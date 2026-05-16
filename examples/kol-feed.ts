/**
 * Print the latest 10 KOL buys.
 *
 * Run:
 *   MADEONSOL_API_KEY=msk_... npx tsx examples/kol-feed.ts
 *
 * Free key at https://madeonsol.com/pricing — 200 req/day, no card.
 */
import { MadeOnSol } from "madeonsol";

const apiKey = process.env.MADEONSOL_API_KEY;
if (!apiKey) {
  console.error("Set MADEONSOL_API_KEY — get a free one at https://madeonsol.com/pricing");
  process.exit(1);
}

const client = new MadeOnSol({ apiKey });

const { trades } = await client.kol.feed({ limit: 10, action: "buy" });

console.log(`Latest ${trades.length} KOL buys:\n`);
for (const t of trades) {
  const who = t.kol_name || `${t.wallet_address.slice(0, 4)}…${t.wallet_address.slice(-4)}`;
  const sym = t.token_symbol || "?";
  const sol = (t.sol_amount ?? 0).toFixed(2);
  const mc = t.market_cap_usd_at_trade != null
    ? `@ MC $${Math.round(t.market_cap_usd_at_trade).toLocaleString()}`
    : "";
  console.log(`  ${who.padEnd(22)}  bought  ${sym.padEnd(10)}  ${sol.padStart(6)} SOL ${mc}`);
}
