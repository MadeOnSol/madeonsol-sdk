// Offline tests for the contract-parity bindings (sdk-contract/ drift burn-down):
// every new method hits the right method + path + query/body, and a route-shaped
// sample body comes back untouched. No network, no key. The response shapes are
// type-checked separately in test/contract-types.ts (`npm test` runs tsc on it).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { MadeOnSol } from "../dist/index.js";

const BASE = "https://madeonsol.com/api/v1";
let calls;
let nextBody;
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  nextBody = {};
  globalThis.fetch = async (url, init) => {
    calls.push({ url: new URL(url), method: init?.method ?? "GET", body: init?.body ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify(nextBody), { status: 200, headers: { "content-type": "application/json" } });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const client = () => new MadeOnSol({ apiKey: "msk_test" });

test("kol.wallets → GET /kol/wallets with filters", async () => {
  nextBody = {
    wallets: [{ wallet_address: "W1", name: "a", twitter_url: null, avatar_url: null, strategy_tag: null, twitter_followers: null, follow_count: 0, is_active: true, tracked_since: null }],
    count: 1, total: 1, limit: 200, offset: 0, has_more: false,
  };
  const r = await client().kol.wallets({ limit: 200, active: "all", q: "ans" });
  const c = calls[0];
  assert.equal(c.method, "GET");
  assert.equal(c.url.pathname, "/api/v1/kol/wallets");
  assert.equal(c.url.searchParams.get("active"), "all");
  assert.equal(c.url.searchParams.get("q"), "ans");
  assert.deepEqual(r, nextBody);
});

test("token.search → GET /tokens/search?q=&limit=", async () => {
  nextBody = { q: "bonk", count: 0, results: [], note: "No token in our universe matches" };
  await client().token.search({ q: "bonk", limit: 5 });
  assert.equal(calls[0].url.pathname, "/api/v1/tokens/search");
  assert.equal(calls[0].url.searchParams.get("q"), "bonk");
  assert.equal(calls[0].url.searchParams.get("limit"), "5");
});

test("token.get include: array is comma-joined, absent include sends no query", async () => {
  await client().token.get("MINT", { include: ["buyer_quality", "deployer"] });
  await client().token.get("MINT");
  assert.equal(calls[0].url.pathname, "/api/v1/token/MINT");
  assert.equal(calls[0].url.searchParams.get("include"), "buyer_quality,deployer");
  assert.equal(calls[1].url.search, "");
});

test("listSignals / getSignalPerformance(history) / manifests", async () => {
  const c = client();
  await c.listSignals();
  await c.getSignalPerformance("dump_cluster_count", { history: true });
  await c.manifests({ dataset: "token_trades", limit: 7 });
  assert.equal(calls[0].url.href, `${BASE}/signals`);
  assert.equal(calls[1].url.pathname, "/api/v1/signals/dump_cluster_count/performance");
  assert.equal(calls[1].url.searchParams.get("history"), "true");
  assert.equal(calls[2].url.pathname, "/api/v1/manifests");
  assert.equal(calls[2].url.searchParams.get("dataset"), "token_trades");
  assert.equal(calls[2].url.searchParams.get("limit"), "7");
});

test("wallet.flags → GET /wallet/{address}/flags with as_of + history", async () => {
  nextBody = { wallet: "W", as_of: "2026-09-01T00:00:00.000Z", flagged: [], sources: { deployer: null, alpha: null, dump_cluster: null, kol: null, sniper: null, bundler: null }, note: "n" };
  const r = await client().wallet.flags("W/x", { as_of: "2026-09-01T00:00:00Z", history: true });
  assert.equal(calls[0].url.pathname, "/api/v1/wallet/W%2Fx/flags");
  assert.equal(calls[0].url.searchParams.get("history"), "true");
  assert.equal(r.sources.deployer, null);
});

test("wallet.batchTrades → POST /wallet/batch/trades with the body as given", async () => {
  nextBody = { wallets: [{ wallet: "A", count: 0, trades: [] }], since: 1, next_since: 1, limit_per_wallet: 20, coverage: { history_start_days: 90, scope: "s", note: "n" } };
  const r = await client().wallet.batchTrades({ wallets: ["A", "B"], since: 1, limit_per_wallet: 20, action: "buy" });
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url.href, `${BASE}/wallet/batch/trades`);
  assert.deepEqual(calls[0].body, { wallets: ["A", "B"], since: 1, limit_per_wallet: 20, action: "buy" });
  assert.equal(r.next_since, 1);
});

test("wallet.funding → GET /wallet/{address}/funding?limit=&offset=", async () => {
  await client().wallet.funding("W", { limit: 5, offset: 10 });
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].url.pathname, "/api/v1/wallet/W/funding");
  assert.equal(calls[0].url.searchParams.get("limit"), "5");
  assert.equal(calls[0].url.searchParams.get("offset"), "10");
});

test("wallet.scoreList → POST /wallet-list/score { wallets }", async () => {
  await client().wallet.scoreList(["A"]);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url.href, `${BASE}/wallet-list/score`);
  assert.deepEqual(calls[0].body, { wallets: ["A"] });
});

test("kol.scoutLeaderboard / coordinationHistory paths unchanged", async () => {
  const c = client();
  await c.kol.scoutLeaderboard({ limit: 5 });
  await c.kol.coordinationHistory({ limit: 5 });
  assert.equal(calls[0].url.pathname, "/api/v1/kol/scouts/leaderboard");
  assert.equal(calls[1].url.pathname, "/api/v1/kol/coordination/history");
});

test("deployer.deployerActivity → GET /deployer-hunter/{wallet}/activity with limit/cursor/since/types", async () => {
  nextBody = { wallet: "W", is_deployer: true, events: [], pagination: { next_cursor: null, has_more: false } };
  const r = await client().deployer.deployerActivity("W", { limit: 200, cursor: "abc", since: "2026-09-01T00:00:00Z", types: "launch,dev_sell" });
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].url.pathname, "/api/v1/deployer-hunter/W/activity");
  assert.equal(calls[0].url.searchParams.get("limit"), "200");
  assert.equal(calls[0].url.searchParams.get("cursor"), "abc");
  assert.equal(calls[0].url.searchParams.get("since"), "2026-09-01T00:00:00Z");
  assert.equal(calls[0].url.searchParams.get("types"), "launch,dev_sell");
  assert.equal(r.is_deployer, true);
});

