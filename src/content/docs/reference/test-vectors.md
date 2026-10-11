---
title: Test vectors
description: Public test vectors you can use to check DID.is results against the specifications.
---

DID.is is tested against published vectors from the specifications it implements. You can use the same vectors to check your own implementation, or to compare its output with DID.is.

## did:key

The [did:key specification](https://w3c-ccg.github.io/did-key-spec/) example key:

```bash
curl https://did.is/api/v1/resolve/did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

Expected: `verdict.outcome` is `RESOLVED`, one Ed25519 `Multikey` verification method, and these dimension states:

| Dimension | State |
| --- | --- |
| `integrity` | `SELF_CERTIFYING` |
| `keys` | `ESTABLISHED` |
| `control` | `SELF_CERTIFYING` |
| `origin` | `NOT_APPLICABLE` |
| `transport` | `NOT_APPLICABLE` |
| `history` | `NOT_APPLICABLE` |
| `organization` | `NOT_ESTABLISHED` |

## Data Integrity: eddsa-jcs-2022

[W3C Data Integrity EdDSA Cryptosuites v1.0](https://www.w3.org/TR/vc-di-eddsa/), example in Appendix B (`eddsa-jcs-2022`):

- Credential `id`: `urn:uuid:58172aac-d8ba-11ed-83dd-0b3aef56cc33`
- Issuer: `https://vc.example/issuers/5678`
- Verification method: `did:key:z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2#z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2`
- `proofValue`: `z2HnFSSPPBzR36zdDgK8PbEHeXbR56YF24jwMpt3R1eHXQzJDMWS93FCzpvJpwTWd3GAVFuUfjoJdcnTMuVor51aX`

The proof verifies. Changing any claim (for example `alumniOf`) makes it invalid.

## JSON canonicalization: RFC 8785 numbers

From [RFC 8785 Appendix B](https://www.rfc-editor.org/rfc/rfc8785#appendix-B):

| binary64 bits | Canonical form |
| --- | --- |
| `0x0000000000000000` | `0` |
| `0x8000000000000000` | `0` |
| `0x0000000000000001` | `5e-324` |
| `0x8000000000000001` | `-5e-324` |
| `0x7fefffffffffffff` | `1.7976931348623157e+308` |
| `0x4340000000000000` | `9007199254740992` |
| `0x44b52d02c7e14af6` | `1e+23` |
| `0x3eb0c6f7a0b5ed8d` | `0.000001` |

## Failure cases

| Input | Expected |
| --- | --- |
| `did:example:123` | `501 METHOD_NOT_SUPPORTED` |
| `did:web:example.com` (no DID document published) | `404 NOT_FOUND` |
| `did:web:localtest.me` (resolves to loopback) | `403 EGRESS_BLOCKED` |
| Credential without a proof | `MALFORMED`, check `structure` fails |
| Delegation chain `[]` | `MALFORMED`, check `depth` fails |
| JSON with a duplicate member such as `{"alg":"none","\u0061lg":"EdDSA"}` | Rejected |
