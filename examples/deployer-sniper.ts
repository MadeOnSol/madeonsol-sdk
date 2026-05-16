/**
 * Poll Pump.fun deployer alerts every 30s. Print only ELITE-tier launches as they appear.
 *
 * Run:
 *   MADEONSOL_API_KEY=msk_... npx tsx examples/deployer-sniper.ts
 *
 * Free key at https://madeonsol.com/pricing.
 *
 * For sub-second push (instead of 30s polling), use webhooks + PRO/ULTRA:
 *   client.webhooks.create({ url, events: ["deployer.alert"], filters: { tier: "elite" } })
 */
import { MadeOnSol } from "madeonsol";

const apiKey = process.env.MADEONSOL_API_KEY;
if (!apiKey) {
  console.error("Set MADEONSOL_API_KEY — get a free one at https://madeonsol.com/pricing");
  process.exit(1);
}

const client = new MadeOnSol({ apiKey });
const seen = new Set<string>();

console.log("Polling elite Pump.fun deployer alerts every 30s. Ctrl+C to stop.\n");

async function tick() {
  try {
    const { alerts } = await client.deployer.alerts({ limit: 20, tier: "elite" });
    for (const a of alerts.reverse()) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      const mc = a.market_cap_at_alert != null
        ? `$${Math.round(a.market_cap_at_alert).toLocaleString()}`
        : "?";
      const time = new Date(a.created_at).toLocaleTimeString();
      console.log(`[${time}]  ${a.token_symbol ?? "?"}  (${a.token_name ?? "—"})  MC ${mc}  — ${a.title}`);
    }
  } catch (err) {
    console.error("poll failed:", err instanceof Error ? err.message : err);
  }
}

await tick();
setInterval(tick, 30_000);
