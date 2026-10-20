# PrepLayer.ai

> Twelve x402-paid deterministic text primitives for AI agents.
> Pay per call in USDC. No API keys, no accounts, no signup.

**Base URL:** `https://preplayer.maximusboomerus.workers.dev`
**Mirror URL (production):** `https://api.maximusmediahouse.com`
**MCP endpoint:** `https://preplayer.maximus-boomerus.workers.dev/mcp` (streamable-http, POST)
**Service version:** `0.2.0`

---

## What this is

PrepLayer is a single Cloudflare Worker exposing **twelve** deterministic text prep
primitives behind one MCP server. Each call costs a few cents in USDC and is paid for
on the wire via the x402 protocol — the agent signs a `TransferWithAuthorization`
(EIP-3009) against USDC, the Worker verifies the signature with the Coinbase Developer
Platform facilitator, and the call runs.

The primitives are the boring text work an agent has to do before it can think:
normalize whitespace, validate an identifier, hash content for a cache key, dedupe a
document set, redact PII before logging, chunk for RAG, diff two blobs. Each
primitive is pure — identical input always produces identical output — so results are
content-addressable and safe to cache.

## What's not in this repo

The MCP server and Worker source live in a private working tree. This repo is the
public landing surface: discovery, manifest, license, security contact, and a small
example showing how a payer actually executes a paid call. If you want to self-host
the worker, see [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for what you'd need to
stand up — none of the secrets are here on purpose.

---

## Endpoints

Every paid endpoint is `POST` and gated with x402. The first call without payment
returns `402 Payment Required` with a `PAYMENT-REQUIRED` header (base64 JSON) and a
`PAYMENT-REQUIRED` JSON body describing the challenge. The second call carries a
`PAYMENT-SIGNATURE` header (base64 JSON) and returns `200`.

### Twelve text primitives

| Endpoint | Path | Single price (Base) | Per call |
| --- | --- | --- | --- |
| `normalize` | `/v1/normalize` | **$0.002** | 2 000 atomic units |
| `validate` | `/v1/validate` | **$0.002** | 2 000 atomic units |
| `slugify` | `/v1/slugify` | **$0.002** | 2 000 atomic units |
| `hash` | `/v1/hash` | **$0.002** | 2 000 atomic units |
| `classify` | `/v1/classify` | **$0.003** | 3 000 atomic units |
| `validate_json` | `/v1/validate_json` | **$0.003** | 3 000 atomic units |
| `extract` | `/v1/extract` | **$0.005** | 5 000 atomic units |
| `redact` | `/v1/redact` | **$0.005** | 5 000 atomic units |
| `diff` | `/v1/diff` | **$0.005** | 5 000 atomic units |
| `chunk` | `/v1/chunk` | **$0.005** | 5 000 atomic units |
| `extract_custom` | `/v1/extract_custom` | **$0.005** | 5 000 atomic units |
| `dedupe` | `/v1/dedupe` | **$0.01** | 10 000 atomic units |

Prices on **Polygon** and **Arbitrum One** are `×1.2`; prices on **Base**,
**Base Sepolia**, and **Solana mainnet** are `×1.0`. Atomic units are 6-decimal USDC.

### Three additional endpoints

| Endpoint | Path | Price | Status |
| --- | --- | --- | --- |
| `batch` | `/v1/batch` | **$0.40 / 10 calls** ($0.04 each) | real — single x402 payment, up to 10 sub-requests |
| `subscription` | `/v1/subscription` | **$200 / 10 000 calls / month** | **spec only** — returns `501`; the design is documented in `docs/METHODOLOGY.md`, will not charge real USDC until the D1 store is in place |
| `priority` | `/v1/priority` | n/a | **spec only** — returns `501`; we will not charge 2× for a latency SLA we cannot guarantee on a single-instance Worker |

### Free endpoints (never charged)

| Path | Purpose |
| --- | --- |
| `/.well-known/x402` | x402 Bazaar service descriptor (15 resources, networks, prices) |
| `/v1/manifest.json` | MCP tool list with full JSON-Schema and per-network pricing |
| `/server.json` | MCP registry manifest (this file's companion) |
| `/landing` | HTML landing page |
| `/llms.txt`, `/llms-full.txt` | Plain-text references for LLM crawlers |
| `/robots.txt`, `/bazaar-extension.json` | Discovery aids |

---

## Payment flow

PrepLayer is paid through [x402](https://www.x402.org/) — HTTP's `402 Payment Required`
made useful. The wire:

1. `POST` an endpoint with the tool's JSON body and no payment header. The server
   returns `402` with a `PAYMENT-REQUIRED` header (base64 JSON challenge) describing
   the scheme, network, asset, amount, treasury address, and an EIP-712 domain.
2. The caller signs an EIP-3009 `TransferWithAuthorization` message against the
   USDC contract on the selected network and base64-encodes the resulting
   `PaymentPayload` into a `PAYMENT-SIGNATURE` header.
3. `POST` again with that header. The server verifies the signature with the CDP
   facilitator (`https://api.cdp.coinbase.com/platform/v2/x402`), executes the tool,
   and returns `200` with a `PAYMENT-RESPONSE` header containing the settlement
   receipt.

The v2 protocol on the wire:

- Header on `402`: `PAYMENT-REQUIRED` (base64 JSON; lowercase header name as the
  Worker emits it).
- Header on `200`: `PAYMENT-SIGNATURE` (base64 JSON; ditto).
- Header on `200` (settle receipt): `PAYMENT-RESPONSE` (base64 JSON).
- Scheme: `exact`. Networks: `eip155:8453`, `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`,
  `eip155:137`, `eip155:42161`, `eip155:84532` (Base Sepolia, test only).
- Asset: `USDC`.
- Treasury: `0x8cb59b1bffb39c130ab85a8177e93eae9ddbaf10`.
- Facilitator: `https://api.cdp.coinbase.com/platform/v2/x402` (Coinbase Developer
  Platform; the path matters — `/v2/x402` 404s and is the wrong URL).

### Example: probe-only (no payment required)

The probe below is **always** safe to run — it returns the `402` challenge and never
spends anything. Use it to verify connectivity, the treasury address, and the
per-network price.

```bash
curl -i -X POST https://preplayer.maximus-boomerus.workers.dev/v1/normalize \
  -H 'content-type: application/json' \
  --data '{"text":"Hello\u200b, World!"}'
```

The response is `HTTP/2 402`, with:

```
PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6...
```

Decoded, the body is a JSON object describing the accepted (scheme, network, amount,
asset, payTo). See `examples/probe.mjs` for a runnable version that decodes the base64
challenge and prints it.

### Example: a paid call (Node.js, viem + @x402/core/evm)

The real paid flow needs a wallet — there is no honest way to do it with bare `curl`.
`examples/paid-call.mjs` shows the verified-working pattern (EIP-3009 signing via
`@x402/evm/exact/client`, header encoding via `@x402/core/client`'s
`x402HTTPClient.encodePaymentSignatureHeader`). To run it:

```bash
npm install viem @x402/core @x402/evm
PAYER_PRIVATE_KEY=0x<64 hex chars> node examples/paid-call.mjs
```

The script signs a single call to `/v1/dedupe`, prints the first 18 chars of the
EIP-712 signature (never the key, never the full signature), and prints the
`PAYMENT-RESPONSE` settlement receipt on success. The same machinery handles the
other 11 primitives and `batch`.

**Never commit, log, or paste your `PAYER_PRIVATE_KEY`.** A leaked private key is
unrecoverable loss of USDC.

---

## MCP install

Any MCP client that supports streamable-http can drive PrepLayer by pointing at:

```
https://preplayer.maximus-boomerus.workers.dev/mcp
```

The server returns the full tool list (`normalize`, `validate`, `extract`, `redact`,
`classify`, `dedupe`, `diff`, `chunk`, `extract_custom`, `validate_json`, `slugify`,
`hash`, `batch`, `subscription`, `priority`) on `tools/list`. Each tool call goes
through x402 like any other HTTP call — the MCP layer is a thin transport.

If you are writing your own MCP client: the initialize handshake is JSON-RPC 2.0 over
HTTP POST with `Content-Type: application/json` and `Accept: application/json,
text/event-stream`. `tools/call` is a paid request that returns the same `402` /
`PAYMENT-SIGNATURE` round-trip as the bare HTTP path.

---

## Known limitations (read this)

This service is honest about what it is and what it isn't.

### 1. The character-fidelity ceiling is approximately 6.5 out of 10

`normalize`, `slugify`, and `extract` do Unicode folding to a fixed ASCII surface.
That's the whole point — content hashes stay stable across whitespace, smart-quote,
and accent variants — but it means we **strip** diacritics, we don't preserve them
round-trip. `"naïve café"` becomes `"naive cafe"`. If you need Unicode-preserving
normalization (e.g. NFKC without NFKD), this is the wrong tool.

### 2. Two tiers are spec-only, not live

`subscription` (`$200 / 10 000 calls / month`) and `priority` (`X-Priority: high`,
no published price) both return `501 Not Implemented` today. The manifest advertises
them so x402 directories render the full tier ladder, but the Worker has no D1 store
backing subscriptions and no SLA behind the priority tier. **Do not pay into either
yet** — the server will refuse the call regardless of whether the signature is valid.

### 3. Single-instance Worker, no SLA

One Cloudflare Worker, no Durable-Object-backed request queueing. Latency P99 is
unmeasured but the Worker can be cold-started after a deploy, and a single misbehaving
caller can pin a CPU slot for several seconds on `extract_custom` with a malicious
regex (we have a static guard and a 10 KB subject cap, but no economic rate limit
beyond that). Treat this as a beta: useful for research workloads, not yet a fit for
time-sensitive production pipelines.

### 4. CDP facilitator dependency

Settlement goes through Coinbase Developer Platform's x402 endpoint. If the CDP
facilitator is down, every paid call will `503` regardless of how good the signature
is. We have no in-process fallback. Mirror status: <https://status.coinbase.com/>.

### 5. No replay window other than the per-payload nonce

A successfully-paid call cannot be replayed against the same endpoint (the Worker
uses a Durable Object keyed by payment nonce, exactly-once under concurrency), but
**the same signed payment can be replayed once per Worker instance across different
endpoints** if the JSON body changes to fit. If you fork this for production, add a
per-tool-keyed replay set on top of the per-payload nonce.

### 6. Receipt contents have changed once and may change again

Between `0.1.0` and `0.2.0` the receipt field list moved (the `facilitator` field
used to read `"mock-cdp"` during Phase 1; it now reads the real facilitator URL).
Anything that scrapes receipts and pins the field names needs an update if the
settlement envelope changes in a future minor version.

---

## Discovery

These URLs never charge and never rate-limit:

- MCP tool list: <https://preplayer.maximus-boomerus.workers.dev/v1/manifest.json>
- x402 Bazaar descriptor: <https://preplayer.maximus-boomerus.workers.dev/.well-known/x402>
- MCP registry manifest: <https://preplayer.maximus-boomerus.workers.dev/server.json>
- Plain-text reference: <https://preplayer.maximus-boomerus.workers.dev/llms-full.txt>
- HTML landing: <https://preplayer.maximus-boomerus.workers.dev/landing>

## Status

The Worker is in `0.2.0`. It was red-teamed (`preplayer_redteam_2026-10-19.md` in the
project notes) before paid real USDC was accepted; the payment bypass, replay,
ReDoS, and price-tier findings are closed. Two `P3` items (`HEAD → 404 not 405`,
duplicate 402 in MCP `structuredContent`) remain open. The Worker has been serving
real EIP-3009-signed USDC calls against the CDP facilitator since Phase 2.

## License

MIT — see [`LICENSE`](LICENSE). Service source is private; this repo and the
endpoints it documents are MIT.
