# madeonsol

[![npm version](https://img.shields.io/npm/v/madeonsol?style=flat-square)](https://www.npmjs.com/package/madeonsol)
[![npm downloads](https://img.shields.io/npm/dm/madeonsol?style=flat-square)](https://www.npmjs.com/package/madeonsol)
[![GitHub stars](https://img.shields.io/github/stars/madeonsol/madeonsol-sdk?style=flat-square&logo=github)](https://github.com/madeonsol/madeonsol-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> ⭐ **[Star on GitHub](https://github.com/madeonsol/madeonsol-sdk)** if you find this useful · 📂 **[Examples](./examples/)** · 📚 **[API docs](https://madeonsol.com/api-docs)**

Official TypeScript/JavaScript SDK for the **[MadeOnSol](https://madeonsol.com) Solana API** — zero dependencies, fully typed, works in Node.js ≥ 18 and edge runtimes.
> Real-time Solana trading intelligence: track 1,069 KOL wallets with <3s latency on paid keys and x402 pay-per-call (free-tier live feeds are 5-min delayed), score 23,000+ Pump.fun deployers, surface deshred deploy signals **~500ms before on-chain confirmation**, detect multi-KOL coordination, score token rug-risk 0–100 with a transparent factor breakdown, expose the bundle cohort that bought a token together and how much of supply it still holds, verify any wallet's current on-chain holdings with airdrop/insider `transfer_delta` detection, push every pump.fun graduation the second it bonds, and stream every DEX trade across 9+ programs. Free tier: 200 requests/day across 40+ endpoints (live feeds 5-min delayed) — no signup payment. Get a key at [madeonsol.com/pricing](https://madeonsol.com/pricing).

> **New in 2.28.0 — stream recovery: resume cursor, de-duplication, honest gaps.** The managed stream now tracks the cursor `{ instance, seq, ts }` of the last frame your handlers finished and resumes after it on every reconnect (the v1 `resume` request, with an automatic fallback to `replay_since_seq` / `replay_since_ts` on older servers). Delivery is at-least-once, de-duplicated by event `id`; new lifecycle events `cursor`, `replay`, `gap` (what could not be recovered — a `seq` gap is never loss) and `fatal`. Close codes are handled: 4001 re-fetches the token (bounded), 4002 waits ≥ 60 s instead of looping every second, 4003 stops, 4008 resumes; the backoff resets only after a `subscribed` ack. Every server `warning` frame is emitted (incl. `channels_rejected` / `channels_revoked`). `STREAM_CHANNELS` lists every Solana channel and `token:prices` joins the `StreamChannel` type. See the stream section's "Recovery" notes.

> **New in 2.27.0 — deployer reputation as-of a date, and creator-fee rewards.** `client.deployerHunter.deployerAsOf(wallet, { date? })` (typed `DeployerAsOfResponse`) binds `GET /deployer-hunter/{wallet}/as-of`: the deployer's reputation exactly as it stood on `date` (default today, UTC) — the latest write-on-change snapshot at or before it, so a backtest sees only what was knowable then. `snapshot.snapshot_date` can predate `requested_date` (snapshots are write-on-change); `snapshot.carried: true` marks that. No snapshot at or before the date → `as_of: false, snapshot: null` — nothing is ever synthesized. `date` must be ≥ 2026-04-07 and not in the future. `client.deployerHunter.deployerRewards(wallet)` (typed `DeployerRewardsResponse`) binds `GET /deployer-hunter/{wallet}/rewards`: pump.fun creator-fee rewards, answered two ways that are never merged — `collected` (what actually reached the wallet: direct vault claims, kept 90 days; social-handle claims; shareholder payouts on **any** token) and `attributed` (every payout on the tokens it **deployed**, split `to_self`/`to_others` + `redirected_pct` — a deployer redirecting most of its fees elsewhere is visible in the gap between the two). Every money field is `{ sol, usdc, usd }`; `usd` is `null` (never a silent 0) when a SOL amount exists and no SOL price was available. `top_tokens`/`top_recipients` (≤10, USD-sorted) show where attributed fees went, recipients flagged `is_self`/`is_social_pda`. Works for non-deployers too (`is_deployer: false`, `attributed` empty). **PRO+** (BASIC receives HTTP 403) on the keyed `msk_` API. New types: `DeployerAsOfParams`, `DeployerAsOfResponse`, `DeployerAsOfSnapshot`, `DeployerRewardsResponse`, `DeployerRewardsMoney`, `DeployerRewardsRail`, `DeployerRewardsTopToken`, `DeployerRewardsTopRecipient`, `DeployerRewardsSocial`.

> **New in 2.26.0 — token surges & revivals: momentum fires with the honest half attached — one endpoint + one live channel.** `client.token.surges(params?)` (typed `TokenSurgesResponse`) binds `GET /tokens/surges`: **`surge`** = a token < 30 min old whose MC runs hard vs its *launch* MC (tier `early` ≤ 10 min / ≥ $12k / ≥ 3×, `strong` ≤ 30 min / ≥ $30k / ≥ 6× and still climbing, `breakout` ≤ 2 min / ≥ $45k / ≥ 8× — each fires once per mint, and only when SUSTAINED across ≥ 10 s, never on a one-tick mark); **`revival`** = a token with no trade candle for ≥ 24 h that started trading again, confirmed by real buys + buy volume on the tape, never by the price move alone. Hard gates on both: liquidity ≥ $1.5k and ≥ 2 % of MC, and the MC gained must be *paid for* (buy volume ≥ 3 % of the move — a spoof-pool mark moves MC on ~$0). Every row carries `tape` (buys / sells / volume, `unique_buyers` only where wallet data exists — `wallet_data_available: false` otherwise, never inferred), `kol`, `early_buyers` (bundled / sold / sniper wallets), `deployer` reputation and **`risk_flags[]`** (`bundled_launch`, `few_buyers`, `wash_pattern`, `thin_liquidity`, `cold_deployer`, `sniper_heavy`, `early_buyers_exiting`, `sell_pressure`, `no_tape_trades`, `no_prior_price`, `mint_authority_active`, `transfer_fee`); rows ≥ 65 min old carry the +1 h `outcome` (`mc_1h_multiple`, `peak_1h_multiple`, `priced_after_1h`) and `stats: true` returns per-(kind, tier) hit-rates — out-of-sample by construction. Filters `kind`, `tier`, `mint`, `launchpad`, `deployer_tier`, `min_mc_usd` / `max_mc_usd`, `min_buys`, `exclude_flags`, `only_clean`; cursors `since` / `before`. Pushed live on the new **`token:surges`** WS channel (events `token:surge` / `token:revival`, typed `TokenSurgeStreamEvent`, server-side filters `TokenSurgesSubscribeFilters`: `kinds[]`, `tiers[]`, `launchpads[]`, `exclude_flags[]`, `min_mc_usd` / `max_mc_usd`, `deployer_tier[]`). Nearly every scalar is `| null` — null means unknown, never zero. **PRO+** (BASIC receives HTTP 403) on the keyed `msk_` API.

> **New in 2.25.1 — stream tokens never expire.** `client.stream.getToken()` (`POST /stream/token`) now returns the **same token on every call, forever**. It stops working only if your subscription lapses or you call `client.stream.getToken({ rotate: true })` to replace it (the previous value keeps working for 60 s). `StreamToken.expires_at` and `next_refresh_at` are always `null` (kept for wire compatibility — do not schedule refreshes on them); the response gains `rotated: boolean` and `lifetime: string`. The server never rotates on its own and never sends `token_refresh` unless you rotated; a `4001` close means "mint again" (lapsed or rotated), never a timer. Prefer `Authorization: Bearer <token>` on the WebSocket handshake — `?token=` still works and is masked in access logs. `client.stream.connect()` already does the right thing (it calls `getToken()` on every (re)connect); no code change needed on your side.

> **New in 2.25.0 — token locks & vesting, upcoming unlocks, and pump.fun creator-fee sharing / fee claims — five endpoints + two live channels.** `client.token.locks(mint, params?)` (typed `TokenLocksResponse`) binds `GET /tokens/{mint}/locks`: every on-chain Streamflow / Jupiter Lock / Bonfida lock or vesting contract on a mint, decoded from the locker programs' account state, with a LIVE-derived view (`locked_raw` still locked, `unlocked`, `withdrawn`, `claimable`, `status`, `next_unlock`) and a `summary` (locked / deposited totals, the 7d / 30d forward unlock schedule, `active_cancelable_by_sender` — a lock the sender can cancel is a weaker promise). `client.token.locksFeed(params?)` (`GET /tokens/locks`) is the cross-token feed of NEW contracts, cursor-paginated (`pagination.next_since` / `next_before`) and pushed live on the new **`token:locks`** WS channel (event `token:lock`, typed `TokenLockStreamEvent`). `client.token.unlocks(params?)` (`GET /tokens/unlocks`) lists upcoming unlock EVENTS (cliff / period / final / tranche) inside `within=1h…90d` with `window_amount_*` per contract. `client.token.feeShares(mint)` (`GET /tokens/{mint}/fee-shares`) decodes a pump.fun coin's on-chain `SharingConfig` — who its creator fees are redirected to (`share_bps`, `is_admin`, `is_social_pda` for fees earmarked for an X account etc., `redirected_bps`, `social_bps`, `is_default` = 100% to the creator) plus the distribution rollup per recipient and the config change log; `client.token.feeClaims(params?)` (`GET /tokens/fee-claims`) is the fee-event feed (`distribution` with per-address `payouts[]`, `social_claim`, `shares_created` / `updated` / `reset`, `creator_transferred`, `creator_claim` on request), pushed live on the new **`token:fee_claims`** channel (event `token:fee_claim`, typed `TokenFeeClaimStreamEvent`). Honest limits: base-unit amounts are **strings** and ui / usd / pct are `null` when decimals or price are unknown; **LP locks are NOT included** (token / vesting locks only); **fee-event history starts 2026-08-17**; all five are **PRO+** (BASIC receives HTTP 403) on the keyed `msk_` API.

> **New in 2.24.0 — live holder census: exact holder count, labelled holders, and pools that are named, not just excluded.** `client.alpha.holders(mint)` (typed `TokenHoldersResponse`) binds `GET /tokens/{mint}/holders` (PRO+): every token account of the mint read from the ledger at `confirmed` and merged per owner, so `concentration.holder_count` is EXACT (distinct non-zero owners minus pools / bonding curves / burns) — never a trade-derived estimate; it is `null` only when the provider refuses the census for a mega-cap, in which case you get the top-20 view and `source.census_fallback_reason` says so. Each disclosed owner carries our labels (`deployer` / `kol` / `early_buyer` / `bundle` / `bot` / `dump_cluster` — empty means unknown to us, not clean), and `excluded[]` NAMES what was taken out of the circulating denominator: `reason` = `pool` (with `dex` + `pool_address`), `bonding_curve` (pump.fun / LaunchLab), `burn`, or `program_account` only when we genuinely cannot attribute the PDA; `pool_pct` / `burned_pct` / `program_pct` split the exclusion. Amounts are raw u64 **strings**. Disclosure: PRO ranks 1–10, ULTRA 1–50, BUSINESS 1–100 — the maths is tier-independent. Big tokens take 5–30 s upstream: you get `503 holder_scan_in_progress` with `retry_after_seconds: 20` while the scan finishes into the cache, and the retry is instant.

> **New in 2.23.0 — two prices on the trade tape, and the right one is now the default.** The trade tape now tells you what a trade actually cost. `price_sol`/`price_usd` on each trade are THIS trade's executed price — `sol_amount / token_amount`, reconciling exactly with the amounts on the same row and with the PnL endpoints. Because `sol_amount` is the wallet's net SOL movement, that is the trader's all-in effective rate: swap fee and any account rent included, not the pool mid. The market-cap tracker's canonical pool price moved to the new **`market_price_sol`/`market_price_usd`** fields — sampled once per token per pool update, so every trade in the same slot shares it. Until now `price_sol` carried that canonical value and disagreed with the row's own amounts by a **7.9% median** (p90 ~74%): a stale market price reads low in a pump and high in a dump, so anything you averaged out of the tape inherited the bias instead of cancelling it. Use `price_sol` for cost basis, fills and PnL; `market_price_sol` for a per-token series independent of trade size and direction. Both `client.alpha.tokenTrades(mint)` and `client.wallet.trades(address)` carry all four fields on `TokenTrade` / `WalletTrade` — the wallet tape returned amounts and no price at all before.

> **New in 2.22.0** — **Clean stream shutdown.** `client.stream.connect().close()` now fully tears down the underlying WebSocket so short-lived scripts exit promptly instead of hanging on a lingering socket. In Node the client now prefers the `ws` package (which exposes `terminate()`) and hard-terminates on close; the browser still uses the native WebSocket. No API changes — purely a lifecycle fix. (If you don't already depend on `ws` and want the fast exit on Node ≥22, `npm i ws`.)
>
> **New in 2.21.0** — **Pool depth / price-impact + dev self-activity on the risk score.** `client.alpha.tokenDepth(mint, { sizes? })` (`GET /tokens/{mint}/depth`, **PRO+**) answers "how much SOL does it take to move the price N%", per pool. Each depth-computable pool returns `spot_price_sol`, `fee_pct`, `source` (`"stream"` for constant-product AMMs served zero-RPC from stream reserves, `"live_rpc"` for pump.fun/bonk curves priced from a live read of the curve's VIRTUAL reserves), `reserves_age_ms`, per-size `quotes` (`size_sol`/`tokens_out`/`avg_price_sol`/`price_impact_pct`), and `to_move_price` (SOL to move price `1pct`/`5pct`/`10pct`). `sizes` accepts a CSV string or `number[]` (max 8, each >0 and ≤10000; default `0.5,1,5,10`); the response carries `sol_usd`, `sizes_sol`, `primary_pool`, and honesty-first `unsupported_pools` — concentrated pools (CLMM/Orca/DLMM), Meteora-DBC curves, and unclassified pools come back with a `reason` instead of a wrong number. Impact is per-pool, not router-optimal. Plus `client.alpha.risk(mint)` responses gain a top-level `dev` block (`TokenRiskDev | null`) — deployer self-activity for the mint: `wallet`, `launchpad`, `deployed_at`, create-tx `buy_sol`/`buy_tokens`/`buy_supply_pct`, post-create `bought_tokens_after`/`sold_tokens`/`sold_sol` with `first_sell_at`/`last_sell_at`, live on-chain `holdings_tokens`/`holdings_supply_pct`, `wallet_empty` (`boolean | null`), and `transferred_out` (`boolean | null` — chain balance well below the trade-derived expectation, i.e. tokens moved without a swap). `dev` is `null` when the mint has no tracked deploy row (single-mint `/risk` only; absent on batch items). New types: `TokenDepthParams`, `TokenDepthResponse`, `TokenDepthPool`, `TokenDepthUnsupportedPool`, `TokenDepthPoolBase`, `TokenDepthQuote`, `TokenDepthToMovePrice`, `TokenDepthSource`, `TokenRiskDev`.
>
> **New in 2.20.0** — **Wallet batch classify, token trade tape, sniper footprint.** `client.wallet.batchClassify(wallets)` (`POST /wallet/batch/classify`, 1–100 addresses, **PRO+**) returns bulk reputation flags per wallet: `is_sniper`, `is_bundler` (lifetime), `is_dumper` (rolling 42d), `is_kol` + `kol_name`, `bot_confidence`, and `dump_cluster` cohort stats — flags are pump.fun-pipeline scoped (`false` = not observed, NOT verified clean). `client.token.trades(mint, params?)` (`GET /tokens/{mint}/trades`, **PRO+**) is the mint-scoped trade tape — cursor-paginated raw trades with `price_sol`/`price_usd`/`early_buyer_rank`/`slot`, filterable by `action`/`wallet`/`since`/`until`, defaulting to the FULL history (starts 2026-04-12; the `coverage` block carries `history_start` + `scope`). The wallet profile `flags` block (`client.wallet.stats()`) gains the same `is_sniper`/`is_bundler`/`is_dumper` + `dump_cluster` fields, and **`bot_confidence` is a type fix**: previously typed `number | null` but the API always returned `null` due to a bug — it now returns the real value as a string enum `"none" | "low" | "medium" | "high" | null`. `TokenRiskInputs` gains `sniper_footprint` (slot-window snipe rollup: `buys`/`buyers`/`sol`/`supply_pct`/`sniper_wallet_buys`/`data_available`/`as_of`, or null) and `client.sniper.recent()` deploys each carry the same `footprint` block. New types: `WalletClassification`, `WalletBatchClassifyResponse`, `TokenTradesParams`, `TokenTrade`, `TokenTradesResponse`, `TokenTradesCoverage`, `SniperFootprint`, `BotConfidence`, `DumpClusterStats`.
>
> **New in 2.19.0** — **Verified wallet holdings.** `client.wallet.holdings(address, { limit?, min_value_usd? })` (`GET /wallet/{address}/holdings`) reads the wallet's actual current SPL + Token-2022 token accounts and SOL balance straight from chain, enriches each with our price/MC/name/symbol, and computes a `transfer_delta` (on-chain amount − trade-derived net position) — exposing tokens that arrived or left **without a swap** (airdrops, insider funding, wallet-hopping). Distinct from `client.wallet.positions()` (trade-derived FIFO): holdings is "what they actually hold right now". Returns `WalletHoldingsResponse` with a `summary` (`token_accounts`/`non_zero`/`returned`/`priced`/`total_value_usd`/`truncated`), `sol_balance`, and `verified_at`. `limit` 1–500 (default 200), `min_value_usd` ≥0 (default 0). **ULTRA only.** New types: `WalletHoldingsParams`, `WalletHoldingsResponse`, `Holding`.
>
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
| **Verified Holdings** | Current on-chain SPL + Token-2022 balances + SOL, read straight from chain and enriched with price/MC/name, plus a `transfer_delta` that exposes airdrops / insider funding / wallet-hopping (tokens that moved without a swap). ULTRA. |
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
- **Holdings verifier / airdrop detector** — `client.wallet.holdings()` for verified current on-chain balances, and flag tokens with a nonzero `transfer_delta` (arrived without a swap — airdrops, insider funding, wallet-hopping)
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

**v2.20** — each deploy also carries a `footprint` block (`SniperFootprint | null`): the slot-window snipe rollup for slots [-1..+3] around the deploy — `buys`, `buyers`, `sol`, `supply_pct`, `sniper_wallet_buys`, `data_available`, `as_of`. `null` until the ~10-min settle window has passed (or when the mint is outside the pump.fun-pipeline write-gate) — absent, not zero.

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

Transparent 0–100 token rug-risk/safety score (higher = riskier). Returns a `band` (`safe`/`caution`/`danger`), an explainable `factors[]` array that sums into `risk_score`, and the raw `inputs` (mint/freeze authority revocation, liquidity USD + liquidity-to-MC ratio, transfer fee bps, Token-2022 flag, burn detection, launch cohort SOL + size, deployer bond rate + total deployed, KOL signal, blacklist status). **v2.20:** `inputs` also carries `sniper_footprint` (`SniperFootprint | null`) — the slot-window snipe rollup (`buys`/`buyers`/`sol`/`supply_pct`/`sniper_wallet_buys`/`data_available`/`as_of`). Informational: it does not move the score; `null` when not yet computed. PRO/ULTRA — BASIC receives HTTP 403.

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

#### `client.alpha.tokenPools(mint)`

Per-venue liquidity map — every DEX pool a token trades in, each flagged live (`is_active`) or parked, with `liquidity_usd`, `last_price_sol`, `last_swap_at`, `dex`, `quote_mint`, and `amm_id`. The `summary` block rolls up `pool_count`/`active_pool_count`/`dex_count`, `dexes[]`, `total_liquidity_usd`, the `primary_pool`/`primary_dex`, and `top_pool_share_pct` (largest-pool concentration) — a fragmentation read on a token's liquidity. **PRO/ULTRA only** — BASIC receives HTTP 403.

```ts
const { pools, summary } = await client.alpha.tokenPools("EPjFW...");
console.log(`${summary.active_pool_count}/${summary.pool_count} live across ${summary.dex_count} DEXs · top pool ${summary.top_pool_share_pct}%`);
```

Returns: `TokenPoolsResponse`

---

#### `client.alpha.holders(mint)`

Live holders, holder count + concentration (`GET /tokens/{mint}/holders`) — a full holder census read from the ledger at `confirmed`: every token account of the mint (owner + balance), merged per owner. This is who holds **now**; `capTable` is who bought first. **PRO+** — BASIC receives HTTP 403.

- `concentration.holder_count` is **exact** (distinct non-zero owners minus excluded pools/curves/burns, at `slot`) and `null` only when the provider refused the census for a mega-cap mint — then `source.method` is `"getTokenLargestAccounts"` (top-20 view) and `source.census_fallback_reason` is set. It is never estimated from trades.
- `amount_raw` on every holder and excluded row is a raw u64 **string** — never a float; use `BigInt()`. `amount` is the UI-scaled convenience number.
- Pools, bonding curves, burns and unattributed program accounts are **excluded** from the circulating denominator and listed in `excluded[]`, each named where possible: `reason` `pool` (+ `dex`, `pool_address`), `bonding_curve` (pump.fun / LaunchLab), `burn`, else `program_account`. The #1 raw account of a fresh memecoin is its own bonding curve. `concentration.pool_pct` / `burned_pct` / `program_pct` split them (over total supply).
- Disclosure is tier-gated: **PRO** ranks 1–10, **ULTRA** 1–50, **BUSINESS** 1–100 (`disclosed` tells you your cap); `top1/top10/top20/top50/top100_share`, the cohort `*_pct` values and `holder_count` are computed over the full set and are identical on every tier. All shares are 0–100.
- Each holder carries `labels[]` from MadeOnSol wallet intelligence (`deployer` / `kol` / `early_buyer` / `buyer` / `bundle` / `bot` / `dump_cluster`) plus `kol_name`, `early_buyer_rank`, `bot_confidence`, `historical_win_rate`. Empty labels = unknown to us, not verified clean.
- Latency: fresh pump.fun mints <1 s; 200k–550k-account tokens 6–11 s. While the upstream scan is still running the API answers **503** `error_kind: "holder_scan_in_progress"` with `retry_after_seconds: 20` — the scan keeps going and is cached, so the retry is instant. `holder_rpc_unavailable` (503, `retry_after_seconds: 15`) is a fail-closed RPC outage. Both throw `MadeOnSolError` with `status === 503`; inspect `error.body`. Unknown mint: 404 `error_kind: "not_a_mint"`.

```ts
import { MadeOnSolError } from "madeonsol";

async function holders(mint: string) {
  for (;;) {
    try {
      return await client.alpha.holders(mint);
    } catch (e) {
      const body = e instanceof MadeOnSolError ? (e.body as { error_kind?: string; retry_after_seconds?: number }) : null;
      if (e instanceof MadeOnSolError && e.status === 503 && body?.error_kind === "holder_scan_in_progress") {
        await new Promise((r) => setTimeout(r, (body.retry_after_seconds ?? 20) * 1000)); // scan is cached — retry is instant
        continue;
      }
      throw e;
    }
  }
}

const { holders: top, concentration, excluded } = await holders("EPjFW...");
console.log(`${concentration.holder_count} holders · top10 ${concentration.top10_share}% of circulating`);
console.log(`bonding curve / pools hold ${concentration.pool_pct}% of supply (${excluded.length} excluded owners)`);
console.log(top[0].owner, BigInt(top[0].amount_raw), top[0].labels);
```

Returns: `TokenHoldersResponse` (`TokenHolder`, `TokenHoldersExcluded`, `TokenHoldersConcentration`, `TokenHoldersDeployer`, `TokenHoldersSource`, `TokenHolderLabel`, `TokenHolderExcludedReason`, `TokenHoldersMethod`)

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

Aggregate stats over 90d plus cross-product flags (KOL / alpha / deployer). Includes enrichments: top traded tokens with realized PnL, trading style, deployer tier mix, recent trades. **v2.8** adds `derived` block: win rate, ROI, best/worst trade, biggest miss (token sold that later mooned), and AI-classified verdict. **v2.20** adds reputation flags to `flags`: `is_sniper`, `is_bundler` (lifetime), `is_dumper` (rolling 42d), and `dump_cluster` cohort stats — pump.fun-pipeline scoped, so `false` means "not observed", NOT verified clean. **v2.20 type fix:** `flags.bot_confidence` is a string enum (`"none" | "low" | "medium" | "high" | null`), not a number — the old `number | null` typing never matched a real value (the API returned `null` unconditionally due to a bug, now fixed).

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

#### `client.wallet.holdings(address, params?)`

Verified **current** on-chain holdings — reads the wallet's actual SPL + Token-2022 token accounts and SOL balance straight from chain, enriches each with our price/MC/name/symbol, and computes a `transfer_delta` (on-chain `amount` − trade-derived net position). A nonzero `transfer_delta` exposes tokens that arrived or left **without a swap** — airdrops, insider funding, wallet-hopping. Distinct from `positions()` (trade-derived FIFO): holdings is "what they actually hold right now". **ULTRA only.**

```ts
const h = await client.wallet.holdings("ASVz...ybJk", { min_value_usd: 10 });
console.log(`${h.summary.non_zero} tokens · $${h.summary.total_value_usd} · ${h.sol_balance} SOL`);
for (const t of h.holdings) {
  const d = t.transfer_delta;
  const flag = d && d > 0 ? "  ⬅ arrived without a swap" : "";
  console.log(`  ${t.symbol ?? t.mint.slice(0,8)}…  ${t.amount}  ($${t.value_usd ?? "—"})${flag}`);
}
```

Params:
- `limit` — 1-500, default 200
- `min_value_usd` — number ≥0, default 0 (minimum USD value per holding to include)

Returns: `WalletHoldingsResponse` — `holdings[]` (typed `Holding`), `sol_balance`, `summary` (`token_accounts` / `non_zero` / `returned` / `priced` / `total_value_usd` / `truncated`), `verified_at`, `trade_window_days`, `cache_hit`, `ttl_seconds`.

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

#### `client.wallet.batchClassify(wallets)` *(new in 2.20 — PRO+)*

Bulk wallet reputation flags — 1–100 addresses in one request (`POST /wallet/batch/classify`). Each entry carries the same flag values as the `flags` block of `stats()`: `is_sniper`, `is_bundler`, `is_dumper`, `is_kol` + `kol_name`, `bot_confidence` (`"none"`/`"low"`/`"medium"`/`"high"` or null), and `dump_cluster` (`{ dump_cohorts, runner_cohorts, total_cohorts, as_of }` or null).

**Semantics** — flags are pump.fun-pipeline scoped: `false` means the behavior was **not observed** by our pipeline, NOT that the wallet is verified clean. `is_bundler` is a lifetime flag; `is_dumper` is a rolling 42-day window.

```ts
const { wallets, as_of } = await client.wallet.batchClassify([buyerA, buyerB, buyerC]);
for (const w of wallets) {
  const tags = [w.is_sniper && "sniper", w.is_bundler && "bundler", w.is_dumper && "dumper", w.is_kol && `KOL ${w.kol_name}`].filter(Boolean);
  console.log(`${w.address.slice(0, 8)}…  ${tags.join(" · ") || "clean-ish (not observed)"}  bot=${w.bot_confidence ?? "?"}`);
}
```

Returns: `WalletBatchClassifyResponse` — `{ wallets: WalletClassification[], count, as_of }`.

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

#### `client.deployer.deployerHistory(wallet, opts?)`

Daily reputation time-series for a deployer — one snapshot per `date` capturing the `tier`, `is_tracked` flag, `total_deployed`/`total_bonded`, `bonding_rate`, `recent_bond_rate`, `avg_peak_mc`, and `best_token_peak_mc` that were true on that day. Backtest "was this deployer elite when it launched token X?" without look-ahead bias. `opts.limit` is 1–365 daily snapshots (default 90).

```ts
const { is_deployer, snapshots } = await client.deployer.deployerHistory("3xAB...", { limit: 180 });
const onLaunch = snapshots.find((s) => s.date === "2025-01-01");
console.log(onLaunch?.tier, onLaunch?.bonding_rate);
```

Returns: `DeployerHistoryResponse`

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

#### `client.token.trades(mint, params?)` *(new in 2.20 — PRO+)*

Mint-scoped trade tape — every captured trade for a token, cursor-paginated newest first (`GET /tokens/{mint}/trades`). Each trade carries `tx_signature`, `wallet_address`, `action`, `sol_amount`, `token_amount`, `price_sol`/`price_usd`, `early_buyer_rank`, `slot`, `block_time`, `traded_at`. Unlike `client.wallet.trades()` (90-day default), the default window here is the **full history**.

**Coverage honesty** — the tape starts 2026-04-12 and is pump.fun-pipeline scoped; the `coverage` block (`history_start`, `scope`) makes both visible on every response. Trades outside that pipeline are not on the tape.

```ts
let cursor: string | undefined;
while (true) {
  const page = await client.token.trades(mint, { limit: 500, cursor, action: "buy" });
  for (const t of page.trades) processBuy(t);
  if (!page.has_more) break;
  cursor = page.next_cursor!;
}
```

Params:
- `limit` — 1-500, default 100
- `cursor` — from `next_cursor` of previous response
- `action` — `"buy"` or `"sell"`
- `wallet` — filter to one wallet address
- `since` / `until` — Unix epoch seconds (default: full history)

Returns: `TokenTradesResponse` with `trades[]` + `next_cursor` + `has_more` + `filters` echo + `coverage`.

---

#### `client.token.locks(mint, params?)` *(new in 2.25 — PRO+)*

Token locks & vesting on a mint (`GET /tokens/{mint}/locks`) — every on-chain **Streamflow** stream, **Jupiter Lock** vesting escrow and **Bonfida** token-vesting contract, decoded from the locker programs' account state. Each row carries the schedule (`start_at` / `cliff_at` / `period_seconds` / `end_at`, `cliff_amount`, `amount_per_period`), the terms (`cancelable_by_sender` — funds are locked against the *recipient*, not the locker; `cancelable_by_recipient`, `transferable`, `can_topup`) and a **live-derived** view computed at request time: `locked_raw` (still locked now), `unlocked`, `withdrawn`, `claimable`, `status` (active / completed / cancelled / closed) and `next_unlock` (cliff | period | final | tranche). `summary` rolls up `lock_count`, `active_count`, `by_program` / `by_kind`, `distinct_lockers`, locked / deposited totals (raw + ui + usd + % of supply), `unlocking_7d_*` / `unlocking_30d_*`, the nearest `next_unlock` and `active_cancelable_by_sender`. **PRO+** — BASIC receives HTTP 403.

- `*_raw` amounts are base-unit **strings** — never floats; use `BigInt()`. `amount` / `locked` / `*_usd` / `*_pct_of_supply` are `null` when decimals or price are unknown (`token.facts_resolved`).
- **LP locks are NOT included** — this is token / vesting locks only.
- `status` / `program` narrow `locks[]` only; `summary` always covers every contract on the mint (`summary.complete` is false past 5000 contracts — totals then cover the newest 5000).
- `created_at_estimated: true` marks a backfilled Jupiter Lock row with no on-chain creation time.

```ts
const { summary, locks } = await client.token.locks(mint, { status: "active" });
console.log(`${summary.locked_pct_of_supply}% of supply locked · ${summary.unlocking_7d_usd} USD unlocks in 7d`);
console.log(`${summary.active_cancelable_by_sender} active locks the locker can still cancel`);
for (const l of locks) console.log(l.program, l.kind, BigInt(l.locked_raw), "until", l.end_at, l.cancelable_by_sender ? "(cancelable)" : "");
```

Params: `status` (active | completed | cancelled | closed), `program` (streamflow | jupiter_lock | bonfida_vesting), `limit` (1–500, default 200).

Returns: `TokenLocksResponse` (`TokenLock`, `TokenLocksSummary`, `TokenLockNextUnlock`, `TokenLockToken`, `TokenLockProgram`, `TokenLockKind`, `TokenLockStatus`, `TokenUnlockEventKind`)

---

#### `client.token.locksFeed(params?)` *(new in 2.25 — PRO+)*

Cross-token feed of **new** lock / vesting contracts, newest first (`GET /tokens/locks`) — who just locked tokens, of what mint, how much, until when. Rows are the same live-derived contract as `locks()` plus `token` (`symbol`, `decimals`, `price_usd`, `market_cap_usd`). Poll with `since = pagination.next_since`, page back with `before = pagination.next_before`, or subscribe to the **`token:locks`** WS channel (event `token:lock`) for a push the moment the contract lands on-chain. `min_usd` / `min_pct_of_supply` / `status` post-filter (×4 over-fetch, so a page may be shorter than `limit`). Backfilled Jupiter Lock rows are excluded unless `include_estimated: true`. **LP locks are NOT included.** **PRO+**.

```ts
let since: string | undefined;
for (;;) {
  const page = await client.token.locksFeed({ since, min_usd: 10_000 });
  for (const l of page.locks) console.log(l.token.symbol, l.amount_usd, "USD locked until", l.end_at, "by", l.sender);
  since = page.pagination.next_since ?? since;
  await new Promise((r) => setTimeout(r, 30_000));
}
```

Params: `since` / `before` (ISO date-time cursors), `mint`, `sender`, `recipient`, `program`, `kind` (lock | vesting), `status`, `min_usd`, `min_pct_of_supply` (0–100), `include_estimated` (boolean), `limit` (1–100, default 50).

Returns: `TokenLocksFeedResponse` (`TokenLockFeedEntry`, `TokenFeedPagination`, `TokenFeedStreamPointer`)

---

#### `client.token.unlocks(params?)` *(new in 2.25 — PRO+)*

Upcoming **unlock events** across all active lock / vesting contracts inside a window (`GET /tokens/unlocks`) — which tokens have locked supply hitting the market, how much, from whose lock. One entry per active contract = its **next** unlock event in the window (`event`: cliff | period | final | tranche) with `unlock_at` / `in_seconds` / `amount_*`, plus `window_amount_*` = that contract's total release over the whole window, the mint's `token` facts and the parent `lock` (subset of the `locks()` row). Continuous per-second streams (Streamflow payroll) contribute only their cliff / final events. **LP locks are NOT included.** **PRO+**.

```ts
const { window, unlocks } = await client.token.unlocks({ within: "24h", sort: "largest_usd", min_usd: 50_000 });
console.log(window.from, "→", window.to);
for (const u of unlocks) console.log(u.token.symbol, u.event, u.amount_usd, "USD in", u.in_seconds, "s —", u.lock.program, u.lock.sender);
```

Params: `within` (1h | 6h | 24h | 3d | 7d (default) | 14d | 30d | 90d), `mint`, `program`, `kind`, `min_usd`, `min_pct_of_supply`, `sort` (soonest (default) | largest_usd | largest_pct), `limit` (1–200, default 50).

Returns: `TokenUnlocksResponse` (`TokenUnlockEvent`, `TokenUnlocksWithin`)

---

#### `client.token.feeShares(mint)` *(new in 2.25 — PRO+)*

pump.fun **creator-fee sharing** on a coin (`GET /tokens/{mint}/fee-shares`) — who its creator fees are redirected to. Decodes the on-chain `SharingConfig` (pump_fees PDA `["sharing-config", mint]`): `admin`, `status`, each shareholder's `share_bps` / `share_pct` with `is_admin` and `is_social_pda` (a SocialFeePda holds fees earmarked for a platform identity — `social.platform` 2 = X, `social.user_id` is the platform-native numeric id, **not** the handle — with `lifetime_claimed`), `redirected_bps` (share going to non-admin addresses), `social_bps` and `is_default` (100% to the creator — a real answer: pump creates one config per coin). Plus `distributions` (every `distribute_creator_fees` payout, pro-rata per shareholder; per-recipient `received_*` totals; `past_recipients` no longer in the split), `history` (config created / updated / reset, creator transferred) and `recent_distributions`. `config.source` is `"stream"` (our table — only non-default configs are stored) or `"chain"` (live PDA read; `config_error` set and `config` null if every RPC endpoint failed). Amounts are quote base units (SOL lamports unless a stable-quoted coin) as **strings**. **Event / distribution history starts 2026-08-17.** **PRO+**.

```ts
const fs = await client.token.feeShares(mint);
if (fs.config?.is_default) console.log("100% of creator fees go to the creator");
else for (const s of fs.config?.shareholders ?? []) console.log(s.address, s.share_pct, "%", s.social?.platform_label ?? "", "received", s.received_usd, "USD");
console.log(fs.distributions.count, "distributions,", fs.distributions.total_usd, "USD since 2026-08-17");
```

Returns: `TokenFeeSharesResponse` (`TokenFeeSharingConfig`, `TokenFeeShareholder`, `TokenFeeSocialIdentity`, `TokenFeeShareHistoryEntry`, `TokenFeeDistribution`, `TokenFeeShareEntry`)

---

#### `client.token.feeClaims(params?)` *(new in 2.25 — PRO+)*

pump.fun **fee-event feed**, newest first (`GET /tokens/fee-claims`). `type`s: `distribution` (creator fees paid out pro-rata to the SharingConfig shareholders — fees redirected to others — with `payouts[]` per address), `social_claim` (fees earmarked for a platform identity — 2 = X — claimed to a `recipient` wallet), `shares_created` / `shares_updated` / `shares_reset` (config changes), `creator_transferred`, and `creator_claim` (the plain creator vault claim — per creator, carries **no mint**; excluded unless you ask for it via `type`). Default 100%-to-creator configs and zero-amount distributions are not stored. Poll with `since = pagination.next_since` or subscribe to the **`token:fee_claims`** WS channel (event `token:fee_claim`). Amounts are quote base units as **strings** + `amount` / `amount_usd`. **History starts 2026-08-17.** **PRO+**.

```ts
const { events } = await client.token.feeClaims({ type: "distribution,social_claim", min_sol: 1 });
for (const e of events) console.log(e.type, e.mint, e.amount, e.quote, e.recipient ?? `${e.payouts?.length} payouts`);
```

Params: `type` (comma list), `mint`, `recipient`, `actor`, `social_platform` (2 = X), `social_user_id`, `min_sol`, `since` / `before` (ISO date-time cursors), `limit` (1–100, default 50).

Returns: `TokenFeeClaimsResponse` (`TokenFeeClaimEvent`, `TokenFeePayout`, `TokenFeeEventType`, `TokenFeedPagination`, `TokenFeedStreamPointer`)

---

#### `client.token.surges(params?)` *(new in 2.26 — PRO+)*

Token **momentum fires**, newest first (`GET /tokens/surges`). Two kinds. **`surge`** — a token < 30 min old whose market cap runs hard vs its *launch* MC: tier `early` (≤ 10 min, ≥ $12k, ≥ 3× launch MC), `strong` (≤ 30 min, ≥ $30k, ≥ 6× launch **and** ≥ 2× the lowest sample of the last 3 min — it is climbing *now*), `breakout` (≤ 2 min, ≥ $45k, ≥ 8×). Each tier fires at most once per mint; tiers are independent (a token can go straight to breakout). A tier must be **sustained** — floor + multiple hold on the current tick *and* on a sample ≥ 10 s older, and nothing fires before 20 s of age: a one-tick mark (same-slot bundle, routed dust) is a spike, not a surge. When the engine first saw the token late (`baseline_source: "late"`) the launch multiple is not applied — USD floor + velocity only. **`revival`** — a token with **no 1-minute trade candle for ≥ 24 h** that starts trading again, confirmed **only by the tape** (≥ 5 buys, ≥ $500 buy volume, MC ≥ 1.5× the pre-dormancy close — or ≥ 20 buys / ≥ $5k regardless), never by the price mark: a single dust buy into an empty pool marks MC up 300 % and is not a revival. One fire per dormancy episode (24 h re-fire guard). **Hard gates on both kinds** (not flags): liquidity ≥ $1.5k *and* ≥ 2 % of MC when known, MC ≤ $100B, and the MC gained must be **paid for** — buy volume on the tape ≥ 3 % × (MC − launch / pre-dormancy MC); a price mark in a spoof pool moves MC on ~$0 of volume. **PRO+** — BASIC receives HTTP 403.

Every row carries `tape` (buys / sells / volume since birth or revival; `tape.source` = `candles` or `wallet_trades`, `tape.available: false` with nulls while no tape covers the window yet; `unique_buyers` / `trades_per_wallet` only when the mint is in `token_trades` coverage — `wallet_data_available: false` otherwise, **never inferred zero**), `kol` (tracked-KOL buyers + names), `early_buyers` (first-20 cohort: bundled, cohort SOL, sold, sniper wallets), `deployer` (tier, bonding / runner rate, labeled tokens) and **`risk_flags[]`** — the honest half (thresholds echoed in `definitions.risk_flags`). Rows ≥ 65 min old carry `outcome` (`mc_usd_1h_after`, `peak_mc_usd_1h_after`, `low_mc_usd_1h_after`, `mc_1h_multiple`, `peak_1h_multiple`, `priced_after_1h` — `false` = no candle in the hour, not zero); `stats: true` adds per-(kind, tier) hit-rates over `days` (`up_1h_pct`, `median_peak_multiple`, `doubled_1h_pct`) — out-of-sample by construction, the fire is recorded before the outcome exists. The live thresholds are echoed in `definitions` (read from the engine, so they cannot drift from what fires). Poll with `since = pagination.next_since`, or subscribe to the **`token:surges`** WS channel (events `token:surge` / `token:revival` — the same object minus `outcome`).

- Nearly every scalar is `| null` — null means unknown, never zero. `tier` is null on revivals; `dormant_hours` / `prev_mc_usd` / `mc_vs_prev_multiple` are null on surges; `baseline_*` / `mc_multiple` / `mc_change_3m_pct` are null on revivals.
- `launchpad` is the venue at *birth*, `primary_dex` where it trades at fire time — a pump token that graduated inside its first 10 min is `pumpfun` / `pumpswap`.
- `tier` with `kind: "revival"` is a 400; an unknown flag in `exclude_flags` is a 400 with `known_flags[]`.

```ts
const { events, stats } = await client.token.surges({ kind: "surge", tier: "strong", exclude_flags: ["bundled_launch", "sniper_heavy"], stats: true });
for (const e of events) {
  console.log(e.symbol, `$${e.market_cap_usd}`, `${e.mc_multiple}× launch`, e.tape.buys, "buys /", e.tape.unique_buyers ?? "n/a", "buyers", e.risk_flags, e.outcome ? `${e.outcome.peak_1h_multiple}× peak in 1h` : "outcome pending");
}
for (const r of stats?.rows ?? []) console.log(r.kind, r.tier, `${r.up_1h_pct}% up after 1h`, "median peak", r.median_peak_multiple, `(${r.with_outcome} fires)`);

// live
const stream = await client.stream.connect();
stream.subscribe(["token:surges"], { kinds: ["surge"], tiers: ["strong", "breakout"], exclude_flags: ["bundled_launch"], min_mc_usd: 30_000 } satisfies TokenSurgesSubscribeFilters);
stream.on("token:surge", (d) => { const e = d as TokenSurgeStreamEvent; console.log(e.tier, e.symbol, e.market_cap_usd, e.risk_flags); });
stream.on("token:revival", (d) => { const e = d as TokenSurgeStreamEvent; console.log("revived after", e.dormant_hours, "h", e.symbol, e.mc_vs_prev_multiple); });
```

Params: `kind` (surge | revival), `tier` (early | strong | breakout — surge only), `mint`, `since` / `before` (ISO date-time cursors), `min_mc_usd` / `max_mc_usd`, `min_buys`, `launchpad`, `deployer_tier` (elite | good | moderate | rising | cold | unranked), `exclude_flags` (array or comma list), `only_clean` (boolean), `stats` (boolean), `days` (1–30, default 7), `limit` (1–200, default 50).

Returns: `TokenSurgesResponse` (`TokenSurgeEvent`, `TokenSurgeStreamEvent`, `TokenSurgeTape`, `TokenSurgeKol`, `TokenSurgeEarlyBuyers`, `TokenSurgeDeployer`, `TokenSurgeOutcome`, `TokenSurgeStats`, `TokenSurgeStatsRow`, `TokenSurgesFilters`, `TokenSurgeDefinitions`, `TokenSurgeKind`, `TokenSurgeTier`, `TokenSurgeRiskFlag`, `TokenSurgeDeployerTier`, `TokenSurgesSubscribeFilters`, `TokenFeedPagination`, `TokenFeedStreamPointer`)

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

Issue your WebSocket streaming token. Pro/Ultra subscribers get `ws_url` for KOL/deployer event streaming. Ultra subscribers also get `dex_ws_url` for the all-DEX trade stream.

Stream tokens **never expire** (since 2.25.1): the same token comes back on every call until your subscription lapses or you pass `{ rotate: true }` to replace it (the previous value keeps working for 60 s). Send it as `Authorization: Bearer <token>` on the WebSocket handshake (`?token=` still works). A `4001` close means "mint again", never a timer.

```ts
const token = await client.stream.getToken();
console.log(token.ws_url);      // wss://madeonsol.com/ws/v1/stream
console.log(token.dex_ws_url);  // wss://madeonsol.com/ws/v1/dex-stream (Ultra only)
console.log(token.expires_at);  // null — never expires
const fresh = await client.stream.getToken({ rotate: true }); // replace it
```

Returns: `StreamToken` — `{ token, expires_at: null, next_refresh_at: null, rotated, lifetime, ws_url, dex_ws_url?, usage }`

#### `client.stream.connect()` *(new in 2.10)*

Open a **managed** stream — token fetch (the token never expires; `getToken()` is called on every (re)connect), auto-reconnect (backoff + jitter), heartbeat liveness, and typed events are handled for you. No need to touch `getToken()` or `ws` directly.

```ts
const stream = client.stream.connect();
stream.on("kol:trade", (t) => console.log(t.token_symbol, t.action));
stream.on("deployer:alert", (a) => console.log("new deploy", a.token_mint));
stream.subscribe(["kol:trades", "deployer:alerts"]);
// stream.unsubscribe([...]) / stream.close() when done
```

Channels: `kol:trades`, `kol:coordination`, `kol:first_touches`, `deployer:alerts`, `wallet_tracker:events`, `copytrade:signals`, `price_alert:events`, `sniper:deploys`, `token:graduations`, `token:prices` (**new** in the channel list — event `token:price`, per-mint price/MC ticks; PRO+, REQUIRES `filters.mints` — PRO 25 / ULTRA 100 / BUSINESS 250 per connection; a state stream, so ticks carry no id/seq and are never replayed) (every pump.fun graduation in real time, tracked deployer or not — typed `GraduationEvent`), `token:locks` (**new 2.25** — event `token:lock` for every NEW Streamflow / Jupiter Lock / Bonfida lock or vesting contract, typed `TokenLockStreamEvent`; PRO+; updates are not pushed — poll `client.token.locks()`), `token:fee_claims` (**new 2.25** — event `token:fee_claim` for every pump.fun fee event: distributions, social-handle claims, config changes, typed `TokenFeeClaimStreamEvent`; PRO+), `token:surges` (**new 2.26** — events `token:surge` / `token:revival` the moment a momentum fire is confirmed, typed `TokenSurgeStreamEvent` with `tape` / `kol` / `early_buyers` / `deployer` / `risk_flags[]`; server-side filters `kinds[]`, `tiers[]`, `launchpads[]`, `exclude_flags[]`, `min_mc_usd` / `max_mc_usd`, `deployer_tier[]` — typed `TokenSurgesSubscribeFilters`; PRO+; the +1 h `outcome` is REST-only — poll `client.token.surges()`). Lifecycle: `open`, `close`, `reconnect`, `subscribed`, `heartbeat`, `warning`, `cursor`, `replay`, `gap`, `fatal`, `error`. Node 22+ uses the global `WebSocket`; on Node < 22 also `npm i ws`.

##### Recovery: cursor, resume, de-duplication *(new in 2.28.0)*

The stream client keeps a **resume cursor** `{ instance, seq, ts }` — the position of the last frame your handlers finished — and on every reconnect asks the server to resume after it (`subscribe { …, resume }`).

- **"Processed"** means every handler for that frame returned, or the promise it returned settled. Return a promise from an async handler and the cursor waits for it (and for every earlier frame). A handler that throws or rejects still counts as processed; the error goes to `error`.
- **At-least-once, never exactly-once.** After a reconnect a frame can arrive again. The client drops ids it delivered recently (the last 10,000, option `dedupeSize`); anything you persist should still dedupe on `evt.id`. Replayed frames carry `evt.replayed === true`.
- **Persistence.** The cursor lives in memory. Save `stream.getCursor()` (or on every `cursor` event) and pass it back as `{ resume }` to continue after a process restart. Persist the committed cursor, never `getProgress()`.
- **Committed cursor vs progress.** `getCursor()` is the COMMITTED, safe cursor — persist and resume from this one. `getProgress()` is what has been received and handled (replayed frames included) and is not safe to resume from. Live frames commit as they are handled. Replayed frames never commit: the server replays channel by channel, so only a `replay_end` the server calls complete — or one whose gaps are all final — commits, at the server's `last_seq` / `last_ts`. If a recovery is incomplete, or the socket closes mid-replay, the committed cursor stays at the pre-resume point, and live frames after it are delivered but not committed until a later recovery completes (`isRecoveryIncomplete()`). **Trade-off:** the next reconnect re-requests the unrecovered range from the old cursor, and what arrives twice is dropped by id. Call `acceptGap()` once you have backfilled the range the `gap` event named, or decided to skip it. A gap the server calls final is handled by `onUnrecoverableGap` (below).
- **Gaps: what is known, and who decides.** A `gap` event says which channels the server could not rebuild, the **range that may be incomplete** (`skipped.from` → `skipped.to`, plus `from`), the server's `reason`, whether it is `permanent`, and the bounds the server reported (`limits`, and per-channel `time_basis` / `truncated_at_ts` / `retry_after_ms` under `channels`). Events in that range **may** be missing — the number cannot be known, so it is never stated. Backfill the range from REST if you need certainty.
  - **Transient** (`retryable: true` — `backpressure`, `closed`, `source_busy`, `source_error`, `late_ingest_possible`, `row_cap`): the committed cursor stays put, live frames do not commit, and the client resumes again after the server's `retryAfterMs` (for `row_cap`, from `resumeTsHint`), then on every reconnect. `resumeTsHint` is used only when EVERY incomplete channel is `row_cap`; otherwise the retry asks from the committed cursor again. The client asks again after the server’s `retryAfterMs` at most `maxResumeRetries` times per connection (default 5); when that budget is spent the gap event says `exhausted: true`, the cursor stays where it is, and the next reconnect resumes again.
  - **Final** (`retryable: false` — `not_reconstructable`, `window_exceeded`, and an older server's `ring_truncated` / `instance_changed`): asking again can never fill it. **The SDK then decides to continue** — that is the client's decision, not your approval — and reports it on the same `gap` event with `advancedPastGap: true`, `source: "auto"` and the range being skipped, *before* the cursor moves. Set `onUnrecoverableGap: "stop"` to keep the cursor instead: the stream stops and emits `fatal` with the gap, and you decide (`acceptGap()` then `connect()` continues; `acceptGap()` reports the same gap with `source: "manual"`).
- **Older servers.** Against a server that does not understand `resume` yet, the client falls back to `replay_since_seq` (same server process) or `replay_since_ts` (the server restarted). That only covers the server's in-memory buffer (minutes), and a restart is reported as a `gap` with `instance_changed`.
- **Close codes.** `4001` → the token is re-fetched and the client reconnects (`maxAuthRetries`, default 3, then `fatal`); `4002` connection limit → `error` plus a wait of at least 60 s (`connectionLimitBackoffMs`) — free a ghost slot with the stream-sessions API; `4003` → `fatal`, the client stops; `4008` slow consumer → reconnect and resume. The backoff resets only when the server acks a subscribe, never on a bare socket open.
- **Warnings.** `warning` fires for every server warning frame, including `channels_rejected` and `channels_revoked` (revoked channels are removed from the subscription so reconnects do not re-request them) (a channel dropped after a plan change). A rejected or revoked channel is silent, so handle it.

```ts
const stream = client.stream.connect({ resume: loadCursor() ?? undefined });
stream.on("*", async (data, evt) => {
  await store.upsert(evt!.id, data); // the cursor advances once this resolves
});
stream.on("cursor", (c) => saveCursor(c));        // { instance, seq, ts }
stream.on("gap", (g) => console.warn("may be missing:", g.reasons, g.skipped)); // g.advancedPastGap: the SDK continued past it
stream.on("fatal", (f) => console.error("stream stopped:", f.code, f.reason));
```

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

  // Wallet classification (v2.20)
  WalletClassification,
  WalletBatchClassifyResponse,
  BotConfidence,
  DumpClusterStats,

  // Token trade tape (v2.20)
  TokenTradesParams,
  TokenTrade,
  TokenTradesResponse,
  TokenTradesCoverage,

  // Sniper footprint (v2.20)
  SniperFootprint,

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
- [Pricing & API keys](https://madeonsol.com/pricing) — Free tier: 200 requests/day, no signup payment
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
