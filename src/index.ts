// ─────────────────────────────────────────────────────────────────────────────
// MadeOnSol SDK
// Official TypeScript wrapper for the MadeOnSol Solana API.
// Zero dependencies — uses native fetch (Node ≥ 18).
// ─────────────────────────────────────────────────────────────────────────────

import { MadeOnSolStream } from "./stream.js";
import type { StreamClientOptions } from "./stream.js";

export { MadeOnSolStream } from "./stream.js";
export type {
  StreamClientOptions,
  StreamChannel,
  StreamEventName,
  StreamEvent,
  StreamLifecycleEvent,
} from "./stream.js";

const BASE_URL = "https://madeonsol.com/api/v1";

// ─── Error ───────────────────────────────────────────────────────────────────

export class MadeOnSolError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "MadeOnSolError";
    this.status = status;
    this.body = body;
  }
}

// ─── Shared types ────────────────────────────────────────────────────────────

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ─── KOL types ───────────────────────────────────────────────────────────────

export type KolAction = "buy" | "sell";
export type LeaderboardPeriod = "today" | "7d" | "30d" | "90d" | "180d";
export type CoordinationPeriod = "1h" | "6h" | "24h" | "7d";
export type KolStrategy = "scalper" | "day_trader" | "swing_trader" | "hodler" | "mixed";
export type KolLeaderboardSort =
  | "pnl"
  | "winrate"
  | "volume"
  | "avg_roi"
  | "profit_factor"
  | "early_entry_pct"
  | "consistency";
export type KolWalletInclude = "pnl_by_token" | "recent_winners" | "recent_losers";

export interface KolFeedParams {
  /** Number of trades to return (1–100). Default: 50. */
  limit?: number;
  /** Cursor — return trades strictly older than this ISO 8601 timestamp. Pass `next_before` from the previous response. */
  before?: string;
  /** Filter by trade direction. */
  action?: KolAction;
  /** Filter by a specific KOL wallet address. */
  kol?: string;
  /** Minimum SOL amount per trade. */
  min_sol?: number;
  /** Maximum token age in minutes at trade time. */
  token_age_max_min?: number;
  /** Return only buys — convenience alias for action="buy". */
  exclude_sells?: boolean;
  /** Only trades by KOLs with 7d win rate >= this (0–100). */
  min_kol_winrate?: number;
  /** Filter by auto-classified strategy tag. */
  strategy?: KolStrategy;
  /** v1.6 — Lower bound on market_cap_usd_at_trade. Trades with unknown MC are dropped when this is set. */
  min_mc_usd?: number;
  /** v1.6 — Upper bound on market_cap_usd_at_trade. */
  max_mc_usd?: number;
}

export interface KolLeaderboardParams {
  /** Time window for ranking. Default: "7d". */
  period?: LeaderboardPeriod;
  /** Sort key. Default: "pnl". */
  sort?: KolLeaderboardSort;
  /** Filter by auto-classified strategy tag. */
  strategy?: KolStrategy;
  /** Minimum 7d win rate (0–100). */
  min_winrate?: number;
  /** Max results (1–100). Default: 50. */
  limit?: number;
}

export interface KolWalletParams {
  /** Comma-separated extras: "pnl_by_token", "recent_winners", "recent_losers". PRO/ULTRA only. */
  include?: KolWalletInclude | string;
}

export interface KolCoordinationParams {
  /** Look-back window. Default: "24h". */
  period?: CoordinationPeriod;
  /** Minimum number of KOLs required to flag coordination (2–50). Default: 3. */
  min_kols?: number;
  /** Max results (1–50). Default: 20. */
  limit?: number;
  /** Minimum average 7d win rate across cluster KOLs (0–100). */
  min_avg_winrate?: number;
  /** Require at least 2 distinct strategy tags in the cluster (filters echo chambers). */
  unique_strategies?: boolean;
  /** v1.1 — Include major memecoins (WIF/BONK/POPCAT). Default: false. */
  include_majors?: boolean;
  /** v1.1 — Peak-density sliding window in minutes (1–60). Default: 15. */
  window_minutes?: number;
  /** v1.1 — Minimum composite coordination score (0–100). Default: 0. */
  min_score?: number;
  /** v1.6 — Lower bound on the cluster's entry MC (MC at the chronologically-first KOL buy). Tokens with unknown entry MC are dropped when this is set. */
  min_mc_usd?: number;
  /** v1.6 — Upper bound on the cluster's entry MC. */
  max_mc_usd?: number;
}

export interface KolTradeDeployer {
  wallet: string;
  tier: string;
  bonding_rate?: number | null;
}

export interface KolTrade {
  tx_signature: string;
  wallet_address: string;
  kol_name?: string | null;
  kol_twitter?: string | null;
  action: KolAction;
  token_mint: string;
  token_name?: string | null;
  token_symbol?: string | null;
  token_image_url?: string | null;
  sol_amount: number;
  token_amount: number;
  /** Token market cap in USD at the moment of trade (real-time, sourced from
   *  our in-memory price tracker — not the Dexscreener spot which lags). */
  market_cap_usd_at_trade?: number | null;
  /** Token price in USD at the moment of trade. */
  price_usd_at_trade?: number | null;
  traded_at: string;
  kol_strategy_tag?: string | null;
  kol_auto_strategy_tag?: string | null;
  kol_winrate_7d?: number | null;
  kol_winrate_30d?: number | null;
  kol_early_entry_pct_30d?: number | null;
  kol_is_heating_up?: boolean | null;
  kol_percentile_pnl_7d?: number | null;
  kol_percentile_winrate_7d?: number | null;
  token_age_minutes?: number | null;
  deployer?: KolTradeDeployer | null;
  deployer_tier?: string | null;
}

export interface KolFeedResponse {
  trades: KolTrade[];
  count: number;
  data_age_seconds?: number | null;
  /** Cursor for the next page — pass as `before` to fetch older trades. */
  next_before?: string | null;
  _rid?: string;
}

export interface KolLeaderboardEntry {
  name?: string | null;
  wallet: string;
  strategy_tag?: string | null;
  auto_strategy_tag?: string | null;
  pnl: number;
  buy_count: number;
  sell_count: number;
  volume: number;
  win_rate?: number | null;
  avg_roi?: number | null;
  profit_factor?: number | null;
  early_entry_pct_30d?: number | null;
  consistency_7d?: number | null;
  is_heating_up?: boolean | null;
  is_cold?: boolean | null;
  percentile_pnl_7d?: number | null;
  percentile_winrate_7d?: number | null;
  percentile_pnl_30d?: number | null;
  percentile_winrate_30d?: number | null;
  /** Median position hold duration in minutes over the last 30 days. */
  median_hold_minutes_30d?: number | null;
  /** Percentile rank for early entry (0–100) over the last 30 days. */
  percentile_early_entry_30d?: number | null;
}

export interface KolLeaderboardResponse {
  leaderboard: KolLeaderboardEntry[];
  period: string;
  sort?: string | null;
  _rid?: string;
}

export interface KolPnlByToken {
  mint: string;
  token_name: string | null;
  token_symbol: string | null;
  realized_pnl_usd: number;
  buy_count: number;
  sell_count: number;
}

export interface KolWalletProfile {
  wallet: string;
  kol_name: string | null;
  kol_twitter: string | null;
  total_pnl_usd: number;
  win_rate: number;
  trade_count: number;
  pnl_by_token?: KolPnlByToken[];
}

export interface CoordinationKol {
  name: string;
  wallet: string;
  /** v1.1 — Sum of SOL spent by this KOL (PRO+ sees buy_sol/sell_sol/exited). */
  buy_sol?: number;
  sell_sol?: number;
  /** v1.1 — True if sell_sol > buy_sol (net-flow-negative). */
  exited?: boolean;
}

export interface CoordinatedToken {
  token_mint: string;
  token_name: string | null;
  token_symbol: string | null;
  kol_count: number;
  total_buys: number;
  total_sells: number;
  net_sol_flow: number;
  signal: "accumulating" | "distributing";
  avg_winrate_7d: number | null;
  entry_rank_avg: number | null;
  unique_strategies: number;
  strategies: string[];
  first_buy_at: string;
  last_buy_at: string;
  time_to_consensus_sec: number;
  /** v1.1 — Peak density window (busiest N-minute stretch in the cluster). */
  peak_window_start?: string;
  peak_window_end?: string;
  peak_kols?: number;
  peak_buys?: number;
  /** v1.1 — Count of wallets that exited (net-flow-negative). */
  exited_count?: number;
  holders_count?: number;
  /** v1.1 — Composite 0–100 coordination score. */
  coordination_score?: number;
  /** v2.4 (2026-05-06) — market cap (USD) stamped on the cluster's chronologically-first KOL buy. */
  market_cap_usd_at_first_buy?: number | null;
  /** v2.4 — current market cap (USD), from token_prices. */
  market_cap_usd?: number | null;
  /** v2.4 — current last-trade price (USD). */
  last_price_usd?: number | null;
  kols?: CoordinationKol[];
}

export interface KolCoordinationResponse {
  coordination: CoordinatedToken[];
  /** v1.1 — Score formula version; bumped when weights change. */
  score_version?: string;
  /** v1.1 — Peak-density window used for this response. */
  window_minutes?: number;
  period?: string;
  min_kols?: number;
  _rid?: string;
}

// ─── Coordination alerts (v1.1) ─────────────────────────────────────────────

export type CoordinationDeliveryMode = "websocket" | "webhook" | "both";

export interface CoordinationAlertRule {
  id: string;
  name: string | null;
  min_kols: number;
  window_minutes: number;
  min_score: number;
  include_majors: boolean;
  cooldown_min: number;
  score_jump_break: number;
  delivery_mode: CoordinationDeliveryMode;
  webhook_url: string | null;
  /** v1.6 — Lower bound on entry MC (MC at the triggering trade). Tokens with unknown MC are dropped when set. */
  min_mc_usd?: number | null;
  /** v1.6 — Upper bound on entry MC. */
  max_mc_usd?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CoordinationAlertCreateParams {
  name?: string;
  /** 2–50. Default: 5. */
  min_kols?: number;
  /** 1–60. Default: 15. */
  window_minutes?: number;
  /** 0–100. Default: 0. */
  min_score?: number;
  include_majors?: boolean;
  /** 1–1440 minutes. Default: 30. */
  cooldown_min?: number;
  /** Early re-fire when new score ≥ last_score + score_jump_break. 0–100. Default: 20. */
  score_jump_break?: number;
  /** Default: "websocket". */
  delivery_mode?: CoordinationDeliveryMode;
  /** Required when delivery_mode is "webhook" or "both". Must be HTTPS. */
  webhook_url?: string;
  /** v1.6 — Lower bound on entry MC. Drops triggers on tokens whose MC at the triggering trade is below this. */
  min_mc_usd?: number;
  /** v1.6 — Upper bound on entry MC. Drops triggers on tokens above this MC. */
  max_mc_usd?: number;
}

export interface CoordinationAlertUpdateParams {
  name?: string | null;
  min_kols?: number;
  window_minutes?: number;
  min_score?: number;
  include_majors?: boolean;
  cooldown_min?: number;
  score_jump_break?: number;
  delivery_mode?: CoordinationDeliveryMode;
  webhook_url?: string | null;
  is_active?: boolean;
  /** v1.6 — Pass null to clear; omit to leave unchanged. */
  min_mc_usd?: number | null;
  /** v1.6 — Pass null to clear; omit to leave unchanged. */
  max_mc_usd?: number | null;
}

export interface CoordinationAlertListResponse {
  rules: CoordinationAlertRule[];
  _rid?: string;
}

export interface CoordinationAlertCreateResponse {
  rule: CoordinationAlertRule;
  /** One-time HMAC secret. Save it — will not be shown again. */
  webhook_secret: string | null;
  note?: string;
}

export interface CoordinationAlertGetResponse {
  rule: CoordinationAlertRule;
}

export interface CoordinationAlertUpdateResponse {
  rule: CoordinationAlertRule;
}

export interface CoordinationAlertDeleteResponse {
  deleted: boolean;
}

// ─── Price alerts (v1.9) ────────────────────────────────────────────────────

export type PriceAlertDeliveryMode = "webhook" | "websocket" | "both";
export type PriceAlertStatus = "watching" | "dipped" | "recovered" | "expired";

export interface PriceAlertCreateParams {
  /** Solana mint address. */
  token_mint: string;
  /** Drop % threshold (0.01–99.99). Alert fires when MC drops below baseline × (1 − drop_pct/100). */
  drop_pct: number;
  /** Recovery % threshold (0.01–1000). After dip fires, alert fires again when MC rises above dip_low × (1 + recovery_pct/100). Optional. */
  recovery_pct?: number;
  /** Optional label. */
  name?: string;
  /** Default: "webhook". */
  delivery_mode?: PriceAlertDeliveryMode;
  /** Required when delivery_mode is "webhook" or "both". Must be HTTPS. */
  webhook_url?: string;
}

export interface PriceAlertUpdateParams {
  name?: string | null;
  delivery_mode?: PriceAlertDeliveryMode;
  webhook_url?: string | null;
  is_active?: boolean;
}

export interface PriceAlert {
  id: number;
  name: string | null;
  token_mint: string;
  token_symbol: string | null;
  baseline_mc_usd: number;
  drop_pct: number;
  recovery_pct: number | null;
  status: PriceAlertStatus;
  dip_low_mc_usd: number | null;
  dip_fired_at: string | null;
  delivery_mode: PriceAlertDeliveryMode;
  webhook_url: string | null;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PriceAlertListResponse {
  alerts: PriceAlert[];
  _rid?: string;
}

export interface PriceAlertCreateResponse {
  alert: PriceAlert;
  /** One-time HMAC secret. Save it — will not be shown again. */
  webhook_secret: string | null;
  note?: string;
}

export interface PriceAlertGetResponse {
  alert: PriceAlert;
}

export interface PriceAlertUpdateResponse {
  alert: PriceAlert;
}

export interface PriceAlertDeleteResponse {
  deleted: boolean;
}

export interface PriceAlertEvent {
  id: number;
  alert_id: number;
  event_type: "dip" | "recovery";
  fired_at: string;
  token_mint: string;
  baseline_mc_usd: number;
  current_mc_usd: number;
  drop_pct_actual: number | null;
  dip_low_mc_usd: number | null;
  recovery_pct_actual: number | null;
  delivered: boolean;
}

export interface PriceAlertEventsParams {
  alert_id?: number;
  event_type?: "dip" | "recovery";
  since?: string;
  limit?: number;
}

export interface PriceAlertEventsResponse {
  events: PriceAlertEvent[];
  _rid?: string;
}

// ─── Scout leaderboard (v1.9) ──────────────────────────────────────────────

export type ScoutLeaderboardSort = "swarm_3plus_pct" | "n_first_touches_30d" | "swarm_5plus_pct" | "scout_score";

export interface ScoutLeaderboardParams {
  limit?: number;
  scout_tier?: ScoutTier;
  sort?: ScoutLeaderboardSort;
}

// ─── KOL consensus (v1.9) ──────────────────────────────────────────────────

export interface KolConsensusResponse {
  total_kol_buyers: number;
  total_kol_sellers: number;
  kol_exit_rate: number | null;
  net_flow_sol: number;
  total_buy_sol: number;
  total_sell_sol: number;
  first_kol_buy_at: string | null;
  last_kol_buy_at: string | null;
  first_touch_wallet: string | null;
  first_touch_at: string | null;
  median_entry_mc_usd: number | null;
  /** ULTRA only — individual buyer wallets. */
  buyers?: string[];
  /** ULTRA only — wallets that fully exited. */
  exited?: string[];
  _rid?: string;
}

// ─── Peak history (v1.9) ───────────────────────────────────────────────────

export interface PeakHistoryResponse {
  peak_mc_usd: number | null;
  peak_mc_updated_at: string | null;
  current_mc_usd: number | null;
  current_price_usd: number | null;
  decline_from_peak_pct: number | null;
  mc_at_bond: number | null;
  mc_1h_after_bond: number | null;
  mc_6h_after_bond: number | null;
  mc_24h_after_bond: number | null;
  mc_7d_after_bond: number | null;
  still_alive_1h: boolean | null;
  time_to_bond_minutes: number | null;
  deployed_at: string | null;
  bonded_at: string | null;
  _rid?: string;
}

// ─── Coordination history (v1.9) ───────────────────────────────────────────

export interface CoordinationHistoryParams {
  limit?: number;
  since?: string;
  min_score?: number;
}

// ─── First-touch signal ─────────────────────────────────────────────────────

export type ScoutTier = "S" | "A" | "B" | "C";

export interface FirstTouchesParams {
  /** ISO datetime — return events strictly newer than this. Polling cursor. */
  since?: string;
  /** ISO datetime — return events strictly older than this. Pagination cursor. */
  before?: string;
  /** 1–100. Default: 50 (BASIC capped at 20). */
  limit?: number;
  /** Single KOL wallet (32–44 base58 chars). */
  kol?: string;
  /** 0–100. */
  min_kol_winrate_7d?: number;
  /** v1.6 — Lower bound on market_cap_usd_at_first_buy. Touches with unknown MC are dropped when this is set. */
  min_mc_usd?: number;
  /** v1.6 — Upper bound on market_cap_usd_at_first_buy. */
  max_mc_usd?: number;
  /** Restrict to scouts of this tier or better (S > A > B > C). Requires n_first_touches_30d ≥ 30. */
  min_scout_tier?: ScoutTier;
  /** Lower the minimum sample size for scout scoring (default 30). */
  min_n_touches?: number;
  strategy?: "scalper" | "day_trader" | "swing_trader" | "hodler" | "mixed";
  token_age_max_min?: number;
  min_first_buy_sol?: number;
  /** Suffix-filter the token mint (e.g. "pump", "bonk"). */
  mint_suffix?: string;
  /** Shortcut filter sets — `scout` = min_scout_tier=B + min_n_touches=30 + token_age_max_min=60. */
  preset?: "scout" | "fresh_launch";
  /** Comma-separated includes — currently `followers_4h` (only computed for events ≥4h old). */
  include?: string;
}

export interface FirstTouchEvent {
  token_mint: string;
  token_symbol: string | null;
  token_name: string | null;
  token_image_url: string | null;
  first_buy_at: string;
  sol_amount: number | null;
  token_amount: number | null;
  tx_signature: string | null;
  token_age_minutes: number | null;
  first_kol: {
    /** Wallet address — only present on Ultra tier. */
    wallet?: string;
    name: string | null;
    twitter_url: string | null;
    winrate_7d: number | null;
    strategy: string | null;
    scout_tier: ScoutTier | null;
    /** Same as swarm_3plus_pct on the leaderboard. */
    scout_score: number | null;
    n_first_touches_30d: number | null;
  };
  followers_4h?: number;
  /** v2.4 (2026-05-06) — market cap (USD) stamped on the exact tx that fired the first KOL buy, joined via tx_signature. */
  market_cap_usd_at_first_buy?: number | null;
  /** v2.4 — token price (USD) at the same moment. */
  price_usd_at_first_buy?: number | null;
  /** v2.4 — current market cap (USD), from token_prices. */
  market_cap_usd?: number | null;
  /** v2.4 — current last-trade price (USD). */
  last_price_usd?: number | null;
}

export interface FirstTouchesResponse {
  events: FirstTouchEvent[];
  count: number;
  next_before: string | null;
  data_age_seconds: number | null;
  _rid?: string;
}

export interface FirstTouchSubscriptionFilters {
  kol?: string;
  mint_suffix?: string;
  min_first_buy_sol?: number;
  min_scout_tier?: ScoutTier;
  min_n_touches?: number;
}

export interface FirstTouchSubscription {
  id: string;
  name: string | null;
  filters: FirstTouchSubscriptionFilters;
  delivery_mode: CoordinationDeliveryMode;
  webhook_url: string | null;
  /** v1.6 — Lower bound on first-touch MC. Pass null to clear. */
  min_mc_usd?: number | null;
  /** v1.6 — Upper bound on first-touch MC. Pass null to clear. */
  max_mc_usd?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FirstTouchSubscriptionCreateParams {
  name?: string;
  filters?: FirstTouchSubscriptionFilters;
  /** Default: "webhook". */
  delivery_mode?: CoordinationDeliveryMode;
  /** Required when delivery_mode is "webhook" or "both". Must be HTTPS. */
  webhook_url?: string;
  /** v1.6 — Lower bound on first-touch MC. */
  min_mc_usd?: number;
  /** v1.6 — Upper bound on first-touch MC. */
  max_mc_usd?: number;
}

export interface FirstTouchSubscriptionUpdateParams {
  name?: string | null;
  filters?: FirstTouchSubscriptionFilters;
  delivery_mode?: CoordinationDeliveryMode;
  webhook_url?: string | null;
  is_active?: boolean;
  /** v1.6 — Pass null to clear; omit to leave unchanged. */
  min_mc_usd?: number | null;
  /** v1.6 — Pass null to clear; omit to leave unchanged. */
  max_mc_usd?: number | null;
}

export interface FirstTouchSubscriptionListResponse {
  subscriptions: FirstTouchSubscription[];
  _rid?: string;
}

export interface FirstTouchSubscriptionCreateResponse {
  subscription: FirstTouchSubscription;
  /** One-time HMAC secret. Save it — will not be shown again. */
  webhook_secret: string | null;
  note?: string;
}

export interface FirstTouchSubscriptionGetResponse {
  subscription: FirstTouchSubscription;
}

export interface FirstTouchSubscriptionUpdateResponse {
  subscription: FirstTouchSubscription;
}

export interface FirstTouchSubscriptionDeleteResponse {
  ok: boolean;
}

export type KolPairsPeriod = "7d" | "30d";
export type KolHotTokensPeriod = "1h" | "6h";
export type KolTimingPeriod = "7d" | "30d";
export type KolPnlPeriod = "7d" | "30d" | "90d" | "180d";
export type KolTrendingPeriod = "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "12h";

export interface KolPairsParams {
  /** Time period. Default: "7d". */
  period?: KolPairsPeriod;
  /** Minimum shared tokens to qualify (1–20). Default: 3. */
  min_shared?: number;
  /** Max results (1–50). Default: 20. */
  limit?: number;
}

export interface KolPair {
  kol_a: { name: string; wallet?: string };
  kol_b: { name: string; wallet?: string };
  shared_token_count: number;
  agreement_rate?: number;
  shared_tokens?: string[];
}

export interface KolPairsResponse {
  pairs: KolPair[];
  period: string;
  min_shared: number;
  _rid?: string;
}

export interface KolTimingParams {
  /** Time period. Default: "30d". */
  period?: KolTimingPeriod;
}

export interface KolTimingProfile {
  tokens_traded: number;
  positions_closed: number;
  avg_hold_minutes: number | null;
  median_hold_minutes?: number | null;
  pct_closed_1h?: number | null;
  pct_closed_6h?: number | null;
  pct_closed_24h?: number | null;
  avg_buy_size_sol?: number | null;
  avg_sell_size_sol?: number | null;
  most_active_hours?: number[] | null;
  hour_distribution?: Record<string, number> | null;
}

export interface KolTimingResponse {
  kol: { name: string; wallet?: string };
  timing: KolTimingProfile;
  period: string;
}

export interface KolHotTokensParams {
  /** Time period. Default: "6h". */
  period?: KolHotTokensPeriod;
  /** Minimum KOL buyers (1–20). Default: 1. */
  min_kols?: number;
  /** Max results (1–50). Default: 20. */
  limit?: number;
  /** Minimum average 7d win rate across KOL buyers (0–100). */
  min_avg_winrate?: number;
  /** Require at least 2 distinct strategy tags among the KOLs. */
  unique_strategies?: boolean;
}

export interface HotToken {
  token_mint: string;
  token_symbol: string;
  token_name: string;
  kols_total: number;
  kols_recent: number;
  acceleration: number;
  total_buy_sol: number;
  total_sell_sol: number;
  net_flow: number;
  first_kol_buy_age_minutes: number | null;
  kols?: { name: string; wallet?: string }[] | null;
  token_image_url?: string | null;
  first_kol_buy_at?: string | null;
  last_kol_buy_at?: string | null;
  time_to_consensus_sec?: number | null;
  avg_winrate_7d?: number | null;
  entry_rank_avg?: number | null;
  unique_strategies?: number | null;
  strategies?: string[] | null;
}

export interface KolHotTokensResponse {
  hot_tokens: HotToken[];
  period: string;
  min_kols: number;
  _rid?: string;
}

export interface KolPnlParams {
  /** Time period. Default: "30d". */
  period?: KolPnlPeriod;
}

export interface KolPnlSummary {
  realized_pnl_sol: number;
  total_volume_sol: number;
  tokens_traded: number;
  closed_positions: number;
  open_positions: number;
  win_count: number;
  loss_count: number;
  win_rate: number | null;
  profit_factor: number | null;
  best_trade_pnl_sol: number;
  worst_trade_pnl_sol: number;
  avg_roi_pct: number | null;
  avg_hold_minutes: number;
  median_hold_minutes: number;
  max_drawdown_sol: number;
}

export interface KolPnlCurvePoint {
  date: string;
  day_pnl: number;
  cumulative_pnl: number;
  trades: number;
}

export interface KolClosedPosition {
  token_mint: string;
  token_symbol: string;
  token_name: string;
  buy_count: number;
  sell_count: number;
  bought_sol: number;
  sold_sol: number;
  pnl_sol: number;
  roi_pct: number;
  hold_minutes: number;
  result: "win" | "loss";
  first_trade: string;
  last_trade: string;
}

export interface KolOpenPosition {
  token_mint: string;
  token_symbol: string;
  token_name: string;
  buy_count: number;
  bought_sol: number;
  first_buy_at: string;
}

export interface KolPnlResponse {
  kol: { name: string; wallet?: string | null; twitter_url?: string | null; strategy_tag?: string | null };
  summary: KolPnlSummary;
  pnl_curve?: KolPnlCurvePoint[] | null;
  closed_positions?: KolClosedPosition[] | null;
  open_positions?: KolOpenPosition[] | null;
  period: string;
}

export interface KolTrendingParams {
  /** Time period. Default: "1h". Sub-hour periods (5m/15m/30m) require PRO/ULTRA. */
  period?: KolTrendingPeriod;
  /** Minimum KOL buyers (1–20). Default: 1. */
  min_kols?: number;
  /** Max results (1–50). Default: 20. */
  limit?: number;
}

export interface TrendingToken {
  token_mint: string;
  token_symbol: string;
  token_name: string;
  buy_volume_sol: number;
  sell_volume_sol: number;
  net_flow_sol: number;
  buy_count: number;
  sell_count: number;
  kol_count: number;
  latest_buy_age_minutes: number | null;
  token_image_url?: string;
  first_buy_at?: string;
  latest_buy_at?: string;
  kols?: { name: string; wallet?: string }[];
}

export interface KolTrendingResponse {
  trending: TrendingToken[];
  period: string;
  min_kols: number;
  _rid?: string;
}

export interface KolTokenActivity {
  mint: string;
  token_name: string | null;
  token_symbol: string | null;
  kol_buyers: string[];
  kol_sellers: string[];
  buy_count: number;
  sell_count: number;
  total_sol_volume: number;
  recent_trades: KolTrade[];
}

// ─── KOL entry-order ─────────────────────────────────────────────────────────

export interface KolEntryOrderParams {
  /** Max entries to return (1–100). Default: 50. */
  limit?: number;
}

export interface KolEntryOrderEntry {
  rank: number;
  kol_name: string | null;
  kol_twitter: string | null;
  wallet: string;
  strategy_tag: KolStrategy | string | null;
  auto_strategy_tag: KolStrategy | string | null;
  winrate_7d: number | null;
  winrate_30d: number | null;
  early_entry_pct_30d: number | null;
  percentile_pnl_7d?: number | null;
  percentile_winrate_7d?: number | null;
  first_buy_at: string;
  seconds_after_first: number;
  sol_amount: number;
  token_amount: number;
  tx_signature?: string;
}

export interface KolEntryOrderResponse {
  token_mint: string;
  token_name: string | null;
  token_symbol: string | null;
  total_kol_buyers: number;
  first_buy_at: string;
  last_buy_at: string;
  span_sec: number;
  entries: KolEntryOrderEntry[];
}

// ─── KOL compare ─────────────────────────────────────────────────────────────

export interface KolCompareParams {
  /** 2–5 Solana wallet addresses. Tier limit: BASIC=2, PRO=4, ULTRA=5. */
  wallets: string[];
}

export interface KolCompareProfile {
  wallet: string;
  found: boolean;
  name?: string;
  twitter_url?: string | null;
  strategy_tag?: KolStrategy | string | null;
  auto_strategy_tag?: KolStrategy | string | null;
  winrate_7d?: number | null;
  winrate_30d?: number | null;
  avg_roi_7d?: number | null;
  avg_roi_30d?: number | null;
  profit_factor_7d?: number | null;
  profit_factor_30d?: number | null;
  pnl_7d?: number | null;
  pnl_30d?: number | null;
  early_entry_pct_30d?: number | null;
  consistency_7d?: number | null;
  median_hold_minutes_30d?: number | null;
  closed_positions_7d?: number;
  closed_positions_30d?: number;
  is_heating_up?: boolean;
  is_cold?: boolean;
  percentile_pnl_7d?: number | null;
  percentile_winrate_7d?: number | null;
  percentile_pnl_30d?: number | null;
  percentile_winrate_30d?: number | null;
  percentile_early_entry_30d?: number | null;
}

export interface KolCompareOverlapToken {
  token_mint: string;
  token_symbol: string | null;
  token_name: string | null;
  wallets: string[];
  buy_count: number;
}

export interface KolCompareResponse {
  profiles: KolCompareProfile[];
  /** Tokens bought by 2+ of the provided wallets in the last 30d (PRO+ only). */
  overlap?: KolCompareOverlapToken[];
}

// ─── KOL alerts ──────────────────────────────────────────────────────────────

export type KolAlertType = "consensus_cluster" | "fresh_token_kol_buy" | "heating_up";
export type KolAlertWindow = "1h" | "6h" | "24h";
export type KolAlertSeverity = "low" | "medium" | "high";

export interface KolAlertsParams {
  /** Detection window. Default: "6h". */
  window?: KolAlertWindow;
  /** Max alerts to return (1–100). Default: 30. */
  limit?: number;
  /** Restrict to specific alert types (default: all). */
  types?: KolAlertType[];
}

export interface KolAlert {
  type: KolAlertType | string;
  severity: KolAlertSeverity | string;
  detected_at: string | null;
  // Shape varies by type — these are common fields flattened from the API response.
  token_mint?: string;
  token_symbol?: string | null;
  token_name?: string | null;
  wallet?: string;
  kol_name?: string | null;
  kol_twitter?: string | null;
  // consensus_cluster
  kol_count?: number;
  net_sol_flow?: number;
  signal?: "accumulating" | "distributing";
  time_to_consensus_sec?: number | null;
  first_buy_at?: string | null;
  kols?: string[] | Array<{ name: string; wallet?: string }>;
  // fresh_token_kol_buy
  token_age_minutes?: number;
  kol_winrate_7d?: number | null;
  kol_percentile_pnl_7d?: number | null;
  sol_amount?: number;
  // heating_up
  strategy_tag?: KolStrategy | string | null;
  winrate_7d?: number | null;
  pnl_7d?: number;
  closed_positions_7d?: number;
  percentile_pnl_7d?: number | null;
  // Any additional fields flattened from the wire payload.
  [key: string]: unknown;
}

export interface KolAlertsResponse {
  alerts: KolAlert[];
  count: number;
  window: string;
  types: string[];
  _rid?: string;
}

// ─── Deployer Hunter types ────────────────────────────────────────────────────

export type DeployerTier = "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
export type DeployerSortField =
  | "bonding_rate"
  | "recent_bond_rate"
  | "total_bonded"
  | "last_deploy_at";
export type AlertPeriod = "7d" | "30d" | "all";
export type BestTokensPeriod = "7d" | "30d" | "all";

export interface DeployerLeaderboardParams extends PaginationParams {
  /** Filter by tier. */
  tier?: DeployerTier;
  /** Sort field. Default: "bonding_rate". */
  sort?: DeployerSortField;
  /** Max results (1–50). Default: 20. */
  limit?: number;
}

export interface DeployerTokensParams extends PaginationParams {
  /** Max results (1–50). Default: 20. */
  limit?: number;
}

export interface DeployerAlertsParams extends PaginationParams {
  /** ISO 8601 datetime — return alerts since this time. */
  since?: string;
  /** Cursor — return alerts strictly older than this ISO 8601 timestamp. Pass `next_before` from the previous response. Preferred over `offset` at scale. */
  before?: string;
  /** Max results (1–50). Default: 20. */
  limit?: number;
  /**
   * Filter alerts by deployer tier.
   * **PRO/ULTRA only** — BASIC subscribers passing this receive HTTP 403.
   */
  tier?: DeployerTier;
  /** Filter by alert_type (e.g. "new_deploy", "bonded"). */
  alert_type?: string;
  /** Filter by alert priority. */
  priority?: "high" | "medium" | "low";
  /** Only alerts where at least N KOLs bought the token (post-filter against the enriched kol_buys.count). */
  min_kol_buys?: number;
}

export interface DeployerAlertStatsParams {
  /** Time window. Default: "all". */
  period?: AlertPeriod;
}

export interface BestTokensParams {
  /** Time window. Default: "7d". */
  period?: BestTokensPeriod;
  /** Max results (1–20). Default: 5. */
  limit?: number;
}

export interface RecentBondsParams {
  /** Max results (1–50). Default: 20. */
  limit?: number;
  /** ISO 8601 datetime — only bonds strictly newer than this timestamp. Pass `next_since` from the previous response for incremental polling. */
  since?: string;
  /** Filter by deployer tier. */
  tier?: DeployerTier;
  /** Only bonds that reached at least this peak market cap (USD). */
  peak_mc_min?: number;
}

export interface DeployerTierCounts {
  elite: number;
  good: number;
  rising: number;
}

export interface DeployerStats {
  tracked_count: number;
  signals_today: number;
  bonds_detected: number;
  bond_rate: number;
  tiers: DeployerTierCounts;
  _rid?: string;
}

export interface DeployerSummary {
  wallet_address: string;
  tier: DeployerTier;
  bonding_rate?: number | null;
  total_bonded?: number | null;
  recent_outcomes?: string | null;
  recent_bond_rate?: number | null;
  total_tokens_deployed?: number | null;
  /** Peak market cap (USD) of this deployer's best token to date. Populated on alert rows. */
  best_token_peak_mc?: number | null;
  /** Fraction of the deployer's labeled tokens that ran (peak >=60min after deploy) vs dumped. */
  runner_rate?: number | null;
  /** Confidence denominator; gate on >=3. */
  labeled_tokens?: number | null;
  avg_time_to_bond_minutes?: number | null;
}

export interface DeployerLeaderboardEntry {
  id: string;
  wallet_address: string;
  tier: DeployerTier;
  bonding_rate: number;
  recent_bond_rate: number;
  total_tokens_deployed: number;
  total_bonded: number;
  last_deploy_at?: string | null;
  recent_outcomes?: string | null;
  avg_time_to_bond_minutes?: number | null;
  /** Fraction of the deployer's labeled tokens that ran (peak >=60min after deploy) vs dumped. */
  runner_rate?: number | null;
  /** Confidence denominator; gate on >=3. */
  labeled_tokens?: number | null;
  best_token_peak_mc?: number | null;
  avg_peak_mc?: number | null;
  last_bond_at?: string | null;
  is_tracked?: boolean | null;
  label?: string | null;
  first_seen_at?: string | null;
}

export interface DeployerLeaderboardResponse {
  deployers: DeployerLeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  _rid?: string;
}

export interface DeployerToken {
  mint: string;
  name: string | null;
  symbol: string | null;
  bonded: boolean;
  deployed_at: string;
  bonded_at: string | null;
  peak_market_cap_usd: number | null;
}

export interface DeployerProfile {
  wallet: string;
  tier: DeployerTier;
  bonding_rate: number;
  recent_bond_rate: number;
  total_deployed: number;
  total_bonded: number;
  last_deploy_at: string | null;
  first_seen: string | null;
  /** Fraction of the deployer's labeled tokens that ran (peak >=60min after deploy) vs dumped. */
  runner_rate?: number | null;
  /** Confidence denominator; gate on >=3. */
  labeled_tokens?: number | null;
  avg_time_to_bond_minutes?: number | null;
  tokens?: DeployerToken[] | null;
}

export interface DeployerTokensResponse {
  tokens: DeployerToken[];
  count: number;
  total: number;
}

export interface KolBuysSummary {
  count: number;
  total_sol: number;
  kols: unknown[];
}

export interface DeployerAlert {
  id: string;
  token_mint: string;
  token_name?: string | null;
  token_symbol?: string | null;
  alert_type: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  market_cap_at_alert?: number | null;
  /** Deployer wallet's SOL balance at alert time, in SOL. Null when unknown. */
  deployer_sol_balance?: number | null;
  deployers: DeployerSummary;
  kol_buys?: KolBuysSummary | null;
}

export interface DeployerAlertsResponse {
  alerts: DeployerAlert[];
  limit: number;
  offset: number;
  /** Cursor for the next page — pass as `before` to fetch older alerts. */
  next_before?: string | null;
  data_age_seconds?: number | null;
  _rid?: string;
}

export interface BondRateStats {
  total_deploys: number;
  total_bonded: number;
  rate: number;
}

export interface MultiplierStats {
  total_with_mc: number;
  pct_2x: number;
  pct_5x: number;
  pct_10x: number;
  pct_50x: number;
  avg_multiplier: number;
  best_multiplier: number;
}

export interface TierStats {
  deploys: number;
  bonded: number;
  bond_rate: number;
  avg_multiplier?: number | null;
  total_with_mc: number;
}

export interface DeployerAlertStats {
  bond_rate: BondRateStats;
  multiplier: MultiplierStats;
  tiers: Record<string, TierStats>;
  period: string;
  _rid?: string;
}

export interface BestToken {
  id: string;
  token_mint: string;
  token_name?: string | null;
  token_symbol?: string | null;
  token_image_url?: string | null;
  bonded_at: string;
  peak_market_cap?: number | null;
  mc_at_bond?: number | null;
  market_cap_at_alert?: number | null;
  mc_multiplier?: number | null;
  deployer_wallet: string;
  deployer_tier: DeployerTier;
  alerted_at?: string | null;
}

export interface BestTokensResponse {
  tokens: BestToken[];
  period: string;
  limit: number;
  _rid?: string;
}

export interface RecentBond {
  id: string;
  token_mint: string;
  token_name?: string | null;
  token_symbol?: string | null;
  token_image_url?: string | null;
  deployed_at: string;
  bonded_at: string;
  time_to_bond_minutes?: number | null;
  peak_market_cap?: number | null;
  mc_at_bond?: number | null;
  deployers: DeployerSummary;
}

export interface RecentBondsResponse {
  tokens: RecentBond[];
  limit: number;
  /** Cursor for incremental polling — pass as `since` on the next call to fetch only newer bonds. */
  next_since?: string | null;
  _rid?: string;
}

export interface DeployerStreak {
  type: string;
  count: number;
}

export interface DeployerRollingRate {
  window_end: number;
  bond_rate: number;
}

export interface DeployerStretch {
  start_index: number;
  end_index: number;
  bond_rate: number;
}

export interface DeployerTrajectoryData {
  current_streak: DeployerStreak;
  longest_bond_streak: number;
  longest_fail_streak: number;
  rolling_bond_rates: DeployerRollingRate[];
  trend: string;
  avg_days_between_deploys: number | null;
  avg_recovery_tokens: number | null;
  best_stretch: DeployerStretch | null;
  worst_stretch: DeployerStretch | null;
  total_tokens_analyzed: number;
}

export interface DeployerTrajectoryResponse {
  deployer: {
    wallet_address: string;
    total_tokens_deployed: number;
    total_bonded: number;
    bonding_rate: number;
    recent_bond_rate: number;
    tier: string;
  };
  trajectory: DeployerTrajectoryData;
}

export interface DeployerHistoryParams {
  /** Number of daily snapshots to return (1–365). Default: 90. */
  limit?: number;
}

/** One day's reputation snapshot for a deployer — the state that was true on
 * `date`, so you can backtest "was this deployer elite when it launched token X?"
 * without look-ahead bias. */
export interface DeployerHistorySnapshot {
  date: string;
  tier: string;
  is_tracked: boolean;
  total_deployed: number;
  total_bonded: number;
  bonding_rate: number | null;
  recent_bond_rate: number | null;
  avg_peak_mc: number | null;
  best_token_peak_mc: number | null;
}

export interface DeployerHistoryResponse {
  is_deployer: boolean;
  wallet: string;
  snapshots: DeployerHistorySnapshot[];
}

// ─── Alpha wallet intelligence types ─────────────────────────────────────────

export type AlphaSort = "win_rate" | "pnl" | "roi";
export type AlphaPeriod = "7d" | "30d" | "all";

export interface AlphaLeaderboardParams {
  /** Time period. Default: "all". */
  period?: AlphaPeriod;
  /** Minimum tokens traded to qualify (1–20). Default: 5. */
  min_tokens?: number;
  /** Sort field. Default: "win_rate". */
  sort?: AlphaSort;
  /** Exclude medium/high bot-confidence wallets. Default: true. */
  exclude_bots?: boolean;
}

export interface AlphaWalletEntry {
  rank: number;
  wallet: string;
  tokens_traded: number;
  wins: number;
  losses: number;
  /** BASIC: integer %. PRO/ULTRA: decimal fraction 0–1 (4dp). */
  win_rate: number | null;
  net_pnl_sol: number;
  // PRO/ULTRA fields
  total_sol_bought?: number;
  total_sol_sold?: number;
  roi?: number | null;
  avg_rank?: number | null;
  best_rank?: number | null;
  total_buys?: number;
  total_sells?: number;
  last_seen?: string | null;
  // ULTRA fields
  bundle_rate?: number;
  buy_size_stddev?: number;
  active_hours?: number | null;
  bot_confidence?: string | null;
}

export interface AlphaLeaderboardResponse {
  leaderboard: AlphaWalletEntry[];
  total: number;
  period: string;
  sort: string;
  min_tokens: number;
  exclude_bots: boolean;
  _rid?: string;
}

export interface AlphaWalletPosition {
  token_mint: string;
  token_symbol: string | null;
  token_name: string | null;
  first_buy_at: string | null;
  last_trade_at: string | null;
  buy_count: number;
  sell_count: number;
  total_bought_sol: number;
  total_sold_sol: number;
  realized_pnl_sol: number;
  roi_pct: number | null;
  result: "win" | "loss" | "open";
}

export interface AlphaWalletBotSignal {
  signal: string;
  detail: string;
}

export interface AlphaWalletSummary {
  tokens_traded: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  net_pnl_sol: number;
  total_vol_sol: number;
  roi: number | null;
  avg_rank: number | null;
  best_rank: number | null;
  bundle_rate: number;
  buy_size_stddev: number;
  active_hours: number | null;
  bot_confidence: string;
  night_only_activity: boolean;
}

export interface AlphaWalletResponse {
  wallet: string;
  summary: AlphaWalletSummary;
  positions: AlphaWalletPosition[];
  bot_signals: AlphaWalletBotSignal[];
}

export interface AlphaLinkedWallet {
  wallet_address: string;
  shared_tokens: number;
  similarity_score: number;
}

export interface AlphaLinkedResponse {
  wallet: string;
  linked_wallets: AlphaLinkedWallet[];
  total: number;
}

export interface AlphaCapTableBuyer {
  rank: number;
  wallet: string;
  first_buy_sol: number;
  first_buy_at: string | null;
  is_bundle: boolean;
  is_kol: boolean;
  kol_name: string | null;
  bot_confidence: string | null;
  historical_win_rate: number | null;
  historical_pnl_sol: number | null;
  historical_tokens: number | null;
}

export interface AlphaCapTableSummary {
  known_alpha_wallets: number;
  known_kols: number;
  bundle_buyers: number;
  buyer_quality_score: number;
  confidence: "low" | "medium" | "high";
  signal: "positive" | "neutral" | "negative";
}

export interface AlphaCapTableResponse {
  mint: string;
  buyers: AlphaCapTableBuyer[];
  summary: AlphaCapTableSummary;
}

export interface AlphaBuyerQualityBreakdown {
  alpha_wallet_count: number;
  kol_count: number;
  bundle_buyer_count: number;
  avg_historical_win_rate: number | null;
  bot_dominated: boolean;
  /**
   * First-20 buyers on the rolling dump-cluster list (wallets whose 5+
   * recent first-20 appearances are exclusively on tokens that peaked
   * <15 min after deploy; trailing 42d, refreshed daily). Out-of-sample:
   * 3+ such wallets predicted a sub-15-min peak 94% of the time vs 61%
   * base. Informational — does not move the score.
   */
  dump_cluster_count: number;
  /**
   * First-20 buyers with 5+ recent first-20 appearances of any kind.
   * Alone it predicts nothing; a heavily recycled cohort with
   * dump_cluster_count 0 historically leans runner.
   */
  recycled_early_buyer_count: number;
}

export interface AlphaBuyerQualityResponse {
  mint: string;
  score: number;
  confidence: "low" | "medium" | "high";
  signal: "positive" | "neutral" | "negative";
  cached_at: string;
  /** Returned on all tiers. */
  breakdown?: AlphaBuyerQualityBreakdown;
  note?: string;
}

// ─── Token risk score (v2.13) ──────────────────────────────────────────────

export type TokenRiskBand = "safe" | "caution" | "danger";
export type TokenRiskStatus = "ok" | "warn" | "danger";

export interface TokenRiskFactor {
  /** Stable machine key (e.g. "mint_authority", "liquidity"). */
  key: string;
  /** Human-readable label for the factor. */
  label: string;
  /** Per-factor verdict. */
  status: TokenRiskStatus;
  /** Risk points this factor contributed to `risk_score`. */
  points: number;
  /** One-line explanation of the assessment. */
  detail: string;
}

export interface TokenRiskInputs {
  mint_authority_revoked: boolean | null;
  freeze_authority_revoked: boolean | null;
  liquidity_usd: number | null;
  liquidity_to_mc_ratio: number | null;
  transfer_fee_bps: number | null;
  is_token_2022: boolean | null;
  burn_detected: boolean | null;
  launch_cohort_sol: number | null;
  launch_cohort_size: number | null;
  deployer_bonding_rate: number | null;
  deployer_total_deployed: number | null;
  kol_signal: string | null;
  is_blacklisted: boolean | null;
  [key: string]: unknown;
}

/** Transparent 0–100 token rug-risk/safety score (higher = riskier). PRO/ULTRA only. */
export interface TokenRiskResponse {
  mint: string;
  /** 0–100, higher = riskier. */
  risk_score: number;
  band: TokenRiskBand;
  /** Explainable per-factor breakdown that sums into `risk_score`. */
  factors: TokenRiskFactor[];
  /** Raw signals the score was computed from. */
  inputs: TokenRiskInputs;
  score_version: string;
  as_of: string;
}

/** Per-mint error entry in a batch-risk response. Untracked mints come back as
 * `"not_tracked"`; a per-mint scoring failure comes back as `"error"`. Neither
 * fails the batch. */
export interface TokenRiskBatchError {
  mint: string;
  error: "not_tracked" | "error";
}

/** One entry in `TokenRiskBatchResponse.tokens` — either a full risk result
 * (same shape as `alpha.risk(mint)`, plus `as_of`) or a per-mint error stub.
 * Discriminate on the presence of the `error` field. */
export type TokenRiskBatchItem = TokenRiskResponse | TokenRiskBatchError;

/** Bulk token risk scoring — up to 50 mints in one request that counts as 1
 * against quota. `tokens` preserves de-duplicated input order; `count` is the
 * number of unique mints. **PRO/ULTRA only.** */
export interface TokenRiskBatchResponse {
  tokens: TokenRiskBatchItem[];
  count: number;
  _rid?: string;
}

// ─── Token bundle cohort (v2.18) ───────────────────────────────────────────

/** How the bundle cohort was grouped: `"atomic_tx"` (every buy landed in a
 * single transaction), `"same_slot"` (buys landed in the same slot but across
 * transactions), or `"none"` (no bundle cohort detected). */
export type BundleKind = "atomic_tx" | "same_slot" | "none";

/** Bundle-cohort holdings summary for a token — returned on **every** tier. */
export interface BundleSummary {
  /** Number of wallets in the detected bundle cohort. */
  wallet_count: number;
  /** How the cohort was grouped. */
  bundle_kind: BundleKind;
  /** 0–1 share of the tokens the cohort originally bought that it still holds,
   * or `null` when unknown. */
  held_ratio: number | null;
  /** **HEADLINE** — 0–1 share of total token supply the cohort currently holds,
   * or `null` when unknown. */
  held_pct_of_supply: number | null;
  /** True when every wallet in the cohort has fully sold out. */
  fully_exited: boolean;
  /** Total SOL the cohort spent buying. */
  buy_volume: number;
  /** Total tokens the cohort currently holds. */
  tokens_held: number;
}

/** One wallet in the bundle cohort. **PRO** returns the top-10 with flags only;
 * **ULTRA** adds identity (`kol_name`, `win_rate`, `bot_confidence`) and the
 * per-wallet `tokens_held` balance (all marked optional / ULTRA-only below). */
export interface BundleWallet {
  rank: number;
  wallet: string;
  /** 0–1 share of this wallet's bought tokens still held, or `null`. */
  held_ratio: number | null;
  has_sold: boolean;
  /** True when this wallet bought in the atomic bundle transaction. */
  atomic: boolean;
  is_kol: boolean;
  /** ULTRA-only — KOL display name when this wallet is a known KOL. */
  kol_name?: string | null;
  /** ULTRA-only — the wallet's historical win rate (0–1). */
  win_rate?: number | null;
  /** ULTRA-only — 0–1 bot-likelihood from the alpha classifier. */
  bot_confidence?: string | null;
  /** ULTRA-only — tokens this wallet currently holds. */
  tokens_held?: number | null;
}

/** Bundle-cohort holdings for a token — the wallets that bought together (one
 * atomic transaction or the same slot) and how much of supply they still hold.
 * **Tier-gated:** BASIC/TRADER receive the `bundle` summary block only with
 * `wallets: []`; PRO adds the top-10 cohort wallets (flags only); ULTRA returns
 * the full cohort enriched with KOL identity, win rate, bot confidence, and
 * per-wallet token balances. */
export interface TokenBundleResponse {
  mint: string;
  bundle: BundleSummary;
  wallets: BundleWallet[];
}

/** One DEX pool a token trades in. `is_active` distinguishes live pools from
 * parked/drained ones; `liquidity_usd`/`last_price_sol`/`last_swap_at` are null
 * when the pool has no recent on-chain activity. */
export interface TokenPool {
  pool_address: string;
  dex: string;
  quote_mint: string;
  liquidity_usd: number | null;
  last_price_sol: number | null;
  last_swap_at: string | null;
  amm_id: string | null;
  is_active: boolean;
}

export interface TokenPoolsSummary {
  pool_count: number;
  active_pool_count: number;
  dex_count: number;
  dexes: string[];
  total_liquidity_usd: number | null;
  primary_pool: string | null;
  primary_dex: string | null;
  /** Share of total liquidity held by the single largest pool (0–100). */
  top_pool_share_pct: number | null;
}

/** Per-venue liquidity map — every DEX pool a token trades in, live vs parked,
 * plus fragmentation (`dex_count`) and top-pool concentration. */
export interface TokenPoolsResponse {
  mint: string;
  pools: TokenPool[];
  summary: TokenPoolsSummary;
}

export type CandleTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface CandlesParams {
  /** Bar size. Default "1h". */
  tf?: CandleTimeframe;
  /** Most-recent N bars, 1–1000. Default 200. */
  limit?: number;
  /** ISO8601 window start. Defaults to limit×tf before `to`. */
  from?: string;
  /** ISO8601 window end. Defaults to now. */
  to?: string;
}

/** One OHLCV bar. Net-flow fields are present only on ULTRA keys
 * (see `CandlesResponse.net_flow_included`). */
export interface Candle {
  /** Bucket start, ISO8601. */
  t: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume_usd: number;
  trades: number;
  market_cap_usd: number | null;
  // ── ULTRA-only net-flow / liquidity fields ──
  /** Organic BUY volume USD (buy+sell = volume_usd). */
  buy_volume_usd?: number | null;
  /** Organic SELL volume USD. */
  sell_volume_usd?: number | null;
  /** buy_volume_usd − sell_volume_usd — the net-flow signal. */
  net_volume_usd?: number | null;
  buy_count?: number | null;
  sell_count?: number | null;
  volume_mev_usd?: number | null;
  /** Pool liquidity at bar open; with close → LP add/remove delta. */
  open_liquidity_usd?: number | null;
  close_liquidity_usd?: number | null;
  high_mc_usd?: number | null;
  low_mc_usd?: number | null;
}

export interface CandlesResponse {
  mint: string;
  timeframe: CandleTimeframe;
  from: string;
  to: string;
  count: number;
  /** True on ULTRA keys — the net-flow / liquidity fields are populated. */
  net_flow_included: boolean;
  candles: Candle[];
}

export type TokenFlowWindow = "1h" | "24h";

export interface TokenFlowParams {
  /** Lookback window. Default "1h". */
  window?: TokenFlowWindow;
}

/** Aggregated buy/sell flow for a token over a 1h or 24h window. */
export interface TokenFlowResponse {
  mint: string;
  window: TokenFlowWindow;
  /** ISO8601 window start. */
  from: string;
  unique_wallets: number;
  unique_buyers: number;
  unique_sellers: number;
  buy_count: number;
  sell_count: number;
  total_trades: number;
  buy_sol: number;
  sell_sol: number;
  /** buy_sol − sell_sol — the net SOL flow. */
  net_sol: number;
  trades_per_wallet: number;
}

/** Payload of a `token:graduation` stream event — every pump.fun graduation
 * (bonding curve complete → PumpSwap migration), tracked deployer or not. */
export interface GraduationEvent {
  token_mint: string;
  token_name: string | null;
  token_symbol: string | null;
  time_to_bond_minutes: number | null;
  deployer_wallet: string | null;
  /** 'unranked' when the deployer is unknown to deployer-hunter. */
  deployer_tier: string;
  market_cap_usd: number | null;
  bonded_at: string;
}

export interface AlphaBuyerQualityBatchResponse {
  tokens: AlphaBuyerQualityResponse[];
  count: number;
  /** Number of mints that were served from the shared LRU cache without a DB query. */
  cache_hits: number;
  _rid?: string;
}

// ─── Universal wallet types (/wallet/{address}/*) ─────────────────────────────
// New 2026-05-20. Works on any Solana wallet, not just curated KOLs. Backed by
// FIFO cost-basis math over the last 90 days of token_trades. Cached in
// wallet_analyses with dynamic TTL (5min/1h/24h). Cache hits don't count
// against your daily quota.

export interface WalletStats {
  first_seen: string;
  last_seen:  string;
  total_trades: number;
  buys:  number;
  sells: number;
  bought_sol: number;
  sold_sol:   number;
  unique_tokens: number;
  /** Lookback window in days — currently 90. */
  window_days: number;
}

export interface WalletFlags {
  is_kol:   boolean;
  kol_name: string | null;
  /** True if the wallet exists in mv_alpha_wallets (≥1 early-buyer record). */
  is_alpha_tracked: boolean;
  /** 0–1, higher = more bot-like. From the alpha classifier (migration 124). */
  bot_confidence:      number | null;
  alpha_win_rate:      number | null;
  alpha_net_pnl_sol:   number | null;
  alpha_tokens_traded: number | null;
  is_deployer: boolean;
  deployer_tokens_deployed: number | null;
  deployer_bonding_rate:    number | null;
}

// v1.8.1 enrichments — additive, nullable. Old SDK consumers ignoring these
// fields keep working when the server adds more enrichment fields.
export interface WalletTopToken {
  token_mint:       string;
  token_symbol:     string | null;
  buys:             number;
  sells:            number;
  sol_in:           number;
  sol_out:          number;
  realized_pnl_sol: number;
  current_mc_usd:   number | null;
  peak_mc_usd:      number | null;
  last_traded_at:   string;
}

export interface WalletTradingStyle {
  total_trades:            number;
  avg_trade_size_sol:      number;
  /** 0-1: fraction of trades with early_buyer_rank ≤ 10. */
  sniper_rate:             number;
  early_entries:           number;
  /** 0-1: fraction of tokens with both buys and sells. */
  round_trip_rate:         number;
  tokens_with_round_trips: number;
  median_hold_minutes:     number | null;
  dominant_action:         "buy" | "sell" | "balanced";
}

export interface WalletDeployerTierEntry {
  /** "elite" | "good" | "rising" | "moderate" | "cold" | "unranked" */
  tier:  string;
  count: number;
}

export interface WalletDeployerBreakdown {
  total_tokens:      number;
  tracked_deployers: number;
  by_tier:           WalletDeployerTierEntry[];
}

export interface WalletRecentTrade {
  token_mint:    string;
  token_symbol:  string | null;
  action:        "buy" | "sell";
  sol_amount:    number;
  block_time:    number;
  traded_at:     string;
  tx_signature:  string;
}

export interface WalletStandoutTrade {
  token_mint:    string;
  token_symbol:  string | null;
  pnl_sol:       number;
  sol_in:        number;
  sol_out:       number;
  roi_pct:       number;
}

export interface WalletBiggestMiss {
  token_mint:           string;
  token_symbol:         string | null;
  actual_sol_out:       number;
  potential_sol_at_ath:  number;
  missed_sol:           number;
  ath_mc_usd:           number;
  sold_at_mc_usd:       number | null;
}

export type WalletVerdictTone = "green" | "red" | "amber" | "muted";

export interface WalletVerdict {
  label:       string;
  description: string;
  tone:        WalletVerdictTone;
}

export interface WalletDerivedStats {
  win_rate:               number | null;
  roi_pct:                number | null;
  total_realized_pnl_sol: number;
  best_trade:             WalletStandoutTrade | null;
  worst_trade:            WalletStandoutTrade | null;
  biggest_miss:           WalletBiggestMiss | null;
  verdict:                WalletVerdict | null;
}

export interface WalletStatsResponse {
  address: string;
  /** Null if the wallet has no trades in the window but does appear in flag tables. */
  stats: WalletStats | null;
  flags: WalletFlags;
  /** Top traded tokens with realized PnL (v1.8.1+). Optional for forward-compat. */
  top_tokens?:         WalletTopToken[];
  /** Trading-style signals (v1.8.1+): avg size, sniper rate, round-trip rate, hold time. */
  trading_style?:      WalletTradingStyle | null;
  /** Pump.fun deployer-tier distribution this wallet bought from (v1.8.1+). */
  deployer_breakdown?: WalletDeployerBreakdown | null;
  /** Last 10 raw trades with symbols joined (v1.8.1+). */
  recent_trades?:      WalletRecentTrade[];
  /** Derived analytics: win rate, ROI, best/worst trade, biggest miss, verdict (v1.9+). */
  derived?:            WalletDerivedStats;
  _rid?: string;
}

export interface WalletPnlSummary {
  realized_sol:   number;
  unrealized_sol: number;
  total_pnl_sol:  number;
  total_bought_sol: number;
  total_sold_sol:   number;
  /** Closed-position win count (not per-trade). */
  wins:   number;
  /** Closed-position loss count. */
  losses: number;
  win_rate: number | null;
  /** Gross wins / gross losses. null when there are no losses (undefined math). */
  profit_factor:       number | null;
  avg_hold_minutes:    number | null;
  median_hold_minutes: number | null;
  /** Running peak-to-trough drawdown on the realized SOL curve. */
  max_drawdown_sol: number;
  open_positions_count:   number;
  closed_positions_count: number;
  total_tokens_traded:    number;
  best_realized:  { token_mint: string; realized_sol: number } | null;
  worst_realized: { token_mint: string; realized_sol: number } | null;
}

export interface WalletPnlCurvePoint {
  /** YYYY-MM-DD (UTC). */
  date: string;
  day_pnl: number;
  cumulative_pnl: number;
  trades: number;
}

export interface WalletClosedPosition {
  token_mint: string;
  buy_count:  number;
  sell_count: number;
  bought_sol: number;
  sold_sol:   number;
  pnl_sol:    number;
  /** realized_sol / total_bought_sol × 100. */
  roi_pct:    number | null;
  /** First buy → last sell, in minutes. */
  hold_minutes: number | null;
  result: "win" | "loss" | "breakeven";
  first_trade: string | null;
  last_trade:  string | null;
}

export interface WalletOpenPosition {
  token_mint: string;
  token_amount:   number;
  cost_basis_sol: number;
  avg_entry_price_sol: number;
  /** Live from mc-tracker. null if the mint has no current price (delisted / never indexed). */
  current_price_sol: number | null;
  current_value_sol: number | null;
  unrealized_sol:    number | null;
  unrealized_pct:    number | null;
  first_buy_at: string | null;
  buys_in_position: number;
}

export interface WalletPnlNotes {
  /** Cost basis is observable only from this timestamp onwards (data window cutoff). */
  cost_basis_observable_from: string;
  /** Present when the 50k-trade hard cap was hit; older trades aren't factored in. */
  truncated_trades?: number;
}

export interface WalletPnlResponse {
  address: string;
  window_days: number;
  summary: WalletPnlSummary;
  /** Sparse daily UTC buckets — only days with at least one realized event. */
  pnl_curve: WalletPnlCurvePoint[];
  /** Sorted by pnl_sol DESC — best winners first. */
  closed_positions: WalletClosedPosition[];
  open_positions:   WalletOpenPosition[];
  notes: WalletPnlNotes;
  cache_hit?: boolean;
  /** Only present on cache hits. */
  computed_at?: string;
  /** Only present on cache misses — TTL for this row in wallet_analyses. */
  ttl_seconds?: number;
  _rid?: string;
}

export interface WalletPositionsResponse {
  address: string;
  positions: WalletOpenPosition[];
  cache_hit?: boolean;
  computed_at?: string | null;
  ttl_seconds?: number | null;
  _rid?: string;
}

export interface WalletHoldingsParams {
  /** 1–500, default 200. */
  limit?: number;
  /** Minimum USD value per holding to include, default 0. */
  min_value_usd?: number;
}

/** One current on-chain holding — an SPL or Token-2022 token account balance,
 * enriched with our price/MC/name data plus a `transfer_delta` vs the wallet's
 * trade-derived net position. */
export interface Holding {
  mint: string;
  symbol: string | null;
  name: string | null;
  amount: number;
  amount_raw: string;
  decimals: number;
  token_program: "spl" | "token2022";
  price_usd: number | null;
  value_usd: number | null;
  market_cap_usd: number | null;
  is_bonded: boolean | null;
  /** Trade-derived net position from FIFO math over the data window, or null. */
  trade_derived_amount: number | null;
  /** On-chain `amount` − `trade_derived_amount`. Nonzero exposes tokens that
   * arrived/left WITHOUT a swap (airdrops, insider funding, wallet-hopping). */
  transfer_delta: number | null;
}

export interface WalletHoldingsResponse {
  address: string;
  sol_balance: number;
  holdings: Holding[];
  summary: {
    token_accounts: number;
    non_zero: number;
    returned: number;
    priced: number;
    total_value_usd: number;
    truncated: boolean;
  };
  verified_at: string;
  trade_window_days: number;
  cache_hit: boolean;
  ttl_seconds: number;
}

export interface WalletTradesParams {
  /** 1–500, default 100. */
  limit?: number;
  /** From `next_cursor` of a previous response. */
  cursor?: string;
  action?: "buy" | "sell";
  /** Filter to a single token mint. */
  token_mint?: string;
  /** Unix epoch seconds — default now-90d. */
  since?: number;
  /** Unix epoch seconds — default now. */
  until?: number;
}

export interface WalletTrade {
  tx_signature: string;
  token_mint:   string;
  action: "buy" | "sell";
  sol_amount:   number;
  token_amount: number;
  block_time:   number;
  traded_at:    string;
}

export interface WalletTradesFilters {
  action: "buy" | "sell" | null;
  token_mint: string | null;
  since: number;
  until: number;
}

export interface WalletTradesResponse {
  address: string;
  trades:  WalletTrade[];
  /** Pass as `cursor` on the next call. null when the end of the result set is reached. */
  next_cursor: string | null;
  has_more: boolean;
  filters: WalletTradesFilters;
  _rid?: string;
}

// ─── Token intelligence types (/token/{mint}) ─────────────────────────────────

export type TokenKolSignal = "accumulating" | "distributing" | "neutral";

export interface TokenKolTopBuyer {
  name: string;
  sol_amount: number;
  /** ULTRA only — individual KOL wallet addresses in the top-buyer list. */
  wallet?: string;
}

export interface TokenKolActivity {
  buying_kols: number;
  selling_kols: number;
  net_flow_sol: number;
  signal: TokenKolSignal;
  top_buyers: TokenKolTopBuyer[];
}

export interface TokenDeployerInfo {
  wallet: string;
  tier: DeployerTier;
  bonding_rate: number | null;
  total_deployed: number | null;
  total_bonded: number | null;
  recent_bond_rate: number | null;
}

/**
 * Velocity windows surfaced by the API. Each metric is its own object keyed
 * by window label; window keys are sparse — only present once the token has
 * been tracked long enough for that window to be computed. Use the parent's
 * `history_age_seconds` to know which windows are available.
 *
 * Backed by mc-tracker's CONFIRMED-commitment swap stream so windows are
 * reorg-safe.
 */
export type VelocityWindowKey = "5m" | "15m" | "1h" | "2h" | "4h";
export type VelocityNumberMap = Partial<Record<VelocityWindowKey, number | null>>;
export type VelocityVolumeMap = Partial<Record<VelocityWindowKey, number>>;

export interface TokenResponseBody {
  mint: string;
  price_usd: number | null;
  price_sol: number | null;
  market_cap: number | null;
  volume_24h_usd: number | null;
  volume_24h_sol: number | null;
  trades_24h: number | null;
  last_trade_at: string | null;
  /** When the mint first appeared in our indexer (null if unknown). */
  first_seen_at?: string | null;
  /** Seconds since first_seen_at (null if unknown). */
  age_seconds?: number | null;
  is_blacklisted?: boolean;
  /** "stablecoin" | "wrapped_sol" | "lst" | "rug" | custom category when blacklisted. Null otherwise. */
  blacklist_category?: string | null;
  deployer: TokenDeployerInfo | null;
  kol_activity: TokenKolActivity;
  /** v1.7 — market-cap % change keyed by window (sparse — only windows the token has enough history for). */
  mc_change_pct?: VelocityNumberMap;
  /** v1.7 — organic (MEV-stripped) USD volume keyed by window. */
  volume_usd?: VelocityVolumeMap;
  /** v1.7 — MEV/bot volume as % of total volume keyed by window. */
  mev_volume_pct?: VelocityNumberMap;
  /** v1.7 — seconds of velocity history available for this token (capped at ~4h05m). */
  history_age_seconds?: number | null;
  /** Ratio of liquidity_usd to market_cap — a proxy for pool depth relative to token size. */
  liquidity_to_mc_ratio?: number | null;
  /** Total SOL spent by the first-20 buyers at launch. */
  launch_cohort_sol?: number | null;
  /** Count of distinct first-20 buyers (0–20). */
  launch_cohort_size?: number;
}

export interface TokenResponse {
  token: TokenResponseBody;
  _rid?: string;
}

export interface TokenBatchResponse {
  tokens: TokenResponseBody[];
  count: number;
  _rid?: string;
}

// ─── /tokens (directory list) types — v1.7 ───────────────────────────────────

export type TokenListSort =
  | "mc_desc"
  | "mc_asc"
  | "last_trade_desc"
  | "liquidity_desc"
  | "cumulative_volume_desc"
  // v2.15 — momentum / trending sorts (DB-native via token_prices_trending view)
  | "mc_change_5m_desc"
  | "mc_change_1h_desc"
  | "volume_1h_desc"
  | "trending";

export type TokenPrimaryDex =
  | "pumpfun"
  | "pumpswap"
  | "raydium"
  | "meteora"
  | "orca"
  | "raydium_clmm";

export interface TokenListParams {
  // MC band
  min_mc?: number;
  max_mc?: number;
  /** Minimum liquidity_usd. Default 2000 — pass 0 to disable. */
  min_liq?: number;
  /** Only tokens with a trade within the last N hours (0.1–168). */
  active_h?: number;
  primary_dex?: TokenPrimaryDex;
  authority_revoked?: boolean;
  exclude_token2022?: boolean;
  min_lp_burnt_pct?: number;
  /** Computed (post-filter): organic-volume floor in the last 1 hour. */
  min_volume_1h_usd?: number;
  /** Computed (post-filter): MEV/bot volume ceiling as a % of total. */
  max_mev_share_pct?: number;
  /** Computed (post-filter): minimum 1h MC change %. */
  mc_change_1h_min_pct?: number;
  /** Computed (post-filter): maximum 1h MC change %. */
  mc_change_1h_max_pct?: number;
  sort?: TokenListSort;
  limit?: number;
  offset?: number;
  /** Filter by minimum liquidity_to_mc_ratio. */
  min_liq_mc_ratio?: number;
  /** Filter by maximum liquidity_to_mc_ratio. */
  max_liq_mc_ratio?: number;
  /** Filter by deployer tier. */
  deployer_tier?: "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
}

export interface TokenSummary {
  mint: string;
  symbol: string | null;
  name: string | null;
  price_usd: number | null;
  market_cap_usd: number | null;
  fdv_usd: number | null;
  liquidity_usd: number | null;
  primary_dex: string | null;
  authorities_revoked: boolean;
  lp_burnt_pct: number | null;
  is_token_2022: boolean;
  last_trade_time: string | null;
  mc_change_5m_pct: number | null;
  mc_change_1h_pct: number | null;
  organic_volume_1h_usd: number | null;
  mev_share_pct: number | null;
  /** Ratio of liquidity_usd to market_cap_usd — a proxy for pool depth. */
  liquidity_to_mc_ratio?: number | null;
  /** Deployer Hunter tier for this token's deployer wallet. */
  deployer_tier?: string | null;
}

export interface TokenListResponse {
  tokens: TokenSummary[];
  pagination: {
    limit: number;
    offset: number;
    returned: number;
    has_more: boolean;
    /** True when at least one computed filter ran in JS — page size may be < limit. */
    post_filtered: boolean;
  };
  filters: Record<string, unknown>;
  _rid?: string;
}

// ─── /tokens/almost-bonded types — v2.15 ─────────────────────────────────────

export type AlmostBondedSort = "velocity_desc" | "progress_desc" | "eta_asc";

export interface AlmostBondedParams {
  /** Lower bound on bonding progress %. Default 80. */
  min_progress?: number;
  /** Upper bound on bonding progress %. Default 99.99 (already-bonded excluded). */
  max_progress?: number;
  /** Minimum Δprogress/min. Tokens without a 5m-ago snapshot are dropped when set. */
  min_velocity_pct_per_min?: number;
  /** Max minutes since deploy (post-filter). */
  max_age_minutes?: number;
  /** Filter by deployer reputation tier. */
  deployer_tier?: "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
  /** Only tokens whose mint+freeze authorities are revoked. */
  authority_revoked?: boolean;
  /** Minimum liquidity_usd. */
  min_liq?: number;
  /** Sort axis. Default "velocity_desc". */
  sort?: AlmostBondedSort;
  /** Page size (1–100). Default 50. */
  limit?: number;
}

export interface AlmostBondedToken {
  mint: string;
  symbol: string | null;
  name: string | null;
  /** Bonding-curve progress %, from on-chain real_token_reserves depletion. */
  progress_pct: number | null;
  /** Δprogress per minute; null until a 5m-ago snapshot exists. */
  velocity_pct_per_min: number | null;
  /** Linear projection of minutes-to-bond from current velocity; null when not measurable. */
  eta_minutes: number | null;
  /** True when |velocity| is below the stall threshold; null when velocity is unknown. */
  stalled: boolean | null;
  real_sol_reserves: number | null;
  market_cap_usd: number | null;
  liquidity_usd: number | null;
  authorities_revoked: boolean;
  deployer_tier: string | null;
  age_minutes: number | null;
}

export interface AlmostBondedResponse {
  tokens: AlmostBondedToken[];
  filters: Record<string, unknown>;
  returned: number;
  note: string;
  _rid?: string;
}

// ─── /me types — v1.7 ────────────────────────────────────────────────────────

export type ApiTier = "BASIC" | "TRADER" | "PRO" | "ULTRA";

export interface MeQuotaWindow {
  limit: number;
  used: number;
  remaining: number;
}

export interface MeResponse {
  subscriber: string;
  tier: ApiTier;
  tier_label: string;
  subscription: {
    status: string;
    billing_cycle: "monthly" | "annual";
    current_period_end: string | null;
    started_at: string;
  } | null;
  quota: {
    daily: MeQuotaWindow & { resets_at: string };
    burst: MeQuotaWindow & { window_seconds: number };
  };
  features: {
    webhooks: { limit: number; used: number };
    ws_connections: { limit: number };
    dex_connections: { limit: number };
    copytrade_wallets: { limit: number; used: number };
    copytrade_rules: { limit: number; used: number };
    coordination_rules: { limit: number; used: number };
    first_touch_subscriptions: { limit: number; used: number };
    wallet_tracker_watchlist: { used: number };
  };
  _rid?: string;
}

// ─── Wallet Tracker types ─────────────────────────────────────────────────────

export type WalletTrackerEventType = "swap" | "transfer";
export type WalletTrackerAction = "buy" | "sell" | "transfer_in" | "transfer_out";
export type WalletTrackerSummaryPeriod = "24h" | "7d" | "30d";

export interface WatchlistAddParams {
  /** Solana wallet address to track. */
  wallet_address: string;
  /** Optional human-readable label. */
  label?: string;
}

export interface WatchlistUpdateParams {
  /** New label for the wallet, or null to clear it. */
  label: string | null;
}

export interface WalletEntry {
  wallet_address: string;
  label: string | null;
  added_at: string;
}

export interface WatchlistAddResponse {
  wallet_address: string;
  label: string | null;
  added_at: string;
  remaining: number;
}

export interface WatchlistResponse {
  wallets: WalletEntry[];
  count: number;
  limit: number;
  remaining: number;
  _rid?: string;
}

export interface WalletTrackerEvent {
  id: string;
  wallet_address: string;
  label: string | null;
  event_type: WalletTrackerEventType;
  action: WalletTrackerAction;
  /** Solana block time (Unix seconds). */
  block_time: number;
  /** Block time as ISO string. */
  block_time_iso: string;
  token_mint: string | null;
  token_symbol: string | null;
  token_name: string | null;
  sol_amount: number;
  token_amount: number | null;
  price_per_token_sol: number | null;
  counterparty: string | null;
  /** Transaction signature — BASIC tier: null. */
  tx_signature: string | null;
  program: string | null;
}

export interface WalletTrackerTradesParams {
  /** Filter by specific wallet address. */
  wallet?: string;
  /** Filter by action type. */
  action?: WalletTrackerAction;
  /** Filter by event type. */
  event_type?: WalletTrackerEventType;
  /** Max results (1–200). Default: 50. */
  limit?: number;
  /** Cursor for pagination: block_time of the last item from the previous page. */
  before?: number;
}

export interface WalletTrackerTradesResponse {
  events: WalletTrackerEvent[];
  count: number;
}

export interface WalletTrackerWalletStats {
  wallet_address: string;
  label: string | null;
  swap_count: number;
  buys: number;
  sells: number;
  sol_bought: number;
  sol_sold: number;
  last_event_at: string | null;
}

export interface WalletTrackerSummaryParams {
  /** Time window for stats. Default: "7d". */
  period?: WalletTrackerSummaryPeriod;
  /** Filter to a specific wallet address. */
  wallet?: string;
}

export interface WalletTrackerSummaryResponse {
  wallets: WalletTrackerWalletStats[];
  period: string;
}

export interface WalletTrackerDeleteResponse {
  success: boolean;
}

// ─── Tools types ─────────────────────────────────────────────────────────────

export interface ToolsSearchParams {
  /** Full-text search query. */
  q?: string;
  /** Category slug filter. */
  category?: string;
  /** Max results (1–50). Default: 20. */
  limit?: number;
}

export interface Tool {
  name: string;
  slug: string;
  tagline: string;
  website_url: string;
  logo_url?: string | null;
  categories: string[];
  pricing_model?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
  health_score?: number | null;
  url?: string | null;
}

export interface ToolsSearchResponse {
  tools: Tool[];
  count: number;
  _rid?: string;
}

// ─── Streaming types ────────────────────────────────────────────────────────

export interface StreamToken {
  token: string;
  expires_at: string;
  next_refresh_at?: string | null;
  ws_url: string;
  /** DEX trade stream URL — only present for Ultra tier subscribers */
  dex_ws_url?: string | null;
  usage: string;
  _rid?: string;
}

/** A live WebSocket session for your API key (as returned by
 * `client.stream.sessions()`). */
export interface StreamSession {
  id: string;
  /** Which streaming service the socket is connected to. */
  service: "ws-streaming" | "dex-stream";
  tier: string;
  channels: string[];
  /** ISO-8601 connect time. */
  connected_at: string;
  remote_ip: string | null;
  messages_sent: number;
}

export interface StreamSessionsResponse {
  sessions: StreamSession[];
  count: number;
  _rid?: string;
}

/** Result of evicting a live session via `client.stream.deleteSession(id)`. */
export interface StreamSessionEvictResponse {
  evicted: true;
  id: string;
  _rid?: string;
}

// ─── Webhook types ──────────────────────────────────────────────────────────

export interface WebhookCreateParams {
  url: string;
  events: string[];
  filters?: Record<string, unknown>;
}

export interface WebhookUpdateParams {
  url?: string;
  events?: string[];
  filters?: Record<string, unknown>;
  status?: "active" | "paused";
}

export interface Webhook {
  id: number;
  url: string;
  events: string[];
  filters: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

export interface WebhookListResponse {
  webhooks: Webhook[];
  _rid?: string;
}

export interface WebhookDeleteResponse {
  success: boolean;
}

// ─── Client config ────────────────────────────────────────────────────────────

export interface MadeOnSolConfig {
  /**
   * MadeOnSol API key (starts with `msk_`).
   * Get a free key at https://madeonsol.com/pricing
   */
  apiKey: string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function buildUrl(baseUrl: string, path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

// ─── KOL namespace ───────────────────────────────────────────────────────────

class KolClient {
  constructor(private readonly _fetch: <T>(url: string) => Promise<T>, private readonly _baseUrl: string) {}

  /**
   * Live feed of KOL trades.
   * @param params Optional filters: limit (1–100), action, kol wallet.
   */
  feed(params?: KolFeedParams): Promise<KolFeedResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/feed", params as Record<string, string | number | undefined>));
  }

  /**
   * KOL PnL leaderboard.
   * @param params Optional period filter ("today" | "7d" | "30d" | "90d" | "180d").
   * KOL trade data is retained for 180 days; the 90d/180d windows fill up over time.
   */
  leaderboard(params?: KolLeaderboardParams): Promise<KolLeaderboardResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/leaderboard", params as Record<string, string | undefined>));
  }

  /**
   * Full profile for a single KOL wallet.
   * @param wallet Solana wallet address.
   * @param params Optional: include "pnl_by_token" for per-token breakdown.
   */
  wallet(wallet: string, params?: KolWalletParams): Promise<KolWalletProfile> {
    return this._fetch(buildUrl(this._baseUrl, `/kol/${encodeURIComponent(wallet)}`, params as Record<string, string | undefined>));
  }

  /**
   * Detect coordinated buying activity across KOL wallets.
   * @param params Optional filters: period, min_kols, limit.
   */
  coordination(params?: KolCoordinationParams): Promise<KolCoordinationResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/coordination", params as Record<string, string | number | undefined>));
  }

  /**
   * KOL activity for a specific token mint.
   * @param mint Token mint address.
   */
  token(mint: string): Promise<KolTokenActivity> {
    return this._fetch(buildUrl(this._baseUrl, `/kol/tokens/${encodeURIComponent(mint)}`));
  }

  /**
   * KOL affinity pairs — which KOLs frequently co-trade the same tokens.
   * @param params Optional: period, min_shared, limit.
   */
  pairs(params?: KolPairsParams): Promise<KolPairsResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/pairs", params as Record<string, string | number | undefined>));
  }

  /**
   * KOL entry/exit timing profile — hold duration, exit speed, activity patterns.
   * @param wallet KOL wallet address.
   * @param params Optional: period.
   */
  timing(wallet: string, params?: KolTimingParams): Promise<KolTimingResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/kol/${encodeURIComponent(wallet)}/timing`, params as Record<string, string | undefined>));
  }

  /**
   * KOL momentum tokens — tokens with accelerating KOL buy interest.
   * @param params Optional: period, min_kols, limit.
   */
  hotTokens(params?: KolHotTokensParams): Promise<KolHotTokensResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/tokens/hot", params as Record<string, string | number | undefined>));
  }

  /**
   * Deep per-wallet PnL breakdown — realized PnL, win rate, profit factor,
   * max drawdown, daily equity curve, and per-token closed/open positions.
   * BASIC: summary only. PRO: + curve + closed positions. ULTRA: + open positions.
   * @param wallet KOL wallet address.
   * @param params Optional: period (7d/30d/90d/180d).
   */
  pnl(wallet: string, params?: KolPnlParams): Promise<KolPnlResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/kol/${encodeURIComponent(wallet)}/pnl`, params as Record<string, string | undefined>));
  }

  /**
   * Tokens ranked by KOL buy volume — pure capital-flow signal.
   * Sub-hour periods (5m/15m/30m) require PRO/ULTRA. BASIC capped at 10 results.
   * @param params Optional: period (5m–12h), min_kols, limit.
   */
  trendingTokens(params?: KolTrendingParams): Promise<KolTrendingResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/tokens/trending", params as Record<string, string | number | undefined>));
  }

  /**
   * Ranked list of KOL buyers for a token, ordered by first-buy timestamp.
   * Each entry includes KOL identity, strategy tag, win rate, early-entry %, and time delta from the first KOL entry.
   * @param mint Token mint address.
   * @param params Optional: limit (1–100).
   */
  tokenEntryOrder(mint: string, params?: KolEntryOrderParams): Promise<KolEntryOrderResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/kol/tokens/${encodeURIComponent(mint)}/entry-order`, params as Record<string, string | number | undefined>));
  }

  /**
   * Side-by-side comparison of 2–5 KOL wallets.
   * Returns full scores (winrate/ROI/profit factor/early entry/consistency) and, on PRO+, a 30d overlap array.
   * Tier limits: BASIC=2, PRO=4, ULTRA=5.
   * @param params Required: wallets (2–5 Solana addresses).
   */
  compare(params: KolCompareParams): Promise<KolCompareResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/compare", { wallets: params.wallets.join(",") } as Record<string, string>));
  }

  /**
   * Live feed of notable KOL events: consensus clusters, fresh-launch KOL buys, and heating-up wallets.
   * @param params Optional: window (1h/6h/24h), types (subset), limit.
   */
  alerts(params?: KolAlertsParams): Promise<KolAlertsResponse> {
    const { types, ...rest } = params ?? {};
    const flat: Record<string, string | number | undefined> = { ...(rest as Record<string, string | number | undefined>) };
    if (types && types.length > 0) flat.types = types.join(",");
    return this._fetch(buildUrl(this._baseUrl, "/kol/alerts/recent", flat));
  }

  /**
   * Recent first-KOL-touch events on tokens — the moment a tracked KOL was the
   * first to buy a given mint. Filterable by scout tier (S/A/B/C from
   * mv_kol_scout_score), KOL winrate, token age, mint suffix, etc.
   *
   * Backtest: top scouts attract ≥3 follow-on KOLs within 4h ~50% of the time vs ~14% baseline.
   * Median lead time before second KOL is 12s — for trading this signal,
   * subscribe via the `kol:first_touches` WebSocket channel rather than polling.
   *
   * @param params Optional filters; see FirstTouchesParams.
   */
  firstTouches(params?: FirstTouchesParams): Promise<FirstTouchesResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/first-touches", params as Record<string, string | number | undefined>));
  }

  /**
   * v1.9 — Scout leaderboard: top KOLs ranked by scout score, first-touch frequency,
   * and swarm attraction rate. ULTRA only.
   */
  scoutLeaderboard(params?: ScoutLeaderboardParams): Promise<unknown> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/scouts/leaderboard", params as Record<string, string | number | undefined>));
  }

  /**
   * v1.9 — Coordination history: past coordination alert fires with token, score, KOL count.
   * ULTRA only.
   */
  coordinationHistory(params?: CoordinationHistoryParams): Promise<unknown> {
    return this._fetch(buildUrl(this._baseUrl, "/kol/coordination/history", params as Record<string, string | number | undefined>));
  }
}

// ─── Alpha namespace ─────────────────────────────────────────────────────────

class AlphaClient {
  constructor(private readonly _fetch: <T>(url: string) => Promise<T>, private readonly _baseUrl: string) {}

  /**
   * Leaderboard of statistically profitable wallets ranked by win rate, PnL, or ROI.
   * Scored from 47,000+ early buyers tracked across Pump.fun tokens.
   * BASIC: 25 results, truncated wallets. PRO: 100. ULTRA: 500 + behavioral signals.
   * @param params Optional: period, min_tokens, sort, exclude_bots.
   */
  leaderboard(params?: AlphaLeaderboardParams): Promise<AlphaLeaderboardResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/alpha/leaderboard", params as Record<string, string | number | boolean | undefined>));
  }

  /**
   * Full alpha profile for a single wallet. Per-token trade history, win rate,
   * realized PnL, and bot_signals array explaining the confidence rating.
   * **ULTRA only** — BASIC/PRO receive HTTP 403.
   * @param wallet Solana wallet address.
   */
  wallet(wallet: string): Promise<AlphaWalletResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/alpha/${encodeURIComponent(wallet)}`));
  }

  /**
   * Wallets behaviorally linked to this one — co-bought 3+ tokens within a 2-second
   * window (likely same actor or coordinated group). Returns similarity scores.
   * **ULTRA only** — BASIC/PRO receive HTTP 403.
   * @param wallet Solana wallet address.
   */
  linked(wallet: string): Promise<AlphaLinkedResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/alpha/${encodeURIComponent(wallet)}/linked`));
  }

  /**
   * Cap table: first 10–20 non-deployer early buyers for a token, enriched with
   * historical win rates, PnL, KOL identity, and bundle flags.
   * **BASIC**: HTTP 403. **PRO**: top 10, truncated wallets. **ULTRA**: top 20, full wallets.
   * @param mint Token mint address.
   */
  capTable(mint: string): Promise<AlphaCapTableResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/tokens/${encodeURIComponent(mint)}/cap-table`));
  }

  /**
   * 0–100 buyer quality score for a token's early-buyer cohort.
   * Signal: "positive" (>60), "neutral" (40–60), "negative" (<40). 5-minute cache.
   * BASIC: score + confidence + signal. PRO/ULTRA: + breakdown.
   * @param mint Token mint address.
   */
  buyerQuality(mint: string): Promise<AlphaBuyerQualityResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/tokens/${encodeURIComponent(mint)}/buyer-quality`));
  }

  /**
   * v2.13 — Transparent 0–100 token rug-risk/safety score (higher = riskier).
   * Returns a `band` (safe/caution/danger), an explainable `factors` array that
   * sums into the score, and the raw `inputs` (mint/freeze authority, liquidity,
   * transfer fee, Token-2022 flag, burn, launch cohort, deployer bond rate, KOL
   * signal, blacklist). **PRO/ULTRA only** — BASIC receives HTTP 403.
   * @param mint Token mint address.
   */
  risk(mint: string): Promise<TokenRiskResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/tokens/${encodeURIComponent(mint)}/risk`));
  }

  /**
   * v2.18 — Bundle-cohort holdings: the wallets that bought a token together
   * (one atomic transaction or the same slot) and how much of supply they still
   * hold. The `bundle` summary block leads with `held_pct_of_supply` (0–1 of
   * total supply the cohort currently holds) alongside `bundle_kind`
   * (`"atomic_tx"` | `"same_slot"` | `"none"`), `wallet_count`, `held_ratio`,
   * `fully_exited`, `buy_volume`, and `tokens_held`.
   * **Tier-gated:** BASIC/TRADER get the `bundle` block only (`wallets: []`);
   * PRO adds the top-10 cohort wallets with flags (`held_ratio`, `has_sold`,
   * `atomic`, `is_kol`); ULTRA returns the full cohort plus identity
   * (`kol_name`, `win_rate`, `bot_confidence`) and per-wallet `tokens_held`.
   * @param mint Token mint address.
   */
  bundle(mint: string): Promise<TokenBundleResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/tokens/${encodeURIComponent(mint)}/bundle`));
  }

  /**
   * Per-venue liquidity map: every DEX pool a token trades in, each flagged
   * live (`is_active`) or parked, with `liquidity_usd`, `last_price_sol`, and
   * `last_swap_at`. The `summary` block rolls up pool/DEX counts, total
   * liquidity, the primary pool/dex, and `top_pool_share_pct` (largest-pool
   * concentration) — a fragmentation read for a token's liquidity.
   * **PRO/ULTRA only** — BASIC receives HTTP 403.
   * @param mint Token mint address.
   */
  tokenPools(mint: string): Promise<TokenPoolsResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/tokens/${encodeURIComponent(mint)}/pools`));
  }

  /**
   * v2.14 — OHLCV candlestick time-series (the persisted price/MC trajectory),
   * 1m–1d, rolled up on read. **PRO+**: OHLCV (open/high/low/close/volume_usd/
   * trades/market_cap_usd), last 30 days. **ULTRA**: adds per-bar net flow
   * (buy/sell volume, `net_volume_usd`, buy/sell count, MEV volume), open/close
   * liquidity (LP delta), MC high/low, and full retained history. The response's
   * `net_flow_included` flags which set you received.
   * @param mint Token mint address.
   * @param params tf (default "1h"), limit (1–1000, default 200), from/to (ISO8601).
   */
  candles(mint: string, params: CandlesParams = {}): Promise<CandlesResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/tokens/${encodeURIComponent(mint)}/candles`, params as Record<string, string | number | undefined>));
  }

  /**
   * v2.15 — Aggregated buy/sell flow for a token over a 1h or 24h window:
   * unique wallets/buyers/sellers, buy/sell counts and SOL volumes, `net_sol`
   * (buy_sol − sell_sol), and `trades_per_wallet`. **PRO+** — keyed.
   * @param mint Token mint address.
   * @param params window ("1h" default, or "24h").
   */
  tokenFlow(mint: string, params: TokenFlowParams = {}): Promise<TokenFlowResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/tokens/${encodeURIComponent(mint)}/flow`, params as Record<string, string | number | undefined>));
  }
}

// ─── Token namespace (/token/{mint}) ─────────────────────────────────────────

class TokenClient {
  constructor(
    private readonly _fetch: <T>(url: string) => Promise<T>,
    private readonly _post: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /**
   * Comprehensive per-mint snapshot: price (VWAP), market cap, 24h volume,
   * deployer reputation, KOL smart-money activity, first_seen_at / age_seconds,
   * and blacklist status — all in one call.
   * **ULTRA** adds individual KOL wallet addresses in kol_activity.top_buyers[].
   * @param mint Token mint address (base58).
   */
  get(mint: string): Promise<TokenResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/token/${encodeURIComponent(mint)}`));
  }

  /**
   * Batch lookup of up to 50 mints. Returns the same per-mint shape as `get()`
   * in a single round-trip — DB queries batched with `IN(...)`, dex-stream +
   * RPC fan-outs run in parallel. ~10-20x cheaper than N sequential calls.
   * @param mints Array of 1–50 Solana token mints.
   */
  batch(mints: string[]): Promise<TokenBatchResponse> {
    return this._post(`${this._baseUrl}/token/batch`, { mints });
  }

  /**
   * Batch buyer-quality scoring for up to 50 mints. Shares the same 5-minute
   * LRU cache as `alpha.buyerQuality(mint)` — already-warm mints return at
   * near-zero cost. Response includes a `cache_hits` counter.
   * @param mints Array of 1–50 Solana token mints.
   */
  batchBuyerQuality(mints: string[]): Promise<AlphaBuyerQualityBatchResponse> {
    return this._post(`${this._baseUrl}/tokens/batch/buyer-quality`, { mints });
  }

  /**
   * Batch token risk scoring for up to 50 mints — the same transparent 0–100
   * rug-risk result as `client.alpha.risk(mint)` (each stamped with `as_of`) in
   * a single request that counts as 1 against your quota. Untracked mints come
   * back as `{ mint, error: "not_tracked" }` without failing the batch; `tokens`
   * preserves de-duplicated input order and `count` is the number of unique
   * mints. **PRO/ULTRA only.**
   * @param mints Array of 1–50 Solana token mints.
   */
  batchRisk(mints: string[]): Promise<TokenRiskBatchResponse> {
    return this._post(`${this._baseUrl}/tokens/batch/risk`, { mints });
  }

  /**
   * v1.7 — Filtered, sortable token directory. **PRO+** only. Default
   * `min_liq=2000` trims the long tail of phantom-MC tokens (low-liq pools
   * producing absurd VWAP × supply products); pass `min_liq=0` to opt out.
   * Computed filters (`min_volume_1h_usd`, `max_mev_share_pct`, `mc_change_1h_*`)
   * over-fetch 3× from the DB and filter in JS — pagination page size may be
   * smaller than `limit` when these are set. The response includes
   * `pagination.post_filtered` so clients can detect the over-fetch behaviour.
   * @example
   * ```ts
   * const { tokens } = await client.token.list({
   *   min_liq: 10000,
   *   min_volume_1h_usd: 5000,
   *   max_mev_share_pct: 60,
   *   sort: "mc_desc",
   *   limit: 50,
   * });
   * ```
   */
  list(params?: TokenListParams): Promise<TokenListResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/tokens", params as Record<string, string | number | boolean | undefined>));
  }

  /**
   * v2.15 — Pre-bond pump.fun tokens approaching graduation, ranked by velocity
   * (Δprogress/min) — "95% and accelerating" beats "92% stalled". **PRO+** only.
   * Each token is enriched with deployer reputation tier. `progress_pct` comes
   * from on-chain real_token_reserves depletion; `velocity_pct_per_min` is null
   * until a 5-minute snapshot exists; `eta_minutes` is a linear projection.
   * @example
   * ```ts
   * const { tokens } = await client.token.almostBonded({
   *   min_progress: 90,
   *   min_velocity_pct_per_min: 0.5,
   *   sort: "eta_asc",
   *   limit: 25,
   * });
   * ```
   */
  almostBonded(params?: AlmostBondedParams): Promise<AlmostBondedResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/tokens/almost-bonded", params as Record<string, string | number | boolean | undefined>));
  }

  /**
   * v1.9 — KOL consensus on a token: how many KOLs bought/sold, exit rate,
   * net flow, median entry MC. ULTRA gets individual wallet arrays.
   */
  kolConsensus(mint: string): Promise<KolConsensusResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/tokens/${encodeURIComponent(mint)}/kol-consensus`));
  }

  /**
   * v1.9 — Peak MC history for a token: ATH, decline from peak, MC at bond
   * and at 1h/6h/24h/7d after bond.
   */
  peakHistory(mint: string): Promise<PeakHistoryResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/tokens/${encodeURIComponent(mint)}/peak-history`));
  }
}

// ─── Deployer namespace ───────────────────────────────────────────────────────

class DeployerClient {
  constructor(private readonly _fetch: <T>(url: string) => Promise<T>, private readonly _baseUrl: string) {}

  /**
   * Global deployer statistics.
   */
  stats(): Promise<DeployerStats> {
    return this._fetch(buildUrl(this._baseUrl, "/deployer-hunter/stats"));
  }

  /**
   * Ranked list of deployers.
   * @param params Optional filters: tier, sort, limit, offset.
   */
  leaderboard(params?: DeployerLeaderboardParams): Promise<DeployerLeaderboardResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/deployer-hunter/leaderboard", params as Record<string, string | number | undefined>));
  }

  /**
   * Full profile for a single deployer wallet.
   * @param wallet Solana wallet address.
   */
  profile(wallet: string): Promise<DeployerProfile> {
    return this._fetch(buildUrl(this._baseUrl, `/deployer-hunter/${encodeURIComponent(wallet)}`));
  }

  /**
   * Tokens deployed by a specific wallet.
   * @param wallet Solana wallet address.
   * @param params Optional: limit, offset.
   */
  tokens(wallet: string, params?: DeployerTokensParams): Promise<DeployerTokensResponse> {
    return this._fetch(buildUrl(
      this._baseUrl,
      `/deployer-hunter/${encodeURIComponent(wallet)}/tokens`,
      params as Record<string, number | undefined>,
    ));
  }

  /**
   * Recent deploy alerts from high-quality deployers.
   * @param params Optional filters: since (ISO datetime), limit, offset, tier.
   * The `tier` filter (elite/good/moderate/rising/cold) is **PRO/ULTRA only** —
   * BASIC subscribers passing it receive HTTP 403.
   */
  alerts(params?: DeployerAlertsParams): Promise<DeployerAlertsResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/deployer-hunter/alerts", params as Record<string, string | number | undefined>));
  }

  /**
   * Alert statistics over a time period.
   * @param params Optional: period ("7d" | "30d" | "all").
   */
  alertStats(params?: DeployerAlertStatsParams): Promise<DeployerAlertStats> {
    return this._fetch(buildUrl(this._baseUrl, "/deployer-hunter/alert-stats", params as Record<string, string | undefined>));
  }

  /**
   * Best-performing tokens deployed by tracked wallets.
   * @param params Optional: period, limit.
   */
  bestTokens(params?: BestTokensParams): Promise<BestTokensResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/deployer-hunter/best-tokens", params as Record<string, string | number | undefined>));
  }

  /**
   * Most recently bonded tokens from tracked deployers.
   * @param params Optional: limit.
   */
  recentBonds(params?: RecentBondsParams): Promise<RecentBondsResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/deployer-hunter/recent-bonds", params as Record<string, number | undefined>));
  }

  /**
   * Deployer skill curve — streaks, rolling bond rate, improvement trend, deployment cadence.
   * Requires Pro or Ultra subscription.
   * @param wallet Deployer wallet address.
   * @param params Optional: `include: "daily_snapshots"` for up to 90 daily tier/bonding snapshots.
   */
  trajectory(wallet: string, params?: { include?: "daily_snapshots" }): Promise<DeployerTrajectoryResponse> {
    return this._fetch(buildUrl(this._baseUrl, `/deployer-hunter/${encodeURIComponent(wallet)}/trajectory`, params as Record<string, string | undefined>));
  }

  /**
   * Daily reputation time-series for a deployer — one snapshot per day capturing
   * the tier, tracked flag, deploy/bond counts, bonding rates, and peak-MC stats
   * that were true on that date. Backtest "was this deployer elite when it
   * launched token X?" without look-ahead bias.
   * @param wallet Deployer wallet address.
   * @param opts Optional: limit (1–365 daily snapshots, default 90).
   */
  deployerHistory(wallet: string, opts?: DeployerHistoryParams): Promise<DeployerHistoryResponse> {
    return this._fetch(buildUrl(
      this._baseUrl,
      `/deployer-hunter/${encodeURIComponent(wallet)}/history`,
      opts as Record<string, number | undefined>,
    ));
  }
}

// ─── Wallet Tracker namespace ─────────────────────────────────────────────────

class WalletTrackerClient {
  constructor(
    private readonly _get: <T>(url: string) => Promise<T>,
    private readonly _post: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _patch: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _delete: <T>(url: string) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /**
   * List your tracked wallets with labels and remaining capacity.
   */
  watchlist(): Promise<WatchlistResponse> {
    return this._get(buildUrl(this._baseUrl, "/wallet-tracker/watchlist"));
  }

  /**
   * Add a wallet to your watchlist.
   * Returns HTTP 409 if already tracked or tier limit is reached.
   * Limits: BASIC=10, PRO=50, ULTRA=100.
   * @param params wallet_address (required), label (optional).
   */
  addToWatchlist(params: WatchlistAddParams): Promise<WatchlistAddResponse> {
    return this._post(buildUrl(this._baseUrl, "/wallet-tracker/watchlist"), params);
  }

  /**
   * Remove a wallet from your watchlist.
   * @param address Solana wallet address to remove.
   */
  removeFromWatchlist(address: string): Promise<WalletTrackerDeleteResponse> {
    return this._delete(buildUrl(this._baseUrl, `/wallet-tracker/watchlist/${encodeURIComponent(address)}`));
  }

  /**
   * Update a wallet's label.
   * @param address Solana wallet address.
   * @param params label (string to set, null to clear).
   */
  updateLabel(address: string, params: WatchlistUpdateParams): Promise<WalletEntry> {
    return this._patch(buildUrl(this._baseUrl, `/wallet-tracker/watchlist/${encodeURIComponent(address)}`), params);
  }

  /**
   * Historical events (swaps + transfers) for all watched wallets.
   * BASIC: truncated wallets, no tx_signature, no counterparty.
   * @param params Optional filters: wallet, action, event_type, limit (max 200), before (cursor).
   */
  trades(params?: WalletTrackerTradesParams): Promise<WalletTrackerTradesResponse> {
    return this._get(buildUrl(this._baseUrl, "/wallet-tracker/trades", params as Record<string, string | number | undefined>));
  }

  /**
   * Per-wallet stats (swap counts, SOL bought/sold, last activity).
   * @param params Optional: period (24h/7d/30d), wallet (filter to one address).
   */
  summary(params?: WalletTrackerSummaryParams): Promise<WalletTrackerSummaryResponse> {
    return this._get(buildUrl(this._baseUrl, "/wallet-tracker/summary", params as Record<string, string | undefined>));
  }
}

// ─── Sniper: deshred pre-confirm pump.fun deploy feed (PRO + ULTRA) ─────────
// Deploys are reconstructed from shred-level ("deshred") data and surface
// ~500ms before the chain confirms them — the fastest path to a new pump.fun
// launch. PRO is curated to elite/good deployers; ULTRA sees every deployer
// tier and can maintain a custom deployer watchlist.

export interface SniperDeploy {
  mint: string;
  name: string | null;
  symbol: string | null;
  deployer_wallet: string;
  signature: string;
  slot: number;
  detected_at: string;
  detection_region: string;
  detection_confirmed: boolean;
  deployer_tier: string | null;
  deployer_bond_rate: number | null;
  deployer_total_bonded: number | null;
  deployer_recent: string | null;
  /** Fraction of the deployer's labeled tokens that ran (peak >=60min after deploy) vs dumped. */
  deployer_runner_rate?: number | null;
  /** Confidence denominator; gate on >=3. */
  deployer_labeled_tokens?: number | null;
  /** "deshred" — detection is pre-execution, so the payload carries no MC/logs/balances. */
  confirmed_on_chain: boolean | null;
  confirmed_at: string | null;
}

export interface SniperRecentParams {
  /** Only deploys detected after this ISO-8601 timestamp. */
  since?: string;
  /** Filter by deployer reputation tier (ULTRA; PRO is always elite/good). */
  deployer_tier?: "elite" | "good" | "moderate" | "rising" | "cold" | "unranked";
  /** Minimum deployer lifetime bond rate (0–1). */
  min_bond_rate?: number;
  /** Max results, 1–200 (default 50). */
  limit?: number;
  /** ULTRA: narrow the feed to your custom deployer watchlist (any tier). */
  watchlist?: boolean;
}

export interface SniperRecentResponse {
  deploys: SniperDeploy[];
  count: number;
  data_age_seconds: number | null;
  /** Present (true) when watchlist mode was requested but the watchlist is empty. */
  watchlist_empty?: boolean;
}

export interface SniperByDeployerResponse {
  deployer: string;
  deploys: SniperDeploy[];
  count: number;
}

export interface SniperWatchlistEntry {
  deployer_wallet: string;
  label: string | null;
  created_at: string;
}

export interface SniperWatchlistResponse {
  deployers: SniperWatchlistEntry[];
  count: number;
  limit: number;
  remaining: number;
}

export interface SniperWatchlistAddParams {
  /** A single deployer wallet to add. */
  wallet?: string;
  /** Bulk add (max 50 total). */
  wallets?: string[];
  /** Optional label applied to the added deployer(s). */
  label?: string;
}

export interface SniperWatchlistAddResponse {
  added: number;
  deployers?: string[];
  message?: string;
}

export interface SniperWatchlistRemoveResponse {
  removed: string;
}

/**
 * Deshred pre-confirm pump.fun sniper feed. PRO + ULTRA.
 * Live alerts flow via webhook (`sniper:deploy`), the `sniper:deploys` WebSocket
 * channel; these methods are for catch-up,
 * backtesting, and managing the ULTRA custom watchlist.
 */
class SniperClient {
  constructor(
    private readonly _get: <T>(url: string) => Promise<T>,
    private readonly _post: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _delete: <T>(url: string) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /**
   * Newest-first deshred deploy feed. PRO sees elite/good deployers; ULTRA sees all.
   * Pass `watchlist: true` (ULTRA) to narrow to your custom deployer watchlist.
   */
  recent(params?: SniperRecentParams): Promise<SniperRecentResponse> {
    const q: Record<string, string | number | undefined> = {
      since: params?.since,
      deployer_tier: params?.deployer_tier,
      min_bond_rate: params?.min_bond_rate,
      limit: params?.limit,
      watchlist: params?.watchlist ? "true" : undefined,
    };
    return this._get(buildUrl(this._baseUrl, "/sniper/recent", q));
  }

  /** Deshred deploys filtered to a single deployer wallet. ULTRA only. */
  byDeployer(wallet: string, params?: { limit?: number }): Promise<SniperByDeployerResponse> {
    return this._get(buildUrl(this._baseUrl, `/sniper/by-deployer/${encodeURIComponent(wallet)}`, params as Record<string, number | undefined>));
  }

  /** List your custom deployer watchlist (ULTRA, max 50). */
  watchlist(): Promise<SniperWatchlistResponse> {
    return this._get(buildUrl(this._baseUrl, "/sniper/watchlist"));
  }

  /** Add one (`wallet`) or many (`wallets`) deployers to your watchlist. ULTRA only. */
  addToWatchlist(params: SniperWatchlistAddParams): Promise<SniperWatchlistAddResponse> {
    return this._post(buildUrl(this._baseUrl, "/sniper/watchlist"), params);
  }

  /** Remove a deployer from your watchlist. ULTRA only. */
  removeFromWatchlist(wallet: string): Promise<SniperWatchlistRemoveResponse> {
    return this._delete(buildUrl(this._baseUrl, `/sniper/watchlist/${encodeURIComponent(wallet)}`));
  }
}

// ─── Universal wallet namespace (/wallet/{address}/*) ───────────────────────
// New 2026-05-20. Works on any Solana wallet — not just curated KOLs.
// Backed by FIFO cost-basis math on the last 90 days of token_trades.
// Cached in wallet_analyses with dynamic TTL. PRO+ on every method.

class WalletClient {
  constructor(
    private readonly _get: <T>(url: string) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /**
   * Aggregate stats for any wallet over the last 90 days, plus cross-product
   * flags from KOL / alpha / deployer tables. Sub-100ms even on heavy wallets.
   * Returns 404 if the wallet has no trades AND no flag-table presence.
   * **PRO+**.
   * @param address Solana wallet address (base58, 32–44 chars).
   * @example
   * ```ts
   * const { stats, flags } = await client.wallet.stats("ASVz...ybJk");
   * console.log(`${flags.kol_name ?? address}: ${stats?.total_trades} trades`);
   * ```
   */
  stats(address: string): Promise<WalletStatsResponse> {
    return this._get(buildUrl(this._baseUrl, `/wallet/${encodeURIComponent(address)}`));
  }

  /**
   * Full FIFO cost-basis PnL: realized + unrealized SOL, profit factor, max
   * drawdown, hold-time stats, daily UTC PnL curve, closed positions sorted by
   * pnl desc, open positions hydrated with live prices from mc-tracker.
   *
   * Cached in `wallet_analyses` with dynamic TTL (5min/1h/24h based on last
   * activity). Cache hits don't count against your daily quota and return in
   * < 5ms.
   *
   * **Cost-basis honesty:** observable only inside the data window — wallets
   * that sold tokens bought before that window have the overflow silently
   * discarded rather than fabricated. `notes.cost_basis_observable_from`
   * makes the cutoff visible.
   *
   * **PRO+**.
   * @param address Solana wallet address.
   * @example
   * ```ts
   * const pnl = await client.wallet.pnl("ASVz...ybJk");
   * console.log(`Realized: ${pnl.summary.realized_sol} SOL`);
   * console.log(`Win rate: ${(pnl.summary.win_rate! * 100).toFixed(1)}%`);
   * for (const c of pnl.closed_positions.slice(0, 5)) {
   *   console.log(`  ${c.token_mint.slice(0,8)}…  ${c.pnl_sol > 0 ? '+' : ''}${c.pnl_sol} SOL (${c.roi_pct}% ROI)`);
   * }
   * ```
   */
  pnl(address: string): Promise<WalletPnlResponse> {
    return this._get(buildUrl(this._baseUrl, `/wallet/${encodeURIComponent(address)}/pnl`));
  }

  /**
   * Open positions only — lighter slice of `pnl()` for UIs that don't need the
   * summary or curve. Shares the `wallet_analyses` cache: calling this right
   * after `pnl()` is an immediate cache hit. **PRO+**.
   * @param address Solana wallet address.
   */
  positions(address: string): Promise<WalletPositionsResponse> {
    return this._get(buildUrl(this._baseUrl, `/wallet/${encodeURIComponent(address)}/positions`));
  }

  /**
   * Verified CURRENT on-chain holdings — reads the wallet's actual SPL +
   * Token-2022 token accounts and SOL balance straight from chain, enriches
   * each with our price/MC/name/symbol, and computes `transfer_delta`
   * (on-chain amount − trade-derived net position). A nonzero `transfer_delta`
   * exposes tokens that arrived or left WITHOUT a swap — airdrops, insider
   * funding, wallet-hopping.
   *
   * Distinct from `positions()` (trade-derived FIFO): holdings is "what they
   * actually hold right now". **ULTRA only.**
   * @param address Solana wallet address.
   * @param params Optional: limit (1–500, default 200), min_value_usd (≥0, default 0).
   * @example
   * ```ts
   * const h = await client.wallet.holdings("ASVz...ybJk", { min_value_usd: 10 });
   * console.log(`${h.summary.non_zero} tokens, $${h.summary.total_value_usd}`);
   * for (const t of h.holdings.filter(t => t.transfer_delta && t.transfer_delta > 0)) {
   *   console.log(`  ${t.symbol ?? t.mint.slice(0,8)}: +${t.transfer_delta} arrived without a swap`);
   * }
   * ```
   */
  holdings(address: string, params?: WalletHoldingsParams): Promise<WalletHoldingsResponse> {
    return this._get(buildUrl(
      this._baseUrl,
      `/wallet/${encodeURIComponent(address)}/holdings`,
      params as Record<string, string | number | undefined>,
    ));
  }

  /**
   * Cursor-paginated raw trades. Default window is the last 90 days; override
   * via `since`/`until` (Unix epoch seconds). Default limit 100, max 500.
   *
   * Pagination is stable across DESC ordering — keep paging with `next_cursor`
   * until `has_more === false`. **PRO+**.
   *
   * @example
   * ```ts
   * let cursor: string | undefined;
   * while (true) {
   *   const page = await client.wallet.trades("ASVz...ybJk", { limit: 200, cursor, action: "buy" });
   *   for (const t of page.trades) processBuy(t);
   *   if (!page.has_more) break;
   *   cursor = page.next_cursor!;
   * }
   * ```
   */
  trades(address: string, params?: WalletTradesParams): Promise<WalletTradesResponse> {
    return this._get(buildUrl(
      this._baseUrl,
      `/wallet/${encodeURIComponent(address)}/trades`,
      params as Record<string, string | number | undefined>,
    ));
  }
}

// ─── Coordination alerts namespace (v1.1) ───────────────────────────────────

class CoordinationAlertsClient {
  constructor(
    private readonly _get: <T>(url: string) => Promise<T>,
    private readonly _post: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _patch: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _delete: <T>(url: string) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /**
   * List your coordination alert rules.
   * Requires PRO or ULTRA.
   */
  list(): Promise<CoordinationAlertListResponse> {
    return this._get(buildUrl(this._baseUrl, "/kol/coordination/alerts"));
  }

  /**
   * Create a coordination alert rule. Returns the rule plus a one-time
   * `webhook_secret` (save it — used for HMAC-SHA256 signature verification).
   * Tier quotas: PRO 5 rules, ULTRA 20 rules.
   */
  create(params: CoordinationAlertCreateParams): Promise<CoordinationAlertCreateResponse> {
    return this._post(buildUrl(this._baseUrl, "/kol/coordination/alerts"), params);
  }

  /** Fetch a single rule by id. */
  get(id: string): Promise<CoordinationAlertGetResponse> {
    return this._get(buildUrl(this._baseUrl, `/kol/coordination/alerts/${encodeURIComponent(id)}`));
  }

  /** Update a rule (toggle is_active, raise min_score, etc). */
  update(id: string, params: CoordinationAlertUpdateParams): Promise<CoordinationAlertUpdateResponse> {
    return this._patch(buildUrl(this._baseUrl, `/kol/coordination/alerts/${encodeURIComponent(id)}`), params);
  }

  /** Delete a rule. */
  delete(id: string): Promise<CoordinationAlertDeleteResponse> {
    return this._delete(buildUrl(this._baseUrl, `/kol/coordination/alerts/${encodeURIComponent(id)}`));
  }
}

// ─── First-touch webhook subscriptions (ULTRA) ──────────────────────────────

class FirstTouchSubscriptionsClient {
  constructor(
    private readonly _get: <T>(url: string) => Promise<T>,
    private readonly _post: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _patch: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _delete: <T>(url: string) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /**
   * List your first-touch webhook subscriptions.
   * Requires ULTRA. Up to 10 subscriptions per ULTRA user.
   */
  list(): Promise<FirstTouchSubscriptionListResponse> {
    return this._get(buildUrl(this._baseUrl, "/kol/first-touches/subscriptions"));
  }

  /**
   * Create a first-touch webhook subscription. Returns the subscription plus a
   * one-time `webhook_secret` (save it — used for HMAC-SHA256 signature verification).
   * Requires ULTRA.
   */
  create(params: FirstTouchSubscriptionCreateParams): Promise<FirstTouchSubscriptionCreateResponse> {
    return this._post(buildUrl(this._baseUrl, "/kol/first-touches/subscriptions"), params);
  }

  /** Fetch a single subscription by id. */
  get(id: string): Promise<FirstTouchSubscriptionGetResponse> {
    return this._get(buildUrl(this._baseUrl, `/kol/first-touches/subscriptions/${encodeURIComponent(id)}`));
  }

  /** Update a subscription (toggle is_active, change filters, etc). */
  update(id: string, params: FirstTouchSubscriptionUpdateParams): Promise<FirstTouchSubscriptionUpdateResponse> {
    return this._patch(buildUrl(this._baseUrl, `/kol/first-touches/subscriptions/${encodeURIComponent(id)}`), params);
  }

  /** Delete a subscription. */
  delete(id: string): Promise<FirstTouchSubscriptionDeleteResponse> {
    return this._delete(buildUrl(this._baseUrl, `/kol/first-touches/subscriptions/${encodeURIComponent(id)}`));
  }
}

// ─── Price Alerts namespace (v1.9) ──────────────────────────────────────────

class PriceAlertsClient {
  constructor(
    private readonly _get: <T>(url: string) => Promise<T>,
    private readonly _post: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _patch: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _delete: <T>(url: string) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /**
   * List your price alerts.
   * Requires PRO or ULTRA.
   */
  list(): Promise<PriceAlertListResponse> {
    return this._get(buildUrl(this._baseUrl, "/price-alerts"));
  }

  /**
   * Create a price alert. Captures baseline MC from current token_prices.
   * Returns the alert plus a one-time `webhook_secret`.
   * Tier quotas: PRO 5 alerts, ULTRA 25 alerts.
   */
  create(params: PriceAlertCreateParams): Promise<PriceAlertCreateResponse> {
    return this._post(buildUrl(this._baseUrl, "/price-alerts"), params);
  }

  /** Fetch a single alert by id. */
  get(id: number | string): Promise<PriceAlertGetResponse> {
    return this._get(buildUrl(this._baseUrl, `/price-alerts/${encodeURIComponent(id)}`));
  }

  /** Update alert name, delivery mode, webhook URL, or is_active. Thresholds are immutable. */
  update(id: number | string, params: PriceAlertUpdateParams): Promise<PriceAlertUpdateResponse> {
    return this._patch(buildUrl(this._baseUrl, `/price-alerts/${encodeURIComponent(id)}`), params);
  }

  /** Delete an alert and its event history. */
  delete(id: number | string): Promise<PriceAlertDeleteResponse> {
    return this._delete(buildUrl(this._baseUrl, `/price-alerts/${encodeURIComponent(id)}`));
  }

  /**
   * Fired event history (30-day retention). Filter by alert_id, event_type, since.
   */
  events(params?: PriceAlertEventsParams): Promise<PriceAlertEventsResponse> {
    return this._get(buildUrl(this._baseUrl, "/price-alerts/events", params as Record<string, string | number | undefined>));
  }
}

// ─── Copy-trade namespace ────────────────────────────────────────────────────

export type CopyTradeAction = "buy" | "sell" | "both";
export type CopyTradeSizingMode = "fixed" | "proportional" | "percent_source";
export type CopyTradeDeliveryMode = "webhook" | "websocket" | "both";

export interface CopyTradeSubscription {
  id: number;
  name: string | null;
  source_wallets: string[];
  min_trade_sol: number;
  only_action: CopyTradeAction;
  sizing_mode: CopyTradeSizingMode;
  sizing_amount: number;
  delivery_mode: CopyTradeDeliveryMode;
  webhook_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CopyTradeCreateParams {
  name?: string;
  source_wallets: string[];
  min_trade_sol?: number;
  only_action?: CopyTradeAction;
  sizing_mode?: CopyTradeSizingMode;
  sizing_amount: number;
  delivery_mode?: CopyTradeDeliveryMode;
  webhook_url?: string;
}

export interface CopyTradeUpdateParams {
  name?: string | null;
  source_wallets?: string[];
  min_trade_sol?: number;
  only_action?: CopyTradeAction;
  sizing_mode?: CopyTradeSizingMode;
  sizing_amount?: number;
  delivery_mode?: CopyTradeDeliveryMode;
  webhook_url?: string | null;
  is_active?: boolean;
}

export interface CopyTradeCreateResponse {
  subscription: CopyTradeSubscription;
  /** Returned ONCE on creation when `webhook_url` is set — store it to verify HMAC signatures. */
  webhook_secret: string | null;
  note?: string;
}

export interface CopyTradeSignal {
  id: number;
  subscription_id: number;
  fired_at: string;
  source_wallet: string;
  action: "buy" | "sell";
  token_mint: string;
  token_symbol: string | null;
  token_name: string | null;
  source_sol_amount: number;
  suggested_sol_amount: number;
  tx_signature: string;
  delivered: boolean;
  delivered_at: string | null;
  /** Market cap (USD) stamped on the source trade when the rule fired. */
  market_cap_usd_at_trade?: number | null;
  /** Token price (USD) at the same moment. */
  price_usd_at_trade?: number | null;
  /** Current market cap (USD) — compare against at-trade for chase-vs-dip context. */
  market_cap_usd?: number | null;
  /** Current last-trade price (USD). */
  last_price_usd?: number | null;
}

export interface CopyTradeSignalsParams {
  subscription_id?: number;
  /** ISO 8601 — only signals fired at-or-after this time. */
  since?: string;
  /** 1–500, default 50. */
  limit?: number;
}

class CopyTradeClient {
  constructor(
    private readonly _get: <T>(url: string) => Promise<T>,
    private readonly _post: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _patch: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _delete: <T>(url: string) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /** List your copy-trade rules. Requires PRO or ULTRA. */
  subscriptions(): Promise<{ subscriptions: CopyTradeSubscription[] }> {
    return this._get(buildUrl(this._baseUrl, "/copytrade/subscriptions"));
  }

  /**
   * Create a copy-trade rule (mirror N source wallets). Returns a one-time
   * `webhook_secret` when `webhook_url` is set — save it. Tier quotas: PRO 3
   * rules × 5 wallets, ULTRA 20 × 50.
   */
  create(params: CopyTradeCreateParams): Promise<CopyTradeCreateResponse> {
    return this._post(buildUrl(this._baseUrl, "/copytrade/subscriptions"), params);
  }

  /** Fetch a single rule by id. */
  get(id: number | string): Promise<{ subscription: CopyTradeSubscription }> {
    return this._get(buildUrl(this._baseUrl, `/copytrade/subscriptions/${encodeURIComponent(id)}`));
  }

  /** Update any field on a rule. */
  update(id: number | string, params: CopyTradeUpdateParams): Promise<{ subscription: CopyTradeSubscription }> {
    return this._patch(buildUrl(this._baseUrl, `/copytrade/subscriptions/${encodeURIComponent(id)}`), params);
  }

  /** Delete a rule and its signal history. */
  delete(id: number | string): Promise<{ deleted: boolean }> {
    return this._delete(buildUrl(this._baseUrl, `/copytrade/subscriptions/${encodeURIComponent(id)}`));
  }

  /** Fired signal history (up to 7 days). Filter by subscription_id, since, limit. */
  signals(params?: CopyTradeSignalsParams): Promise<{ signals: CopyTradeSignal[] }> {
    return this._get(buildUrl(this._baseUrl, "/copytrade/signals", params as Record<string, string | number | undefined>));
  }
}

// ─── Tools namespace ─────────────────────────────────────────────────────────

class ToolsClient {
  constructor(private readonly _fetch: <T>(url: string) => Promise<T>, private readonly _baseUrl: string) {}

  /**
   * Search the MadeOnSol tool directory.
   * @param params Optional: q (search query), category (slug), limit.
   */
  search(params?: ToolsSearchParams): Promise<ToolsSearchResponse> {
    return this._fetch(buildUrl(this._baseUrl, "/tools/search", params as Record<string, string | number | undefined>));
  }
}

// ─── Stream namespace ───────────────────────────────────────────────────────

class StreamClient {
  constructor(
    private readonly _get: <T>(url: string) => Promise<T>,
    private readonly _post: <T>(url: string) => Promise<T>,
    private readonly _delete: <T>(url: string) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /**
   * Generate a 24-hour WebSocket streaming token.
   * Pro/Ultra: ws_url for KOL/deployer event streaming.
   * Ultra only: dex_ws_url for all-DEX trade streaming.
   */
  getToken(): Promise<StreamToken> {
    return this._post(buildUrl(this._baseUrl, "/stream/token"));
  }

  /**
   * List your live WebSocket sessions across the KOL/deployer (`ws-streaming`)
   * and all-DEX (`dex-stream`) services — id, tier, subscribed channels, connect
   * time, remote IP, and messages sent. Useful for auditing open connections and
   * finding a ghost session that's holding a connection slot. **PRO/ULTRA only.**
   */
  sessions(): Promise<StreamSessionsResponse> {
    return this._get(buildUrl(this._baseUrl, "/stream/sessions"));
  }

  /**
   * Force-close (evict) a live WebSocket session by id — frees the connection
   * slot a ghost/stale socket is holding. Returns `{ evicted: true, id }`; throws
   * a 404 if no live session has that id, or a 400 if `id` is not a positive
   * integer. **PRO/ULTRA only.**
   * @param id Session id (positive integer, as a number or string).
   */
  deleteSession(id: number | string): Promise<StreamSessionEvictResponse> {
    return this._delete(buildUrl(this._baseUrl, `/stream/sessions/${encodeURIComponent(id)}`));
  }

  /**
   * Open a managed real-time WebSocket stream. Handles token fetch + refresh,
   * auto-reconnect with backoff, heartbeat liveness, and typed events for you.
   *
   * @example
   * const stream = client.stream.connect();
   * stream.on("kol:trade", (t) => console.log(t));
   * stream.subscribe(["kol:trades", "deployer:alerts"]);
   */
  connect(opts?: Omit<StreamClientOptions, "getToken">): MadeOnSolStream {
    return new MadeOnSolStream({ ...opts, getToken: () => this.getToken() });
  }
}

// ─── Webhook namespace ──────────────────────────────────────────────────────

class WebhookClient {
  constructor(
    private readonly _get: <T>(url: string) => Promise<T>,
    private readonly _post: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _patch: <T>(url: string, body?: unknown) => Promise<T>,
    private readonly _delete: <T>(url: string) => Promise<T>,
    private readonly _baseUrl: string,
  ) {}

  /** List all webhooks. */
  list(): Promise<WebhookListResponse> {
    return this._get(buildUrl(this._baseUrl, "/webhooks"));
  }

  /** Create a new webhook. */
  create(params: WebhookCreateParams): Promise<Webhook> {
    return this._post(buildUrl(this._baseUrl, "/webhooks"), params);
  }

  /** Update a webhook. */
  update(id: number, params: WebhookUpdateParams): Promise<Webhook> {
    return this._patch(buildUrl(this._baseUrl, `/webhooks/${id}`), params);
  }

  /** Delete a webhook. */
  delete(id: number): Promise<WebhookDeleteResponse> {
    return this._delete(buildUrl(this._baseUrl, `/webhooks/${id}`));
  }

  /** Send a test payload to a webhook. */
  test(webhookId: number): Promise<unknown> {
    return this._post(buildUrl(this._baseUrl, "/webhooks/test"), { webhook_id: webhookId });
  }
}

// ─── Main client ─────────────────────────────────────────────────────────────

/**
 * MadeOnSol API client.
 *
 * Supports two authentication methods:
 * - **MadeOnSol API key** — starts with `msk_`, get one free at https://madeonsol.com/pricing
 *
 * @example
 * ```ts
 * import { MadeOnSol } from "madeonsol";
 *
 * const client = new MadeOnSol({ apiKey: "msk_your_api_key_here" });
 *
 * const { trades } = await client.kol.feed({ limit: 10, action: "buy" });
 * const { deployers } = await client.deployer.leaderboard({ tier: "elite" });
 * const { alerts } = await client.deployer.alerts({ limit: 5 });
 * ```
 */
export class MadeOnSol {
  /** KOL wallet tracking endpoints. */
  readonly kol: KolClient;
  /** Pump.fun deployer intelligence endpoints. */
  readonly deployer: DeployerClient;
  /** Alpha wallet intelligence: leaderboard, profiles, cap tables, buyer quality. */
  readonly alpha: AlphaClient;
  /** Token intelligence — comprehensive per-mint snapshot + batch lookups. */
  readonly token: TokenClient;
  /** Solana tool directory endpoints. */
  readonly tools: ToolsClient;
  /** WebSocket streaming token (Pro/Ultra). */
  readonly stream: StreamClient;
  /** Webhook management (Pro/Ultra). */
  readonly webhooks: WebhookClient;
  /** Wallet tracker: watchlist CRUD, trades, and per-wallet stats. */
  readonly walletTracker: WalletTrackerClient;
  /** Universal wallet endpoints — stats, FIFO PnL, open positions, paginated trades for any Solana wallet. PRO+. */
  readonly wallet: WalletClient;
  /** Coordination alert rules CRUD (v1.1) — PRO/ULTRA. */
  readonly coordinationAlerts: CoordinationAlertsClient;
  /** First-touch webhook subscriptions CRUD — ULTRA only. Use `kol.firstTouches()` for read-only queries. */
  readonly firstTouchSubscriptions: FirstTouchSubscriptionsClient;
  /** Price alerts CRUD — PRO/ULTRA. Sub-second dip/recovery detection. */
  readonly priceAlerts: PriceAlertsClient;
  /** Deshred pre-confirm pump.fun sniper feed + custom watchlist — PRO/ULTRA. */
  readonly sniper: SniperClient;
  /** Copy-trade rules + fired signals — PRO/ULTRA. */
  readonly copytrade: CopyTradeClient;

  private readonly _apiKey: string;
  private readonly _baseUrl: string;

  constructor(config: MadeOnSolConfig) {
    if (!config || !config.apiKey || typeof config.apiKey !== "string") {
      // Print the hint as well — a bare throw can be swallowed by error handlers
      // and the user never sees the link. console.error guarantees stderr.
      console.error(
        "\n[madeonsol] Missing API key.\n" +
        "  → Get a free key (200 req/day, no card) at https://madeonsol.com/pricing\n" +
        "  → Then: new MadeOnSol({ apiKey: process.env.MADEONSOL_API_KEY })\n",
      );
      throw new Error(
        "MadeOnSol: apiKey is required. Get a free key at https://madeonsol.com/pricing",
      );
    }
    this._apiKey = config.apiKey;
    this._baseUrl = BASE_URL;

    const boundGet = this._request.bind(this);
    const boundPost = ((url: string, body?: unknown) => this._requestWithBody("POST", url, body)) as <T>(url: string, body?: unknown) => Promise<T>;
    const boundPatch = ((url: string, body?: unknown) => this._requestWithBody("PATCH", url, body)) as <T>(url: string, body?: unknown) => Promise<T>;
    const boundDelete = ((url: string) => this._requestWithBody("DELETE", url)) as <T>(url: string) => Promise<T>;

    this.kol = new KolClient(boundGet, this._baseUrl);
    this.deployer = new DeployerClient(boundGet, this._baseUrl);
    this.alpha = new AlphaClient(boundGet, this._baseUrl);
    this.token = new TokenClient(boundGet, boundPost, this._baseUrl);
    this.tools = new ToolsClient(boundGet, this._baseUrl);
    this.stream = new StreamClient(boundGet, boundPost, boundDelete, this._baseUrl);
    this.webhooks = new WebhookClient(boundGet, boundPost, boundPatch, boundDelete, this._baseUrl);
    this.walletTracker = new WalletTrackerClient(boundGet, boundPost, boundPatch, boundDelete, this._baseUrl);
    this.wallet = new WalletClient(boundGet, this._baseUrl);
    this.coordinationAlerts = new CoordinationAlertsClient(boundGet, boundPost, boundPatch, boundDelete, this._baseUrl);
    this.firstTouchSubscriptions = new FirstTouchSubscriptionsClient(boundGet, boundPost, boundPatch, boundDelete, this._baseUrl);
    this.priceAlerts = new PriceAlertsClient(boundGet, boundPost, boundPatch, boundDelete, this._baseUrl);
    this.sniper = new SniperClient(boundGet, boundPost, boundDelete, this._baseUrl);
    this.copytrade = new CopyTradeClient(boundGet, boundPost, boundPatch, boundDelete, this._baseUrl);
  }

  private _headers(): Record<string, string> {
    return { Authorization: `Bearer ${this._apiKey}`, Accept: "application/json", "User-Agent": "madeonsol-sdk/2.15.0" };
  }

  /**
   * v1.7 — Inspect your own quota, tier, and feature usage. Reads from the
   * same in-memory counters that drive rate-limit enforcement, so the
   * `quota.daily.remaining` returned here is authoritative (no header parsing).
   * Available to every authenticated tier.
   *
   * @example
   * ```ts
   * const me = await client.me();
   * console.log(`${me.tier}: ${me.quota.daily.remaining}/${me.quota.daily.limit} req left today`);
   * if (me.quota.daily.remaining < 100) {
   *   // self-throttle
   * }
   * ```
   */
  me(): Promise<MeResponse> {
    return this._request(buildUrl(this._baseUrl, "/me"));
  }

  /**
   * Performance stats for a named signal — hit rate, precision, sample count,
   * and lookback window. Available on all tiers.
   *
   * @param name Signal name (e.g. "kol_coordination", "first_touch_scout", "deployer_elite").
   * @example
   * ```ts
   * const perf = await client.getSignalPerformance("kol_coordination");
   * console.log(perf.precision, perf.hit_rate);
   * ```
   */
  getSignalPerformance(name: string): Promise<unknown> {
    return this._request(buildUrl(this._baseUrl, `/signals/${encodeURIComponent(name)}/performance`));
  }

  private async _request<T>(url: string): Promise<T> {
    const response = await fetch(url, { method: "GET", headers: this._headers() });
    return this._handleResponse<T>(response);
  }

  private async _requestWithBody<T>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: { ...this._headers(), "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return this._handleResponse<T>(response);
  }

  private async _handleResponse<T>(response: Response): Promise<T> {
    let responseBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    if (!response.ok) {
      const body =
        typeof responseBody === "object" && responseBody !== null
          ? (responseBody as Record<string, unknown>)
          : null;
      const errField = body && typeof body.error === "string" ? body.error : null;
      const msgField = body && typeof body.message === "string" ? body.message : null;
      const message = errField ?? msgField ?? `Request failed with status ${response.status}`;
      throw new MadeOnSolError(message, response.status, responseBody);
    }

    return responseBody as T;
  }
}

// Re-export config type for convenience
export type { MadeOnSolConfig as Config };
