# madeonsol

[![npm version](https://img.shields.io/npm/v/madeonsol?style=flat-square)](https://www.npmjs.com/package/madeonsol)
[![npm downloads](https://img.shields.io/npm/dm/madeonsol?style=flat-square)](https://www.npmjs.com/package/madeonsol)
[![GitHub stars](https://img.shields.io/github/stars/madeonsol/madeonsol-sdk?style=flat-square&logo=github)](https://github.com/madeonsol/madeonsol-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> ⭐ **[Star on GitHub](https://github.com/madeonsol/madeonsol-sdk)** if you find this useful · 📂 **[Examples](./examples/)** · 📚 **[API docs](https://madeonsol.com/api-docs)**

Official TypeScript/JavaScript SDK for the **[MadeOnSol](https://madeonsol.com) Solana API** — zero dependencies, fully typed, works in Node.js ≥ 18 and edge runtimes.
> Real-time Solana trading intelligence: track 1,069 KOL wallets with <3s latency, score 23,000+ Pump.fun deployers, surface deshred deploy signals **~500ms before on-chain confirmation**, detect multi-KOL coordination, score token rug-risk 0–100 with a transparent factor breakdown, expose the bundle cohort that bought a token together and how much of supply it still holds, push every pump.fun graduation the second it bonds, and stream every DEX trade across 9+ programs. Free tier: 200 requests/day at [madeonsol.com/pricing](https://madeonsol.com/pricing) — no credit card required.

> **New in 2.18.0** — **Bundle cohort intelligence.** `client.alpha.bundle(mint)` (`GET /tokens/{mint}/bundle`) surfaces the wallets that bought a token together — in one atomic transaction (`bundle_kind: "atomic_tx"`) or the same slot (`"same_slot"`) — and, headline first, how much of supply they still hold. The `bundle` summary block (returned on every tier) carries `held_pct_of_supply` (0–1 of total supply, HEADLINE), `bundle_kind`, `wallet_count`, `held_ratio`, `fully_exited`, `buy_volume`, and `tokens_held`. **Tier-gated:** BASIC/TRADER get the `bundle` block only (`wallets: []`); PRO adds the top-10 cohort wallets with flags (`held_ratio`, `has_sold`, `atomic`, `is_kol`); ULTRA returns the full cohort plus identity (`kol_name`, `win_rate`, `bot_confidence`) and per-wallet `tokens_held`. New types: `TokenBundleResponse`, `BundleSummary`, `BundleWallet`, `BundleKind`.
>
> **New in 2.17.0** — **Batch risk scoring + live stream-session control.** `client.token.batchRisk(mints)` (`POST /tokens/batch/risk`, up to 50 mints, **counts as 1 request**) returns the same transparent 0–100 rug-risk result as `client.alpha.risk(mint)` for each mint (with `as_of`); untracked mints come back as `{ mint, error: "not_tracked" }` without failing the batch. `client.stream.sessions()` lists your live WebSocket sessions (`ws-streaming` + `dex-stream`) and `client.stream.deleteSession(id)` force-closes one to free a slot a ghost socket is holding. **PRO/ULTRA only.** New types: `TokenRiskBatchResponse`, `TokenRiskBatchItem`, `TokenRiskBatchError`, `StreamSession`, `StreamSessionsResponse`, `StreamSessionEvictResponse`.
>
> **New in 2.16.0** — **Almost-bonded discovery + trending sorts.** `client.token.almostBonded({ min_progress, min_velocity_pct_per_min, deployer_tier, sort, limit })` — pre-bond pump.fun tokens near graduation, ranked by velocity (Δprogress/min): "95% and accelerating" beats "92% stalled". Each token carries `progress_pct`, `velocity_pct_per_min`, `eta_minutes`, `stalled`, `real_sol_reserves`, `market_cap_usd`, `liquidity_usd`, `authorities_revoked`, `deployer_tier`, and `age_minutes`. **PRO/ULTRA only.** New types: `AlmostBondedParams`, `AlmostBondedToken`, `AlmostBondedResponse`, `AlmostBondedSort`. Plus `client.token.list({ sort })` gains four momentum sorts — `mc_change_5m_desc`, `mc_change_1h_desc`, `volume_1h_desc`, and `trending` (composite recent-volume × positive-momentum rank).
>
> **New in 2.15.0** — **Token flow + deployer SOL balance.** `client.alpha.tokenFlow(mint, { window })` (`GET /tokens/{mint}/flow`, `window` `1h` default or `24h`, **PRO+**) returns aggregated buy/sell flow for a token: `unique_wallets`/`unique_buyers`/`unique_sellers`, `buy_count`/`sell_count`/`total_trades`, `buy_sol`/`sell_sol`/`net_sol` (buy − sell), and `trades_per_wallet`, plus the window `from` timestamp. New types: `TokenFlowResponse`, `TokenFlowParams`, `TokenFlowWindow`. Deployer-alert objects (`DeployerAlert`) now also carry `deployer_sol_balance` (the deployer wallet's SOL balance at alert time, `number | null`).
>
> **New in 2.14.0** — **OHLCV candles + net flow.** `client.alpha.candles(mint, { tf, limit, from, to })` returns the persisted price/MC trajectory as candlesticks (`1m`/`5m`/`15m`/`1h`/`4h`/`1d`, rolled up on read). **PRO**: OHLCV (`open`/`high`/`low`/`close`/`volume_usd`/`trades`/`market_cap_usd`), last 30 days. **ULTRA**: adds per-bar net flow (`buy_volume_usd`/`sell_volume_usd`/`net_volume_usd`, `buy_count`/`sell_count`, `volume_mev_usd`), liquidity delta (`open_liquidity_usd`/`close_liquidity_usd`) and full history — `net_flow_included` flags which set you got. New types: `Candle`, `CandlesResponse`, `CandlesParams`, `CandleTimeframe`.
>
> **New in 2.13.0** — **Token risk score.** `client.alpha.risk(mint)` returns a transparent 0–100 rug-risk/safety score (higher = riskier) for any token: a `band` (`safe`/`caution`/`danger`), an explainable `factors[]` array (each with `key`, `label`, `status`, `points`, `detail`) that sums into the score, and the raw `inputs` it was computed from — mint/freeze authority revocation, liquidity USD + liquidity-to-MC ratio, transfer fee bps, Token-2022 flag, burn detection, launch cohort (SOL + size), deployer bond rate + total deployed, KOL signal, and blacklist status. Plus `score_version` and `as_of`. **PRO/ULTRA only.** New types: `TokenRiskResponse`, `TokenRiskFactor`, `TokenRiskInputs`, `TokenRiskBand`, `TokenRiskStatus`.
>
> **New in 2.12.0** — **Launch cohort, liquidity/MC ratio, deployer tier filter, KOL hold stats, and signal performance.** `TokenResponseBody` (single + batch) gains `liquidity_to_mc_ratio`, `launch_cohort_sol`, and `launch_cohort_size`. `client.token.list()` adds `min_liq_mc_ratio`, `max_liq_mc_ratio`, and `deployer_tier` filter params; list items gain `liquidity_to_mc_ratio` and `deployer_tier`. `KolLeaderboardEntry` gains `median_hold_minutes_30d` and `percentile_early_entry_30d`. New top-level method `client.getSignalPerformance(name)` calls `GET /signals/{name}/performance`.
>
> **New in 2.11.1** — **Deployer runner-rate fields.** Sniper deploys, deployer alerts/profiles, and leaderboard rows now carry `runner_rate` (fraction of the deployer's labeled tokens that ran — peak ≥60min after deploy — vs dumped) and `labeled_tokens` (confidence denominator; gate on ≥3).
>
> **New in 2.11** — **Graduation events + dump-cluster detection.** Subscribe `token:graduations` for every pump.fun bond in real time — tracked deployer or not — with typed `GraduationEvent` payloads (mint, deployer tier, time-to-bond, MC at bond). Buyer-quality `breakdown` adds `dump_cluster_count` (out-of-sample validated: 3+ such wallets in the first-20 → 94% dump vs 61% base) and `recycled_early_buyer_count` (high count with zero cluster leans runner). DEX firehose: replay buffer deepened to ~5 minutes; mint-scoped subs now receive in-band `dex:graduations` frames — the bond lands on the same connection as your position's trade flow.

> **New in 2.9** — **Deshred Sniper Alerts.** `client.sniper.recent()` surfaces new pump.fun deploys reconstructed from shred-level data ~500ms before the chain confirms them — a measured head start over any confirmed-stream feed. PRO sees elite/good deployers; ULTRA sees every tier and maintains a custom deployer watchlist (`client.sniper.addToWatchlist()`). Use the `sniper:deploys` WebSocket channel or `sniper:deploy` webhook for live push instead of polling.
>
> **New in 2.8** — **Price alerts, scout leaderboard, wallet derived stats.** `client.priceAlerts.*` — CRUD for token MC dip/recovery alerts delivered via webhook or WebSocket (PRO=5, ULTRA=25). `client.kol.scoutLeaderboard()` — top scouts ranked by first-touch follow-on rate. `client.kol.coordinationHistory()` and `client.token.peakHistory()` expose the historical record. `client.wallet.stats()` now returns a `derived` block: `win_rate`, `roi`, `verdict`, and `biggest_miss`.
>
> **New in 2.7** — **Universal Wallet API.** `client.wallet.stats()`, `client.wallet.pnl()`, `client.wallet.positions()`, `client.wallet.trades()` — FIFO cost-basis PnL, open positions hydrated with live prices, and cursor-paginated raw trades for **any** Solana wallet (not just curated KOLs). PRO+. Server-side cache (5min/1h/24h based on activity) — cache hits don't count against your quota.
>
> **New in 2.6.1** *(2026-05-13)* — **Velocity types fixed.** Velocity fields are now correctly typed as `mc_change_pct`, `volume_usd`, `mev_volume_pct` — each its own object keyed by `5m`/`15m`/`1h`/`2h`/`4h` — to match the actual API response. The 2.6.0 shape (`velocity[window].mc_change_pct`) was wrong; clients reading it would get `undefined`. Patch is type-only — no runtime breaking changes.
>
> **New in 2.6.0** *(2026-05-12)* — **Token directory + self-inspection.** `client.token.list({ min_liq, min_volume_1h_usd, max_mev_share_pct, mc_change_1h_min_pct, sort, ... })` — browse and filter every active mint, with default `min_liq=2000` to skip phantom-MC dust. `client.me()` — read your tier, daily/burst quota state, and per-feature usage in one call (no header parsing). Velocity / MEV-share fields added to every `TokenResponseBody`: `mc_change_pct`, `volume_usd`, `mev_volume_pct` (each keyed by `5m`/`15m`/`1h`/`2h`/`4h`) plus `history_age_seconds` on the parent. `/token/{mint}` 400s now ship `code`, `reason`, `received_length`, `example`, and `docs` URL — stop guessing why a mint failed. Deprecated `avg_entry_mc_usd` / `entry_mc_samples` removed from leaderboard types. All other 2.5.x APIs unchanged.

> **Build Solana trading bots, analytics dashboards, KOL copy-trading tools, deshred sniper bots, and ecosystem browsers.**

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
| **KOL Tracker** | Real-time trade feed, PnL leaderboard with five time windows (today, 7d, 30d, 90d, 180d), coordination detection, per-wallet profiles, and deep PnL analytics for 1,069 tracked KOL wallets. **180 days of trade history** retained. |
| **Deshred Sniper** | Deploy feed reconstructed from shred-level data — surfaces new pump.fun launches **~500ms before on-chain confirmation**. PRO: elite/good deployers. ULTRA: all tiers + custom watchlist. Use WebSocket/webhook for live push. |
| **Alpha Wallet Intel** | Leaderboard of 1M+ scored early-buyer wallets, full wallet profiles, linked-wallet clustering, token cap-table enrichment, and 0–100 buyer quality scores with dump-cluster wallet detection. |
| **Token Risk Score** | Transparent 0–100 rug-risk/safety score per token with a `safe`/`caution`/`danger` band, explainable factor breakdown, and the raw inputs (authorities, liquidity, transfer fee, launch cohort, deployer bond rate, KOL signal, blacklist). PRO/ULTRA. |
| **Bundle Cohort** | The wallets that bought a token together (one atomic tx or the same slot) and — headline first — `held_pct_of_supply` still held, plus `held_ratio`, `fully_exited`, and buy volume. Every tier gets the summary; PRO adds top-10 wallet flags; ULTRA adds KOL identity, win rate, bot confidence, and per-wallet balances. |
| **Universal Wallet** | FIFO cost-basis PnL, open positions (hydrated with live prices), and raw trade history for **any** Solana wallet — not just curated KOLs. 90-day window, server-side cache. PRO+. |
| **Price Alerts** | Token MC dip/recovery alerts delivered via WebSocket or HMAC-signed webhook. PRO: 5 rules, ULTRA: 25. |
| **Wallet Tracker** | Monitor any Solana wallet for swaps and transfers. Track up to 10/50/100 wallets (Free/Pro/Ultra). Full wallets, counterparties, and tx_signatures on every tier. 120-day event retention. WS events on ULTRA. |
| **Deployer Hunter** | 23,000+ pump.fun deployers scored by bonding rate — tier leaderboard, deploy alerts, deployer profiles, and best-tokens feed. |
| **DEX Trade Stream** | Real-time WebSocket stream of ALL Solana DEX trades across 9+ programs — filter by token, wallet, DEX, deployer tier, or trade size. ~5 min replay + in-band graduation frames on mint-scoped subs. ULTRA. |
| **Webhooks** | Push notifications for KOL trades, coordination signals, deployer alerts, and wallet tracker events (Pro/Ultra) |
| **Tool Directory** | Search 1,070+ Solana tools and dApps indexed on MadeOnSol |

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

// Deshred sniper — ~500ms before on-chain confirmation (PRO/ULTRA)
const { deploys } = await client.sniper.recent({ limit: 20, min_bond_rate: 0.5 });
console.log(deploys[0].token_name, "deployed by", deploys[0].deployer_tier, "tier deployer");

// Multi-KOL coordination signal
const { coordination } = await client.kol.coordination({ min_kols: 3, min_score: 70 });

// FIFO PnL for any wallet (PRO+)
const pnl = await client.wallet.pnl("ASVz...ybJk");
console.log(`Realized: ${pnl.summary.realized_sol} SOL · Win rate: ${(pnl.summary.win_rate! * 100).toFixed(1)}%`);

// Search Solana tools
const { tools } = await client.tools.search({ q: "trading", limit: 10 });
```

---

## Use cases

- **Copy-trading bot** — stream KOL buys via `client.kol.feed()` and mirror trades
- **Deshred sniper** — `client.sniper.recent()` or subscribe to `sniper:deploys` WebSocket for ~500ms pre-confirm deploy signals
- **DEX trade sniping** — subscribe to the all-DEX stream filtered by token, wallet, or deployer tier
- **Graduation sniper / position manager** — subscribe `token:graduations` for every pump.fun bond in real time, or hold a mint-scoped firehose sub and get the bond in-band with your position's trade flow
- **Coordination detector** — flag tokens with `client.kol.coordination({ min_kols: 3, min_score: 70 })`
- **Scout signal** — track first-KOL-touch events filtered to S/A-tier scouts via `client.kol.firstTouches({ preset: "scout" })`
- **Rug-risk gate** — score a token with `client.alpha.risk(mint)` and skip anything in the `danger` band before buying
- **Bundle-cohort check** — call `client.alpha.bundle(mint)` and bail when `held_pct_of_supply` is high (a bundle still sitting on supply can dump) or when the cohort hasn't `fully_exited`
- **Wallet analyser** — `client.wallet.pnl()` for FIFO cost-basis PnL on any Solana wallet
- **Price alert bot** — `client.priceAlerts.create()` for MC dip/recovery alerts delivered via webhook
- **Analytics dashboard** — combine leaderboard, PnL, token velocity, and tool data
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

Each `KolLeaderboardEntry` includes `median_hold_minutes_30d` (median position hold duration in minutes over the last 30 days) and `percentile_early_entry_30d` (early-entry percentile rank 0–100 over the last 30 days).

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

#### `client.priceAlerts.*` *(new in 2.8)*

**Sub-second token MC dip/recovery alerts.** Set a drop threshold on any token — when MC drops below baseline, a `price_alert:dip` event fires. Optionally track recovery. **PRO: 5 alerts, ULTRA: 25 alerts.**

```ts
// Create: alert when token drops 20%, then notify when it recovers 15% from the dip low
const { alert, webhook_secret } = await client.priceAlerts.create({
  token_mint: "So11111111111111111111111111111111111111112",
  drop_pct: 20,
  recovery_pct: 15,
  name: "SOL dip tracker",
  delivery_mode: "webhook",
  webhook_url: "https://example.com/dip-hook",
});

await client.priceAlerts.list();
await client.priceAlerts.get(alert.id);
await client.priceAlerts.update(alert.id, { name: "Renamed", is_active: false });
await client.priceAlerts.delete(alert.id);

// Event history (30-day retention)
const { events } = await client.priceAlerts.events({ event_type: "dip", limit: 50 });
```

Alert lifecycle: `watching` -> `dipped` -> `recovered` (terminal). One-shot per alert. Baseline MC captured at creation time. 30-day auto-expiry. Thresholds immutable — delete and recreate to change.

WebSocket: subscribe to channel `price_alert:events` — user-scoped. Webhook: per-alert HMAC-SHA256 signed (same scheme as coordination alerts).

---

#### `client.sniper.*` — Deshred Sniper Alerts *(new in 2.9)*

**The fastest path to a new pump.fun launch.** Deploys are reconstructed from shred-level (**deshred**) data and surface in the feed **~500ms before the chain confirms them** — a measured head start versus any confirmed-stream feed. **PRO** sees elite + good deployers; **ULTRA** sees every tier and can keep a custom deployer watchlist.

```ts
// Newest-first deshred deploy feed (PRO: elite/good · ULTRA: all tiers)
const { deploys } = await client.sniper.recent({ limit: 50, min_bond_rate: 0.5 });

// Audit one deployer's recent launches (ULTRA)
await client.sniper.byDeployer("7dEx...4pQ8");

// Custom watchlist — get deploys from only the deployers you track, any tier (ULTRA, max 50)
await client.sniper.addToWatchlist({ wallets: ["7dEx...4pQ8", "9aBc...2zZ1"], label: "alpha devs" });
await client.sniper.watchlist();
const { deploys: tracked } = await client.sniper.recent({ watchlist: true });
await client.sniper.removeFromWatchlist("7dEx...4pQ8");
```

Detection is pre-execution, so payloads carry no MC/logs/balances — `confirmed_on_chain` is `"deshred"`. For **live** push (not polling), use the `sniper:deploy` webhook event or the `sniper:deploys` WebSocket channel. ~1–3% of detected deploys may abandon before settlement.

---

#### `client.kol.scoutLeaderboard(params?)` *(new in 2.8)*

Scout leaderboard: top KOLs ranked by scout score, first-touch frequency, and swarm attraction rate. **ULTRA only.**

```ts
const data = await client.kol.scoutLeaderboard({ limit: 20, scout_tier: "S", sort: "scout_score" });
```

---

#### `client.kol.coordinationHistory(params?)` *(new in 2.8)*

Historical coordination alert fires — past events with token, score, KOL count. **ULTRA only.**

```ts
const data = await client.kol.coordinationHistory({ limit: 50, min_score: 70 });
```

---

#### `client.token.kolConsensus(mint)` *(new in 2.8)*

KOL consensus on a token: how many bought/sold, exit rate, net flow, median entry MC. **ULTRA** gets individual wallet arrays.

```ts
const consensus = await client.token.kolConsensus("4sVahM4U8js62mQV58ABSkNRhf6Ztc7Xs2LXUznNpump");
```

---

#### `client.token.peakHistory(mint)` *(new in 2.8)*

Peak MC history: ATH, decline from peak, MC at bond and at 1h/6h/24h/7d after bond.

```ts
const peak = await client.token.peakHistory("4sVahM4U8js62mQV58ABSkNRhf6Ztc7Xs2LXUznNpump");
```

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

Leaderboard of 1M+ scored early-buyer wallets ranked by win rate, PnL, or ROI.

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

#### `client.alpha.risk(mint)`

Transparent 0–100 token rug-risk/safety score (higher = riskier). Returns a `band` (`safe`/`caution`/`danger`), an explainable `factors[]` array that sums into `risk_score`, and the raw `inputs` (mint/freeze authority revocation, liquidity USD + liquidity-to-MC ratio, transfer fee bps, Token-2022 flag, burn detection, launch cohort SOL + size, deployer bond rate + total deployed, KOL signal, blacklist status). PRO/ULTRA — BASIC receives HTTP 403.

```ts
const { risk_score, band, factors } = await client.alpha.risk("EPjFW...");
if (band === "danger") return; // skip risky tokens
```

Returns: `TokenRiskResponse`

---

#### `client.alpha.bundle(mint)`

Bundle-cohort holdings — the wallets that bought a token together (one atomic transaction, `bundle_kind: "atomic_tx"`, or the same slot, `"same_slot"`) and, headline first, how much of supply they still hold. The `bundle` summary block (`held_pct_of_supply`, `bundle_kind`, `wallet_count`, `held_ratio`, `fully_exited`, `buy_volume`, `tokens_held`) is returned on **every** tier. BASIC/TRADER get `wallets: []`; PRO adds the top-10 cohort wallets with flags (`held_ratio`, `has_sold`, `atomic`, `is_kol`); ULTRA returns the full cohort plus identity (`kol_name`, `win_rate`, `bot_confidence`) and per-wallet `tokens_held`.

```ts
const { bundle, wallets } = await client.alpha.bundle("EPjFW...");
if ((bundle.held_pct_of_supply ?? 0) > 0.2 && !bundle.fully_exited) return; // bundle still holds supply
```

Returns: `TokenBundleResponse`

---

#### `client.alpha.candles(mint, params?)`

OHLCV candlestick time-series — the persisted price/MC trajectory, rolled up to any timeframe on read. **PRO**: OHLCV (last 30 days). **ULTRA**: + per-bar net flow (buy/sell volume, `net_volume_usd`, counts, MEV volume), liquidity delta, and full retained history. Params: `tf` (`1m`|`5m`|`15m`|`1h`|`4h`|`1d`, default `1h`), `limit` (1–1000, default 200), `from`/`to` (ISO8601). `net_flow_included` flags whether the ULTRA fields are populated.

```ts
const { candles, net_flow_included } = await client.alpha.candles("EPjFW...", { tf: "5m", limit: 100 });
const last = candles.at(-1);
console.log(last.close, net_flow_included ? `net flow $${last.net_volume_usd}` : "(ULTRA for net flow)");
```

Returns: `CandlesResponse`

---

#### `client.alpha.tokenFlow(mint, params?)`

Aggregated buy/sell flow for a token over a rolling window. **PRO+** (keyed). Params: `window` (`1h` default, or `24h`). Returns unique wallet/buyer/seller counts, buy/sell counts and SOL volumes, `net_sol` (`buy_sol − sell_sol`), and `trades_per_wallet`, plus the window `from` timestamp.

```ts
const flow = await client.alpha.tokenFlow("EPjFW...", { window: "24h" });
console.log(`${flow.unique_wallets} wallets · net ${flow.net_sol} SOL`);
```

Returns: `TokenFlowResponse`

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

### Universal Wallet — `client.wallet` *(new in 2.7)*

Per-wallet endpoints that work on **any** Solana wallet, not just curated KOLs. FIFO cost-basis PnL over the last 90 days. PRO+ on every method. Results are cached server-side in `wallet_analyses` with dynamic TTL (5min / 1h / 24h based on last activity); cache hits don't count against your daily quota.

**Cost-basis honesty:** observable only inside the 90-day data window. Wallets that sold tokens bought before that window have the overflow silently discarded rather than fabricated. `notes.cost_basis_observable_from` makes the cutoff visible per call.

#### `client.wallet.stats(address)`

Aggregate stats over 90d plus cross-product flags (KOL / alpha / deployer). Includes enrichments: top traded tokens with realized PnL, trading style, deployer tier mix, recent trades. **v2.8** adds `derived` block: win rate, ROI, best/worst trade, biggest miss (token sold that later mooned), and AI-classified verdict.

```ts
const { stats, flags, derived } = await client.wallet.stats("ASVz...ybJk");
console.log(`${flags.kol_name ?? address}: ${stats?.total_trades} trades`);
if (derived?.verdict) {
  console.log(`${derived.verdict.label}: ${derived.verdict.description}`);
}
if (derived?.biggest_miss) {
  console.log(`Biggest miss: ${derived.biggest_miss.token_symbol} — missed +${derived.biggest_miss.missed_sol.toFixed(1)} SOL`);
}
```

Returns: `WalletStatsResponse` (404 if the wallet has no trades and no flag-table presence).

---

#### `client.wallet.pnl(address)`

Full FIFO cost-basis PnL: realized + unrealized SOL, profit factor, max drawdown, avg + median hold minutes, daily UTC PnL curve, closed positions sorted by pnl desc (with ROI %, hold time, win/loss), and open positions hydrated with live current prices from the market-cap tracker.

```ts
const pnl = await client.wallet.pnl("ASVz...ybJk");
console.log(`Realized: ${pnl.summary.realized_sol} SOL · Unrealized: ${pnl.summary.unrealized_sol} SOL`);
console.log(`Win rate: ${(pnl.summary.win_rate! * 100).toFixed(1)}% · PF: ${pnl.summary.profit_factor}`);
for (const c of pnl.closed_positions.slice(0, 5)) {
  const sign = c.pnl_sol > 0 ? "+" : "";
  console.log(`  ${c.token_mint.slice(0,8)}…  ${sign}${c.pnl_sol} SOL  (${c.roi_pct}% ROI, ${c.hold_minutes}m hold)`);
}
```

Returns: `WalletPnlResponse`. Cache hits include `cache_hit: true` + `computed_at`; misses include `ttl_seconds`.

---

#### `client.wallet.positions(address)`

Open positions only — lighter slice of `pnl()`. Shares the same cache, so calling this right after `pnl()` is an immediate hit.

```ts
const { positions } = await client.wallet.positions("ASVz...ybJk");
for (const p of positions) {
  const u = p.unrealized_sol;
  console.log(`  ${p.token_mint.slice(0,8)}…  cost ${p.cost_basis_sol} SOL  unrealized ${u ?? "—"} SOL  (${p.unrealized_pct ?? "—"}%)`);
}
```

Returns: `WalletPositionsResponse`. Mints without a current price return `unrealized_sol: null` rather than fabricated zero.

---

#### `client.wallet.trades(address, params?)`

Cursor-paginated raw trades. Default window is the last 90 days; override via `since` / `until` (Unix epoch seconds). Default limit 100, max 500.

```ts
let cursor: string | undefined;
while (true) {
  const page = await client.wallet.trades("ASVz...ybJk", { limit: 200, cursor, action: "buy" });
  for (const t of page.trades) processBuy(t);
  if (!page.has_more) break;
  cursor = page.next_cursor!;
}
```

Params:
- `limit` — 1-500, default 100
- `cursor` — from `next_cursor` of previous response
- `action` — `"buy"` or `"sell"`
- `token_mint` — filter to one token
- `since` / `until` — Unix epoch seconds (default last 90d)

Returns: `WalletTradesResponse` with `trades[]` + `next_cursor` + `has_more` + `filters` echo.

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

Each `DeployerAlert` carries the deploy details plus `deployer_sol_balance` — the deployer wallet's SOL balance at alert time (`number | null` when unknown).

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

Returns: `TokenResponse` (with `mc_change_pct` / `volume_usd` / `mev_volume_pct` (each keyed by 5m/15m/1h/2h/4h) + `history_age_seconds` as of 1.7). **New in 2.12:** also returns `liquidity_to_mc_ratio` (liquidity_usd / market_cap), `launch_cohort_sol` (total SOL spent by the first-20 buyers), and `launch_cohort_size` (count of first-20 buyers, 0–20).

#### `client.token.batch(mints)`

Batch lookup up to 50 mints in one round-trip. ~10–20× cheaper than N sequential calls. Each item returns the same shape as `get()` — including `liquidity_to_mc_ratio`, `launch_cohort_sol`, and `launch_cohort_size` *(new in 2.12)*.

```ts
const { tokens } = await client.token.batch(["mint1", "mint2", "mint3"]);
```

Returns: `TokenBatchResponse`

#### `client.token.list(params?)` *(new in 2.6 — PRO+)*

Filtered, sortable token directory. Default `min_liq=2000` trims the long tail of phantom-MC tokens from low-liquidity pools; pass `min_liq=0` to opt out.

**Server-side filters** (cheap, indexed): `min_mc`, `max_mc`, `min_liq`, `active_h`, `primary_dex` (`pumpfun`/`pumpswap`/`raydium`/`meteora`/`orca`/`raydium_clmm`), `authority_revoked`, `exclude_token2022`, `min_lp_burnt_pct`, `deployer_tier` (`elite`/`good`/`moderate`/`rising`/`cold`/`unranked`), `min_liq_mc_ratio`, `max_liq_mc_ratio`.

**Computed post-filters** (over-fetches 3×): `min_volume_1h_usd`, `max_mev_share_pct`, `mc_change_1h_min_pct`, `mc_change_1h_max_pct`. When any of these are set, `pagination.post_filtered` is `true` and page size may be smaller than `limit`.

**Sort** (`sort`): `mc_desc` (default), `mc_asc`, `last_trade_desc`, `liquidity_desc`, `cumulative_volume_desc`, plus *(new in 2.15)* the momentum sorts `mc_change_5m_desc`, `mc_change_1h_desc`, `volume_1h_desc`, and `trending` (composite recent-volume × positive-momentum rank, DB-native — paginates correctly with no over-fetch).

Each item in `tokens[]` includes `liquidity_to_mc_ratio` and `deployer_tier` *(new in 2.12)*.

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

#### `client.token.almostBonded(params?)` *(new in 2.15 — PRO+)*

Pre-bond pump.fun tokens approaching graduation, ranked by **velocity** (Δprogress/min) — "95% and accelerating" beats "92% stalled". Each token is enriched with its deployer's reputation tier.

**Params** (all optional): `min_progress` (default 80), `max_progress` (default 99.99), `min_velocity_pct_per_min`, `max_age_minutes`, `deployer_tier` (`elite`/`good`/`moderate`/`rising`/`cold`/`unranked`), `authority_revoked`, `min_liq`, `sort` (`velocity_desc` default / `progress_desc` / `eta_asc`), `limit` (1–100, default 50).

Each item in `tokens[]`: `mint`, `symbol`, `name`, `progress_pct`, `velocity_pct_per_min` (null until a 5m snapshot exists), `eta_minutes` (linear projection), `stalled`, `real_sol_reserves`, `market_cap_usd`, `liquidity_usd`, `authorities_revoked`, `deployer_tier`, `age_minutes`.

```ts
// Tokens >90% bonded, accelerating, from a credible deployer — soonest first
const { tokens } = await client.token.almostBonded({
  min_progress: 90,
  min_velocity_pct_per_min: 0.5,
  deployer_tier: "elite",
  sort: "eta_asc",
  limit: 25,
});
```

Returns: `AlmostBondedResponse` (with `tokens[]`, `filters`, `returned`, `note`)

#### `client.token.batchBuyerQuality(mints)`

Batch buyer-quality scoring for up to 50 mints. Shares the same 5-minute LRU cache as `client.alpha.buyerQuality(mint)`.

Returns: `AlphaBuyerQualityBatchResponse`

#### `client.token.batchRisk(mints)` *(new in 2.17 — PRO+)*

Batch token risk scoring for up to 50 mints in a single request that **counts as 1** against your quota — each item is the same transparent 0–100 rug-risk result as `client.alpha.risk(mint)` (with `band`, `factors[]`, `inputs`, `score_version`, `as_of`). Untracked mints come back as `{ mint, error: "not_tracked" }` without failing the batch. `tokens` preserves de-duplicated input order; `count` is the number of unique mints. **PRO/ULTRA only.**

```ts
const { tokens, count } = await client.token.batchRisk(["mint1", "mint2", "mint3"]);
for (const t of tokens) {
  if ("error" in t) continue;            // untracked / per-mint failure
  if (t.band === "danger") console.log(`skip ${t.mint} (${t.risk_score})`);
}
```

Returns: `TokenRiskBatchResponse` — `{ tokens: (TokenRiskResponse | TokenRiskBatchError)[], count }`

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

### Signal Performance — `client.getSignalPerformance(name)` *(new in 2.12)*

Performance stats for a named signal: hit rate, precision, sample count, and lookback window.

```ts
const perf = await client.getSignalPerformance("kol_coordination");
console.log(perf.precision, perf.hit_rate);
```

Params: `name` — signal name (e.g. `"kol_coordination"`, `"first_touch_scout"`, `"deployer_elite"`).

Returns: `Promise<unknown>` — shape varies by signal name; see `/api-docs` for the full schema.

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

#### `client.stream.connect()` *(new in 2.10)*

Open a **managed** stream — token fetch + 24h refresh, auto-reconnect (backoff + jitter), heartbeat liveness, and typed events are handled for you. No need to touch `getToken()` or `ws` directly.

```ts
const stream = client.stream.connect();
stream.on("kol:trade", (t) => console.log(t.token_symbol, t.action));
stream.on("deployer:alert", (a) => console.log("new deploy", a.token_mint));
stream.subscribe(["kol:trades", "deployer:alerts"]);
// stream.unsubscribe([...]) / stream.close() when done
```

Channels: `kol:trades`, `kol:coordination`, `kol:first_touches`, `deployer:alerts`, `wallet_tracker:events`, `copytrade:signals`, `price_alert:events`, `sniper:deploys`, `token:graduations` (every pump.fun graduation in real time, tracked deployer or not — typed `GraduationEvent`). Lifecycle: `open`, `close`, `reconnect`, `heartbeat`, `error`. Node 22+ uses the global `WebSocket`; on Node < 22 also `npm i ws`.

#### `client.stream.sessions()` / `client.stream.deleteSession(id)` *(new in 2.17 — PRO+)*

Audit and evict your **live** WebSocket sessions across the KOL/deployer (`ws-streaming`) and all-DEX (`dex-stream`) services. `sessions()` lists each open connection; `deleteSession(id)` force-closes one — handy for freeing a connection slot held by a ghost/stale socket after a network drop.

```ts
const { sessions, count } = await client.stream.sessions();
for (const s of sessions) {
  console.log(s.id, s.service, s.channels, s.messages_sent);
}

// Kill a stale session to free a slot
const { evicted } = await client.stream.deleteSession(sessions[0].id);
```

`deleteSession()` returns `{ evicted: true, id }`; it throws a 404 if no live session has that id, or a 400 if `id` is not a positive integer. Types: `StreamSession`, `StreamSessionsResponse`, `StreamSessionEvictResponse`.

---

### DEX Firehose (Ultra) — `wss://madeonsol.com/ws/v1/dex-stream`

Real-time trades across **9+ Solana DEX programs** (Pump.fun, PumpAMM, PumpSwap, Raydium AMM/CPMM/CAMM, Jupiter v6, Orca Whirlpool, Meteora DBC/DAMM, LaunchLab/bonk.fun) on a single normalized WebSocket. Server-side filters drop everything you don't care about before it hits your socket.

**Limits:** ULTRA = 2 connections, **10 named subscriptions per connection**, up to **500 trades replay** from a server-side buffer holding ~5 minutes of firehose history (not connection-scoped — covers trades from before you connected; newest-first, sort by `block_time`). Inbound rate limit: 5 messages/sec (excess emits one error per second).

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

### Copy-Trade — `client.copytrade` *(new in 2.10)*

Mirror N source wallets into actionable signals (delivered via webhook/WebSocket). PRO/ULTRA — PRO: 3 rules × 5 wallets, ULTRA: 20 × 50.

```ts
const { subscription, webhook_secret } = await client.copytrade.create({
  name: "whale mirror",
  source_wallets: ["WalletA…", "WalletB…"],
  sizing_mode: "fixed",
  sizing_amount: 0.5,           // SOL per mirrored buy
  only_action: "buy",
  delivery_mode: "webhook",
  webhook_url: "https://you.example/hook",
});

await client.copytrade.subscriptions();          // list rules
await client.copytrade.update(subscription.id, { is_active: false });
await client.copytrade.signals({ limit: 50 });   // 7-day fired-signal history
await client.copytrade.delete(subscription.id);
```

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
- [MadeOnSol on GitHub](https://github.com/madeonsol/madeonsol) — Main project repository

## Also Available

| Platform | Package |
|---|---|
| Rust | [`madeonsol`](https://crates.io/crates/madeonsol) on crates.io |
| Python (LangChain, CrewAI) | [`madeonsol-x402`](https://pypi.org/project/madeonsol-x402/) on PyPI |
| MCP Server (Claude, Cursor) | [`mcp-server-madeonsol`](https://www.npmjs.com/package/mcp-server-madeonsol) · [Smithery](https://smithery.ai/servers/madeonsol/solana-kol-intelligence) · [Glama](https://glama.ai/mcp/servers/LamboPoewert/mcp-server-madeonsol) |
| ElizaOS | [`@madeonsol/plugin-madeonsol`](https://www.npmjs.com/package/@madeonsol/plugin-madeonsol) |
| Solana Agent Kit | [`solana-agent-kit-plugin-madeonsol`](https://www.npmjs.com/package/solana-agent-kit-plugin-madeonsol) |

---

## License

MIT © [MadeOnSol](https://madeonsol.com)
