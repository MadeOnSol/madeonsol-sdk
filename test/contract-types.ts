// Type-level contract samples: each constant is shaped exactly like what the
// route emits (src/app/api/v1/** in the API repo, 2026-10-03) — numbers where
// the route emits numbers, null where it can null. `npm test` type-checks this
// file (test/tsconfig.json); a type that drifts from the wire shape fails it.
import type {
  AlphaLinkedResponse,
  CandlesResponse,
  CoordinationHistoryResponse,
  DeployerAlertStats,
  DeployerProfileResponse,
  DeployerStats,
  DeployerTokensResponse,
  KolCompareResponse,
  KolTokenActivity,
  KolWalletProfile,
  KolWalletsResponse,
  ManifestsResponse,
  RecentBond,
  ScoutLeaderboardResponse,
  SignalPerformanceResponse,
  SignalsCatalogResponse,
  SniperDeploy,
  StreamToken,
  TokenBatchResponse,
  TokenListResponse,
  TokenResponse,
  TokenRiskBatchError,
  TokenRiskResponse,
  TokenSearchResponse,
  WalletBatchTradesResponse,
  WalletFlagsResponse,
  WalletFundingResponse,
  WalletListScoreResponse,
  WalletPositionsResponse,
  WalletTrackerTradesResponse,
  AlphaBuyerQualityResponse,
} from "../src/index";

// GET /kol/{wallet}?include=pnl_by_token
export const kolWallet = {
  kol: { name: "Ansem", wallet: "W", twitter_url: null, strategy_tag: null, auto_strategy_tag: null },
  stats: { pnl: 1.5, buy_count: 3, sell_count: 1, volume: 4.2, win_rate: 50 },
  scores: {
    winrate_7d: null, winrate_30d: 55, avg_roi_7d: null, avg_roi_30d: null, profit_factor_7d: null, profit_factor_30d: null,
    pnl_7d: null, pnl_30d: null, early_entry_pct_30d: null, consistency_7d: null, median_hold_minutes_30d: null,
    closed_positions_7d: 0, closed_positions_30d: 0, is_heating_up: false, is_cold: false,
  },
  peer_ranks: { percentile_pnl_7d: null, percentile_winrate_7d: 90, percentile_pnl_30d: null, percentile_winrate_30d: null, percentile_early_entry_30d: null },
  recent_trades: [{ token_mint: "M", token_name: null, token_symbol: null, action: "buy", sol_amount: 1, token_amount: 1000, market_cap_usd_at_trade: null, price_usd_at_trade: null, tx_signature: "S", traded_at: "2026-10-01T00:00:00Z" }],
  pnl_by_token: [{ token_mint: "M", token_symbol: "X", token_name: "X", buy_count: 1, sell_count: 0, total_bought: 1, total_sold: 0, pnl: -1, result: "open", first_trade: "t", last_trade: "t" }],
} satisfies KolWalletProfile;

// GET /kol/tokens/{mint} (BASIC adds the delay fields)
export const kolToken = {
  token_mint: "M",
  summary: { kol_count: 1, total_bought_sol: 2, total_sold_sol: 1, net_flow_sol: 1, signal: "accumulating" },
  kols: [{ name: "a", wallet: "W", buy_count: 1, sell_count: 1, total_bought: 2, total_sold: 1, net_sol: -1, position: "net_buyer", first_trade: "t", last_trade: "t" }],
  delay: "5m", delay_seconds: 300,
} satisfies KolTokenActivity;

export const kolWallets = {
  wallets: [{ wallet_address: "W", name: null, twitter_url: null, avatar_url: null, strategy_tag: null, twitter_followers: null, follow_count: 0, is_active: true, tracked_since: null }],
  count: 1, total: 1, limit: 200, offset: 0, has_more: false,
  filters: { active: "true", q: null, strategy: null }, note: "n",
} satisfies KolWalletsResponse;

export const kolCompare = {
  profiles: [{ wallet: "W", found: true }],
  overlap: [],
  overlap_meta: { window_start: "t", min_wallets: 2, total: null, returned: 0, has_more: null, complete: false },
} satisfies KolCompareResponse;

export const scouts = {
  scouts: [{ wallet: "W", name: null, avatar_url: null, twitter_url: null, scout_tier: "S", first_touches_30d: 40, avg_followers_4h: 2.5, swarm_3plus_pct: 50, swarm_5plus_pct: null, computed_at: "t" }],
  count: 1,
} satisfies ScoutLeaderboardResponse;

export const coordHistory = {
  events: [{ token_mint: "M", fired_at: "t", coordination_score: 80, total_fires: 3, kol_buyers: 5, current_mc_usd: null, current_price_usd: null }],
  count: 1,
} satisfies CoordinationHistoryResponse;

// GET /alpha/{wallet}/linked
export const linked = {
  wallet: "W",
  linked: [{ wallet_address: "L", shared_tokens: 4, avg_time_diff_secs: 1.25, avg_sol_diff: 0.000123, similarity_score: 0.81 }],
} satisfies AlphaLinkedResponse;

export const deployerStats = {
  tracked_count: 1, signals_today: 0, bonds_detected: 0, bond_rate: 0,
  tiers: { elite: 1, good: 0, rising: 0 } as DeployerStats["tiers"],
  avg_mc_at_alert_usd_30d: { elite: null, good: 12000, rising: null },
  mc_at_alert_samples_30d: { elite: null, good: 3, rising: 0 },
  mc_at_alert_window_start: "t", mc_at_alert_complete: true,
} satisfies DeployerStats;

export const alertStats = {
  bond_rate: {} as DeployerAlertStats["bond_rate"], multiplier: {} as DeployerAlertStats["multiplier"],
  tiers: {}, period: "all", sampled_rows: 1200, truncated: false,
} satisfies DeployerAlertStats;

export const recentBond: Pick<RecentBond, "instant_bond"> = { instant_bond: true };

// GET /deployer-hunter/{wallet}/tokens
export const deployerTokens = {
  tokens: [{ id: "u", token_mint: "M", token_name: null, token_symbol: null, deployed_at: "t", bonded_at: null, time_to_bond_minutes: null, peak_market_cap: null, mc_at_bond: null, market_cap_at_alert: null, alerted_at: null, instant_bond: false }],
  total: 1, limit: 20, offset: 0, has_more: false,
} satisfies DeployerTokensResponse;
export const notDeployer = { is_deployer: false, wallet: "W", tokens: [], total: 0, limit: 20, offset: 0, has_more: false } satisfies DeployerTokensResponse;

// pump.fun pass-through: typed known keys + unknown extras allowed
export const pumpTokens: DeployerProfileResponse["pump_tokens"] = [
  { mint: "M", image_uri: "u", created_timestamp: 1700000000000, ath_market_cap: 1, usd_market_cap: 1, reply_count: 0, pump_swap_pool: "P", some_new_key: 1 },
];

export const sniper: Pick<SniperDeploy, "attribution_status" | "attribution_checked_at"> = { attribution_status: "corrected", attribution_checked_at: null };

export const streamToken = {
  token: "t", expires_at: null, ws_url: "wss://x", usage: "u",
  subscribe_example: { type: "subscribe", channels: ["kol:trades"] },
  channels: ["kol:trades"],
  rhc_token_prices: { subscribe_example: {}, address_cap: null, coalesce_ms: 250, note: "n" },
  named_subscriptions: { subscribe_example: {}, max_per_connection: 5, note: "n" },
} satisfies StreamToken;

const snapshot = {
  mint: "M", price_usd: null, price_sol: null, market_cap: null, volume_24h_usd: null, volume_24h_sol: null, trades_24h: null, last_trade_at: null,
  deployer: null, kol_activity: { buying_kols: 0, selling_kols: 0, net_flow_sol: 0, signal: "neutral" as const, top_buyers: [] },
  vwap_price_usd: null, vwap_price_sol: null, primary_pool_address: null, price_source: null, price_observed_at: null, price_is_stale: null, price_age_seconds: null,
  deployer_identity: { identity_status: "lookup_failed" as const, history_status: null, address: null, source: null },
  token_supply_burn_detected: null, lp_burn_status: "unknown" as const,
};
export const tokenGet = {
  token: snapshot, as_of: "t", included: ["buyer_quality", "deployer"],
  include_errors: { deployer: { status: 503, error: "deployer lookup temporarily unavailable — retry" } },
} satisfies TokenResponse;
export const tokenBatch = { tokens: [snapshot], count: 1, as_of: "t", degraded_fields: ["kol_activity"] } satisfies TokenBatchResponse;

export const tokenList = {
  tokens: [], pagination: { limit: 50, offset: 0, returned: 0, has_more: false, post_filtered: false }, filters: {},
  deprecations: [{ param: "lp_burned", status: "deprecated", matches: "verified LP evidence only", replacement: "lp_burn_status" }],
} satisfies TokenListResponse;
export const tokenRow: Pick<TokenListResponse["tokens"][number], "lp_burned" | "lp_burn_status" | "token_supply_burn_detected"> = { lp_burned: null, lp_burn_status: "unknown", token_supply_burn_detected: null };

export const tokenSearch = {
  q: "bonk", count: 1,
  results: [{ mint: "M", symbol: "BONK", name: null, match: "symbol_exact", market_cap_usd: 1, liquidity_usd: null, primary_dex: null, last_trade_at: null, image_url: null, twitter: null, website: null }],
} satisfies TokenSearchResponse;

export const riskSingle: Pick<TokenRiskResponse, "dev_status" | "resolved_from"> = { dev_status: "unavailable", resolved_from: { address: "P", kind: "pool", dex: "pumpswap", source: "pool_registry" } };
export const riskBatchErr = { mint: "M", error: "unavailable", code: "risk_inputs_unavailable", unavailable_inputs: ["authorities"], retryable: true } satisfies TokenRiskBatchError;

export const bq: Pick<AlphaBuyerQualityResponse, "signal_stats"> = {
  signal_stats: { dump_cluster_count: { value: 3, bucket: "k>=3", outcome: "dump", hit_rate: 0.6, base_rate: 0.3, lift: 2, sample_n: 120, window_days: 30, as_of: "t", summary: "s" } },
};

export const candlesMeta: Pick<CandlesResponse, "covered_from" | "history_floor" | "history_clamped" | "history_outside_plan" | "truncated"> = {
  covered_from: "t", history_floor: null, history_clamped: false, history_outside_plan: false, truncated: false,
};

export const positionsCache: Pick<WalletPositionsResponse, "cache_age_seconds" | "cache_validation" | "cache_invalidated"> = { cache_age_seconds: 12, cache_validation: "head_checked", cache_invalidated: "new_activity" };

// GET /wallet-tracker/trades — a transfer (action null, no counterparty key)
export const tracker = {
  events: [{ wallet_address: "W", label: null, event_type: "transfer", action: null, token_mint: null, token_symbol: null, token_name: null, sol_amount: 1, token_amount: null, tx_signature: "S", block_time: 1700000000, slot: null, replayed: false, ingested_at: "t", timestamp: "t" }],
  count: 1, ordered_by: "block_time", next_cursor: null, next_cursor_slot: null,
} satisfies WalletTrackerTradesResponse;

export const signals = {
  name: "MadeOnSol Signal Scorecard", description: "d", docs: "https://madeonsol.com/solana-api",
  signals: [{ name: "dump_cluster_count", methodology: "m", performance_endpoint: "https://madeonsol.com/api/v1/signals/dump_cluster_count/performance" }],
} satisfies SignalsCatalogResponse;
export const perfEmpty = { signal: "runner_rate", buckets: [], note: "not computed yet" } satisfies SignalPerformanceResponse;
export const perf = {
  signal: "dump_cluster_count", metric_type: "binary", outcome: "dump", window_days: 30, base_rate: null, test_from: null, test_to: null, as_of: "t", methodology: "m",
  buckets: [{ bucket: "k>=1", hit_rate: 0.5, base_rate: 0.3, lift: 1.6, sample_n: 100 }],
  history: [{ as_of: "t", buckets: [{ bucket: "k>=1", hit_rate: null, lift: null, sample_n: 10 }] }],
} satisfies SignalPerformanceResponse;

export const manifests = {
  manifests: [{ dataset: "token_trades", data_as_of: "t", produced_at: "t", producer: "p", ts_column: "block_time", rows_24h: 10, min_ts: null, max_ts: null, row_count_estimate: 100, schema_hash: "h", fingerprint: "f" }],
  count: 1, dataset: null, methodology_version: "v", note: "n",
} satisfies ManifestsResponse;

export const flags = {
  wallet: "W", as_of: "t", flagged: ["deployer"],
  sources: { deployer: { snapshot_at: "t", active: true, carried: true, tier: "elite" }, alpha: null, dump_cluster: null, kol: null, sniper: null, bundler: null },
  history: [{ source: "deployer", flags: { tier: "elite" }, snapshot_at: "t" }],
  note: "n",
} satisfies WalletFlagsResponse;

export const batchTrades = {
  wallets: [{ wallet: "A", count: 1, trades: [{ tx_signature: "S", token_mint: "M", action: "sell", sol_amount: 1, token_amount: 10, price_sol: 0.1, price_usd: null, market_price_sol: null, market_price_usd: null, block_time: 1700000000, traded_at: "t" }] }],
  since: 1699990000, next_since: 1700000000, limit_per_wallet: 20,
  coverage: { history_start_days: 90, scope: "s", note: "n" },
} satisfies WalletBatchTradesResponse;

export const scoreList = {
  wallets: [
    { address: "A", status: "not_computed", score: null, pnl: null, cache_hit: null, computed_at: null, cache_age_seconds: null, message: "call again" },
  ],
  count: 1, scored: 0, cached: 0, computed_now: 0, no_trades: 0, not_computed: 1, max_wallets: 200, max_live_compute: 25, score_methodology: "m", as_of: "t",
} satisfies WalletListScoreResponse;

// GET /wallet/{address}/funding (wallet-funding.ts getFundingConnections + direct_funding)
const link = { asset: "native", symbol: "SOL", decimals: 9, amount_raw: "1500000000", amount: "1.5", transfer_count: 1, first_seen: "t", last_seen: "t", transactions: [{ tx: "S", explorer_url: "https://solscan.io/tx/S" }] };
export const funding = {
  chain: "solana", chain_id: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", native_asset: "SOL", address: "W", status: "ok", summary: "s",
  shared_funders: [{
    funder: "F", funder_explorer_url: "u", funder_label: null, service_funder: false,
    to_this_wallet: [link],
    connected_wallets: [{ address: "W2", explorer_url: "u", tracked_as: ["kol"], transfers: [{ ...link, symbol: null, decimals: null, amount: null }] }],
  }],
  pagination: { limit: 10, offset: 0, total: 1, has_more: false },
  coverage: {
    collection_enabled: true, mode: "on", heartbeat_at: "t", collector_current: true, monitoring_started_at: "t",
    last_committed_position: "412345678", last_committed_at: "t",
    tracked_intervals: [{ source: "kol", tracked_since: "t", tracked_until: null }],
    known_gaps: [], supported_transfer_types: ["native"], unsupported_transfer_types: ["spl"], recovery: null, history: "h",
  },
  direct_funding: { observed: false, coverage: "forward_only", coverage_explanation: "e", observation_started_at: null, note: "n" },
  disclaimer: "d",
} satisfies WalletFundingResponse;
