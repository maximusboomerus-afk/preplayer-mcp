# Pricing

Reference table for every paid primitive on every supported network. Prices
are in USDC; multipliers are relative to the Base price.

## Per-call base (single tier)

| Endpoint | Base / Solana / Sepolia | Polygon | Arbitrum One |
| --- | --- | --- | --- |
| `normalize` | $0.002 | $0.0024 | $0.0024 |
| `validate` | $0.002 | $0.0024 | $0.0024 |
| `slugify` | $0.002 | $0.0024 | $0.0024 |
| `hash` | $0.002 | $0.0024 | $0.0024 |
| `classify` | $0.003 | $0.0036 | $0.0036 |
| `validate_json` | $0.003 | $0.0036 | $0.0036 |
| `extract` | $0.005 | $0.006 | $0.006 |
| `redact` | $0.005 | $0.006 | $0.006 |
| `diff` | $0.005 | $0.006 | $0.006 |
| `chunk` | $0.005 | $0.006 | $0.006 |
| `extract_custom` | $0.005 | $0.006 | $0.006 |
| `dedupe` | $0.01 | $0.012 | $0.012 |

## Batch tier (10 sub-requests per call)

| Endpoint | Base / Solana / Sepolia | Polygon | Arbitrum One |
| --- | --- | --- | --- |
| `batch` | **$0.40 / 10 calls** ($0.04 each) | $0.48 / 10 ($0.048 each) | $0.48 / 10 ($0.048 each) |

## Subscription tier (spec only — `501` today)

| Window | Volume | Price |
| --- | --- | --- |
| monthly | 10 000 calls | **$200** on Base, Solana, Sepolia / $240 on Polygon, Arbitrum |

Will not charge real USDC until the D1 store is in place. **Do not sign a
subscription payment today** — the Worker returns `501` regardless.

## Priority tier (spec only — `501` today)

| Header | Behavior |
| --- | --- |
| `X-Priority: high` | Would target a sub-200 ms P99 SLA. **Not implemented.** Returns `501` regardless of signature. |

## Atomic units reminder

x402 atomic units are 6-decimal USDC. `$0.002 = 2000` units. `$0.40 = 400 000` units.
`$200 = 200 000 000` units. If your payer uses a different decimal place (USDC on
non-EVM chains or a future stable), you will be price-rejected with `402`.

## Refunds

There is no refund flow. Plan retries accordingly.
