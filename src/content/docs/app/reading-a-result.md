---
title: Reading a result
description: The four levels of the did.is result page, from the plain-language verdict to the raw substrate.
---

A result page on did.is has four levels. Each adds detail; you can stop at any level.

| Level | Name | What you see |
| --- | --- | --- |
| 1 | Verdict | One sentence per evidence dimension, in plain language, including the ones that are not established. |
| 2 | Evidence graph | Every document, key, origin, certificate and linkage credential as a node, and every relation as a verified, observed or declared edge. See [Evidence graph](/app/evidence-graph/). |
| 3 | Telemetry | The resolution as it happened: DNS pinning, TLS handshake, parsing, hash-chain and signature checks, with real timings. |
| 4 | Substrate | Raw JSON, multicodec breakdowns, RFC 7638 thumbprints and the exact API calls to reproduce the result. |

## Level 1: verdict

The headline describes control, for example:

- `did:key`: "Self-certifying Ed25519 DID; private-key possession not tested."
- `did:web:did.is`: "Controlled by the operator of did.is; publishes Ed25519 verification keys."

Below it, each of the seven [evidence dimensions](/start/concepts/) shows its state and statement, with what it **proves** and what it **does not prove**. Read the "does not prove" line before relying on a result.

## Level 3: telemetry

Telemetry lists the stages that actually ran, in order. For a `did:web` identifier, typical stages are:

| Stage | Meaning |
| --- | --- |
| `syntax.parse` | DID syntax check (DID Core §3.1) |
| `method.web.transform` | DID to HTTPS URL, e.g. `did:web:did.is` → `https://did.is/.well-known/did.json` |
| `egress.dns` | DNS resolution; the address is checked and pinned (see [Egress protection](/reference/egress/)) |
| `egress.fetch` | TLS handshake and HTTP exchange, with certificate issuer |
| `document.parse` | JSON parsing and document `id` check, with SHA-256 of the document |
| `linkage.verify` | DID Configuration (origin binding) verification |
| `evidence.assemble` | Dimensions and verdict assembled |

The same stages are available from [`GET /v1/stream/{did}`](/build/stream/), and in the `trace` field of error responses.

## History and changes

For identifiers DID.is has seen before, the page shows observation history and what changed between observations (keys added, removed or rotated, services, controller, domain binding). For `did:web` these are DID.is's own records, not proof of what the document contained in the past.

## Limitations

Each result ends with its limitations, for example "Self-certifying identifiers cannot be rotated or deactivated; a compromised key compromises the DID permanently."
