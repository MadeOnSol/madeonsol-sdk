// Offline tests for the WebSocket stream client: cursor tracking, v1 resume,
// legacy replay fallback, id dedup, gap reporting and close-code handling.
// Uses an in-memory fake WebSocket + scripted server (no network, no key).
// The SAME file runs in madeonsol-x402, robinhood-chain-x402, madeonsol and
// robinhood-chain-sdk — keep the copies identical.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as mod from "../dist/stream.js";

const Stream = mod.MadeOnSolStream ?? mod.RobinhoodChainStream ?? mod.RobinhoodStream;
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

/**
 * Scripted server. mode "v1" answers `resume` per the Phase 1 contract;
 * mode "legacy" is today's server (ignores `resume`, honours replay_since_*).
 */
class FakeServer {
  constructor({ mode = "v1", instance = "inst-A", echoResume = false } = {}) {
    this.mode = mode;
    this.instance = instance;
    this.echoResume = echoResume;
    this.ring = [];      // frames the server "remembers"
    this.seq = 0;
    this.sockets = [];
    this.subscribes = [];
    this.v1Result = null; // override the replay_end of the next v1 resume
    this.onSubscribe = null;
    const server = this;
    this.Impl = class FakeWS {
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
      if (this.echoResume && msg.resume) ack.resume = msg.resume;
      ws.push(ack);
      if (msg.resume) {
        const r = msg.resume;
        const same = r.instance === this.instance;
        const out = this.ring.filter((f) => (same ? f.seq > r.seq : f.ts > r.ts));
        ws.push({ type: "replay_start", ts: Date.now() });
        for (const f of out) ws.push({ ...f, replayed: true });
        ws.push(this.v1Result ?? {
          type: "replay_end", sent: out.length, matched: out.length, complete: true, reason: null,
          last_seq: this.seq, live_from_seq: this.seq + 1,
          channels: { [CH]: { mode: same ? "ring" : "durable", sent: out.length, complete: true } }, ts: Date.now(),
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
  assert.deepEqual(got.map((g) => g.seq), [7, 1]);
  assert.deepEqual(stream.getCursor(), { instance: "inst-B", seq: 1, ts: 2_000_000 });
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

test("v1 server: resume echo on the ack skips detection; instance change uses the cursor ts", async () => {
  const server = new FakeServer({ echoResume: true });
  const { stream, got, events } = makeStream(server, { resume: { instance: "old", seq: 50, ts: 1_000_010 } });
  server.frame({ seq: 11 }); // ts 1_000_011 > cursor ts → durable-backfilled
  stream.subscribe([CH]);
  await until(() => events.replay.length === 1, 3000, "replay");
  assert.deepEqual(server.subscribes[0].resume, { instance: "old", seq: 50, ts: 1_000_010 }, "constructor resume option is used");
  assert.equal(server.subscribes.length, 1, "no legacy fallback against a v1 server");
  assert.deepEqual(got.map((g) => g.seq), [11]);
  assert.deepEqual(stream.getCursor(), { instance: "inst-A", seq: 11, ts: 1_000_011 });
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
