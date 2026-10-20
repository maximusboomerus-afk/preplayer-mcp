# Security Policy

PrepLayer.ai is a paid public endpoint — it accepts signed USDC transfers on Base,
Solana, Polygon, and Arbitrum. We take that seriously even though the service is
operated by a small team.

## Supported versions

The `0.2.x` line is the only actively supported release at the moment. Earlier
versions (notably the `0.1.x` Phase-1 mock-verifier deployment that synthesized
fake receipts) should NOT be relied on and never accepted real USDC. Anything in
the changelog below `0.2.0` is historical.

## What to report

Please report, in priority order:

1. **Payment bypass.** A way to call a paid endpoint without a valid facilitator
   signature, or to replay a settled payment for additional credit, or to underpay
   (atomic units less than the manifest price for the chosen network). Anything that
   lets a caller receive the tool's output without paying the advertised amount is
   a P0.
2. **ReDoS / CPU pegging.** A pattern that pegs a CPU slot for more than ~1 second
   at trivial input size, regardless of cost. We have a static guard and a 10 KB
   subject cap but the regex surface is open-ended.
3. **PII leakage.** Any path that returns source text or extracted spans without
   redaction when `classes` is set on `redact`, or any `redact` call that returns a
   span position pointing inside the original input.
4. **Information disclosure.** Unauthenticated access to anything that should be
   paid — manifests and Bazaar descriptors are public on purpose, everything else is
   not.
5. **Supply chain.** A compromised release of `@x402/core`, `@x402/evm`, `@x402/svm`,
   `@x402/hono`, or `@coinbase/cdp-sdk` that changes the wire signature header
   format or the EIP-712 domain binding. Pin hashes and rebuild.
6. **Free-tier abuse.** A loop or payload that bills an unbounded amount of free
   tier CPU / DO-state without paying for it. We do not have an economic rate limit
   yet (see README §3).

## What does NOT need a report

- The fact that the service accepts no API key and signs every call per request
  by design. That is the whole point of x402 and is not a vulnerability.
- `subscription` and `priority` returning `501`. Documented behavior.
- Cold starts and P99 latency above 200 ms. Beta SLA — not a bug, see README §3.
- Output of `normalize` that strips diacritics. Documented, see README §1.
- The `mock-cdp` facilitator string in any historical receipt from before the
  Phase 2 deploy. Historical artifacts.

## How to report

Email **security [at] preplayer.ai** with a description, reproduction steps, and
the smallest failing payload or signed payment that triggers the issue. If the
finding involves a specific settled payment, include the `tx_hash` or the
`PAYMENT-REQUIRED` challenge base64 — never the private key.

We aim to acknowledge within **72 hours** and to ship a fix (or a documented
mitigation) for P0 within **7 days**. P1 within **30 days**. P2 / P3 on a
best-effort basis.

We do not currently operate a paid bug-bounty program. Responsible disclosure
is the right framing for this stage.

## Hardening history

- **2026-10-19** — Payment-bypass closed. The Worker now calls the real CDP
  facilitator at `/platform/v2/x402` for every paid request (the prior
  `/v2/x402` URL 404s) and fails closed if the verifier is unreachable. Phase 1
  mock verifier (`tx_hash: 0xmock…`, `facilitator: "mock-cdp"`) is removed.
- **2026-10-19** — Replay protection. Each signature nonce is recorded in a
  Durable Object (`ReplayGuard`) and exactly one request per payment passes
  even under a 12-way concurrent race.
- **2026-10-19** — ReDoS guard. `extract_custom` rejects unsafe regexes via
  static shape analysis (15/15 known-bad patterns) plus a 10 KB subject cap.
- **2026-10-19** — Body-size cap. 413 returned before parse for bodies over
  the per-tool maximum.
- **2026-10-19** — Version drift. The deployed bundle's `SERVICE_VERSION` is
  now `0.2.0`, matching the manifest.

## PGP

No public PGP key at this time. If you need one for a coordinated disclosure,
ask in the first email and we'll publish one with the response.
