/**
 * Real-time WebSocket streaming client.
 *
 * Wraps the connect → token → subscribe → event loop with auto-reconnect,
 * heartbeat liveness, and typed events, so consumers never hand-roll
 * connection management. Obtain one via `client.stream.connect()`. Stream
 * tokens do not expire: `getToken()` is called on every (re)connect and returns
 * the same value until the subscription lapses or you explicitly rotate it.
 *
 * Recovery (v1 resume): the client remembers a cursor `{instance, seq, ts}` —
 * the last frame whose handlers finished — and on every reconnect asks the
 * server to resume after it (`subscribe {…, resume}`); against an older server
 * it falls back to `replay_since_seq` (same process) / `replay_since_ts`
 * (restarted). Delivery is at-least-once, de-duplicated by event `id`; a
 * `"gap"` event says what could NOT be recovered. `seq` gaps are normal and
 * never mean loss. Close codes: 4001 re-fetches the token (bounded, then
 * `"fatal"`), 4002 (connection limit) waits ≥ 60 s, 4003 stops with
 * `"fatal"`, 4008 (slow consumer) reconnects and resumes.
 *
 * Works in Node (uses the global `WebSocket` on Node 22+, else lazily imports
 * the optional `ws` package) and the browser (native WebSocket). Zero required
 * dependencies.
 */

/** Channels you can subscribe to (mirrors the server registry, services/shared/stream-channels.mjs). */
export type StreamChannel =
  | "kol:trades"
  | "kol:coordination"
  | "kol:first_touches"
  | "deployer:alerts"
  | "wallet_tracker:events"   // ULTRA+
  | "copytrade:signals"
  | "price_alert:events"
  | "sniper:deploys"
  | "token:graduations"
  | "token:prices"            // PRO+, mint-scoped: REQUIRES filters.mints (PRO 25 / ULTRA 100 / BUSINESS 250)
  | "token:locks"
  | "token:fee_claims"
  | "token:surges";

/** Every Solana channel, in the server's order. */
export const STREAM_CHANNELS: readonly StreamChannel[] = [
  "kol:trades",
  "kol:coordination",
  "kol:first_touches",
  "deployer:alerts",
  "wallet_tracker:events",
  "copytrade:signals",
  "price_alert:events",
  "sniper:deploys",
  "token:graduations",
  "token:prices",
  "token:locks",
  "token:fee_claims",
  "token:surges",
];

/** Event names delivered on those channels (subscribe to a channel, receive these). */
export type StreamEventName =
  | "kol:trade"
  | "kol:coordination"
  | "kol:first_touch"
  | "deployer:alert"
  | "deployer:bond"
  | "wallet_tracker:event"
  | "copytrade:signal"
  | "price_alert:dip"
  | "price_alert:recovery"
  | "sniper:deploy"
  | "token:graduation"
  | "token:price"             // on token:prices — a state tick: no id/seq, never replayed
  | "token:lock"
  | "token:fee_claim"
  | "token:surge"
  | "token:revival";

/** Minimal stream-token shape the client needs (token + ws_url). */
export interface StreamTokenLike {
  token: string;
  ws_url: string;
}

// ── Shared stream core ──────────────────────────────────────────────────────
// Everything below this line is IDENTICAL in the four TypeScript SDKs
// (madeonsol-x402, robinhood-chain-x402, madeonsol, robinhood-chain-sdk);
// only the class name and the token type differ. Change it in all four.

/** Lifecycle events you can also listen for. */
export type StreamLifecycleEvent =
  | "open"        // socket open (subscribe follows)
  | "close"       // socket closed: { code, reason } (reconnect may follow)
  | "reconnect"   // a reconnect attempt is scheduled: { attempt, delayMs, code }
  | "subscribed"  // server confirmed a subscribe (the backoff resets here)
  | "heartbeat"   // server liveness ping
  | "warning"     // server warning frame (channels_rejected, channels_revoked, …) — see StreamWarning
  | "cursor"      // the resume cursor advanced — see StreamCursor (persist it for durable resume)
  | "replay"      // a resume/replay finished — see StreamReplayResult
  | "gap"         // the server said part of a resume could NOT be recovered — see StreamGap
  | "fatal"       // the stream stopped for good (4003, or 4001 after bounded token refreshes) — see StreamFatal
  | "error";      // transport/parse/handler error, or a 4002 connection-limit close

/**
 * A server `type: "warning"` frame, surfaced as the `"warning"` lifecycle
 * event. Known codes: `channels_rejected` (a subscribe named a channel that
 * does not exist or that your tier cannot hold — each with a reason, plus the
 * full list of channels it accepts) and `channels_revoked` (the server dropped
 * channels you held, e.g. after a plan downgrade). A rejected or revoked
 * channel is silent, so never ignore these.
 */
export interface StreamWarning {
  /** Machine-readable code, e.g. `"channels_rejected"` or `"channels_revoked"`. */
  code?: string;
  /** Channels the server refused, each with a human-readable reason. */
  rejected?: Array<{ channel: string; reason: string }>;
  /** Channels the server removed from this connection (channels_revoked). */
  revoked?: Array<{ channel: string; reason: string }> | string[];
  /** Every channel the server accepts. */
  valid_channels?: string[];
  /** Optional human-readable message (not sent on every warning). */
  message?: string;
  /** Server timestamp (ms). */
  ts?: number;
  [key: string]: unknown;
}

/**
 * Resume cursor: the position of the LAST frame whose handlers finished
 * processing ("processed" = every handler for that frame returned, or the
 * promise it returned settled). `instance` identifies the server process
 * (seq restarts when it changes), `seq` is the server's global ordinal and
 * `ts` the frame time in ms. Delivery is at-least-once: after a resume you may
 * see a frame again — dedupe by `evt.id` (the client already drops ids it saw
 * recently). Persist it (on the `"cursor"` event or via `getCursor()`) and pass
 * it back as the `resume` option to continue after a process restart.
 */
export interface StreamCursor {
  instance: string;
  seq: number;
  ts: number;
}

export interface StreamEvent<T = unknown> {
  channel: StreamChannel;
  event: StreamEventName;
  data: T;
  ts: number;
  /** Stable event id — the same event carries the same id live and in replay. Dedupe on it. */
  id?: string;
  /**
   * Server-global ordinal. Gaps are NORMAL (it counts every channel and every
   * user) and are never evidence of loss — only a `"gap"` event is.
   */
  seq?: number | null;
  /** true when the frame was re-sent by a replay/backfill rather than live. */
  replayed?: boolean;
  /**
   * Where a replayed frame came from: "ring" (the server's in-memory buffer) or
   * "durable" (rebuilt from storage — `seq` is then null).
   */
  mode?: "ring" | "durable";
  /** true when a durable frame could not reproduce every live field — see `missing`. */
  partial?: boolean;
  /** Live payload keys a durable frame could not reproduce (they are absent, never guessed). */
  missing?: string[];
  /** "bus" for a live-path frame the server re-sent after its own event-bus reconnect. */
  recovered?: string;
  /** true on a token:price state snapshot sent at resume time. */
  snapshot?: boolean;
}

/** Outcome of a resume, emitted as `"replay"` after the server's `replay_end`. */
export interface StreamReplayResult {
  /** "resume" = the server answered the v1 `resume` request; "legacy" = the
   *  client fell back to `replay_since_seq` / `replay_since_ts` (older server). */
  protocol: "resume" | "legacy";
  /** The cursor the client resumed from. */
  from: StreamCursor | null;
  /** The resume fields the client sent. */
  request: Record<string, unknown>;
  /** Replayed frames received. */
  received: number;
  /** Replayed frames handed to your handlers (received minus duplicates). */
  delivered: number;
  /** Replayed frames dropped because their id was already delivered. */
  duplicates: number;
  /** false when anything could not be recovered — a `"gap"` event follows. */
  complete: boolean;
  /** Server's replay mode ("ring" | "durable"), null on an older server. */
  mode: string | null;
  /** Why the server could not use its ring (e.g. "instance_changed", "ring_truncated"), or null. */
  resumeReason: string | null;
  /** Raw `replay_start` frame (null if none arrived). */
  start: Record<string, unknown> | null;
  /** Raw `replay_end` frame (null on a client-side timeout). */
  end: Record<string, unknown> | null;
}

/**
 * Part of a resume could not be recovered. `reasons` uses the server's
 * vocabulary (`backpressure`, `ring_truncated`, `instance_changed`,
 * `window_exceeded`, `row_cap`, `not_reconstructable`) plus the client-side
 * `replay_timeout`. Backfill the window from REST if you need it.
 */
export interface StreamGap {
  /** The first reason (convenience). */
  reason: string;
  reasons: string[];
  /** Per-channel entries the server reported as incomplete / not reconstructable. */
  channels: Record<string, unknown>;
  /** The cursor the resume started from. */
  from: StreamCursor | null;
  replay: StreamReplayResult;
}

/** The stream stopped and will not reconnect on its own. */
export interface StreamFatal {
  code: number | null;
  reason: string;
}

export interface StreamClientOptions {
  /**
   * Returns your stream token (the SDK wires this to the stream-token
   * endpoint). Called on every (re)connect — including after a 4001 close,
   * which is how a rotated/lapsed token gets replaced. Tokens never expire, so
   * it is never called on a timer.
   */
  getToken: () => Promise<StreamTokenLike>;
  /** Reconnect automatically on drop (default: true). */
  autoReconnect?: boolean;
  /** Max reconnect backoff in ms (default: 30000). */
  maxBackoffMs?: number;
  /** Reconnect if no server heartbeat arrives within this window (default: 90000). */
  heartbeatTimeoutMs?: number;
  /** Override the WebSocket implementation (e.g. inject `ws` explicitly). */
  WebSocketImpl?: unknown;
  /**
   * A cursor you persisted earlier (from `getCursor()` or the `"cursor"`
   * event). The first subscribe then asks the server to resume after it.
   */
  resume?: StreamCursor | null;
  /** How many recent event ids to remember for de-duplication (default: 10000). */
  dedupeSize?: number;
  /** Consecutive 4001 closes (token rejected) before `"fatal"` (default: 3). */
  maxAuthRetries?: number;
  /** Minimum wait after a 4002 connection-limit close, in ms (default: 60000). */
  connectionLimitBackoffMs?: number;
  /**
   * After a resume subscribe is acked, how long to wait for the server's
   * `replay_start` before assuming an older server that does not understand
   * `resume`, and retrying with `replay_since_seq` / `replay_since_ts`
   * (default: 3000). A live event arriving first triggers the fallback at once.
   */
  resumeDetectMs?: number;
  /** Give up waiting for a fallback replay's `replay_end` after this many ms (default: 15000). */
  legacyReplayTimeoutMs?: number;
}

type Listener = (data: unknown, evt?: StreamEvent) => unknown;

// Minimal structural type covering both the browser WebSocket and the `ws` package.
interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code?: number; reason?: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

async function resolveWebSocket(override?: unknown): Promise<new (url: string) => WebSocketLike> {
  if (override) return override as never;
  // Prefer the `ws` package in Node: it exposes terminate() for an immediate
  // socket teardown, so close() lets short-lived processes exit. The global
  // (undici) WebSocket on Node 22+ keeps its TLS socket open after close() —
  // it has no terminate() and no reachable socket handle — which hangs the
  // event loop. In the browser this import rejects and we fall back to the
  // platform's native WebSocket. Cast the specifier to string so TS doesn't
  // require the module to be installed at build time.
  try {
    const mod = (await import("ws" as string)) as { default?: unknown; WebSocket?: unknown };
    const impl = mod.default ?? mod.WebSocket;
    if (impl) return impl as never;
  } catch {
    /* not Node, or `ws` not installed — fall back to the platform WebSocket */
  }
  const g = (globalThis as { WebSocket?: unknown }).WebSocket;
  if (g) return g as never;
  throw new Error(
    "No WebSocket implementation available. On Node < 22, install `ws` (npm i ws) or pass { WebSocketImpl }.",
  );
}

const OPEN = 1;
type Frame = Record<string, unknown>;
type Position = { instance: string | null; seq: number | null; ts: number };

interface Recovery {
  /** "detect" until we know whether the server understood `resume`. */
  protocol: "detect" | "resume" | "legacy";
  from: StreamCursor | null;
  channels: string[];
  request: Record<string, unknown>;
  acked: boolean;
  suppressAck: boolean;
  instanceChanged: boolean;
  start: Frame | null;
  received: number;
  delivered: number;
  duplicates: number;
  /** Live frames held back while a client-side (legacy) replay runs. */
  held: Frame[];
  timer: ReturnType<typeof setTimeout> | null;
}

const HELD_LIVE_CAP = 10_000;

function isThenable(v: unknown): v is PromiseLike<unknown> {
  return !!v && (typeof v === "object" || typeof v === "function") && typeof (v as { then?: unknown }).then === "function";
}

function validCursor(c: unknown): StreamCursor | null {
  if (!c || typeof c !== "object") return null;
  const { instance, seq, ts } = c as Record<string, unknown>;
  if (typeof instance !== "string" || !instance) return null;
  if (typeof seq !== "number" || !Number.isFinite(seq) || seq < 0) return null;
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts < 0) return null;
  return { instance, seq, ts };
}

export class MadeOnSolStream {
  private opts: Required<Omit<StreamClientOptions, "WebSocketImpl" | "resume">> & Pick<StreamClientOptions, "WebSocketImpl">;
  private ws: WebSocketLike | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private desired = { channels: new Set<StreamChannel>(), filters: {} as Record<string, unknown> };
  private closedByUser = false;
  private stopped = false;
  private attempt = 0;
  private authFailures = 0;
  private hbTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connecting = false;
  /** Server process id of the CURRENT connection (from connected/subscribed). */
  private serverInstance: string | null = null;
  /** Whether this connection already sent its first subscribe (the only one that resumes). */
  private firstSubscribeSent = false;
  private cursor: StreamCursor | null;
  private seen = new Map<string, true>();
  private inflight: Array<{ pos: Position | null; done: boolean }> = [];
  private recovery: Recovery | null = null;

  constructor(opts: StreamClientOptions) {
    this.opts = {
      getToken: opts.getToken,
      autoReconnect: opts.autoReconnect ?? true,
      maxBackoffMs: opts.maxBackoffMs ?? 30_000,
      heartbeatTimeoutMs: opts.heartbeatTimeoutMs ?? 90_000,
      WebSocketImpl: opts.WebSocketImpl,
      dedupeSize: Math.max(0, opts.dedupeSize ?? 10_000),
      maxAuthRetries: Math.max(0, opts.maxAuthRetries ?? 3),
      connectionLimitBackoffMs: Math.max(0, opts.connectionLimitBackoffMs ?? 60_000),
      resumeDetectMs: Math.max(0, opts.resumeDetectMs ?? 3_000),
      legacyReplayTimeoutMs: Math.max(0, opts.legacyReplayTimeoutMs ?? 15_000),
    };
    this.cursor = validCursor(opts.resume);
  }

  /** Register a handler. Use an event name, `"*"` for every event, or a lifecycle event.
   *  An event handler may return a promise: the cursor only advances past a frame once
   *  every handler for it (and for every earlier frame) has settled. */
  on(event: "warning", fn: (warning: StreamWarning) => unknown): this;
  on(event: "cursor", fn: (cursor: StreamCursor) => unknown): this;
  on(event: "replay", fn: (result: StreamReplayResult) => unknown): this;
  on(event: "gap", fn: (gap: StreamGap) => unknown): this;
  on(event: "fatal", fn: (fatal: StreamFatal) => unknown): this;
  on(event: StreamEventName | StreamLifecycleEvent | "*", fn: Listener): this;
  on(event: string, fn: (...args: never[]) => unknown): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn as unknown as Listener);
    return this;
  }

  /** Remove a handler (or all handlers for an event when `fn` is omitted). */
  off(event: string, fn?: (...args: never[]) => unknown): this {
    if (!fn) this.listeners.delete(event);
    else this.listeners.get(event)?.delete(fn as unknown as Listener);
    return this;
  }

  /** The resume cursor (last fully processed frame), or null before the first one. */
  getCursor(): StreamCursor | null {
    return this.cursor ? { ...this.cursor } : null;
  }

  private emit(event: string, data: unknown, evt?: StreamEvent): void {
    const set = this.listeners.get(event);
    if (set) for (const fn of set) { try { fn(data, evt); } catch { /* user handler */ } }
  }

  /** Call every handler for a data frame; collect what they returned (for completion tracking). */
  private callHandlers(event: string, data: unknown, evt: StreamEvent, out: unknown[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try { out.push(fn(data, evt)); } catch (err) { this.emit("error", err); }
    }
  }

  /** Subscribe to one or more channels (connects on first call). Optional server-side filters. */
  subscribe(channels: StreamChannel[], filters?: Record<string, unknown>): this {
    for (const c of channels) this.desired.channels.add(c);
    if (filters) this.desired.filters = { ...this.desired.filters, ...filters };
    if (this.ws && this.ws.readyState === OPEN) this.sendSubscribe();
    else void this.connect();
    return this;
  }

  /** Stop receiving the given channels. */
  unsubscribe(channels: StreamChannel[]): this {
    for (const c of channels) this.desired.channels.delete(c);
    if (this.ws && this.ws.readyState === OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", channels }));
    }
    return this;
  }

  /** Open the connection (also called implicitly by subscribe). Restarts a stream that went `"fatal"`. */
  async connect(): Promise<void> {
    if (this.connecting || (this.ws && this.ws.readyState === OPEN)) return;
    if (this.stopped) { this.stopped = false; this.authFailures = 0; this.attempt = 0; }
    this.closedByUser = false;
    this.connecting = true;
    try {
      const [WS, token] = await Promise.all([
        resolveWebSocket(this.opts.WebSocketImpl),
        this.opts.getToken(),
      ]);
      if (this.closedByUser || this.stopped) return;
      const url = `${token.ws_url}?token=${encodeURIComponent(token.token)}`;
      const ws = new WS(url);
      this.ws = ws;
      this.serverInstance = null;
      this.firstSubscribeSent = false;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        // The backoff attempt is NOT reset here — only a `subscribed` ack proves
        // the connection is usable (an auth/limit close follows a successful open).
        this.resetHeartbeat();
        if (this.desired.channels.size > 0) this.sendSubscribe();
        this.emit("open", undefined);
      };
      ws.onmessage = (ev) => { if (this.ws === ws) this.handleMessage(ev.data); };
      ws.onerror = (err) => { if (this.ws === ws) this.emit("error", err instanceof Error ? err : new Error("WebSocket error")); };
      ws.onclose = (ev) => {
        if (this.ws !== null && this.ws !== ws) return; // superseded socket
        this.handleClose(typeof ev?.code === "number" ? ev.code : null, typeof ev?.reason === "string" ? ev.reason : "");
      };
    } catch (err) {
      this.emit("error", err);
      if (this.authFailures > 0) {
        // Token re-fetch after a 4001 failed — counts toward the bounded retries.
        this.authFailures++;
        if (this.authFailures > this.opts.maxAuthRetries) { this.fatal(4001, "stream token refresh failed"); return; }
      }
      if (!this.closedByUser && !this.stopped && this.opts.autoReconnect) this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  /** Close the connection and stop reconnecting. */
  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.clearHeartbeat();
    this.dropRecovery();
    const sock = this.ws as (WebSocketLike & { terminate?: () => void }) | null;
    this.ws = null;
    try {
      // `ws` package: terminate() destroys the underlying socket immediately so
      // the process can exit. Native/undici WebSocket has no terminate() — fall
      // back to a graceful close().
      if (typeof sock?.terminate === "function") sock.terminate();
      else sock?.close(1000, "client closed");
    } catch { /* ignore */ }
  }

  private handleClose(code: number | null, reason: string): void {
    this.clearHeartbeat();
    this.ws = null;
    this.serverInstance = null;
    // Frames held back for an unfinished recovery are dropped undelivered: the
    // cursor never moved past them, so the next resume asks for them again.
    this.dropRecovery();
    this.emit("close", { code, reason });
    if (this.closedByUser || this.stopped) return;
    if (code === 4003) { this.fatal(code, reason || "authentication error"); return; }
    if (code === 4001) {
      // Token rejected (rotated / lapsed): the reconnect re-fetches it via getToken().
      this.authFailures++;
      if (this.authFailures > this.opts.maxAuthRetries) { this.fatal(code, reason || "stream token rejected"); return; }
    }
    if (!this.opts.autoReconnect) return;
    if (code === 4002) {
      // Connection limit: another socket holds the slot. Never retry tightly.
      const err = new Error(`stream connection limit reached${reason ? `: ${reason}` : ""}`) as Error & { code?: number; reason?: string };
      err.code = 4002;
      err.reason = reason;
      this.emit("error", err);
      this.scheduleReconnect(code, this.opts.connectionLimitBackoffMs);
      return;
    }
    // 4008 (slow consumer) and everything else: reconnect and resume from the cursor.
    this.scheduleReconnect(code);
  }

  private fatal(code: number | null, reason: string): void {
    this.stopped = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.emit("fatal", { code, reason } satisfies StreamFatal);
  }

  private sendSubscribe(): void {
    const channels = Array.from(this.desired.channels);
    if (channels.length === 0 || !this.ws) return;
    const msg: Record<string, unknown> = { type: "subscribe", channels };
    if (Object.keys(this.desired.filters).length > 0) msg.filters = this.desired.filters;
    // Only the FIRST subscribe of a connection resumes; a later subscribe adds
    // channels live (the server replays only the channels named in a subscribe).
    if (!this.firstSubscribeSent && this.cursor && !this.recovery) {
      const from = { ...this.cursor };
      msg.resume = from;
      this.recovery = {
        protocol: "detect", from, channels, request: { resume: from }, acked: false, suppressAck: false,
        instanceChanged: false, start: null, received: 0, delivered: 0, duplicates: 0, held: [], timer: null,
      };
    }
    this.firstSubscribeSent = true;
    this.ws.send(JSON.stringify(msg));
  }

  /** The server did not answer `resume` (older deployment): retry with the legacy fields. */
  private fallbackToLegacy(): void {
    const r = this.recovery;
    if (!r || r.protocol !== "detect" || !r.from || !this.ws) return;
    if (r.timer) { clearTimeout(r.timer); r.timer = null; }
    r.protocol = "legacy";
    r.instanceChanged = !this.serverInstance || this.serverInstance !== r.from.instance;
    // Same process → its ring still indexes our seq. Restarted → seq restarted, use time.
    const legacy = r.instanceChanged ? { replay_since_ts: r.from.ts } : { replay_since_seq: r.from.seq };
    r.request = legacy;
    r.suppressAck = true;
    const msg: Record<string, unknown> = { type: "subscribe", channels: r.channels, ...legacy };
    if (Object.keys(this.desired.filters).length > 0) msg.filters = this.desired.filters;
    try { this.ws.send(JSON.stringify(msg)); } catch { /* closing */ }
    r.timer = setTimeout(() => this.finishRecovery(null), this.opts.legacyReplayTimeoutMs);
  }

  private dropRecovery(): void {
    if (this.recovery?.timer) clearTimeout(this.recovery.timer);
    this.recovery = null;
  }

  private finishRecovery(end: Frame | null): void {
    const r = this.recovery;
    if (!r) return;
    if (r.timer) { clearTimeout(r.timer); r.timer = null; }
    this.recovery = null;
    const reasons: string[] = [];
    const gapChannels: Record<string, unknown> = {};
    // A v1 server answers with complete/sent/matched; an older one with count only.
    const v1 = !!end && ("complete" in end || "sent" in end || "matched" in end);
    if (r.start?.replay_truncated === true || end?.replay_truncated === true) reasons.push("ring_truncated");
    if (!end) reasons.push("replay_timeout");
    else if (v1) {
      if (end.complete === false) reasons.push(typeof end.reason === "string" && end.reason ? end.reason : "incomplete");
      const chs = end.channels;
      if (chs && typeof chs === "object") {
        for (const [ch, raw] of Object.entries(chs as Record<string, unknown>)) {
          // token:prices is a state stream: the server re-sends a snapshot, never a log.
          if (ch === "token:prices") continue;
          const info = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
          const gap = info.gap;
          if (info.complete === false || gap || info.mode === "none") {
            gapChannels[ch] = raw;
            const gr = gap && typeof gap === "object" ? (gap as Record<string, unknown>).reason : gap;
            reasons.push(typeof gr === "string" && gr ? gr : info.mode === "none" ? "not_reconstructable" : "incomplete");
          }
        }
      }
    } else {
      // Legacy server: `count` is what it meant to send; fewer arrived → it stopped on backpressure.
      if (typeof end.count === "number" && r.received < end.count) reasons.push("backpressure");
      // Legacy server + restart: the old process's buffer is gone and there is no durable backfill.
      if (r.protocol === "legacy" && r.instanceChanged) reasons.push("instance_changed");
    }
    const uniq = Array.from(new Set(reasons));
    const result: StreamReplayResult = {
      protocol: v1 || r.protocol === "resume" ? "resume" : "legacy",
      from: r.from,
      request: r.request,
      received: r.received,
      delivered: r.delivered,
      duplicates: r.duplicates,
      complete: uniq.length === 0,
      mode: typeof end?.mode === "string" ? end.mode : null,
      resumeReason: typeof end?.resume_reason === "string" ? end.resume_reason : null,
      start: r.start,
      end,
    };
    this.emit("replay", result);
    if (uniq.length > 0) {
      this.emit("gap", { reason: uniq[0], reasons: uniq, channels: gapChannels, from: r.from, replay: result } satisfies StreamGap);
    }
    // Live frames that arrived during a client-side replay go out now, after it.
    for (const f of r.held) this.deliver(f);
  }

  private handleMessage(raw: unknown): void {
    let msg: Frame;
    try {
      const text = typeof raw === "string" ? raw : String(raw);
      msg = JSON.parse(text);
    } catch {
      this.emit("error", new Error("Failed to parse stream message"));
      return;
    }
    switch (msg.type) {
      case "heartbeat":
        this.resetHeartbeat();
        this.emit("heartbeat", msg.ts);
        return;
      case "connected":
        if (typeof msg.instance === "string") this.serverInstance = msg.instance;
        // Nothing to subscribe to → this frame is as far as a healthy connection gets.
        if (this.desired.channels.size === 0) { this.attempt = 0; this.authFailures = 0; }
        return;
      case "subscribed": {
        if (typeof msg.instance === "string") this.serverInstance = msg.instance;
        this.attempt = 0;
        this.authFailures = 0;
        const r = this.recovery;
        if (r && r.suppressAck) { r.suppressAck = false; return; } // ack of our own fallback subscribe
        this.emit("subscribed", msg.channels);
        if (r && r.protocol === "detect" && !r.acked) {
          r.acked = true;
          const echo = msg.resume;
          if (echo && typeof echo === "object" && (echo as Record<string, unknown>).accepted === false) {
            // Refused (e.g. replay_in_progress): no replay follows, and this is
            // a v1 server — no waiting, no legacy fallback. The server's own
            // warning frame explains why.
            this.dropRecovery();
          } else if ("resume" in msg) r.protocol = "resume"; // server echoed resume: it understood
          else r.timer = setTimeout(() => this.fallbackToLegacy(), this.opts.resumeDetectMs);
        }
        return;
      }
      case "replay_start": {
        let r = this.recovery;
        if (!r) {
          // A replay we did not ask for in this state (e.g. a late answer) — track it anyway.
          r = this.recovery = {
            protocol: "resume", from: null, channels: [], request: {}, acked: true, suppressAck: false,
            instanceChanged: false, start: null, received: 0, delivered: 0, duplicates: 0, held: [], timer: null,
          };
        }
        if (r.protocol === "detect") {
          r.protocol = "resume";
          if (r.timer) { clearTimeout(r.timer); r.timer = null; }
        }
        r.start = msg;
        return;
      }
      case "replay_end":
        this.finishRecovery(msg);
        return;
      case "warning":
        // Never swallow a server warning: a rejected/revoked channel is silent.
        this.emit("warning", msg as StreamWarning);
        return;
      default:
        break;
    }
    if (!msg.channel || !msg.event) return;
    // Bus-recovered frames (recovered:"bus") are re-sent live, not part of a replay.
    const inReplay = msg.replayed === true && msg.recovered !== "bus";
    const r = this.recovery;
    if (r) {
      if (!inReplay && r.protocol === "detect" && r.acked) this.fallbackToLegacy(); // live before replay_start → old server
      if (!inReplay && r.protocol === "legacy") {
        if (r.held.length < HELD_LIVE_CAP) { r.held.push(msg); return; }
        // Too much live traffic to hold: stop holding, deliver in arrival order.
        const held = r.held;
        r.held = [];
        for (const f of held) this.deliver(f);
      }
      if (inReplay) r.received++;
    }
    this.deliver(msg);
  }

  /** Dedupe by id, hand the frame to the handlers, track completion for the cursor. */
  private deliver(msg: Frame): void {
    const inReplay = msg.replayed === true && msg.recovered !== "bus";
    const id = typeof msg.id === "string" || typeof msg.id === "number" ? String(msg.id) : null;
    if (id !== null && this.opts.dedupeSize > 0) {
      const key = `${String(msg.channel)}\u0000${id}`;
      if (this.seen.has(key)) {
        this.seen.delete(key);
        this.seen.set(key, true);
        if (inReplay && this.recovery) this.recovery.duplicates++;
        return;
      }
      this.seen.set(key, true);
      if (this.seen.size > this.opts.dedupeSize) {
        const oldest = this.seen.keys().next().value;
        if (oldest !== undefined) this.seen.delete(oldest);
      }
    }
    if (inReplay && this.recovery) this.recovery.delivered++;
    const data = msg.data as Record<string, unknown> | undefined;
    const evt = { ...msg, replayed: msg.replayed === true || (!!data && typeof data === "object" && data.replayed === true) } as unknown as StreamEvent;
    const seq = typeof msg.seq === "number" && Number.isFinite(msg.seq) ? msg.seq : null;
    const ts = typeof msg.ts === "number" && Number.isFinite(msg.ts) ? msg.ts : null;
    // Only sequenced/identified frames move the cursor (token:price ticks are state, not a log).
    const pos: Position | null = (seq !== null || id !== null) && ts !== null ? { instance: this.serverInstance, seq, ts } : null;
    const results: unknown[] = [];
    this.callHandlers(evt.event, evt.data, evt, results);
    this.callHandlers("*", evt.data, evt, results);
    const pending = results.filter(isThenable);
    if (pending.length === 0 && this.inflight.length === 0) { if (pos) this.advance(pos); return; }
    const entry = { pos, done: pending.length === 0 };
    this.inflight.push(entry);
    if (entry.done) { this.drainInflight(); return; }
    void Promise.allSettled(pending).then((settled) => {
      for (const s of settled) if (s.status === "rejected") this.emit("error", s.reason);
      entry.done = true;
      this.drainInflight();
    });
  }

  private drainInflight(): void {
    while (this.inflight.length > 0 && this.inflight[0].done) {
      const e = this.inflight.shift()!;
      if (e.pos) this.advance(e.pos);
    }
  }

  private advance(pos: Position): void {
    const c = this.cursor;
    let next: StreamCursor;
    if (pos.seq !== null && pos.instance) {
      if (c && c.instance === pos.instance) {
        next = { instance: c.instance, seq: Math.max(c.seq, pos.seq), ts: Math.max(c.ts, pos.ts) };
      } else {
        next = { instance: pos.instance, seq: pos.seq, ts: pos.ts };
      }
    } else if (c) {
      // Unsequenced frame (durable backfill, seq:null): keep the last real seq, advance time.
      next = { ...c, ts: Math.max(c.ts, pos.ts) };
    } else {
      return;
    }
    if (c && c.instance === next.instance && c.seq === next.seq && c.ts === next.ts) return;
    this.cursor = next;
    this.emit("cursor", { ...next });
  }

  private scheduleReconnect(code: number | null = null, minDelayMs = 0): void {
    if (this.reconnectTimer || this.stopped) return;
    const base = Math.min(1000 * 2 ** this.attempt, this.opts.maxBackoffMs);
    let delay = base / 2 + Math.floor((base / 2) * Math.random()); // jitter
    if (minDelayMs > 0) delay = Math.max(delay, minDelayMs + Math.floor((minDelayMs / 2) * Math.random()));
    this.attempt++;
    this.emit("reconnect", { attempt: this.attempt, delayMs: delay, code });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private resetHeartbeat(): void {
    this.clearHeartbeat();
    this.hbTimer = setTimeout(() => {
      // Server went quiet — force a reconnect.
      try { this.ws?.close(4000, "heartbeat timeout"); } catch { /* ignore */ }
    }, this.opts.heartbeatTimeoutMs);
  }

  private clearHeartbeat(): void {
    if (this.hbTimer) { clearTimeout(this.hbTimer); this.hbTimer = null; }
  }
}
