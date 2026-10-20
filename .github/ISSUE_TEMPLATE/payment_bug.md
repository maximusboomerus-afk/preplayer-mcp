---
name: Payment bug
about: A paid call failed in a way that looks like a verifier, facilitator, or replay problem
title: "[payment] "
labels: payment
assignees: []
---

## What happened

The outcome you saw (HTTP status, error code, empty response body, repeated 402,
replay accepted twice, underpayment, etc).

## Network and tool

- **Network:** Base / Solana / Polygon / Arbitrum / Base Sepolia
- **Tool path:** `/v1/<…>`
- **Network caip-2 in your payer:** (e.g. `eip155:8453`)

## Decoded 402 challenge

Paste the **decoded** contents of the `PAYMENT-REQUIRED` base64 header:

```json
{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "amount": "2000",
      "asset": "USDC",
      "payTo": "0x…",
      "maxTimeoutSeconds": 60,
      "extra": { "name": "PrepLayer.ai", "version": "0.2.0" }
    }
  ],
  "resource": { "url": "https://…/v1/<…>", "description": "…", "mimeType": "application/json" }
}
```

## What you signed

- EIP-712 domain: which `name` / `version` did your signer use? Confirm it
  matches the challenge's `extra`.
- EIP-3009 `validAfter` / `validBefore` window (unix seconds).
- The asset address you signed against (USDC contract on the chosen network).

## What you observed

- The facilitator's `verify` response, if you captured it. (Most clients don't;
  that's fine.)
- The presence or absence of a `PAYMENT-RESPONSE` header on the 200.

## What to NOT paste here

- **Never paste your `PAYMENT-SIGNATURE` header value.** It is a one-time bearer
  of USDC.
- **Never paste your private key or seed phrase.**
- **Never paste a real `PAYMENT-RESPONSE`** if it carries an unredeemed nonce
  you might replay; redact the `nonce` field.

If you suspect an actual bypass, see [`SECURITY.md`](../SECURITY.md) and email
`security@preplayer.ai` instead of opening an issue.
