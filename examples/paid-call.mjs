#!/usr/bin/env node
/**
 * paid-call.mjs — execute one real paid call against the live Worker.
 *
 * To run this you need a Base (or Base Sepolia) EOA with USDC and an
 * x402 payer client. The script uses the installed @x402/evm exact
 * scheme and the @x402/core HTTP wrapper, which together construct an
 * EIP-3009 TransferWithAuthorization message, sign it with EIP-712
 * against the USDC contract on the chosen network, and encode the
 * resulting PaymentPayload as a PAYMENT-SIGNATURE header on the
 * second request.
 *
 * Install:
 *   npm install viem @x402/core @x402/evm
 *
 * Run (Base mainnet):
 *   PAYER_PRIVATE_KEY=0x<64 hex chars> node examples/paid-call.mjs
 *
 * Run (Base Sepolia, the recommended test network):
 *   PAYER_PRIVATE_KEY=0x<64 hex chars> \
 *   PAY_URL=https://preplayer.maximus-boomerus.workers.dev/v1/dedupe \
 *   PAY_NETWORK=eip155:84532 \
 *   PAY_BODY='{"documents":["hello world","hello, world!"],\"threshold\":60}' \
 *   node examples/paid-call.mjs
 *
 * Security:
 *   - Never commit PAYER_PRIVATE_KEY to git or paste it into an issue.
 *   - This script prints the first 18 chars of the signature, NOT the
 *     full signature, to keep the audit trail small. If you need the full
 *     PaymentPayload for debugging, use a non-funded throwaway wallet.
 *   - The first call is a probe (always 402); the second is the paid
 *     POST. A successful paid call WILL settle USDC on-chain via the
 *     CDP facilitator — do not treat the script as verify-only.
 */

import { x402Client, x402HTTPClient } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const URL = process.env.PAY_URL || "https://preplayer.maximus-boomerus.workers.dev/v1/dedupe";
const KEY = process.env.PAYER_PRIVATE_KEY;
const BODY_RAW = process.env.PAY_BODY ||
  '{"documents":["hello world","hello, world!"],"threshold":60}';

if (!KEY) {
  console.error("FATAL: PAYER_PRIVATE_KEY env var is required.");
  console.error("       export PAYER_PRIVATE_KEY=0x<64-hex>");
  console.error("       (NEVER hardcode or log the key value.)");
  process.exit(2);
}
if (!/^0x[0-9a-fA-F]{64}$/.test(KEY)) {
  console.error("FATAL: PAYER_PRIVATE_KEY malformed — expected 0x + 64 hex chars.");
  process.exit(2);
}

let body;
try { body = JSON.parse(BODY_RAW); }
catch { console.error("FATAL: PAY_BODY is not valid JSON."); process.exit(2); }

const account = privateKeyToAccount(KEY);
console.log("[1] Payer EOA:", account.address);

const x402 = new x402Client();
registerExactEvmScheme(x402, { signer: account });
const http = new x402HTTPClient(x402);

const probeHeaders = { "content-type": "application/json", accept: "application/json" };
const probe = await fetch(URL, { method: "POST", headers: probeHeaders, body: JSON.stringify(body) });
console.log("[2] Probe status:", probe.status);

if (probe.status === 200) {
  console.log("[i] Endpoint responded 200 WITHOUT payment — it is NOT gated for this caller,");
  console.log("    or the gating path failed-open. Nothing to sign.");
  console.log("    body:", await probe.text());
  process.exit(0);
}
if (probe.status !== 402) {
  console.error("[!] Expected 402, got", probe.status);
  console.error("    body:", await probe.text());
  process.exit(3);
}

const challengeB64 =
  probe.headers.get("payment-required") ??
  probe.headers.get("PAYMENT-REQUIRED") ??
  probe.headers.get("x-payment-required") ??
  null;
if (!challengeB64) {
  console.error("FATAL: 402 had no PAYMENT-REQUIRED header.");
  process.exit(4);
}
const challenge = JSON.parse(Buffer.from(challengeB64, "base64").toString("utf8"));
const accept = Array.isArray(challenge.accepts) ? challenge.accepts[0] : challenge.accepts;
console.log("[3] 402 challenge accepted:", {
  scheme: accept?.scheme,
  network: accept?.network,
  amount: accept?.amount,
  asset: accept?.asset,
  payTo: accept?.payTo,
  maxTimeoutSeconds: accept?.maxTimeoutSeconds,
  extra: accept?.extra,
  x402Version: challenge.x402Version,
});

let payload;
try {
  payload = await http.createPaymentPayload(challenge);
} catch (e) {
  console.error("FATAL: createPaymentPayload threw:", e?.message || e);
  process.exit(5);
}
const sig = String(payload?.payload?.signature || "");
console.log("[4] Sig hex (first 18 chars):", sig.slice(0, 18) + "…");
console.log("[4] Payer (from authorization):", payload?.payload?.authorization?.from);
console.log("[4] Value (atomic units):       ", payload?.payload?.authorization?.value);

const sigHeaders = http.encodePaymentSignatureHeader(payload);
const headerName = Object.keys(sigHeaders)[0];
console.log("[5] Using header:", headerName);

const paidHeaders = { "content-type": "application/json", accept: "application/json", ...sigHeaders };
const paid = await fetch(URL, { method: "POST", headers: paidHeaders, body: JSON.stringify(body) });
console.log("[6] Paid response status:", paid.status);

const settleHeader = paid.headers.get("payment-response") ?? paid.headers.get("PAYMENT-RESPONSE");
if (settleHeader) {
  console.log("[6] PAYMENT-RESPONSE (base64, full):", settleHeader);
}
console.log("[6] Paid response body:", await paid.text());

process.exit(paid.ok ? 0 : 6);
