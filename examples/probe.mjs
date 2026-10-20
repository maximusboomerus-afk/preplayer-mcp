#!/usr/bin/env node
/**
 * probe.mjs — no-payment probe against the live PrepLayer Worker.
 *
 * This script is safe to run with no wallet and no funds. It always
 * returns 402 and never spends anything. It is useful for verifying
 * reachability, decoding the per-tool challenge, and confirming the
 * x402 protocol version and treasury address before you wire a real
 * payer.
 *
 * Usage:
 *   node examples/probe.mjs                 # POST /v1/normalize
 *   PROBE_PATH=/v1/dedupe node examples/probe.mjs
 *
 * Environment overrides:
 *   PROBE_URL   — full URL  (default https://preplayer.maximus-boomerus.workers.dev/v1/normalize)
 *   PROBE_PATH  — path only (used to build PROBE_URL when the URL itself is unset)
 *   PROBE_BODY  — JSON body (default {"text": "Hello"})
 */

const URL = process.env.PROBE_URL
  || `https://preplayer.maximus-boomerus.workers.dev${process.env.PROBE_PATH || "/v1/normalize"}`;
const BODY = process.env.PROBE_BODY || '{"text":"Hello"}';

let body;
try { body = JSON.parse(BODY); }
catch { console.error("FATAL: PROBE_BODY is not valid JSON"); process.exit(2); }

const probeHeaders = { "content-type": "application/json", accept: "application/json" };

const res = await fetch(URL, { method: "POST", headers: probeHeaders, body: JSON.stringify(body) });

console.log("[probe] status:", res.status);
console.log("[probe] content-type:", res.headers.get("content-type"));

// The Worker emits the 402 challenge as a base64-JSON header named 'PAYMENT-REQUIRED'
// on every gated endpoint.
const challengeB64 =
  res.headers.get("payment-required") ??
  res.headers.get("PAYMENT-REQUIRED") ??
  res.headers.get("x-payment-required") ??
  null;

if (res.status === 402) {
  if (!challengeB64) {
    console.error("[probe] 402 had no PAYMENT-REQUIRED header.");
    process.exit(3);
  }
  let challenge;
  try {
    challenge = JSON.parse(Buffer.from(challengeB64, "base64").toString("utf8"));
  } catch (e) {
    console.error("[probe] PAYMENT-REQUIRED is not base64 JSON:", e?.message || e);
    process.exit(3);
  }
  const a = Array.isArray(challenge.accepts) ? challenge.accepts[0] : challenge.accepts;
  console.log("[probe] x402Version:", challenge.x402Version);
  console.log("[probe] scheme:    ", a?.scheme);
  console.log("[probe] network:   ", a?.network);
  console.log("[probe] amount:    ", a?.amount, "(atomic units)");
  console.log("[probe] asset:     ", a?.asset);
  console.log("[probe] payTo:     ", a?.payTo);
  console.log("[probe] maxSec:    ", a?.maxTimeoutSeconds);
  console.log("[probe] extra:     ", a?.extra);
  console.log("[probe] resource:  ", challenge.resource);
  process.exit(0);
}

if (res.status === 200) {
  console.log("[probe] 200 WITHOUT payment — endpoint is NOT gated, or the 402 path failed-open.");
  console.log("[probe] body:", await res.text());
  process.exit(0);
}

console.log("[probe] unexpected status. body:", await res.text());
process.exit(res.ok ? 0 : 4);
