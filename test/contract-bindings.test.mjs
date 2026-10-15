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

test("early sniper responses retain action identity, nulls and decimal fees on both routes", async () => {
  const deploy = { event_id: "solana:S:1:create", observation_stage: "observed", execution_status: "unknown",
    transaction_version: 1, fee_payer: null, transaction_config: { config_mask: 1, priority_fee_lamports: "18446744073709551615", compute_unit_limit: null, loaded_accounts_data_size_limit: null, heap_size: null } };
  nextBody = { deploys: [deploy], count: 1, data_age_seconds: null };
  assert.deepEqual(await client().sniper.recent(), nextBody);
  assert.equal(calls.at(-1).url.pathname, "/api/v1/sniper/recent");
  nextBody = { deployer: "D", deploys: [deploy], count: 1 };
  assert.deepEqual(await client().sniper.byDeployer("D"), nextBody);
  assert.equal(calls.at(-1).url.pathname, "/api/v1/sniper/by-deployer/D");
});

test("stream discovery preserves activated early-stream metadata and its absence", async () => {
  nextBody = { token: "T", ws_url: "wss://old", early_ws_url: "wss://early", early_stream: {
    channels: ["early:deploys"], subscribe_example: { type: "subscribe", channels: ["early:deploys"] }, execution_status: "unknown", note: "Observed intent" } };
  assert.deepEqual(await client().stream.getToken(), nextBody);
  assert.equal(calls.at(-1).method, "POST");
  assert.equal(calls.at(-1).url.pathname, "/api/v1/stream/token");
  nextBody = { token: "T", ws_url: "wss://old" };
  assert.equal((await client().stream.getToken()).early_stream, undefined);
});

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


test("kol.tokenTrades → GET /kol/tokens/{mint}/trades with limit/action/kol/since/cursor", async () => {
  nextBody = { token_mint: "M", trades: [{ id: "u", kol_name: null, kol_twitter: null, wallet: "W", action: "buy", sol_amount: 1.5, token_amount: null,
    price_usd_at_trade: null, market_cap_usd_at_trade: null, tx_signature: "S", traded_at: "2026-10-15T00:00:00Z" }],
    count: 1, kols_on_page: 1, next_cursor: "c2", has_more: true };
  const r = await client().kol.tokenTrades("M", { limit: 50, action: "sell", kol: "W", since: "2026-10-01T00:00:00Z", cursor: "c1" });
  const c = calls[0];
  assert.equal(c.method, "GET");
  assert.equal(c.url.pathname, "/api/v1/kol/tokens/M/trades");
  assert.equal(c.url.searchParams.get("limit"), "50");
  assert.equal(c.url.searchParams.get("action"), "sell");
  assert.equal(c.url.searchParams.get("kol"), "W");
  assert.equal(c.url.searchParams.get("since"), "2026-10-01T00:00:00Z");
  assert.equal(c.url.searchParams.get("cursor"), "c1");
  assert.deepEqual(r, nextBody);
});

test("alpha.bundles → GET /tokens/{mint}/bundles with window/min_wallets/limit/include_balances", async () => {
  nextBody = { mint: "M", window: "6h", min_wallets: 4, launch_at: null,
    summary: { cluster_count: 0, launch_clusters: 0, later_clusters: 0, latest_cluster_at: null, largest_cluster_wallets: 0, baseline: null },
    clusters: [], exit_tracking: "ok" };
  const r = await client().alpha.bundles("M", { window: "6h", min_wallets: 4, limit: 10, include_balances: true });
  const c = calls[0];
  assert.equal(c.method, "GET");
  assert.equal(c.url.pathname, "/api/v1/tokens/M/bundles");
  assert.equal(c.url.searchParams.get("window"), "6h");
  assert.equal(c.url.searchParams.get("min_wallets"), "4");
  assert.equal(c.url.searchParams.get("limit"), "10");
  assert.equal(c.url.searchParams.get("include_balances"), "true");
  assert.deepEqual(r, nextBody);
  await client().alpha.bundles("M");
  assert.equal(calls[1].url.search, "");
});

test("alpha.bundleShare → GET /tokens/{mint}/bundle-share with window/min_wallets; null share passes through", async () => {
  nextBody = { mint: "M", window: "1h", min_wallets: 3, bundled_pct_of_supply_now: null, scope: "launch_cohort_only", clusters_status: "unavailable",
    wallets: { total: 2, launch_cohort_wallets: 2, cluster_wallets: 0, overlap: 0, clusters_counted: 0, verified: 1, holding: 1, max: 60 },
    held_now: { complete: false, incomplete_reason: "rpc_error" }, as_of: "2026-10-15T00:00:00Z" };
  const r = await client().alpha.bundleShare("M", { window: "1h", min_wallets: 3 });
  const c = calls[0];
  assert.equal(c.method, "GET");
  assert.equal(c.url.pathname, "/api/v1/tokens/M/bundle-share");
  assert.equal(c.url.searchParams.get("window"), "1h");
  assert.equal(c.url.searchParams.get("min_wallets"), "3");
  assert.equal(r.bundled_pct_of_supply_now, null);
  assert.deepEqual(r, nextBody);
});

test("opt-in balance / flag params reach the query string", async () => {
  const c = client();
  await c.alpha.bundle("M", { include_balances: true });
  await c.alpha.buyerQuality("M", { include_balances: true });
  await c.alpha.capTable("M", { limit: 20, verify_current_balances: true, include_scout_scores: true });
  await c.alpha.holders("M", { include_wallet_flags: true });
  await c.deployer.tokens("D", { include_launches_24h: true, only_bonded: true });
  await c.token.topTraders("M", { offset: 25 });
  assert.equal(calls[0].url.pathname, "/api/v1/tokens/M/bundle");
  assert.equal(calls[0].url.searchParams.get("include_balances"), "true");
  assert.equal(calls[1].url.pathname, "/api/v1/tokens/M/buyer-quality");
  assert.equal(calls[1].url.searchParams.get("include_balances"), "true");
  assert.equal(calls[2].url.pathname, "/api/v1/tokens/M/cap-table");
  assert.equal(calls[2].url.searchParams.get("verify_current_balances"), "true");
  assert.equal(calls[2].url.searchParams.get("include_scout_scores"), "true");
  assert.equal(calls[2].url.searchParams.get("limit"), "20");
  assert.equal(calls[3].url.pathname, "/api/v1/tokens/M/holders");
  assert.equal(calls[3].url.searchParams.get("include_wallet_flags"), "true");
  assert.equal(calls[4].url.pathname, "/api/v1/deployer-hunter/D/tokens");
  assert.equal(calls[4].url.searchParams.get("include_launches_24h"), "true");
  assert.equal(calls[4].url.searchParams.get("only_bonded"), "true");
  assert.equal(calls[5].url.searchParams.get("offset"), "25");
  // no opt-in → no query string (unchanged default requests)
  await c.alpha.bundle("M");
  await c.alpha.holders("M");
  assert.equal(calls[6].url.search, "");
  assert.equal(calls[7].url.search, "");
});
