---
title: Standards and conformance
description: The specifications DID.is implements, the versions it follows and the known gaps.
---

The live list is returned by `GET /health` under `standards`. This page explains it.

## Identifiers and resolution

| Specification | Status in DID.is |
| --- | --- |
| W3C DID Core 1.0 | DID syntax, documents and verification relationships. |
| W3C DID Resolution v1 (Candidate Recommendation Draft), HTTPS binding | `/1.0/identifiers/{did}`: content negotiation, RFC 9457 errors, the specification's status codes, 410 for deactivated DIDs, DID URL dereferencing. |
| `did:key` (W3C CCG, v0.9) | Supported. See [DID methods](/reference/did-methods/). |
| `did:jwk` (DIF) | Supported. |
| `did:web` (W3C CCG) | Supported. |
| `did:webvh` 1.0 (DIF) | Supported, including witnesses, pre-rotation and portability. |
| DIF Well-Known DID Configuration v1.0 | Domain linkage credentials in JWT and Data Integrity form; drives the `origin` dimension. |

Other DID methods return `501 METHOD_NOT_SUPPORTED`.

## Credentials and signatures

| Specification | Status in DID.is |
| --- | --- |
| W3C VC Data Model 2.0 and 1.1 | Verified by `/v1/credentials/verify`. |
| W3C Data Integrity, `eddsa-jcs-2022` | Supported. |
| W3C Data Integrity, `ecdsa-jcs-2019` (P-256) | Supported. |
| RDF-canonicalized suites (`eddsa-rdfc-2022`, `ecdsa-rdfc-2019`, `Ed25519Signature2020`, `JsonWebSignature2020`) | Reported as `UNSUPPORTED`. |
| Selective disclosure (`ecdsa-sd-2023`, `bbs-2023`) | Reported as `UNSUPPORTED`. |
| VC-JOSE (`vc+jwt`), VC-JWT 1.1 | Supported. |
| JOSE algorithms | `EdDSA`, `ES256`, `ES256K`. `none`, `crit` and `b64: false` are refused. |
| W3C Bitstring Status List v1.0 | Supported, single-bit entries. StatusList2021 entries are also read. See [Status lists](/reference/status-lists/). |
| RFC 8785 JSON Canonicalization Scheme | Used for Data Integrity, `did:webvh` and fingerprints. See [JSON canonicalization](/reference/jcs/). |
| RFC 9457 Problem Details | Every API error. |

JSON-LD `@context` values are never fetched remotely; DID.is uses an offline catalogue of known contexts.

## Agents

| Specification | Status in DID.is |
| --- | --- |
| Model Context Protocol `2026-07-28` | `server/discover`, used first. |
| Model Context Protocol `2025-11-25` | Session handshake, used as fallback. |
| A2A Protocol 1.0 | Agent card validation and signature verification; 0.3 cards are recognised. |
| DID.is Delegation Receipt v1 | Experimental DID.is format, not a standard. See [Delegation Receipt v1](/reference/delegation-receipts/). |

## Known gaps

- `did:web` has no defence against an origin serving different documents to different resolvers. `did:webvh` witnesses reduce this for witnessed versions.
- A `did:webvh` host can withhold newer log entries. Witnesses and watchers reduce this risk but do not remove it.
- TLS evidence relies on the public WebPKI root store.
- MCP side-effect classes are heuristics and are labelled as such.
- DID.is does not verify legal identity. The `organization` dimension is always `NOT_ESTABLISHED`.
