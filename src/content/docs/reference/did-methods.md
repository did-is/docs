---
title: DID methods
description: How DID.is resolves did:key, did:jwk, did:web and did:webvh, and what each method can establish.
---

DID.is resolves four methods. The method decides which [evidence dimensions](/start/concepts/) can be established.

| Method | Document source | Integrity | Update authority | History |
| --- | --- | --- | --- | --- |
| `did:key` | Derived from the identifier | Self-certifying | Self-certifying | Not applicable |
| `did:jwk` | Derived from the identifier | Self-certifying | Self-certifying | Not applicable |
| `did:web` | `https://<domain>/.well-known/did.json` | Depends on the origin | Not established | Not established |
| `did:webvh` | `https://<domain>/.well-known/did.jsonl` (signed log) | Verified log | Verified update keys | Verified |

## did:key

The document is derived from the multibase (`z`, base58btc) and multicodec-prefixed public key in the identifier. Verification methods use the `Multikey` type.

| Key type | Use |
| --- | --- |
| Ed25519 | `authentication`, `assertionMethod`, `capabilityInvocation`, `capabilityDelegation` |
| X25519 | `keyAgreement` only |
| P-256, secp256k1 (compressed) | `authentication`, `assertionMethod`, `capabilityInvocation`, `capabilityDelegation` |
| P-384, P-521, BLS12-381 G2, RSA | The document is produced, but the key cannot be used for verification. |

Points are validated; Ed25519 signatures are verified strictly (RFC 8032).

Example: `did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK`.

## did:jwk

`did:jwk:<base64url of a UTF-8 JSON JWK>`. The document has one `JsonWebKey2020` verification method, `#0`. A JWK with `"use": "enc"` is used only for key agreement; otherwise it is used for signing relationships. JWKs that contain private key members are refused. The encoded value is limited to 4096 characters.

## did:web

`did:web:<domain>[%3A<port>][:<path>]*` maps to `https://<domain>[:<port>]/.well-known/did.json`, or `https://<domain>[:<port>]/<path>/did.json` when a path is present.

In addition to the method specification, DID.is:

- refuses IP literals, credentials in URLs, dot segments and double encoding;
- fetches only from public addresses (see [Egress protection](/reference/egress/));
- requires the document `id` to equal the requested DID;
- limits the document to 1 MiB.

A `did:web` document is only as trustworthy as the domain's DNS, hosting and TLS. If the origin also publishes a valid [DID Configuration](https://identity.foundation/.well-known/resources/did-configuration/), the `origin` dimension is established.

## did:webvh

`did:webvh:<SCID>:<domain>[%3A<port>][:<path>]*` maps to `https://<domain>/.well-known/did.jsonl` (or `/<path>/did.jsonl`). The whole log is verified before any document is returned:

- **SCID:** the self-certifying identifier matches the hash of the first entry.
- **Entry hashes:** each entry's `versionId` is chained to its predecessor; version numbers are sequential and times strictly increasing.
- **Proofs:** every entry has an `eddsa-jcs-2022` proof by an authorised update key; pre-rotation commitments (`nextKeyHashes`) are honoured.
- **Parameters:** `method` must be `did:webvh:1.0`; deactivation, portability and witness thresholds (`did-witness.json`) are enforced.

Limits: log 4 MiB, 2000 entries, witness file 1 MiB. Resolving `did:webvh` uses the intensive request budget.

Use `?versionId=`, `?versionTime=` or `?versionNumber=` with [`/v1/dereference`](/build/resolution/#dereference-a-did-url) to fetch an earlier version.
