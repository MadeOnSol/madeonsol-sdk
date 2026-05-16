/**
 * "First KOL buy on a fresh token mint" events — the highest-conviction early signal.
 *
 * Filtered to S-tier scouts: KOL wallets whose first-touch picks attract ≥3 follow-on
 * KOLs within 4h ~50% of the time vs ~14% baseline (38d backtest, 491k buys).
 *
 * Run:
 *   MADEONSOL_API_KEY=msk_... npx tsx examples/first-touch-scout.ts
 *
 * Free key at https://madeonsol.com/pricing.
 *
 * For push (median lead time 12s before the second KOL hits), use ULTRA:
 *   client.firstTouchSubscriptions.create({ filters: { min_scout_tier: "S" }, ... })
 */
import { MadeOnSol } from "madeonsol";

const apiKey = process.env.MADEONSOL_API_KEY;
if (!apiKey) {
  console.error("Set MADEONSOL_API_KEY — get a free one at https://madeonsol.com/pricing");
  process.exit(1);
}

const client = new MadeOnSol({ apiKey });

const { events } = await client.kol.firstTouches({
  preset: "scout",
  min_scout_tier: "S",
  limit: 20,
});

console.log(`${events.length} recent first-touch events from S-tier scouts:\n`);
for (const e of events) {
  const fk = e.first_kol;
  const sym = e.token_symbol ?? e.token_mint.slice(0, 8);
  const age = e.token_age_seconds != null
    ? `${Math.round(e.token_age_seconds / 60)}m old`
    : "age ?";
  const score = fk.scout_score != null ? `${fk.scout_score}%` : "?";
  const time = new Date(e.touched_at).toLocaleTimeString();

  console.log(`[${time}]  ${fk.name ?? "(unnamed)"}  scouted  ${sym}  (${age}, scout_score=${score})`);
}
