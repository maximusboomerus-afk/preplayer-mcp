# Methodology

This document explains the pricing and engineering choices behind PrepLayer.ai.
It's intended for integrators who want to understand the unit economics and for
anyone considering self-hosting or forking the worker.

## What we're pricing against

Every call is priced against a **normalized compute cost**, not against a market
rate per "request". The normalization is the only defensible data product here
because:

1. The primitives are pure — there is no input-dependent variance in cost.
   `normalize` on 1 KB costs the same as `normalize` on 1.1 MB up to the input
   cap. A flat-rate call reflects this honestly.
2. The primitives are small — the entire tool surface fits in one Cloudflare
   Worker on free-plan tier. Marginal compute cost is sub-cent.
3. The bottleneck is **whoever's wallet signs the payment**, not our CPU.

That is why the `single` tier ranges from $0.002 (`normalize`, `validate`,
`slugify`, `hash` — pattern matching and string folding) up to $0.01
(`dedupe` — pairwise Jaccard across up to 200 documents). The price scales with
the size of the work the server has to do, in 5-cent-quantum steps inside one
order of magnitude.

## Per-call normalization, not per-token

A common alternative is to bill per input character or per token. We deliberately
do not, for two reasons:

- **It punishes batching.** An agent that pre-normalizes a 10 000-document
  dataset in one round trip pays 10 000× the per-token fee. Per-call with a
  bounded input cap is more honest.
- **It creates a tail-latency cliff.** The slowest `extract_custom` call on a
  regulated regex needs the same response time as a fast one; per-token would
  let a malicious caller push the workload up without paying for it.

The input caps (1 KB to 1 MB depending on tool) are documented in the manifest
and enforced before parse (`413 Payload Too Large`). A caller who wants to
process 10× the cap calls `batch` ten times.

## The `batch` tier

`POST /v1/batch` accepts up to 10 sub-requests in one body, charges one x402
payment of $0.40 ($0.04 per call), and returns 10 results in the same order.

The discount over `single` is roughly 20% per call. It exists because:

- A round trip saves the agent one network handshake and one EIP-3009 signature
  per 10 sub-requests. The agent's marginal cost falls, and we pass on roughly
  half of the saving.
- The Worker still pays for 10 invocations of the underlying primitives. There
  is no free compute.

The discount is intentionally **not** 50% — it would make `batch` the default
even for callers who don't care about round trips, and we'd lose the price signal
that drives the per-call normalization.

## The `subscription` tier (spec only)

`POST /v1/subscription` with `X-Subscription-Token: <token>` would gate a month
of up to 10 000 calls behind a single $200 payment. The design exists in the
manifest for x402 directory display, but the Worker currently returns `501` for
every subscription request regardless of the signed payment.

The blocker is operational, not economic. A subscription needs:

- A D1 (or equivalent KV) store that maps a per-caller token to a remaining
  quota.
- A per-second rate limit tied to that quota (otherwise a paid-up caller can
  starve single-tier callers).
- A renewal / revoke flow that the facilitator doesn't currently express.

We are not going to charge for the spec-only version. If you sign a
subscription payment today, the Worker returns `501` and your signature is
unused. Do not sign one.

## The `priority` tier (spec only)

Same status as `subscription` — returns `501`. We will not charge a 2×
premium for a sub-200 ms P99 latency SLA until the Worker is at least
multi-region, and even then only if the SLA is met under load.

## Multi-chain pricing

Prices on `eip155:137` (Polygon) and `eip155:42161` (Arbitrum One) are `1.2×`
the Base and Solana prices. The surcharge covers the additional facilitator
verify round-trip variance on the longer-finality L2s, not the gas cost — gas
is paid by the facilitator, not by us.

`eip155:84532` (Base Sepolia) is supported at the same `1.0×` price as Base
mainnet and is the recommended test network. Use it for `examples/paid-call.mjs`
during development.

## The `PAYMENT-SIGNATURE` header is the only protocol contract

You will see `PAYMENT-REQUIRED` (base64 JSON challenge) on every 402 and
`PAYMENT-RESPONSE` (base64 JSON receipt) on every 200. The lowercase header
names are what the Worker emits. The x402 v1 header `X-PAYMENT` is **not** the
right header for this Worker — the Worker speaks x402 v2 only. Our internal
redteam found a server that accepted the v1 header for compatibility and
attributed receipts to the wrong nonce; that server is gone.

## Why "deterministic" matters

Each primitive returns identical output for identical input. That means an
agent's cache key is the content hash, not a hash of the call envelope. It also
means the `PAYMENT-RESPONSE` from one call is not interchangeable with another's
— the `nonce` in the receipt ties the receipt to a single tool invocation.

## What we are NOT

We are not a model API, not a memory store, not a vector index, not a fraud
scoring service. Agents that need any of those should wire them upstream and
keep PrepLayer for the boring text utility work — that's where the unit
economics make sense.

## Replay and refund policy

The Worker uses a Durable Object (`ReplayGuard`) keyed by the payment nonce.
Each nonce is admitted exactly once. **There is no refund flow.** If a call is
made and the tool returns an error status (`502`, `503`, `504`, anything except
`401`/`402`/`403`/`404`/`413`), the USDC has already settled and we cannot
claw it back via x402. The CDP facilitator does not offer a refund primitive.
Plan accordingly — a learning agent that retries aggressively should budget for
the duplicate calls.
