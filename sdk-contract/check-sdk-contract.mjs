#!/usr/bin/env node
/**
 * check-sdk-contract.mjs — does this SDK bind everything the MadeOnSol API
 * contract says it should? Canonical copy lives in the monorepo at
 * sdk-contract/check-sdk-contract.mjs and is VENDORED (byte-identical) into each
 * standalone SDK repo by `node scripts/sync-sdk-contract.mjs <repo-dir> <sdk-id>`.
 * Do not edit the vendored copy; edit the monorepo one and re-sync.
 *
 * Reads, from the SDK repo (offline, no network):
 *   sdk-contract/contract.json  pinned API contract (operations + critical fields)
 *   sdk-contract/policy.json    which operations this SDK binds (chains + reviewed exclusions)
 *   sdk-contract/pin.json       source commit + contract_hash of the pin (informational here)
 *   <SRC_DIR>/**                .ts / .rs / .py sources
 *
 * Fails (exit 1) when a REQUIRED operation (policy chain, not excluded) has no
 * path literal in the SDK, or one of its critical response fields never appears
 * in the SDK source. Language-agnostic text checks:
 *   route  = the path template (`/kol/${w}/pnl`, `"/kol/{}/pnl"`) normalised to `/kol/{}/pnl`;
 *            method is NOT distinguished (a path bound for GET covers POST on it too)
 *   field  = the JSON key appears as a whole word anywhere in the source
 *            (catches a wholly-missing field, not a mistyped one)
 *
 *   node sdk-contract/check-sdk-contract.mjs            # SRC_DIR=src by default
 *   SRC_DIR=src node sdk-contract/check-sdk-contract.mjs --json
 *
 * Exit 0 = in parity · 1 = drift · 2 = setup error.
 * Docs: https://github.com/MadeOnSol/madeonsol docs/sdk-contract-parity.md
 */
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_DIRS = new Set(["node_modules", "target", "dist", "build", "examples", "tests", "test", ".git", "sdk-contract"]);
const EXT = /\.(ts|mts|rs|py)$/;

export function normalizePath(p) {
  let s = String(p).split(/[?#]/)[0];
  s = s.replace(/^\/api\/(?:v1|x402)(?=\/)/, "");
  s = s.replace(/\$\{[^}]*\}/g, "{}").replace(/\{[^}]*\}/g, "{}");
  return s.replace(/\/+$/, "") || "/";
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const f = path.join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (EXT.test(f) && !f.endsWith(".d.ts")) out.push(f);
  }
  return out;
}

/** All API-path-shaped string literals (normalised) + the full source text. */
export function extractSdkSurface(srcDir) {
  const files = walk(srcDir);
  const paths = new Set();
  let text = "";
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    text += src + "\n";
    for (const m of src.matchAll(/"([^"\n]*)"|`([^`]*)`|'([^'\n]*)'/g)) {
      const raw = m[1] ?? m[2] ?? m[3] ?? "";
      // `${this._baseUrl}/x` (TS) and `"{}/x"` / `"{base}/x"` (Rust format!) carry a base-URL prefix.
      const c = raw.replace(/^(?:\$\{[^}]*\}|\{[^}]*\})+/, "").replace(/^\/api\/(?:v1|x402)(?=\/)/, "");
      if (!/^\/[a-z][a-z0-9-]*(\/|$|\?)/.test(c)) continue;
      paths.add(normalizePath(c));
    }
  }
  return { files: files.length, paths, text };
}

function globMatch(pattern, value) {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) return value.startsWith(pattern.slice(0, -1));
  return pattern === value;
}

/** `"GET /x"`, `"* /admin/*"`, `"/x"` (any method), `"@alias"` (op.alias_of is set). */
export function matchesOp(pattern, op) {
  if (pattern.trim() === "@alias") return Boolean(op.alias_of);
  const parts = pattern.trim().split(/\s+/);
  const [m, p] = parts.length === 2 ? parts : ["*", parts[0]];
  return (m === "*" || m.toUpperCase() === op.method) && globMatch(p, op.path);
}

/** Split the contract into required / excluded operations under a policy. */
export function applyPolicy(contract, policy) {
  const chains = new Set(policy.chains ?? []);
  const required = [];
  const excluded = [];
  const used = new Set();
  for (const op of contract.operations) {
    if (!chains.has(op.chain)) continue;
    const hit = (policy.exclude ?? []).findIndex((ex) => (ex.match ?? []).some((pat) => matchesOp(pat, op)));
    if (hit >= 0) {
      used.add(hit);
      excluded.push({ id: op.id, reason: policy.exclude[hit].reason });
    } else required.push(op);
  }
  const unusedExcludes = (policy.exclude ?? []).filter((_, i) => !used.has(i)).map((ex) => ex.match.join(", "));
  return { required, excluded, unusedExcludes };
}

function fieldList(op) {
  const out = op.response.top.map((k) => ({ key: k, label: k }));
  for (const [arr, keys] of Object.entries(op.response.items ?? {})) {
    for (const k of keys) out.push({ key: k, label: arr === "[]" ? `[].${k}` : `${arr}[].${k}` });
  }
  return out;
}

function fieldIgnored(policy, op, label) {
  return (policy.exclude_fields ?? []).some(
    (ex) => matchesOp(ex.match, op) && (ex.fields ?? []).some((f) => f === label || f === "*"),
  );
}

export function checkSdk({ contract, policy, surface }) {
  const { required, excluded, unusedExcludes } = applyPolicy(contract, policy);
  const missingRoutes = [];
  const missingFields = [];
  const wordCache = new Map();
  const present = (w) => {
    if (!wordCache.has(w)) wordCache.set(w, new RegExp(`(^|[^A-Za-z0-9_])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9_]|$)`).test(surface.text));
    return wordCache.get(w);
  };
  for (const op of required) {
    if (!surface.paths.has(normalizePath(op.path))) {
      missingRoutes.push(`${op.id}  [${op.tier ?? "?"}]`);
      continue;
    }
    for (const f of fieldList(op)) {
      if (!present(f.key) && !fieldIgnored(policy, op, f.label)) missingFields.push(`${op.id}  ${f.label}`);
    }
  }
  return { required: required.length, excluded, unusedExcludes, missingRoutes, missingFields };
}

export function formatReport(sdk, res) {
  const lines = [];
  if (res.missingRoutes.length) {
    lines.push(`  ${res.missingRoutes.length} operation(s) the policy requires but the SDK does not bind:`);
    for (const r of res.missingRoutes) lines.push(`    - ${r}`);
  }
  if (res.missingFields.length) {
    lines.push(`  ${res.missingFields.length} critical response field(s) never mentioned in the SDK source:`);
    for (const r of res.missingFields) lines.push(`    - ${r}`);
  }
  if (res.missingRoutes.length || res.missingFields.length) {
    lines.push(`  Fix: bind them in the SDK, or (deliberately) add a reviewed exclusion with a reason to`);
    lines.push(`  sdk-contract/policy/${sdk}.json in the monorepo and re-sync. See docs/sdk-contract-parity.md.`);
  }
  if (res.unusedExcludes.length) lines.push(`  note: policy exclusions matching nothing: ${res.unusedExcludes.join(" | ")}`);
  return lines.join("\n");
}

function main() {
  const root = process.cwd();
  const dir = path.join(root, "sdk-contract");
  const srcDir = process.env.SRC_DIR || "src";
  for (const f of ["contract.json", "policy.json"]) {
    if (!existsSync(path.join(dir, f))) {
      console.error(`sdk-contract: missing sdk-contract/${f} — run the sync from the monorepo (docs/sdk-contract-parity.md)`);
      process.exit(2);
    }
  }
  const contract = JSON.parse(readFileSync(path.join(dir, "contract.json"), "utf8"));
  const policy = JSON.parse(readFileSync(path.join(dir, "policy.json"), "utf8"));
  const pin = existsSync(path.join(dir, "pin.json")) ? JSON.parse(readFileSync(path.join(dir, "pin.json"), "utf8")) : {};
  const surface = extractSdkSurface(srcDir);
  if (surface.paths.size < 5) {
    console.error(`sdk-contract: only ${surface.paths.size} path literals in ${srcDir}/ — extractor broken?`);
    process.exit(2);
  }
  const res = checkSdk({ contract, policy, surface });
  if (process.argv.includes("--json")) console.log(JSON.stringify(res, null, 2));
  const head = `sdk-contract ${policy.sdk}: pinned ${pin.source_sha?.slice(0, 12) ?? "?"} (contract ${contract.contract_hash.slice(0, 12)}), ${res.required} required ops, ${res.excluded.length} excluded`;
  if (res.missingRoutes.length || res.missingFields.length) {
    console.error(`\n❌ ${head}\n${formatReport(policy.sdk, res)}\n`);
    process.exit(1);
  }
  const note = formatReport(policy.sdk, res);
  console.log(`✅ ${head} — all bound${note ? `\n${note}` : ""}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
