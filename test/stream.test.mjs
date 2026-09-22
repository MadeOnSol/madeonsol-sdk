// Offline tests for the WebSocket stream client: cursor tracking, v1 resume,
// legacy replay fallback, id dedup, gap reporting and close-code handling.
// Uses an in-memory fake WebSocket + scripted server (no network, no key).
// The SAME file runs in madeonsol-x402, robinhood-chain-x402, madeonsol and
// robinhood-chain-sdk — keep the copies identical.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as mod from "../dist/stream.js";

const Base = mod.MadeOnSolStream ?? mod.RobinhoodChainStream ?? mod.RobinhoodStream;
// Every stream a test opens is closed afterwards, even when an assertion
// failed first — otherwise its reconnect timer keeps the runner alive.
const open = new Set();
class Stream extends Base {
  constructor(o) { super(o); open.add(this); }
}
afterEach(() => { for (const x of open) x.close(); open.clear(); });
const CH2 = mod.STREAM_CHANNELS[1];
const CH = mod.STREAM_CHANNELS[0];
const EV = "test:event";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(pred, ms = 2000, what = "condition") {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (pred()) return;
    await sleep(5);
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** A fake WebSocket class bound to one scripted server. */
function fakeSocketClass(server) {
  return class FakeWS {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.onopen = this.onmessage = this.onclose = this.onerror = null;
      server.sockets.push(this);
      setTimeout(() => {
        if (this.readyState !== 0) return;
        this.readyState = 1;
        this.onopen?.({});
        this.push({ type: "connected", seq: server.seq, instance: server.instance, ts: Date.now() });
      }, 1);
    }
    send(raw) {
      const msg = JSON.parse(raw);
      if (msg.type === "subscribe") server.handleSubscribe(this, msg);
    }
    close(code = 1000, reason = "") { this.serverClose(code, reason); }
    terminate() { this.serverClose(1006, ""); }
    push(obj) { if (this.readyState === 1) this.onmessage?.({ data: JSON.stringify(obj) }); }
    serverClose(code, reason = "") {
      if (this.readyState === 3) return;
      this.readyState = 3;
      setTimeout(() => this.onclose?.({ code, reason }), 1);
    }
  };
}

/**
 * Scripted server. mode "v1" answers `resume` per the Phase 1 contract;
 * mode "legacy" is today's server (ignores `resume`, honours replay_since_*).
 */
class FakeServer {
  constructor({ mode = "v1", instance = "inst-A", echoResume = true } = {}) {
    this.mode = mode;
    this.instance = instance;
    this.echoResume = echoResume;
    this.ring = [];      // frames the server "remembers"
    this.seq = 0;
    this.sockets = [];
    this.subscribes = [];
    this.v1Result = null; // override the replay_end of the next v1 resume
    this.onSubscribe = null;
    this.Impl = fakeSocketClass(this);
  }
  get last() { return this.sockets[this.sockets.length - 1]; }
  frame(extra = {}) {
    const seq = extra.seq ?? ++this.seq;
    if (seq > this.seq) this.seq = seq;
    const f = { channel: CH, event: EV, id: extra.id ?? `id-${seq}`, seq, data: { n: seq }, ts: extra.ts ?? 1_000_000 + seq };
    this.ring.push(f);
    return f;
  }
  live(ws, extra) { const f = this.frame(extra); ws.push(f); return f; }
  handleSubscribe(ws, msg) {
    this.subscribes.push(msg);
    const ack = { type: "subscribed", channels: msg.channels, seq: this.seq, instance: this.instance, ts: Date.now() };
    if (this.onSubscribe && this.onSubscribe(ws, msg) === false) return;
    if (this.mode === "v1") {
      // PR #81: the ack echoes resume {…, accepted}; replay_start … replay_end
      // always precede live frames; durable frames carry seq:null, mode:"durable".
      if (this.echoResume && msg.resume) ack.resume = { ...msg.resume, accepted: true };
      ws.push(ack);
      if (msg.resume) {
        const r = msg.resume;
        const same = r.instance === this.instance;
        const mode = same ? "ring" : "durable";
        const out = this.ring.filter((f) => (same ? f.seq > r.seq : f.ts > r.ts));
        ws.push({ type: "replay_start", mode, count: same ? out.length : null, ...(same ? {} : { resume: true, reason: "instance_changed", since_ts: r.ts }), ts: Date.now() });
        for (const f of out) {
          ws.push(same ? { ...f, replayed: true, mode: "ring" } : { ...f, seq: null, replayed: true, mode: "durable", ...(this.durableMissing ? { partial: true, missing: this.durableMissing } : {}) });
        }
        const last = out[out.length - 1];
        ws.push(this.v1Result ?? {
          type: "replay_end", count: out.length, sent: out.length, matched: out.length, complete: true, reason: null,
          last_seq: same && last ? last.seq : null, last_ts: last ? last.ts : null, live_from_seq: this.seq + 1,
          mode, resume_reason: same ? null : "instance_changed", retryable: false,
          channels: { [CH]: { mode, sent: out.length, complete: true, ...(this.durableMissing ? { partial: true, missing: this.durableMissing } : {}) } },
          limits: same ? undefined : { max_age_ms: 3_600_000, max_rows_per_channel: 5000, max_rows_total: 20000, slack_ms: 30000 },
          ts: Date.now(),
        });
        this.v1Result = null;
      }
      return;
    }
    // legacy
    ws.push(ack);
    const sinceSeq = Number.isInteger(msg.replay_since_seq) ? msg.replay_since_seq : null;
    const sinceTs = typeof msg.replay_since_ts === "number" ? msg.replay_since_ts : null;
    if (sinceSeq == null && sinceTs == null) return;
    const oldest = this.ring[0];
    const truncated = sinceSeq != null ? !!oldest && sinceSeq < oldest.seq - 1 : !!oldest && sinceTs < oldest.ts;
    const out = this.ring.filter((f) => (sinceSeq != null ? f.seq > sinceSeq : f.ts > sinceTs));
    ws.push({ type: "replay_start", count: out.length, replay_truncated: truncated, ts: Date.now() });
    const limit = this.legacySendLimit ?? out.length;
    for (const f of out.slice(0, limit)) ws.push({ ...f, replayed: true });
    ws.push({ type: "replay_end", count: out.length, live_from_seq: this.seq + 1, ts: Date.now() });
  }
}

function makeStream(server, opts = {}) {
  let tokenCalls = 0;
  const stream = new Stream({
    getToken: async () => { tokenCalls++; return { token: `tok ${tokenCalls}/+`, ws_url: "wss://example.test/ws" }; },
    WebSocketImpl: server.Impl,
    maxBackoffMs: 20,
    resumeDetectMs: 40,
    legacyReplayTimeoutMs: 300,
    connectionLimitBackoffMs: 250,
    ...opts,
  });
  const got = [];
  const events = { replay: [], gap: [], fatal: [], warning: [], error: [], reconnect: [], cursor: [], subscribed: [] };
  stream.on(EV, (data, evt) => { got.push({ seq: evt.seq, id: evt.id, replayed: evt.replayed }); });
  for (const k of Object.keys(events)) stream.on(k, (x) => events[k].push(x));
  return { stream, got, events, tokenCalls: () => tokenCalls };
}

test("tracks the cursor of processed frames; seq gaps are never reported as loss", async () => {
  const server = new FakeServer();
  const { stream, got, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1, 2000, "subscribe");
  const ws = server.last;
  server.live(ws, { seq: 1 });
  server.live(ws, { seq: 5 });
  server.live(ws, { seq: 100 });
  await until(() => got.length === 3);
  assert.deepEqual(stream.getCursor(), { instance: "inst-A", seq: 100, ts: 1_000_100 });
  assert.equal(events.gap.length, 0);
  assert.equal(events.cursor.length, 3);
  assert.equal(server.subscribes[0].resume, undefined, "no cursor yet → no resume on the first subscribe");
  // The token is URL-encoded into the handshake URL.
  assert.ok(ws.url.endsWith(`?token=${encodeURIComponent("tok 1/+")}`));
  stream.close();
});

test("async handlers: the cursor only passes a frame after it (and every earlier frame) settled", async () => {
  const server = new FakeServer();
  const stream = new Stream({ getToken: async () => ({ token: "t", ws_url: "wss://x" }), WebSocketImpl: server.Impl });
  const release = new Map();
  stream.on(EV, (data, evt) => new Promise((r) => release.set(evt.seq, r)));
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.live(server.last, { seq: 1 });
  server.live(server.last, { seq: 2 });
  await until(() => release.size === 2);
  assert.equal(stream.getCursor(), null);
  release.get(2)();
  await sleep(10);
  assert.equal(stream.getCursor(), null, "frame 2 done but frame 1 still in flight");
  release.get(1)();
  await until(() => stream.getCursor()?.seq === 2);
  stream.close();
});

test("reconnect + resume on the same instance (v1 server): replayed frames delivered, no gap", async () => {
  const server = new FakeServer();
  const { stream, got, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.live(server.last, { seq: 1 });
  server.live(server.last, { seq: 2 });
  await until(() => got.length === 2);
  // Two frames the client never saw, then the socket drops.
  server.frame({ seq: 3 });
  server.frame({ seq: 4 });
  server.last.serverClose(1006);
  await until(() => events.replay.length === 1, 3000, "replay");
  const sub = server.subscribes[1];
  assert.deepEqual(sub.resume, { instance: "inst-A", seq: 2, ts: 1_000_002 });
  assert.equal(sub.replay_since_seq, undefined);
  assert.equal(sub.replay_since_ts, undefined);
  assert.deepEqual(got.map((g) => g.seq), [1, 2, 3, 4]);
  assert.equal(got[2].replayed, true);
  assert.equal(events.replay[0].protocol, "resume");
  assert.equal(events.replay[0].complete, true);
  assert.equal(events.gap.length, 0);
  assert.equal(stream.getCursor().seq, 4);
  stream.close();
});

test("dedup: replayed duplicates of already-delivered ids are dropped", async () => {
  const server = new FakeServer();
  const { stream, got, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.live(server.last, { seq: 1 });
  server.live(server.last, { seq: 2 });
  server.live(server.last, { seq: 3 });
  await until(() => got.length === 3);
  // Server replays from an older point than the cursor (at-least-once): 2, 3 again + 4.
  server.onSubscribe = (ws, msg) => {
    server.onSubscribe = null;
    ws.push({ type: "subscribed", channels: msg.channels, seq: 4, instance: "inst-A" });
    ws.push({ type: "replay_start" });
    for (const s of [2, 3]) ws.push({ ...server.ring[s - 1], replayed: true });
    ws.push({ ...server.frame({ seq: 4 }), replayed: true });
    ws.push({ type: "replay_end", sent: 3, matched: 3, complete: true, channels: {} });
    return false;
  };
  server.last.serverClose(1006);
  await until(() => events.replay.length === 1, 3000, "replay");
  assert.deepEqual(got.map((g) => g.seq), [1, 2, 3, 4]);
  assert.equal(events.replay[0].duplicates, 2);
  assert.equal(events.replay[0].delivered, 1);
  // A live duplicate after replay is dropped too.
  server.last.push(server.ring[3]);
  await sleep(20);
  assert.equal(got.length, 4);
  stream.close();
});

test("legacy server, same instance: falls back to replay_since_seq and holds live frames until replay_end", async () => {
  const server = new FakeServer({ mode: "legacy" });
  const { stream, got, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.live(server.last, { seq: 1 });
  await until(() => got.length === 1);
  server.frame({ seq: 2 });
  server.frame({ seq: 3 });
  server.last.serverClose(1006);
  await until(() => server.subscribes.length === 2);
  // The old server ignores `resume` and streams live: that triggers the fallback at once.
  server.live(server.last, { seq: 4 });
  await until(() => events.replay.length === 1, 3000, "replay");
  assert.deepEqual(server.subscribes[1].resume, { instance: "inst-A", seq: 1, ts: 1_000_001 });
  assert.equal(server.subscribes[2].replay_since_seq, 1);
  assert.equal(server.subscribes[2].resume, undefined);
  assert.deepEqual(got.map((g) => g.seq), [1, 2, 3, 4], "replay first, then the held live frame");
  assert.equal(events.replay[0].protocol, "legacy");
  assert.equal(events.replay[0].complete, true);
  assert.equal(events.gap.length, 0);
  assert.equal(events.subscribed.length, 2, "the fallback subscribe's ack is not re-emitted");
  stream.close();
});

test("legacy server, idle: falls back after resumeDetectMs", async () => {
  const server = new FakeServer({ mode: "legacy" });
  const { stream, got, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.live(server.last, { seq: 1 });
  await until(() => got.length === 1);
  server.frame({ seq: 2 });
  server.last.serverClose(1006);
  await until(() => events.replay.length === 1, 3000, "replay");
  assert.equal(server.subscribes[2].replay_since_seq, 1);
  assert.deepEqual(got.map((g) => g.seq), [1, 2]);
  stream.close();
});

test("legacy server, instance changed: falls back to replay_since_ts and reports the gap", async () => {
  const server = new FakeServer({ mode: "legacy" });
  const { stream, got, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.live(server.last, { seq: 7 });
  await until(() => got.length === 1);
  // Server restarts: new instance, seq restarts, ring empty but for new frames.
  server.instance = "inst-B";
  server.ring = [];
  server.seq = 0;
  server.frame({ seq: 1, ts: 2_000_000 });
  server.last.serverClose(1012);
  await until(() => events.gap.length === 1, 3000, "gap");
  assert.equal(server.subscribes[2].replay_since_ts, 1_000_007);
  assert.equal(server.subscribes[2].replay_since_seq, undefined);
  assert.ok(events.gap[0].reasons.includes("instance_changed"));
  assert.equal(events.gap[0].permanent, true, "an old server cannot ever replay it");
  assert.deepEqual(got.map((g) => g.seq), [7, 1]);
  // Final gap: reported once, then committed — the stream must not stay stuck.
  assert.deepEqual(stream.getCursor(), { instance: "inst-B", seq: 1, ts: 2_000_000 });
  assert.equal(stream.isRecoveryIncomplete(), false);
  server.last.serverClose(1006);
  await until(() => server.subscribes.length === 4, 3000, "reconnect");
  assert.deepEqual(server.subscribes[3].resume, { instance: "inst-B", seq: 1, ts: 2_000_000 });
  await sleep(120);
  assert.equal(events.gap.length, 1, "no endless stuck state");
  stream.close();
});

test("legacy server: fewer replayed frames than replay_end.count → backpressure gap", async () => {
  const server = new FakeServer({ mode: "legacy" });
  const { stream, got, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.live(server.last, { seq: 1 });
  await until(() => got.length === 1);
  server.frame({ seq: 2 });
  server.frame({ seq: 3 });
  server.legacySendLimit = 1;
  server.last.serverClose(1006);
  await until(() => events.gap.length === 1, 3000, "gap");
  assert.deepEqual(events.gap[0].reasons, ["backpressure"]);
  assert.equal(events.replay[0].complete, false);
  stream.close();
});

test("v1 server: resume echo on the ack skips detection; instance change → durable frames keep the last real seq", async () => {
  const server = new FakeServer();
  server.durableMissing = ["slot", "fdv_usd_at_trade"];
  const { stream, got, events } = makeStream(server, { resume: { instance: "old", seq: 50, ts: 1_000_010 }, resumeDetectMs: 5_000 });
  const evts = [];
  stream.on(EV, (d, evt) => { evts.push(evt); });
  server.frame({ seq: 11 }); // ts 1_000_011 > cursor ts → durable-backfilled
  stream.subscribe([CH]);
  await until(() => events.replay.length === 1, 3000, "replay");
  assert.deepEqual(server.subscribes[0].resume, { instance: "old", seq: 50, ts: 1_000_010 }, "constructor resume option is used");
  assert.equal(server.subscribes.length, 1, "no legacy fallback against a v1 server");
  assert.deepEqual(got.map((g) => g.seq), [null]);
  // Durable frame: seq null, partial/missing passed through to the handler.
  assert.equal(evts[0].mode, "durable");
  assert.equal(evts[0].partial, true);
  assert.deepEqual(evts[0].missing, ["slot", "fdv_usd_at_trade"]);
  // Complete durable replay: commit last_seq (null here → keep) / last_ts.
  assert.deepEqual(stream.getCursor(), { instance: "old", seq: 50, ts: 1_000_011 });
  assert.equal(events.replay[0].mode, "durable");
  assert.equal(events.replay[0].resumeReason, "instance_changed");
  assert.equal(events.gap.length, 0);
  // A later live frame on the new instance replaces the cursor wholesale.
  server.live(server.last, { seq: 12 });
  await until(() => got.length === 2);
  assert.deepEqual(stream.getCursor(), { instance: "inst-A", seq: 12, ts: 1_000_012 });
  stream.close();
});

test("v1 server: an empty replay (sent:0, complete:true) completes at once — no detection wait, no gap", async () => {
  const server = new FakeServer();
  const { stream, events } = makeStream(server, { resume: { instance: "inst-A", seq: 0, ts: 1 }, resumeDetectMs: 5_000, legacyReplayTimeoutMs: 5_000 });
  const t0 = Date.now();
  stream.subscribe([CH]);
  await until(() => events.replay.length === 1, 1000, "replay");
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(events.replay[0].complete, true);
  assert.equal(events.replay[0].received, 0);
  assert.equal(events.gap.length, 0);
  assert.equal(server.subscribes.length, 1);
  stream.close();
});

test("resume refused (accepted:false, replay_in_progress): no waiting, no legacy fallback, live flows", async () => {
  const server = new FakeServer();
  server.onSubscribe = (ws, msg) => {
    ws.push({ type: "subscribed", channels: msg.channels, instance: "inst-A", resume: { ...msg.resume, accepted: false, reason: "replay_in_progress" } });
    ws.push({ type: "warning", code: "replay_in_progress", message: "A replay is already running", channels: msg.channels });
    return false;
  };
  const { stream, got, events } = makeStream(server, { resume: { instance: "inst-A", seq: 3, ts: 1 }, resumeDetectMs: 30, legacyReplayTimeoutMs: 60 });
  stream.subscribe([CH]);
  await until(() => events.warning.length === 1, 1000, "warning");
  server.live(server.last, { seq: 9 });
  await until(() => got.length === 1, 1000, "live frame");
  await sleep(150); // well past resumeDetectMs + legacyReplayTimeoutMs
  assert.equal(events.warning[0].code, "replay_in_progress");
  assert.equal(server.subscribes.length, 1, "no legacy re-subscribe");
  assert.equal(events.replay.length, 0);
  assert.equal(events.gap.length, 0);
  // Nothing was recovered: the live frame is delivered but NOT committed.
  assert.deepEqual(stream.getCursor(), { instance: "inst-A", seq: 3, ts: 1 });
  assert.equal(stream.getProgress().seq, 9);
  assert.equal(stream.isRecoveryIncomplete(), true);
  stream.close();
});

test("bus-recovered frames (replayed:true, recovered:\"bus\") are delivered live, flagged, deduped", async () => {
  const server = new FakeServer();
  const { stream, got } = makeStream(server);
  const evts = [];
  stream.on(EV, (d, evt) => { evts.push(evt); });
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  const f1 = server.live(server.last, { seq: 1 });
  server.last.push({ ...server.frame({ seq: 2 }), replayed: true, recovered: "bus" });
  server.last.push({ ...f1, seq: 3, replayed: true, recovered: "bus" }); // already delivered live
  await until(() => got.length === 2);
  await sleep(20);
  assert.equal(got.length, 2);
  assert.equal(evts[1].replayed, true);
  assert.equal(evts[1].recovered, "bus");
  assert.equal(stream.getCursor().seq, 2);
  stream.close();
});

test("token:prices state-stream entry in replay_end is not a gap", async () => {
  const server = new FakeServer();
  server.v1Result = {
    type: "replay_end", count: 0, sent: 0, matched: 0, complete: true, reason: null, last_seq: null, last_ts: null,
    live_from_seq: 1, mode: "ring", resume_reason: null,
    channels: { [CH]: { mode: "ring", sent: 0, complete: true }, "token:prices": { mode: "none", complete: false, gap: "state_stream", snapshot_sent: 2 } },
  };
  const { stream, events } = makeStream(server, { resume: { instance: "inst-A", seq: 0, ts: 1 } });
  stream.subscribe([CH]);
  await until(() => events.replay.length === 1, 1000, "replay");
  assert.equal(events.replay[0].complete, true);
  assert.equal(events.gap.length, 0);
  stream.close();
});

test("replay_end complete:false / channel gaps → gap event with the server's reasons", async () => {
  const server = new FakeServer();
  const { stream, events } = makeStream(server, { resume: { instance: "inst-A", seq: 0, ts: 1 } });
  server.v1Result = {
    type: "replay_end", sent: 0, matched: 10, complete: false, reason: "window_exceeded",
    channels: { [CH]: { mode: "durable", sent: 0, complete: false, gap: { reason: "row_cap", from_ts: 1, to_ts: 5 } }, other: { mode: "none", sent: 0, complete: false } },
  };
  stream.subscribe([CH]);
  await until(() => events.gap.length === 1, 3000, "gap");
  const gap = events.gap[0];
  assert.equal(gap.reason, "window_exceeded");
  assert.deepEqual(gap.reasons, ["window_exceeded", "row_cap", "not_reconstructable"]);
  assert.deepEqual(Object.keys(gap.channels), [CH, "other"]);
  assert.equal(events.replay[0].complete, false);
  stream.close();
});

test("replay_truncated on replay_start is a gap", async () => {
  const server = new FakeServer();
  const { stream, events } = makeStream(server, { resume: { instance: "inst-A", seq: 0, ts: 1 } });
  server.onSubscribe = (ws, msg) => {
    ws.push({ type: "subscribed", channels: msg.channels, instance: "inst-A" });
    ws.push({ type: "replay_start", replay_truncated: true });
    ws.push({ type: "replay_end", sent: 0, matched: 0, complete: true, channels: {} });
    return false;
  };
  stream.subscribe([CH]);
  await until(() => events.gap.length === 1, 3000, "gap");
  assert.deepEqual(events.gap[0].reasons, ["ring_truncated"]);
  stream.close();
});

test("4001: re-fetches the token and reconnects, bounded, then fatal", async () => {
  const server = new FakeServer();
  server.onSubscribe = (ws) => { ws.serverClose(4001, "Token expired"); return false; };
  const { stream, events, tokenCalls } = makeStream(server, { maxAuthRetries: 2 });
  stream.subscribe([CH]);
  await until(() => events.fatal.length === 1, 3000, "fatal");
  assert.equal(tokenCalls(), 3, "initial + 2 bounded refreshes");
  assert.equal(events.fatal[0].code, 4001);
  const n = server.sockets.length;
  await sleep(100);
  assert.equal(server.sockets.length, n, "no reconnect after fatal");
  stream.close();
});

test("4001 once, then a good token: the retry budget resets on the subscribed ack", async () => {
  const server = new FakeServer();
  let closes = 0;
  server.onSubscribe = (ws) => {
    if (closes++ < 1) { ws.serverClose(4001, "Token expired"); return false; }
    return undefined;
  };
  const { stream, events, tokenCalls } = makeStream(server, { maxAuthRetries: 1 });
  stream.subscribe([CH]);
  await until(() => events.subscribed.length === 1, 3000, "subscribed");
  assert.equal(tokenCalls(), 2);
  assert.equal(events.fatal.length, 0);
  stream.close();
});

test("4002 connection limit: long backoff and an error event, never a tight loop", async () => {
  const server = new FakeServer();
  server.onSubscribe = (ws) => { ws.serverClose(4002, "Connection limit reached"); return false; };
  const { stream, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => events.reconnect.length === 1, 2000, "reconnect");
  assert.ok(events.reconnect[0].delayMs >= 250, `delay ${events.reconnect[0].delayMs}`);
  assert.equal(events.reconnect[0].code, 4002);
  assert.equal(events.error.length, 1);
  assert.equal(events.error[0].code, 4002);
  await sleep(150);
  assert.equal(server.sockets.length, 1, "no reconnect inside the backoff window");
  stream.close();

  // Defaults: at least 60 s.
  const server2 = new FakeServer();
  server2.onSubscribe = (ws) => { ws.serverClose(4002, "limit"); return false; };
  const s2 = new Stream({ getToken: async () => ({ token: "t", ws_url: "wss://x" }), WebSocketImpl: server2.Impl });
  const rec = [];
  s2.on("reconnect", (r) => rec.push(r));
  s2.on("error", () => {});
  s2.subscribe([CH]);
  await until(() => rec.length === 1);
  assert.ok(rec[0].delayMs >= 60_000, `default delay ${rec[0].delayMs}`);
  s2.close();
});

test("4003: stops and emits fatal", async () => {
  const server = new FakeServer();
  server.onSubscribe = (ws) => { ws.serverClose(4003, "Authentication error"); return false; };
  const { stream, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => events.fatal.length === 1, 2000, "fatal");
  assert.deepEqual(events.fatal[0], { code: 4003, reason: "Authentication error" });
  await sleep(80);
  assert.equal(server.sockets.length, 1);
  assert.equal(events.reconnect.length, 0);
  stream.close();
});

test("4008 slow consumer: reconnects and resumes from the cursor", async () => {
  const server = new FakeServer();
  const { stream, got, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.live(server.last, { seq: 1 });
  await until(() => got.length === 1);
  server.frame({ seq: 2 });
  server.last.serverClose(4008, "Slow consumer");
  await until(() => events.replay.length === 1, 3000, "replay");
  assert.deepEqual(server.subscribes[1].resume, { instance: "inst-A", seq: 1, ts: 1_000_001 });
  assert.deepEqual(got.map((g) => g.seq), [1, 2]);
  stream.close();
});

test("backoff resets only after the subscribed ack, not on open", async () => {
  const server = new FakeServer();
  let n = 0;
  server.onSubscribe = (ws) => { if (n++ < 3) { ws.serverClose(1011, "boom"); return false; } return undefined; };
  const { stream, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => events.subscribed.length === 1, 3000, "subscribed");
  assert.deepEqual(events.reconnect.map((r) => r.attempt), [1, 2, 3], "attempt kept growing across opens");
  server.last.serverClose(1006);
  await until(() => events.reconnect.length === 4);
  assert.equal(events.reconnect[3].attempt, 1, "reset by the ack");
  stream.close();
});

test("warning frames are emitted (channels_rejected, channels_revoked)", async () => {
  const server = new FakeServer();
  const { stream, events } = makeStream(server);
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.last.push({ type: "warning", code: "channels_rejected", rejected: [{ channel: "x", reason: "requires ULTRA" }] });
  server.last.push({ type: "warning", code: "channels_revoked", revoked: [{ channel: CH, reason: "tier" }] });
  await until(() => events.warning.length === 2);
  assert.deepEqual(events.warning.map((w) => w.code), ["channels_rejected", "channels_revoked"]);
  stream.close();
});

test("frames without id/seq (state ticks) are delivered but never move the cursor", async () => {
  const server = new FakeServer();
  const { stream, events } = makeStream(server);
  const ticks = [];
  stream.on("*", (d, evt) => ticks.push(evt));
  stream.subscribe([CH]);
  await until(() => server.subscribes.length === 1);
  server.last.push({ channel: CH, event: "tick", data: { p: 1 }, ts: 5 });
  server.last.push({ channel: CH, event: "tick", data: { p: 1 }, ts: 6 });
  await until(() => ticks.length === 2);
  assert.equal(stream.getCursor(), null);
  assert.equal(events.cursor.length, 0);
  stream.close();
});

// ── Committed cursor vs received progress (review of #80) ──────────────────

const T0 = 1_000_000;
const durable = (channel, n, ts) => ({ channel, event: EV, id: `${channel}-${n}`, seq: null, data: { n }, ts, replayed: true, mode: "durable" });
const ackEcho = (ws, msg) => ws.push({ type: "subscribed", channels: msg.channels, instance: "inst-A", resume: { ...msg.resume, accepted: true } });

test("REGRESSION: durable recovery dropped between channel A and B → the next resume starts from the pre-resume cursor and B is delivered", async () => {
  const server = new FakeServer();
  const resume = { instance: "old", seq: 50, ts: T0 };
  let n = 0;
  server.onSubscribe = (ws, msg) => {
    n++;
    ackEcho(ws, msg);
    ws.push({ type: "replay_start", mode: "durable", resume: true, reason: "instance_changed" });
    ws.push(durable(CH, 1, T0 + 1));
    // a bus-recovered live-path frame interleaved with the replay
    ws.push({ channel: CH, event: EV, id: "bus-1", seq: 5, data: {}, ts: T0 + 50, replayed: true, recovered: "bus" });
    ws.push(durable(CH, 2, T0 + 2));
    if (n === 1) { ws.serverClose(1006); return false; } // dropped before channel B
    ws.push(durable(CH2, 1, T0 + 3));
    ws.push(durable(CH2, 2, T0 + 4));
    ws.push({ type: "replay_end", count: 4, sent: 4, matched: 4, complete: true, reason: null, last_seq: null, last_ts: T0 + 4, live_from_seq: 9, mode: "durable", resume_reason: "instance_changed",
      channels: { [CH]: { mode: "durable", sent: 2, complete: true }, [CH2]: { mode: "durable", sent: 2, complete: true } } });
    return false;
  };
  const { stream, events } = makeStream(server, { resume });
  const ids = [];
  stream.on("*", (d, evt) => { ids.push(evt.id); });
  stream.subscribe([CH, CH2]);
  await until(() => server.subscribes.length === 2, 3000, "second subscribe");
  assert.deepEqual(server.subscribes[1].resume, resume, "second resume must start from the pre-resume cursor");
  await until(() => events.replay.length === 1, 3000, "replay");
  assert.deepEqual(ids, [`${CH}-1`, "bus-1", `${CH}-2`, `${CH2}-1`, `${CH2}-2`], "B delivered, A/bus duplicates dropped");
  assert.deepEqual(stream.getCursor(), { instance: "old", seq: 50, ts: T0 + 4 }, "commit = server last_seq (null → keep) / last_ts");
  assert.equal(events.gap.length, 0);
});

test("REGRESSION: row_cap (retryable) keeps the committed cursor and re-resumes from resume_ts_hint", async () => {
  const server = new FakeServer();
  const resume = { instance: "old", seq: 50, ts: T0 };
  let n = 0;
  server.onSubscribe = (ws, msg) => {
    n++;
    ackEcho(ws, msg);
    ws.push({ type: "replay_start", mode: "durable", resume: true });
    ws.push(durable(CH, n, T0 + n));
    if (n === 1) {
      ws.push({ type: "replay_end", count: 1, sent: 1, matched: 1, complete: false, reason: "row_cap", last_seq: null, last_ts: null,
        live_from_seq: 21, mode: "durable", retryable: true, retry_after_ms: 40, resume_ts_hint: T0 + 2, incomplete_channels: [CH2],
        channels: { [CH]: { mode: "durable", sent: 1, complete: true, time_basis: "ingest_time" },
                    [CH2]: { mode: "durable", sent: 0, complete: false, reason: "row_cap", retryable: true, retry_after_ms: 40, truncated_at_ts: T0 + 2, time_basis: "storage_id" } } });
      ws.push({ channel: CH, event: EV, id: "live-21", seq: 21, data: {}, ts: T0 + 100 }); // live right after
      return false;
    }
    ws.push({ type: "replay_end", count: 1, sent: 1, matched: 1, complete: true, reason: null, last_seq: 25, last_ts: T0 + 5,
      live_from_seq: 30, mode: "durable", retryable: false, channels: {} });
    return false;
  };
  const { stream, events } = makeStream(server, { resume });
  const ids = [];
  stream.on("*", (d, evt) => { ids.push(evt.id); });
  stream.subscribe([CH, CH2]);
  await until(() => ids.includes("live-21"), 3000, "live frame");
  assert.deepEqual(stream.getCursor(), resume, "committed cursor stays at the last safe point");
  assert.equal(events.gap[0].reason, "row_cap");
  assert.equal(events.gap[0].permanent, false);
  assert.equal(events.gap[0].retryable, true);
  assert.equal(events.gap[0].retryAfterMs, 40);
  assert.equal(events.gap[0].resumeTsHint, T0 + 2);
  assert.equal(events.gap[0].channels[CH2].time_basis, "storage_id", "per-channel fields pass through");
  assert.equal(stream.getProgress().seq, 21);
  assert.equal(stream.isRecoveryIncomplete(), true);
  // …and the client resumes again on the SAME socket after retry_after_ms, from the hint ts.
  await until(() => server.subscribes.length === 2, 3000, "auto re-resume");
  assert.deepEqual(server.subscribes[1].resume, { instance: "old", seq: 50, ts: T0 + 2 });
  assert.equal(server.sockets.length, 1, "no reconnect was needed");
  await until(() => events.replay.length === 2, 3000, "second replay");
  assert.equal(stream.isRecoveryIncomplete(), false);
  assert.deepEqual(stream.getCursor(), { instance: "inst-A", seq: 25, ts: T0 + 5 });
});

test("final gaps only (retryable:false) are reported once and committed", async () => {
  const server = new FakeServer();
  const resume = { instance: "old", seq: 50, ts: T0 };
  server.onSubscribe = (ws, msg) => {
    ackEcho(ws, msg);
    ws.push({ type: "replay_start", mode: "durable", resume: true });
    ws.push(durable(CH, 1, T0 + 1));
    ws.push({ type: "replay_end", count: 1, sent: 1, matched: 1, complete: false, reason: "not_reconstructable", last_seq: 7, last_ts: T0 + 9,
      live_from_seq: 8, mode: "durable", retryable: false, incomplete_channels: [CH2],
      channels: { [CH]: { mode: "durable", sent: 1, complete: true },
                  [CH2]: { mode: "none", sent: 0, complete: false, gap: "not_reconstructable", cause: "instance_changed" } } });
    return false;
  };
  const { stream, events } = makeStream(server, { resume });
  stream.subscribe([CH, CH2]);
  await until(() => events.gap.length === 1, 2000, "gap");
  assert.equal(events.gap[0].permanent, true);
  assert.equal(events.gap[0].retryable, false);
  // The SDK, not the user, decides to continue — and says so before it does.
  assert.equal(events.gap[0].advancedPastGap, true);
  assert.equal(events.gap[0].source, "auto");
  assert.deepEqual(events.gap[0].skipped.channels, [CH2]);
  assert.deepEqual(events.gap[0].skipped.from, resume);
  assert.deepEqual(events.gap[0].skipped.to, { instance: "inst-A", seq: 7, ts: T0 + 9 });
  assert.deepEqual(stream.getCursor(), { instance: "inst-A", seq: 7, ts: T0 + 9 }, "committed as if complete");
  assert.equal(stream.isRecoveryIncomplete(), false);
  await sleep(80);
  assert.equal(server.subscribes.length, 1, "final gaps are not retried");
  assert.equal(events.gap.length, 1);
});

test("mixed final + retryable gap keeps the committed cursor", async () => {
  const server = new FakeServer();
  const resume = { instance: "old", seq: 50, ts: T0 };
  server.onSubscribe = (ws, msg) => {
    ackEcho(ws, msg);
    ws.push({ type: "replay_start", mode: "durable" });
    ws.push({ type: "replay_end", count: 0, sent: 0, matched: 0, complete: false, reason: "source_busy", last_seq: 9, last_ts: T0 + 9,
      live_from_seq: 10, mode: "durable", retryable: true, retry_after_ms: 10_000,
      channels: { [CH]: { mode: "durable", sent: 0, complete: false, reason: "source_busy", retryable: true, retry_after_ms: 10_000 },
                  [CH2]: { mode: "none", sent: 0, complete: false, gap: "not_reconstructable" } } });
    return false;
  };
  const { stream, events } = makeStream(server, { resume });
  stream.subscribe([CH, CH2]);
  await until(() => events.gap.length === 1, 2000, "gap");
  assert.deepEqual(events.gap[0].reasons, ["source_busy", "not_reconstructable"]);
  assert.equal(events.gap[0].permanent, false, "one transient reason makes the whole resume retryable");
  assert.deepEqual(stream.getCursor(), resume);
  assert.equal(stream.isRecoveryIncomplete(), true);
});

test("late_ingest_possible channel is a transient gap; acceptGap() is the way out", async () => {
  const server = new FakeServer();
  const resume = { instance: "old", seq: 50, ts: T0 };
  server.onSubscribe = (ws, msg) => {
    ackEcho(ws, msg);
    ws.push({ type: "replay_start", mode: "durable" });
    ws.push(durable(CH, 1, T0 + 1));
    ws.push({ type: "replay_end", count: 1, sent: 1, matched: 1, complete: false, reason: "late_ingest_possible", last_seq: null, last_ts: T0 + 1,
      live_from_seq: 3, mode: "durable", retryable: true, retry_after_ms: 10_000,
      channels: { [CH]: { mode: "durable", sent: 1, complete: false, reason: "late_ingest_possible", retryable: true, time_basis: "event_time", late_ingest_possible: true } } });
    return false;
  };
  const { stream, events } = makeStream(server, { resume });
  stream.subscribe([CH]);
  await until(() => events.gap.length === 1, 2000, "gap");
  assert.deepEqual(events.gap[0].reasons, ["late_ingest_possible"]);
  assert.equal(events.gap[0].permanent, false);
  assert.deepEqual(stream.getCursor(), resume);
  const before = events.gap.length;
  stream.acceptGap();
  assert.equal(events.gap.length, before + 1, "the manual advance is reported too");
  assert.equal(events.gap[before].source, "manual");
  assert.equal(events.gap[before].advancedPastGap, true);
  assert.deepEqual(events.gap[before].skipped.from, resume);
  assert.equal(stream.isRecoveryIncomplete(), false);
  assert.equal(stream.getCursor().ts, T0 + 1);
});

test("onUnrecoverableGap stop: keeps the cursor, stops the stream and hands over via fatal", async () => {
  const server = new FakeServer();
  const resume = { instance: "old", seq: 50, ts: T0 };
  server.onSubscribe = (ws, msg) => {
    ackEcho(ws, msg);
    ws.push({ type: "replay_start", mode: "durable" });
    ws.push({ type: "replay_end", count: 0, sent: 0, matched: 0, complete: false, reason: "window_exceeded", last_seq: 9, last_ts: T0 + 9,
      live_from_seq: 10, mode: "durable", retryable: false, limits: { max_age_ms: 3_600_000, max_rows_per_channel: 2000 },
      channels: { [CH]: { mode: "durable", sent: 0, complete: false, reason: "window_exceeded" } } });
    return false;
  };
  const { stream, events } = makeStream(server, { resume, onUnrecoverableGap: "stop" });
  stream.subscribe([CH]);
  await until(() => events.fatal.length === 1, 2000, "fatal");
  assert.equal(events.gap.length, 1);
  assert.equal(events.gap[0].advancedPastGap, false, "strict mode does not skip anything");
  assert.equal(events.gap[0].skipped.to, null);
  assert.deepEqual(events.gap[0].limits, { max_age_ms: 3_600_000, max_rows_per_channel: 2000 });
  assert.equal(events.fatal[0].reason, "unrecoverable gap: window_exceeded");
  assert.equal(events.fatal[0].gap.reason, "window_exceeded");
  assert.deepEqual(stream.getCursor(), resume, "cursor untouched — the caller decides");
  await sleep(80);
  assert.equal(server.sockets.length, 1, "stopped: no reconnect");
  // The caller can take the gap and continue.
  stream.acceptGap();
  assert.equal(stream.isRecoveryIncomplete(), false);
});

test("async replayed handlers: the complete-replay commit waits for them", async () => {
  const server = new FakeServer();
  server.onSubscribe = (ws, msg) => {
    ackEcho(ws, msg);
    ws.push({ type: "replay_start", mode: "durable" });
    ws.push(durable(CH, 1, T0 + 1));
    ws.push({ type: "replay_end", count: 1, sent: 1, matched: 1, complete: true, last_seq: 2, last_ts: T0 + 1, live_from_seq: 3, mode: "durable", retryable: false, channels: {} });
    return false;
  };
  const stream = new Stream({ getToken: async () => ({ token: "t", ws_url: "wss://x" }), WebSocketImpl: server.Impl, resume: { instance: "old", seq: 50, ts: T0 } });
  let release;
  stream.on(EV, () => new Promise((r) => { release = r; }));
  const replays = [];
  stream.on("replay", (x) => replays.push(x));
  stream.subscribe([CH]);
  await until(() => replays.length === 1 && !!release, 2000, "replay");
  assert.deepEqual(stream.getCursor(), { instance: "old", seq: 50, ts: T0 }, "not committed while the replayed handler runs");
  release();
  await until(() => stream.getCursor().instance === "inst-A", 2000, "commit");
  assert.deepEqual(stream.getCursor(), { instance: "inst-A", seq: 2, ts: T0 + 1 });
});

test("channels_revoked removes the channels from the subscription (no re-subscribe loop)", async () => {
  const server = new FakeServer();
  const { stream } = makeStream(server);
  stream.subscribe([CH, CH2]);
  await until(() => server.subscribes.length === 1);
  server.last.push({ type: "warning", code: "channels_revoked", channels: [CH2], revoked: [{ channel: CH2, reason: "requires ULTRA" }] });
  await sleep(10);
  server.last.serverClose(1006);
  await until(() => server.subscribes.length === 2, 3000, "resubscribe");
  assert.deepEqual(server.subscribes[1].channels, [CH]);
});

test("REGRESSION: resume_ts_hint is only used when EVERY incomplete channel is row_cap", async () => {
  const server = new FakeServer();
  const resume = { instance: "old", seq: 50, ts: T0 };
  let n = 0;
  server.onSubscribe = (ws, msg) => {
    n++;
    ackEcho(ws, msg);
    ws.push({ type: "replay_start", mode: "durable" });
    if (n === 1) {
      ws.push(durable(CH, 1, T0 + 1)); // capped channel: rows up to the hint
      ws.push({ type: "replay_end", count: 1, sent: 1, matched: 1, complete: false, reason: "row_cap",
        last_seq: null, last_ts: null, live_from_seq: 9, mode: "durable", retryable: true, retry_after_ms: 30,
        resume_ts_hint: T0 + 2, incomplete_channels: [CH, CH2],
        channels: { [CH]: { mode: "durable", sent: 1, complete: false, reason: "row_cap", retryable: true, truncated_at_ts: T0 + 2 },
                    [CH2]: { mode: "durable", sent: 0, complete: false, reason: "source_error", retryable: true } } });
      return false;
    }
    // The retry must ask from the OLD cursor, so this channel's whole range is still available.
    ws.push(durable(CH2, 1, T0 + 1));
    ws.push(durable(CH, 2, T0 + 3));
    ws.push({ type: "replay_end", count: 2, sent: 2, matched: 2, complete: true, reason: null, last_seq: null,
      last_ts: T0 + 3, live_from_seq: 12, mode: "durable", retryable: false, channels: {} });
    return false;
  };
  const { stream, events } = makeStream(server, { resume });
  const ids = [];
  stream.on("*", (d, evt) => { ids.push(evt.id); });
  stream.subscribe([CH, CH2]);
  await until(() => server.subscribes.length === 2, 3000, "auto re-resume");
  assert.deepEqual(server.subscribes[1].resume, resume, "source_error is not a row_cap: resume from the pre-resume cursor");
  await until(() => events.replay.length === 2, 3000, "second replay");
  assert.ok(ids.includes(CH2 + "-1"), "the source_error channel range is delivered");
  assert.equal(events.gap[0].exhausted, false);
  assert.deepEqual(stream.getCursor(), { instance: "old", seq: 50, ts: T0 + 3 });
});

test("the automatic retry budget runs out visibly (gap.exhausted)", async () => {
  const server = new FakeServer();
  const resume = { instance: "old", seq: 50, ts: T0 };
  server.onSubscribe = (ws, msg) => {
    ackEcho(ws, msg);
    ws.push({ type: "replay_start", mode: "durable" });
    ws.push({ type: "replay_end", count: 0, sent: 0, matched: 0, complete: false, reason: "source_busy", last_seq: null, last_ts: null,
      live_from_seq: 3, mode: "durable", retryable: true, retry_after_ms: 20,
      channels: { [CH]: { mode: "durable", sent: 0, complete: false, reason: "source_busy", retryable: true } } });
    return false;
  };
  const { stream, events } = makeStream(server, { resume, maxResumeRetries: 1 });
  stream.subscribe([CH]);
  await until(() => events.gap.length === 2, 3000, "second gap");
  assert.equal(events.gap[0].exhausted, false);
  assert.equal(events.gap[1].exhausted, true, "no more automatic retries on this connection");
  await sleep(120);
  assert.equal(server.subscribes.length, 2, "it stopped asking");
  assert.deepEqual(stream.getCursor(), resume);
  assert.equal(stream.isRecoveryIncomplete(), true);
});
