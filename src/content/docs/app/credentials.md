---
title: Verify credentials
description: Use Credential Studio on did.is/verify to check a verifiable credential's structure, issuer, proof, validity and status.
---

[did.is/verify](https://did.is/verify) (Credential Studio) checks a verifiable credential and shows each check that ran. Paste a JSON-LD credential, a compact JWT or an SD-JWT VC.

## What is supported

- **Data models:** W3C VC Data Model 2.0 and 1.1.
- **Proofs:** Data Integrity with `eddsa-jcs-2022` or `ecdsa-jcs-2019` (P-256); VC-JOSE (`vc+jwt`) and VC-JWT 1.1, signed with EdDSA, ES256 or ES256K.
- **Status:** Bitstring Status List v1.0 (and legacy StatusList2021) entries are fetched and evaluated.

- **EU wallet credentials:** SD-JWT VC (`dc+sd-jwt`) with disclosure digests, Key Binding and Token Status List. Disclosed values are never shown. See [EU wallet credentials](/build/eu-credentials/).

Proofs that need RDF canonicalization (`eddsa-rdfc-2022`, `ecdsa-rdfc-2019`, `Ed25519Signature2020`) and selective-disclosure suites (`ecdsa-sd-2023`, `bbs-2023`) are reported as `UNSUPPORTED`, never as valid.

## Reading the result

The overall status is the worst outcome across all checks, in this order:

`MALFORMED` › `INVALID` › `UNSUPPORTED` › `REVOKED` › `SUSPENDED` › `EXPIRED` › `NOT_YET_VALID` › `INDETERMINATE` › `VALID`

Only `VALID` means every check passed. Each check has an id, a label, a status and a detail line:

| Check | What it verifies |
| --- | --- |
| `structure` | The credential is well formed and carries a proof. |
| `issuer` | The issuer is a DID that resolves. |
| `proof` | The signature verifies with a key the issuer DID authorises for `assertionMethod`. |
| `validity` | `validFrom` / `validUntil` (or `nbf` / `exp`) include the current time. |
| `status` | Each status list entry is checked; unreachable or unverifiable lists make the result `INDETERMINATE`. |
| `jwt.aud` | For JWTs with an audience, it matches the expected audience you supply. |

Example: a credential without a proof returns `MALFORMED` with the detail "the credential carries no proof".

## What a valid result means

A valid proof shows the credential was signed by a key the issuer DID authorises. It does **not** show that the issuer is authoritative for the claims in the credential. Decide separately which issuers you trust.

To check credentials from code, see [Credentials](/build/credentials/).
