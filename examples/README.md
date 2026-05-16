# madeonsol — examples

Copy-paste examples for the [`madeonsol`](https://www.npmjs.com/package/madeonsol) TypeScript SDK.

Get a free API key (200 req/day, no card) at <https://madeonsol.com/pricing>.

```bash
npm install madeonsol
export MADEONSOL_API_KEY=msk_...
npx tsx examples/kol-feed.ts
```

| File | What it does | Tier |
|---|---|---|
| [`kol-feed.ts`](./kol-feed.ts) | Print the latest 10 KOL buys with token + SOL amount + MC at trade | Free |
| [`deployer-sniper.ts`](./deployer-sniper.ts) | Poll elite-tier Pump.fun launches every 30s and log new alerts | Free |
| [`coordination-detector.ts`](./coordination-detector.ts) | Find tokens being co-bought by 3+ KOLs in the last hour | Free |
| [`first-touch-scout.ts`](./first-touch-scout.ts) | Surface "first KOL buy on a fresh token" events from S-tier scouts | Free |
| [`dex-firehose-whale.ts`](./dex-firehose-whale.ts) | WebSocket: log every DEX trade ≥ 10 SOL across all programs | ULTRA |

All examples are self-contained — no extra deps beyond `madeonsol` and the standard runtime.

## Run any of them

```bash
# tsx (recommended — runs TypeScript directly)
npx tsx examples/kol-feed.ts

# or build then node
npx tsc examples/*.ts --outDir dist-examples --target ES2022 --module ES2022 --moduleResolution Bundler
node dist-examples/kol-feed.js
```
