---
title: Evidence graph
description: Explore relation-level evidence, its observation time and collection limits, and compare recorded graphs.
---

The evidence graph shows the documents and relations behind a resolver result. It is level 2 of the [result page](/app/reading-a-result/) and is available from [`GET /v1/graph/{did}`](/reference/api/#evidence-graph). It is a bounded view of evidence for one DID, not a complete map of its relationships or a permission to act.

## Nodes

Depending on the method and result, the graph contains:

- **Subject**: the DID you asked about.
- **Document**: the DID document that was resolved.
- **Origin** and **TLS certificate** (`did:web`, `did:webvh`).
- **Log** (`did:webvh`): the verified version log.
- **Keys**: the verification methods included in this view.
- **Services**: the service declarations included in this view.
- **DID Configuration**: origin-linkage evidence, with separate signature relations for its cited credentials.
- **Aliases** and **external controllers**: declarations from `alsoKnownAs` and `controller`, with reciprocal origin checks where available.

Each node carries facts, such as the method, outcome, curve or certificate issuer.

## Edges

Each edge has a relation (for example "resolves to", or the verification relationships a key is used for) and a state:

| State | Meaning |
| --- | --- |
| `VERIFIED` | The relation-specific check passed. Read the method and cited evidence; this is not always a signature check. |
| `OBSERVED` | Fetched or derived during resolution, not thereby independently proven. |
| `DECLARED` | Asserted in a document, or a proof was claimed but its format was not verified. |
| `FAILED` | The attempted check or retrieval failed. Read the cited evidence for the reason. |

The subject-to-document **resolves to** relation uses `DID_DOCUMENT_ID_COMPARISON`: `VERIFIED` means the document's `id` matched the requested DID. This is not a document signature, including for `did:web`. For `did:key` and `did:jwk`, separate key-derivation relations bind the encoded public key by construction; they do not test possession of its private key.

Signature and `did:webvh` log-proof relations retain their cryptographic meaning. Each **signed** relation cites one linkage credential and its own proof outcome; several credentials signed by one key are not merged into a single successful proof.

## Relation-level provenance

Open a relation in the graph or the evidence list to see **Relation evidence**. When recorded, its `provenance` explains the existing check rather than performing a new one:

| Field | What to read |
| --- | --- |
| `profile`, `method` | The explanation profile and the specific check or declaration mechanism. `method` is not a signing-key identifier. |
| `evidenceRefs` | JSON pointers into `/evidence/...` in the **same response**, including the selected recorded graph. Expand **Cited evidence** to read those records. |
| `observedAt`, `verifier` | The original observation time and resolver name/version. Cache delivery does not create a new observation time. |
| `sourceUri` | The source, when recorded; not a promise that it is still reachable or unchanged. |
| `hashes` | Pairs of hash scope and digest. Document, retrieval-body, key, certificate and configuration hashes identify different inputs and are not interchangeable. |
| `validFrom`, `validUntil` | Evidence validity dates, when supported and recorded. These are separate from observation time. |
| `limitations` | What this relation does not establish. |

A selected historical `did:webvh` version has its own version time; that does not rewind the TLS or domain-linkage observation to that time. Missing provenance on an older result is unknown, not evidence that a check succeeded.

## Collection limits

The graph includes at most **40 keys, 40 services, 8 aliases and 8 external controllers**. `coverage` reports the shown and total counts from this result's evidence, `truncated`, and a scope/note. The subject itself is excluded from external-controller counts. A filter can hide additional supplied nodes; the page distinguishes view filtering from collection omissions.

The graph is directed and **may contain cycles**. It is not a proof-dependency DAG. Even when every supplied item fits, that does not establish global completeness or the absence of other relationships. Missing coverage on a legacy result remains unknown. Graph node and edge IDs are display references, not DID-method identifiers; duplicate service IDs remain separate declarations, not verified equivalent services.

## Explore the graph

- Choose **All evidence**, **Keys**, **Services** or **Connections**. Connections includes origins, TLS, linkage, logs, aliases and external controllers.
- Use **Find in this graph** to search supplied node labels and facts. Filtering and search do not fetch more evidence.
- Open a node and choose **Focus on this node** for its immediate connections. **Show all connections** leaves that focused view.
- Open **Browse evidence** (its label includes node and relation counts) for a text list of the current view. Nodes open their facts; relations open their method, cited evidence, digests and limitations.

### Expanded workspace and keyboard controls

**Expand graph** opens the native **Graph workspace** dialog near the size of the viewport. It does not force browser fullscreen. **Fit visible graph**, available in that workspace, fits the nodes in the current filtered/focused view; it does not reveal hidden or uncollected evidence.

Drag empty canvas space to pan. Use **Zoom in**, **Zoom out** and **Reset view**, or focus the canvas and use arrow keys to pan, `+`/`-` to zoom and `0` to reset. `Ctrl`/`⌘` + scroll zooms. Use `Tab` to reach nodes and relations, then `Enter` or `Space` to open details.

Expanding and closing retain the filter, query, focused view, recorded-graph/comparison choice and selection. The inline pan/zoom and page scroll position are preserved separately from the expanded view. `Escape` closes an open detail first; a subsequent `Escape` closes the workspace. **Close expanded graph** closes the workspace directly. Focus returns to the opener; if a detail stays open after closing the workspace, focus remains with it until it is dismissed.

On a small screen, fitting a large graph is an overview and can make labels small. Zoom in, narrow the view, or use **Browse evidence** and the detail panels instead of trying to read every label at once.

## Recorded graphs and comparison

Choose **Recorded graphs**, then **Observation to view** and **View recorded graph**. For a comparison, also choose **Earlier observation** and **Compare recorded graphs**. These select exact same-DID `gobs:<positive integer id>` records, not the latest record with a matching document hash. Configuration evidence can change while the document hash stays the same.

The panel labels the result **Recorded graph** and keeps its original observation time. **Changes between recorded views** describes only those two stored projections: **Only in newer view**, **Only in older view** and **Changed evidence**. Observation time alone is not treated as an evidence change. This is not a complete change log, fresh verification or current permission. The live verdict, telemetry and raw response outside the graph remain unchanged. **Return to current result** leaves the recorded view.

History lists up to the latest **50** stored graph references for the same DID. Only fresh public resolutions collect new graph observations: cache hits and private, project or credential operations do not. Each collected graph gets a separate immutable record, including configuration-only changes with an unchanged document hash. Older document observations are not backfilled or reconstructed as graphs. Stored graphs retain typed public evidence, not raw credential payloads or private watch data; there is no cross-DID discovery index or background crawl.

Graph storage is bounded to **10,000 rows, a 64 MiB aggregate serialized-payload budget and 2 MiB per row**. These logical payload budgets are not physical SQLite database or WAL caps. When full, old records are preserved rather than expired, overwritten or pruned; new collection gaps are disclosed without changing the live cryptographic verdict or undoing the independent legacy observation commit. Unavailable or corrupt graph history is not presented as a successful empty list. A snapshot SHA-256 binds the stored bytes, not independent corroboration, a trusted observation clock, complete history or proof of the current/latest state.

## Reading tips

- A `DECLARED` service endpoint only tells you the document lists it.
- A verified origin edge links the DID to the origin. It does not tell you who operates the origin.
- An authentication, assertion or delegation declaration does not establish live private-key possession, current execution authority or legal identity. A path of `VERIFIED` edges does not turn those separate questions into one proof.
