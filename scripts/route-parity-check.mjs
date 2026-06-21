#!/usr/bin/env node
/**
 * route-parity-check.mjs — fails CI if this SDK references an API path that does
 * not exist in the live MadeOnSol API. Language-agnostic: scans .ts/.rs string
 * literals for API paths and checks them against the published OpenAPI spec
 * (the route manifest). Mirror of the guard in the main madeonsol repo, ported
 * to standalone SDK repos that don't have the route files.
 *
 *   node route-parity-check.mjs
 *   OPENAPI_URL=... SRC_DIR=src node route-parity-check.mjs
 *
 * Exit 0 = all paths resolve · 1 = a path has no route · 2 = setup/extractor error.
 */
import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";

const OPENAPI_URL = process.env.OPENAPI_URL || "https://madeonsol.com/api/v1/openapi.json";
const SRC = process.env.SRC_DIR || "src";
// SDK paths intentionally not in the v1 spec (none today).
const ALLOW = new Set((process.env.ALLOW || "").split(",").map((s) => s.trim()).filter(Boolean));

function normalize(p) {
  let s = p.split(/[?#]/)[0];
  s = s.replace(/\$\{[^}]*\}/g, ":p").replace(/\{[^}]*\}/g, ":p"); // ${x}, {x}, {} (rust format!) -> :p
  s = s.replace(/\/+$/, "");
  return s;
}

const spec = await (await fetch(OPENAPI_URL)).json().catch(() => null);
if (!spec || !spec.paths) {
  console.error(`route-parity: could not load OpenAPI spec from ${OPENAPI_URL}`);
  process.exit(2);
}
const ROUTES = new Set(Object.keys(spec.paths).map(normalize)); // relative, e.g. /kol/:p/pnl

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    if (["node_modules", "target", "dist", "build", "examples", "tests", "test"].includes(e)) continue;
    const f = path.join(dir, e);
    if (statSync(f).isDirectory()) out.push(...walk(f));
    else if ((f.endsWith(".ts") && !f.endsWith(".d.ts")) || f.endsWith(".rs")) out.push(f);
  }
  return out;
}

const STR = /"([^"]*)"|`([^`]*)`/g;
const problems = [];
let count = 0;
for (const file of walk(SRC)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const m of line.matchAll(STR)) {
        const raw = m[1] ?? m[2] ?? "";
        let c = raw.replace(/^\/api\/(?:v1|x402)/, ""); // strip prefix; x402 rewrites to v1
        if (!/^\/[a-z][a-z0-9-]*(\/|$)/.test(c)) continue; // API-path-shaped only
        count++;
        const norm = normalize(c);
        if (!norm || norm === "/" || ALLOW.has(raw) || ALLOW.has(norm)) continue;
        if (!ROUTES.has(norm)) problems.push(`${path.relative(".", file)}:${i + 1}  "${raw}"  ->  ${norm}`);
      }
    });
}

if (count < 5) {
  console.error(`route-parity: only ${count} path literals found in ${SRC}/ — extractor may be broken`);
  process.exit(2);
}
const uniq = [...new Set(problems)];
if (uniq.length) {
  console.error(`\n❌ route-parity: ${uniq.length} SDK path(s) with no matching API route (rename drift?):\n  ${uniq.join("\n  ")}\n`);
  process.exit(1);
}
console.log(`✅ route-parity: all ${count} SDK path literals resolve to a live API route (${ROUTES.size} routes in spec)`);
