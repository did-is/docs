---
title: Evidence graph
description: The nodes and edges behind a verdict, and what verified, observed and declared relations mean.
---

The evidence graph shows why a verdict was reached. It is level 2 of the [result page](/app/reading-a-result/) and is available from [`GET /v1/graph/{did}`](/reference/api/#evidence-graph).

## Nodes

Depending on the method and result, the graph contains:

- **Subject**: the DID you asked about.
- **Document**: the DID document that was resolved.
- **Origin** and **TLS certificate** (`did:web`, `did:webvh`).
- **Log** (`did:webvh`): the verified version log.
- **Keys**: each verification method.
- **Services**: each service endpoint.
- **Linkage credential**: the DID Configuration credential, when present.

Each node carries facts, such as the method, outcome, curve or certificate issuer.

## Edges

Each edge has a relation (for example "resolves to", or the verification relationships a key is used for) and a state:

| State | Meaning |
| --- | --- |
| `VERIFIED` | Checked cryptographically or by construction. |
| `OBSERVED` | Seen during resolution but not cryptographically proven. |
| `DECLARED` | Stated in a document without independent evidence. |
| `FAILED` | Checked and wrong. |

Example: for `did:key`, the edge from the subject to the document is `VERIFIED`, because the document is derived from the identifier.

## Reading tips

- A `DECLARED` service endpoint only tells you the document lists it.
- A verified origin edge links the DID to the origin. It does not tell you who operates the origin.
