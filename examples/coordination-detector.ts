/**
 * Find tokens being accumulated by 3+ KOLs in the last hour.
 *
 * Run:
 *   MADEONSOL_API_KEY=msk_... npx tsx examples/coordination-detector.ts
 *
 * Free key at https://madeonsol.com/pricing.
 *
 * For real-time push (within ~1s of the triggering trade), create a coordination
 * alert rule (PRO/ULTRA): client.coordinationAlerts.create({...})
 */
import { MadeOnSol } from "madeonsol";

const apiKey = process.env.MADEONSOL_API_KEY;
if (!apiKey) {
  console.error("Set MADEONSOL_API_KEY — get a free one at https://madeonsol.com/pricing");
  process.exit(1);
}

const client = new MadeOnSol({ apiKey });

const { tokens } = await client.kol.coordination({
  period: "1h",
  min_kols: 3,
  min_score: 60, // 0–100 composite — 60 filters most noise
  include_majors: false, // skip WIF/BONK/POPCAT etc.
});

if (tokens.length === 0) {
  console.log("No coordinated buying detected in the last hour with score ≥ 60.");
  process.exit(0);
}

console.log(`Found ${tokens.length} token(s) with KOL convergence:\n`);
for (const t of tokens) {
  console.log(`  ${t.token_symbol ?? t.token_mint.slice(0, 8)}`);
  console.log(`    score: ${t.coordination_score ?? "?"} / 100`);
  console.log(`    peak: ${t.peak_kols} KOLs co-bought, ${t.peak_buys} buys`);
  if (t.exited_count != null && t.exited_count > 0) {
    console.log(`    ⚠️  ${t.exited_count} KOL(s) already exited`);
  }
  console.log("");
}
