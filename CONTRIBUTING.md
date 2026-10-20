# Contributing

Thanks for helping make PrepLayer better. This document covers what's in this
repository and how to suggest changes.

## What this repo is

This is the **public discovery and documentation surface** for PrepLayer.ai. It
contains:

- The MCP registry manifest (`server.json`) — copied verbatim from the live
  Worker at `/server.json`.
- The README, SECURITY policy, and this file.
- A `docs/METHODOLOGY.md` describing the pricing rationale.
- A small set of runnable examples in `examples/` showing how to drive a paid
  call against the live Worker using the x402 protocol.

It does **not** contain the Worker source, the prompt-template store, or any
secrets. Patches to those live elsewhere.

## How to help

Use Issues for:

- **Bug reports** against a documented endpoint that doesn't match its
  spec or its manifest. Pick the bug report template.
- **Endpoint suggestions.** Things you'd pay $0.002 to $0.01 per call for and
  aren't already in the twelve. Pick the feature request template.
- **Payment questions.** If a signed call fails, settle returns the wrong
  amount, or a network doesn't route. Pick the payment bug template — we need
  the `PAYMENT-REQUIRED` challenge base64 to debug, never the private key.
- **Documentation gaps.** Wrong prices, wrong paths, broken links, broken
  examples.

Pull Requests are welcome for:

- Typo / link / example fixes.
- Additional runnable examples that follow the existing payment flow pattern.
- Corrections to `server.json` that match what the live Worker is serving
  (this file is generated from the Worker, not authored by hand).
- Documentation that explains something the README doesn't.

Pull Requests are **not** the right venue for endpoint suggestions or pricing
changes — open an issue first so we can argue on the merit and the unit
economics before code lands.

## Conduct

Be specific. Be honest. Don't paste private keys, signed payments, or live USDC
amounts into an issue — they belong in security@[…] only. Don't pretend a bug
is more or less serious than it is; the README's limitations list is the
reference baseline.

## License

By contributing, you agree your contributions are MIT-licensed under the same
terms as the rest of this repository. See [`LICENSE`](LICENSE).
