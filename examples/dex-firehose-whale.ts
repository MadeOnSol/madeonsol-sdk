/**
 * WebSocket: log every DEX trade ≥ 10 SOL across all programs.
 *
 * ULTRA-only — the all-DEX firehose is not exposed on Free/PRO.
 *
 * Run:
 *   npm install ws
 *   MADEONSOL_API_KEY=msk_... npx tsx examples/dex-firehose-whale.ts
 *
 * Pricing: https://madeonsol.com/pricing
 *
 * Filter reference: https://madeonsol.com/api-docs#streaming
 */
import { MadeOnSol } from "madeonsol";
import WebSocket from "ws";

const apiKey = process.env.MADEONSOL_API_KEY;
if (!apiKey) {
  console.error("Set MADEONSOL_API_KEY (ULTRA tier) — see https://madeonsol.com/pricing");
  process.exit(1);
}

const client = new MadeOnSol({ apiKey });
const { token, dex_ws_url } = await client.stream.getToken();

if (!dex_ws_url) {
  console.error("dex_ws_url not returned — DEX firehose requires ULTRA. Upgrade at https://madeonsol.com/pricing");
  process.exit(1);
}

const ws = new WebSocket(`${dex_ws_url}?token=${token}`);

ws.on("open", () => {
  console.log("Connected. Subscribing to whale trades (≥ 10 SOL across all DEXs)…\n");
  ws.send(JSON.stringify({
    type: "subscribe",
    sub_id: "whales",
    filters: {
      min_sol: 10,
      // Optional: narrow further
      // dex: "pumpfun" | "pumpswap" | "raydium" | "jupiter" | "orca" | "meteora" | "launchlab",
      // token_age_max_seconds: 3600,
      // action: "buy",
    },
  }));
});

ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.channel !== "dex:trades") return;
  const d = msg.data;
  const sym = d.token_symbol ?? d.token_mint.slice(0, 8);
  const sol = Number(d.sol_amount).toFixed(2);
  const wallet = `${d.wallet_address.slice(0, 4)}…${d.wallet_address.slice(-4)}`;
  const action = d.action.toUpperCase();
  console.log(`[${new Date().toLocaleTimeString()}]  ${d.dex.padEnd(10)}  ${action.padEnd(4)}  ${sol.padStart(6)} SOL  ${sym.padEnd(10)}  by ${wallet}`);
});

ws.on("close", () => console.log("Disconnected."));
ws.on("error", (err) => console.error("WS error:", err));
