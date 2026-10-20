## What this PR does

One sentence.

## Why

Link the issue if there is one. If there isn't, explain.

## Scope

- [ ] `README.md`
- [ ] `docs/`
- [ ] `examples/`
- [ ] `server.json` (regenerated from the live Worker — paste the new file verbatim)
- [ ] `LICENSE` (almost never)
- [ ] `SECURITY.md` (almost never)

## Verification

- [ ] I read the result of `curl -i` against the live Worker for any endpoint
      whose docs I touched.
- [ ] I ran `examples/paid-call.mjs` against `eip155:84532` (Base Sepolia)
      if my change touches the request shape.
- [ ] I did not paste a private key, a `PAYMENT-SIGNATURE` header, or a
      live `PAYMENT-RESPONSE` settlement.

## License

I agree this contribution is MIT under the same terms as [`LICENSE`](../LICENSE).
