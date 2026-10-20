---
name: Bug report
about: An endpoint did not match its documented behavior or returned an unexpected response
title: "[bug] "
labels: bug
assignees: []
---

## Summary

A short description of what went wrong.

## Endpoint and shape

- **Endpoint path:** `/v1/<…>`
- **HTTP method:** `POST` (paid endpoints are POST only)
- **Body you sent:** paste the JSON body, not the `PAYMENT-SIGNATURE` header
- **Expected response:** paste the documented status + JSON shape
- **Actual response:** paste the real status + JSON body

## Reproduction

```bash
curl -i -X POST https://preplayer.maximus-boomerus.workers.dev/v1/<…> \
  -H 'content-type: application/json' \
  --data '{…}'
```

If the issue only manifests after payment, paste the **base64 challenge** you
received from the `402` and the **decoded** `accepts` block (network, amount,
payTo). **Do not paste the `PAYMENT-SIGNATURE` header or any signing material.**

## Environment

- Network: (Base / Solana / Polygon / Arbitrum / Base Sepolia)
- x402 client library version (e.g. `@x402/core` 2.28.0, `@x402/evm` 2.28.0)
- Date / time of the failing call (UTC preferred)

## Severity guess

P0 = payment bypass, underpayment, or PII leak. P1 = wrong output, wrong price,
replay. P2 = cosmetic, P3 = nice-to-have. State your guess and we'll re-rate.
