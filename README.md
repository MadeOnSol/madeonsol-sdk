# madeonsol

[![npm version](https://img.shields.io/npm/v/madeonsol?style=flat-square)](https://www.npmjs.com/package/madeonsol)
[![npm downloads](https://img.shields.io/npm/dm/madeonsol?style=flat-square)](https://www.npmjs.com/package/madeonsol)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

Official TypeScript/JavaScript SDK for the **[MadeOnSol](https://madeonsol.com) Solana API** — zero dependencies, fully typed, works in Node.js ≥ 18 and edge runtimes.
> Real-time Solana trading intelligence: track 1,000+ KOL wallets with <3s latency, score 6,700+ Pump.fun deployers by reputation, detect multi-KOL coordination signals, and stream every DEX trade across 9+ programs. Free tier: 200 requests/day at [madeonsol.com/pricing](https://madeonsol.com/pricing) — no credit card required.

> **New in 2.6.1** *(2026-05-13)* — **Velocity types fixed.** Velocity fields are now correctly typed as `mc_change_pct`, `volume_usd`, `mev_volume_pct` — each its own object keyed by `5m`/`15m`/`1h`/`2h`/`4h` — to match the actual API response. The 2.6.0 shape (`velocity[window].mc_change_pct`) was wrong; clients reading it would get `undefined`. Patch is type-only — no runtime breaking changes.
>
> **New in 2.6.0** *(2026-05-12)* — **Token directory + self-inspection.** `client.token.list({ min_liq, min_volume_1h_usd, max_mev_share_pct, mc_change_1h_min_pct, sort, ... })` — browse and filter every active mint, with default `min_liq=2000` to skip phantom-MC dust. `client.me()` — read your tier, daily/burst quota state, and per-feature usage in one call (no header parsing). Velocity / MEV-share fields added to every `TokenResponseBody`: `mc_change_pct`, `volume_usd`, `mev_volume_pct` (each keyed by `5m`/`15m`/`1h`/`2h`/`4h`) plus `history_age_seconds` on the parent. `/token/{mint}` 400s now ship `code`, `reason`, `received_length`, `example`, and `docs` URL — stop guessing why a mint failed. Deprecated `avg_entry_mc_usd` / `entry_mc_samples` removed from leaderboard types. All other 2.5.x APIs unchanged.

> **Build Solana trading bots, analytics dashboards, KOL copy-trading tools, deployer sniper bots, and ecosystem browsers.**

## Quick start (10 seconds)

```bash
npm install madeonsol
```

```ts
import { MadeOnSol } from "madeonsol";
const client = new MadeOnSol({ apiKey: "msk_..." }); // free tier at madeonsol.com/pricing
const { trades } = await client.kol.feed({ limit: 5, action: "buy" });
```

| Feature | Description |
|---|---|
| **KOL Tracker** | Real-time trade feed, PnL leaderboard with five time windows (today, 7d, 30d, 90d, 180d), coordination detection, per-wallet profiles, and deep PnL analytics for 1,000+ tracked KOL wallets. **180 days of trade history** retained. |
| **Alpha Wallet Intel** | Leaderboard of 47,000+ scored early-buyer wallets, full wallet profiles, linked-wallet clustering, token cap-table enrichment, and 0–100 buyer quality scores. |
| **Wallet Tracker** | Monitor any Solana wallet for swaps and transfers. Track up to 10/50/100 wallets (Free/Pro/Ultra). Full wallets, counterparties, and tx_signatures on every tier. 120-day event retention. WS events on ULTRA. |
| **Deployer Hunter** | Pump.fun deployer scoring, tier leaderboard, deploy alerts, and bonding intelligence |
| **DEX Trade Stream** | Real-time WebSocket stream of ALL Solana DEX trades — filter by token, wallet, program, or trade size (Ultra) |
| **Webhooks** | Push notifications for KOL trades, coordination signals, deployer alerts, and wallet tracker events (Pro/Ultra) |
| **Tool Directory** | Search 950+ Solana tools and dApps indexed on MadeOnSol |

**Links:** [Full docs](https://madeonsol.com/solana-api) · [Website](https://madeonsol.com) · [API docs](https://madeonsol.com/api-docs)

## Authentication

Get a free API key at [madeonsol.com/pricing](https://madeonsol.com/pricing). Keys start with `msk_`.

---

## Install

```bash
npm install madeonsol
# or
yarn add madeonsol
# or
pnpm add madeonsol
```

Requires **Node.js ≥ 18** (uses native `fetch`). Works out of the box in Cloudflare Workers, Vercel Edge, and Bun.

---

## Quick start

```ts
import { MadeOnSol } from "madeonsol";

const client = new MadeOnSol({ apiKey: "msk_your_api_key_here" });

// Latest KOL buy trades
const { trades } = await client.kol.feed({ limit: 10, action: "buy" });
console.log(trades[0].kol_name, "bought", trades[0].token_symbol);

// Elite deployer leaderboard
const { deployers } = await client.deployer.leaderboard({ tier: "elite" });

// Recent deploy alerts
const { alerts } = await client.deployer.alerts({ limit: 5 });

// Search Solana tools
const { tools } = await client.tools.search({ q: "trading", limit: 10 });
```

---

## Use cases

- **Copy-trading bot** — stream KOL buys via `client.kol.feed()` and mirror trades
- **DEX trade sniping** — subscribe to the all-DEX stream filtered by token or wallet
- **Deployer sniper** — monitor `client.deployer.alerts()` for elite-tier launches
- **Coordination detector** — flag tokens with `client.kol.coordination({ min_kols: 3 })`
- **Scout signal** — track first-KOL-touch events filtered to S/A-tier scouts via `client.kol.firstTouches({ preset: "scout" })`
- **Analytics dashboard** — combine leaderboard, PnL, and tool data
- **Telegram/Discord bot** — pipe alerts via webhooks into chat
- **Portfolio tracker** — use `client.kol.wallet()` to follow specific KOL positions

---

## API Reference

### KOL Tracker — `client.kol`

#### `client.kol.feed(params?)`

Live feed of trades made by tracked KOL wallets.

```ts
const { trades, count } = await client.kol.feed({
  limit: 50,      // 1–100, default 50
  action: "buy",  // "buy" | "sell"
  kol: "7xKX...", // filter by specific wallet
});
```

Returns: `KolFeedResponse` — `{ trades: KolTrade[], count: number }`

Each `KolTrade` includes `market_cap_usd_at_trade` and `price_usd_at_trade` — the token's MC and price at the exact moment the swap fired, sourced from our in-memory price tracker (real-time, faster than Dexscreener spot). Use these to surface "KOL bought $X SOL of token at $Y MC" without a second lookup.

---

#### `client.kol.leaderboard(params?)`

KOL PnL leaderboard ranked by realized profit.

```ts
const { leaderboard, period } = await client.kol.leaderboard({
  period: "7d", // "today" | "7d" | "30d" | "90d" | "180d", default "7d"
});
```

> **180-day retention** — KOL trade data is retained for 180 days (extended from 31 on 2026-04-07). The 90d and 180d windows fill up over time as the trade table accumulates.

Returns: `KolLeaderboardResponse`

---

#### `client.kol.wallet(wallet, params?)`

Full profile for a single KOL wallet, including trade history and optional per-token PnL breakdown.

```ts
const profile = await client.kol.wallet("7xKX...", {
  include: "pnl_by_token",
});
```

Returns: `KolWalletProfile`

---

#### `client.kol.coordination(params?)`

Detect tokens where multiple KOLs are buying simultaneously — a strong signal of coordinated pumps. **v1.1** adds peak-density windows, exit tracking, and a composite 0–100 coordination score.

```ts
const { coordination, score_version, window_minutes } = await client.kol.coordination({
  period: "24h",           // "1h" | "6h" | "24h" | "7d", default "24h"
  min_kols: 3,             // 2–50, default 3
  limit: 20,               // 1–50, default 20
  window_minutes: 15,      // v1.1 — peak-density window in minutes (1–60)
  min_score: 60,           // v1.1 — filter by composite score (0–100)
  include_majors: false,   // v1.1 — include WIF/BONK/POPCAT
});

for (const c of coordination) {
  console.log(c.token_symbol, "score", c.coordination_score, "peak", c.peak_kols, "exited", c.exited_count);
  // c.kols[]: { name, wallet, buy_sol, sell_sol, exited }
}
```

Returns: `KolCoordinationResponse` — `{ coordination: CoordinatedToken[], score_version, window_minutes }`

---

#### `client.coordinationAlerts.*` (v1.1)

Create **real-time push alerts** that fire the moment a new coordination cluster forms. Alerts are evaluated per-trade by the signal-evaluator service (sub-second latency), delivered via WebSocket channel `kol:coordination` and/or HMAC-signed webhook. **PRO: 5 rules, ULTRA: 20 rules.**

```ts
// Create a rule: ≥5 KOLs, 10-min window, score ≥70, webhook delivery
const { rule, webhook_secret } = await client.coordinationAlerts.create({
  name: "strong-clusters",
  min_kols: 5,
  window_minutes: 10,
  min_score: 70,
  include_majors: false,
  cooldown_min: 30,           // don't re-fire same token within 30 min
  score_jump_break: 15,       // UNLESS score jumps by 15+ (catches conviction surges)
  delivery_mode: "webhook",   // "websocket" | "webhook" | "both"
  webhook_url: "https://example.com/coord-hook",
});
// SAVE webhook_secret — used for HMAC-SHA256 signature verification.

await client.coordinationAlerts.list();
await client.coordinationAlerts.get(rule.id);
await client.coordinationAlerts.update(rule.id, { min_score: 80, is_active: false });
await client.coordinationAlerts.delete(rule.id);
```

Webhook signatures: header `X-MadeOnSol-Signature` = `sha256(timestamp + "." + body)` with `webhook_secret` as the HMAC key. Reject deliveries older than ~5 min.

WebSocket delivery: subscribe to channel `kol:coordination` on `wss://madeonsol.com/ws/v1/stream` — events are user-scoped (you only receive your own rule fires).

---

#### `client.kol.firstTouches(params?)` *(new in 2.2)*

Recent first-KOL-touch events on tokens — every time a tracked KOL was the first to buy a given mint. Filterable by **scout tier** (S/A/B/C from the per-KOL `mv_kol_scout_score` view), KOL winrate, token age, mint suffix, etc.

**Backtested signal:** top scouts attract ≥3 follow-on KOLs within 4h ~50% of the time vs ~14% baseline (38d / 491k buys / 72,549 events). The full leaderboard is at [madeonsol.com/kol/scouts](https://madeonsol.com/kol/scouts).

```ts
// S-tier scouts on tokens younger than 1h
const { events } = await client.kol.firstTouches({
  preset: "scout",
  min_scout_tier: "S",
  limit: 20,
});

for (const e of events) {
  console.log(e.first_kol.name, "scouted", e.token_symbol, `(scout_score=${e.first_kol.scout_score}%)`);
}
```

Filter knobs: `since`, `before`, `limit`, `kol`, `min_kol_winrate_7d`, `min_scout_tier`, `min_n_touches`, `strategy`, `token_age_max_min`, `min_first_buy_sol`, `mint_suffix`, `preset` (`"scout"` or `"fresh_launch"`), `include` (e.g. `"followers_4h"`).

> **Don't poll — push.** Median lead time before the second KOL is **12 seconds**, so REST polling will lose the swarm. Subscribe to the `kol:first_touches` WebSocket channel (PRO+) or, on Ultra, create an HMAC-signed webhook subscription via `client.firstTouchSubscriptions.create({...})`.

Returns: `FirstTouchesResponse`

---

#### `client.firstTouchSubscriptions.*` *(Ultra)*

Create push-delivery rules for first-touch events. Up to 10 active subscriptions per Ultra user.

```ts
const { subscription, webhook_secret } = await client.firstTouchSubscriptions.create({
  name: "S-tier scouts on pump tokens",
  filters: { min_scout_tier: "S", mint_suffix: "pump" },
  delivery_mode: "webhook",
  webhook_url: "https://my.bot/hooks/scout",
});
// store webhook_secret — shown once

await client.firstTouchSubscriptions.list();
await client.firstTouchSubscriptions.update(subscription.id, { is_active: false });
await client.firstTouchSubscriptions.delete(subscription.id);
```

Same HMAC scheme as coordination alerts. WebSocket channel: `kol:first_touches`.

---

#### `client.kol.token(mint)`

KOL buy/sell activity for a specific token mint.

```ts
const activity = await client.kol.token("EPjFW...");
```

Returns: `KolTokenActivity`

---

#### `client.kol.pnl(wallet, params?)`

Deep per-wallet PnL breakdown with equity curve, risk metrics, and position history.

```ts
const pnl = await client.kol.pnl("7xKX...", {
  period: "30d", // "7d" | "30d" | "90d" | "180d", default "30d"
});
// All tiers: summary + equity curve + closed positions
// ULTRA: + open positions (tokens bought but not yet sold)
```

Returns: `KolPnlResponse`

---

#### `client.kol.trendingTokens(params?)`

Tokens ranked by KOL buy volume across multiple time windows.

```ts
const { tokens } = await client.kol.trendingTokens({
  period: "1h",    // "5m" | "15m" | "30m" | "1h" | "4h" | "8h" | "12h", default "1h"
  min_kols: 2,     // minimum distinct KOL buyers
  limit: 20,       // 1–50, default 20
});
// Available on all tiers; ULTRA unlocks full KOL wallet addresses per token
```

Returns: `KolTrendingTokensResponse`

---

### Alpha Wallet Intelligence — `client.alpha`

#### `client.alpha.leaderboard(params?)`

Leaderboard of 47,000+ scored early-buyer wallets ranked by win rate, PnL, or ROI.

```ts
const { wallets } = await client.alpha.leaderboard({
  period: "30d",   // "7d" | "30d" | "90d", default "30d"
  sort: "win_rate", // "win_rate" | "pnl" | "roi"
  min_tokens: 5,
  exclude_bots: true,
});
// Up to 100 results on Free/Pro; ULTRA unlocks 500 + bot signals
```

Returns: `AlphaLeaderboardResponse`

---

#### `client.alpha.wallet(wallet)`

Full profile for an alpha wallet including per-token history and bot signals. ULTRA only.

```ts
const profile = await client.alpha.wallet("7xKX...");
```

Returns: `AlphaWalletResponse`

---

#### `client.alpha.linked(wallet)`

Linked-wallet clustering — wallets that co-bought with this address within 2 seconds. ULTRA only.

```ts
const { linked } = await client.alpha.linked("7xKX...");
```

Returns: `AlphaLinkedResponse`

---

#### `client.alpha.capTable(mint)`

First buyers for a token enriched with historical win rates, PnL, and KOL identity. PRO/ULTRA.

```ts
const { buyers } = await client.alpha.capTable("EPjFW...");
```

Returns: `AlphaCapTableResponse`

---

#### `client.alpha.buyerQuality(mint)`

0–100 cohort quality score based on the profile of a token's first buyers. All tiers. 5-minute cache.

```ts
const { score } = await client.alpha.buyerQuality("EPjFW...");
```

Returns: `AlphaBuyerQualityResponse`

---

### Wallet Tracker — `client.walletTracker`

#### `client.walletTracker.watchlist()`

List your tracked wallets and remaining capacity.

```ts
const { wallets, capacity } = await client.walletTracker.watchlist();
// capacity: { used, limit } — Free: 10, Pro: 50, Ultra: 100
```

Returns: `WatchlistResponse`

---

#### `client.walletTracker.addToWatchlist(wallet, params?)`

Add a wallet to your watchlist. Tracking begins immediately.

```ts
await client.walletTracker.addToWatchlist("7xKX...", { label: "whale" });
```

---

#### `client.walletTracker.removeFromWatchlist(wallet)`

Remove a wallet from your watchlist.

```ts
await client.walletTracker.removeFromWatchlist("7xKX...");
```

---

#### `client.walletTracker.updateLabel(wallet, label)`

Update the label for a tracked wallet.

```ts
await client.walletTracker.updateLabel("7xKX...", "smart money");
```

---

#### `client.walletTracker.trades(params?)`

Historical swap and transfer events for your watched wallets. 120-day retention.

```ts
const { events } = await client.walletTracker.trades({
  wallet: "7xKX...",    // filter by specific wallet
  action: "buy",        // "buy" | "sell"
  event_type: "swap",   // "swap" | "transfer"
  limit: 50,
  before: "2026-04-01T00:00:00Z", // ISO 8601 cursor
});
```

Returns: `WalletTrackerTradesResponse`

---

#### `client.walletTracker.summary(params?)`

Per-wallet stats across your watchlist: swap counts, SOL bought/sold, last event time.

```ts
const { wallets } = await client.walletTracker.summary({
  period: "7d",        // "24h" | "7d" | "30d", default "7d"
  wallet: "7xKX...",  // optional: single wallet
});
```

Returns: `WalletTrackerSummaryResponse`

---

### Deployer Hunter — `client.deployer`

#### `client.deployer.stats()`

Global statistics across all tracked deployer wallets.

```ts
const stats = await client.deployer.stats();
console.log(stats.overall_bonding_rate); // e.g. 0.043
```

Returns: `DeployerStats`

---

#### `client.deployer.leaderboard(params?)`

Deployers ranked by bonding rate or recent performance.

```ts
const { deployers } = await client.deployer.leaderboard({
  tier: "elite",          // "elite" | "good" | "moderate" | "rising" | "cold"
  sort: "bonding_rate",   // "bonding_rate" | "recent_bond_rate" | "total_bonded" | "last_deploy_at"
  limit: 20,              // 1–50, default 20
  offset: 0,
});
```

Returns: `DeployerLeaderboardResponse`

---

#### `client.deployer.profile(wallet)`

Full profile for a single deployer wallet.

```ts
const deployer = await client.deployer.profile("3xAB...");
console.log(deployer.tier, deployer.bonding_rate);
```

Returns: `DeployerProfile`

---

#### `client.deployer.tokens(wallet, params?)`

All tokens deployed by a specific wallet.

```ts
const { tokens } = await client.deployer.tokens("3xAB...", {
  limit: 20,
  offset: 0,
});
```

Returns: `DeployerTokensResponse`

---

#### `client.deployer.alerts(params?)`

Real-time deploy alerts — fired when a tracked deployer launches a new token.

```ts
const { alerts } = await client.deployer.alerts({
  since: "2025-01-01T00:00:00Z", // ISO 8601
  limit: 20,
  tier: "elite", // "elite" | "good" | "moderate" | "rising" | "cold"
  offset: 0,
});
```

Returns: `DeployerAlertsResponse`

---

#### `client.deployer.alertStats(params?)`

Aggregated alert statistics by tier.

```ts
const stats = await client.deployer.alertStats({ period: "7d" });
// "7d" | "30d" | "all", default "all"
```

Returns: `DeployerAlertStats`

---

#### `client.deployer.bestTokens(params?)`

Top-performing tokens from tracked deployers by peak market cap.

```ts
const { tokens } = await client.deployer.bestTokens({
  period: "7d", // "7d" | "30d" | "all", default "7d"
  limit: 5,     // 1–20, default 5
});
```

Returns: `BestTokensResponse`

---

#### `client.deployer.recentBonds(params?)`

Most recently bonded tokens from tracked deployers.

```ts
const { bonds } = await client.deployer.recentBonds({ limit: 20 });
```

Returns: `RecentBondsResponse`

---

### Token Intelligence — `client.token`

Per-mint snapshots (price, MC, volume, deployer rep, KOL activity, blacklist flags, **v1.7 velocity windows + MEV-share**) and a filtered directory.

#### `client.token.get(mint)`

Comprehensive per-mint snapshot in one call. **ULTRA** also returns individual KOL wallet addresses in `top_buyers[]`.

```ts
const { token } = await client.token.get("So11111111111111111111111111111111111111112");
console.log(token.price_usd, token.market_cap);
console.log(token.mc_change_pct?.["1h"]);   // v1.7
console.log(token.mev_volume_pct?.["1h"]);  // v1.7
```

Invalid mints return a 400 with `code: "invalid_mint"`, `reason`, `received_length`, `example`, and `docs` URL — no trial and error.

Returns: `TokenResponse` (with `mc_change_pct` / `volume_usd` / `mev_volume_pct` (each keyed by 5m/15m/1h/2h/4h) + `history_age_seconds` as of 1.7)

#### `client.token.batch(mints)`

Batch lookup up to 50 mints in one round-trip. ~10–20× cheaper than N sequential calls.

```ts
const { tokens } = await client.token.batch(["mint1", "mint2", "mint3"]);
```

Returns: `TokenBatchResponse`

#### `client.token.list(params?)` *(new in 2.6 — PRO+)*

Filtered, sortable token directory. Default `min_liq=2000` trims the long tail of phantom-MC tokens from low-liquidity pools; pass `min_liq=0` to opt out.

**Server-side filters** (cheap, indexed): `min_mc`, `max_mc`, `min_liq`, `active_h`, `primary_dex` (`pumpfun`/`pumpswap`/`raydium`/`meteora`/`orca`/`raydium_clmm`), `authority_revoked`, `exclude_token2022`, `min_lp_burnt_pct`.

**Computed post-filters** (over-fetches 3×): `min_volume_1h_usd`, `max_mev_share_pct`, `mc_change_1h_min_pct`, `mc_change_1h_max_pct`. When any of these are set, `pagination.post_filtered` is `true` and page size may be smaller than `limit`.

```ts
// Momentum scanner: liquid mints up >20% in 1h, low bot share
const { tokens, pagination } = await client.token.list({
  min_liq: 10000,
  min_volume_1h_usd: 5000,
  max_mev_share_pct: 60,
  mc_change_1h_min_pct: 20,
  sort: "mc_desc",
  limit: 50,
});

// Cleanest filter for a sane "top by MC" feed
const { tokens } = await client.token.list({
  min_liq: 25000,
  active_h: 1,
  authority_revoked: true,
  sort: "mc_desc",
});
```

Returns: `TokenListResponse` (with `tokens[]`, `pagination`, `filters` echo)

#### `client.token.batchBuyerQuality(mints)`

Batch buyer-quality scoring for up to 50 mints. Shares the same 5-minute LRU cache as `client.alpha.buyerQuality(mint)`.

Returns: `AlphaBuyerQualityBatchResponse`

---

### Account — `client.me()` *(new in 2.6)*

Inspect your tier, quota state, and feature usage in one call. Reads from the same in-memory counters that drive rate-limit enforcement, so `quota.daily.remaining` is authoritative — no header parsing needed. Works on every tier (BASIC/PRO/ULTRA).

```ts
const me = await client.me();
console.log(`${me.tier}: ${me.quota.daily.remaining}/${me.quota.daily.limit} req left today`);
console.log(`Webhooks: ${me.features.webhooks.used}/${me.features.webhooks.limit}`);
console.log(`Copy-trade wallets: ${me.features.copytrade_wallets.used}/${me.features.copytrade_wallets.limit}`);

if (me.quota.daily.remaining < 100) {
  // self-throttle
}
```

Returns: `MeResponse`

---

### Tool Directory — `client.tools`

#### `client.tools.search(params?)`

Search 950+ Solana tools indexed on MadeOnSol.

```ts
const { tools, count } = await client.tools.search({
  q: "trading bot",     // full-text search
  category: "trading",  // category slug filter
  limit: 20,            // 1–50, default 20
});
```

Returns: `ToolsSearchResponse`

---

### WebSocket Streaming — `client.stream`

#### `client.stream.getToken()`

Generate a 24-hour WebSocket streaming token. Pro/Ultra subscribers get `ws_url` for KOL/deployer event streaming. Ultra subscribers also get `dex_ws_url` for the all-DEX trade stream.

```ts
const token = await client.stream.getToken();
console.log(token.ws_url);      // wss://madeonsol.com/ws/v1/stream
console.log(token.dex_ws_url);  // wss://madeonsol.com/ws/v1/dex-stream (Ultra only)
```

Returns: `StreamToken` — `{ token, expires_at, ws_url, dex_ws_url?, usage }`

---

### DEX Firehose (Ultra) — `wss://madeonsol.com/ws/v1/dex-stream`

Real-time trades across **9+ Solana DEX programs** (Pump.fun, PumpAMM, PumpSwap, Raydium AMM/CPMM/CAMM, Jupiter v6, Orca Whirlpool, Meteora DBC/DAMM, LaunchLab/bonk.fun) on a single normalized WebSocket. Server-side filters drop everything you don't care about before it hits your socket.

**Limits:** ULTRA = 2 connections, **10 named subscriptions per connection**, up to **500 trades replay** from in-memory ring buffer. Inbound rate limit: 5 messages/sec (excess emits one error per second).

#### Quick start

```ts
import { WebSocket } from "ws"; // or native WebSocket in browsers/Bun

const { token, dex_ws_url } = await client.stream.getToken();
const ws = new WebSocket(`${dex_ws_url}?token=${token}`);  // token MUST be appended as query param

ws.on("open", () => {
  // Multi-subscription: each sub has its own sub_id and filters
  ws.send(JSON.stringify({
    type: "subscribe",
    sub_id: "fresh-pumpfun",
    replay: 50,                   // backfill up to 500 from ring buffer
    filters: {
      dex: "pumpfun",
      token_age_max_seconds: 300, // first seen in last 5 min
      min_sol: 0.5,
      action: "buy",
    },
  }));
});

ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.channel === "dex:trades") {
    // { sub_id, data: { wallet, mint, action, sol_amount, token_amount, dex, ... }, replay, ts }
    console.log(msg.sub_id, msg.data.dex, msg.data.action, msg.data.sol_amount);
  }
});
```

#### Protocol — client → server

| `type` | Required fields | Notes |
|---|---|---|
| `subscribe` | `sub_id`, `filters` | Optional `replay: 1–500` |
| `update` | `sub_id`, `filters` | Replaces filters in place — no disconnect needed |
| `unsubscribe` | `sub_id` | Or omit `sub_id` to clear all subs |
| `list` | — | Server replies with `{ type: "list", subs: [...] }` |
| `ping` | — | Heartbeat — server replies `{ type: "pong" }` |

#### Server → client message shapes

```ts
{ type: "connected",    tier: "ULTRA", capabilities: { max_subs: 10, max_replay: 500, dex_names: [...], deployer_tiers: [...] } }  // on connect
{ type: "subscribed",   sub_id: "fresh-pumpfun", filters: { ... } }
{ type: "replay_done",  sub_id: "fresh-pumpfun", count: 50 }              // after backfill
{ type: "updated",      sub_id: "fresh-pumpfun", filters: { ... } }
{ type: "unsubscribed", sub_id: "fresh-pumpfun" }
{ type: "list",         subs: [{ sub_id, filters }] }                     // reply to { type: "list" }
{ type: "heartbeat",    ts: 1712160000000 }                               // every 30s
{ type: "error",        sub_id?, message: "..." }
{ channel: "dex:trades", sub_id, data: { ... }, replay: false, ts: 1712160000000 }
```

#### Filter dimensions

At least **one targeting filter** is required (otherwise the firehose would dump every trade). Filters compose with AND semantics.

| Filter | Type | Notes |
|---|---|---|
| `token_mint` / `token_mints` | string / string[] (≤50) | Targeting |
| `wallet` / `wallets` | string / string[] (≤50) | Targeting |
| `dex` | string \| string[] | `pumpfun`, `pumpamm`, `pumpswap`, `raydium`, `jupiter`, `orca`, `meteora`, `launchlab` |
| `program` | string | Raw program ID |
| `deployer_tier` | string \| string[] | `elite`, `good`, `moderate`, `rising`, `cold`, `unranked` (uses Deployer Hunter scoring) |
| `token_age_max_seconds` | number | Only trades on mints first seen within window (uses persisted first-seen table) |
| `market_cap_min_sol` / `market_cap_max_sol` | number | Bounded by current market cap (last trade price × cached supply, 1h TTL) |
| `min_sol` / `max_sol` | number | Trade size bounds |
| `action` | `"buy"` \| `"sell"` | Direction |

**Async filters** (`token_age`, `deployer_tier`, `market_cap`) evaluate against live state and are **skipped on replay**. The first trade for an unseen mint may be skipped while the supply fetch is in flight.

#### Multi-sub example

```ts
ws.send(JSON.stringify({ type: "subscribe", sub_id: "snipers",  filters: { token_age_max_seconds: 60 } }));
ws.send(JSON.stringify({ type: "subscribe", sub_id: "whales",   filters: { min_sol: 50 } }));
ws.send(JSON.stringify({ type: "subscribe", sub_id: "kol-mints", filters: { token_mints: ["EPjF...", "So11..."] } }));

// Tighten the snipers filter without disconnecting
ws.send(JSON.stringify({ type: "update", sub_id: "snipers", filters: { token_age_max_seconds: 30, min_sol: 0.3 } }));

// Drop whales when you're done
ws.send(JSON.stringify({ type: "unsubscribe", sub_id: "whales" }));
```

Each `dex:trades` message echoes the `sub_id` that matched, so you can route them locally without reapplying filter logic client-side.

---

### Webhooks — `client.webhooks`

Manage push notification webhooks for real-time events (Pro: 3, Ultra: 10).

```ts
// Create a webhook
const webhook = await client.webhooks.create({
  url: "https://example.com/hook",
  events: ["kol:trade", "deployer:alert"],
  filters: { min_sol: 1 },
});

// List, update, delete
const { webhooks } = await client.webhooks.list();
await client.webhooks.update(webhook.id, { status: "paused" });
await client.webhooks.delete(webhook.id);
await client.webhooks.test(webhook.id);
```

---

## Error handling

All methods throw `MadeOnSolError` on non-2xx responses.

```ts
import { MadeOnSol, MadeOnSolError } from "madeonsol";

try {
  const profile = await client.kol.wallet("invalid-wallet");
} catch (err) {
  if (err instanceof MadeOnSolError) {
    console.error(err.message);   // human-readable message
    console.error(err.status);    // HTTP status code, e.g. 404
    console.error(err.body);      // raw response body
  }
}
```

---

## Exported types

All types are exported from the main entry point:

```ts
import type {
  // Errors
  MadeOnSolError,

  // KOL
  KolTrade,
  KolFeedParams,
  KolFeedResponse,
  KolLeaderboardParams,
  KolLeaderboardResponse,
  KolLeaderboardEntry,
  KolWalletParams,
  KolWalletProfile,
  KolCoordinationParams,
  KolCoordinationResponse,
  CoordinatedToken,
  KolTokenActivity,
  KolPnlByToken,

  // Deployer
  DeployerStats,
  DeployerLeaderboardParams,
  DeployerLeaderboardResponse,
  DeployerLeaderboardEntry,
  DeployerProfile,
  DeployerToken,
  DeployerTokensParams,
  DeployerTokensResponse,
  DeployerAlertsParams,
  DeployerAlertsResponse,
  DeployerAlert,
  DeployerAlertStatsParams,
  DeployerAlertStats,
  BestTokensParams,
  BestTokensResponse,
  BestToken,
  RecentBondsParams,
  RecentBondsResponse,
  RecentBond,

  // Tools
  ToolsSearchParams,
  ToolsSearchResponse,
  Tool,

  // KOL PnL & Trending
  KolPnlResponse,
  KolTrendingTokensResponse,
  TrendingToken,

  // Alpha Wallet Intelligence
  AlphaWalletEntry,
  AlphaLeaderboardResponse,
  AlphaWalletResponse,
  AlphaLinkedResponse,
  AlphaCapTableResponse,
  AlphaBuyerQualityResponse,

  // Wallet Tracker
  WalletEntry,
  WatchlistResponse,
  WalletTrackerEvent,
  WalletTrackerTradesResponse,
  WalletTrackerSummaryResponse,

  // Streaming
  StreamToken,

  // Webhooks
  Webhook,
  WebhookCreateParams,
  WebhookUpdateParams,
  WebhookListResponse,

  // Enums / unions
  KolAction,
  LeaderboardPeriod,
  CoordinationPeriod,
  DeployerTier,
  DeployerSortField,
  AlertPeriod,
  BestTokensPeriod,
} from "madeonsol";
```

---

## Related

- [MadeOnSol website](https://madeonsol.com) — Browse 950+ Solana tools
- [API documentation](https://madeonsol.com/api-docs) — Interactive endpoint reference
- [MadeOnSol on GitHub](https://github.com/LamboPoewert/madeonsol) — Main project repository

## Also Available

| Platform | Package |
|---|---|
| Rust | [`madeonsol`](https://crates.io/crates/madeonsol) on crates.io |
| Python (LangChain, CrewAI) | [`madeonsol-x402`](https://pypi.org/project/madeonsol-x402/) on PyPI |
| MCP Server (Claude, Cursor) | [`mcp-server-madeonsol`](https://www.npmjs.com/package/mcp-server-madeonsol) |
| ElizaOS | [`@madeonsol/plugin-madeonsol`](https://www.npmjs.com/package/@madeonsol/plugin-madeonsol) |
| Solana Agent Kit | [`solana-agent-kit-plugin-madeonsol`](https://www.npmjs.com/package/solana-agent-kit-plugin-madeonsol) |

---

## License

MIT © [MadeOnSol](https://madeonsol.com)
