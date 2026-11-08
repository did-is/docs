---
title: FAQ
description: Answers to common questions about DID.is results, errors and limits.
---

## Does a resolved DID mean I can trust it?

No. Resolution shows that a document exists and what its evidence establishes, one dimension at a time. DID.is does not verify legal identity: the `organization` dimension is always `NOT_ESTABLISHED`. Decide which evidence your use case needs, for example with a [policy](/build/policies/).

## Why is the result `RESOLVED_WITH_WARNINGS`?

The document resolved, but something needs attention. The warnings are in `verdict.statements` and in the dimension states. Common causes: a domain binding that does not verify, a certificate close to expiry, or keys that are not in any verification relationship.

## Does a `VERIFIED` graph relation mean a signature was verified?

Not always. Read the relation's method and cited evidence. **Resolves to** verifies that the document `id` matches the requested DID; it does not verify a document signature or live private-key possession. Signature and `did:webvh` log-proof relations retain their specific cryptographic meaning. None of these alone establishes legal identity, current execution authority or permission to act. See [Evidence graph](/app/evidence-graph/).

## Can I view or compare past graphs?

Yes, when recorded graph evidence is available. On the result page choose **Recorded graphs**, then **View recorded graph** or **Compare recorded graphs**. The API uses `?observation=gobs:<positive integer id>` from that same DID's `graphHistory`. These are exact immutable observations, not a fresh verification or a lookup by document hash. Configuration evidence may differ even when document hashes match. The current verdict and raw response outside the graph do not change. See [Select a recorded graph](/build/resolution/#select-a-recorded-graph).

## Why are older graphs missing or unavailable?

Only fresh public resolutions collect graphs; cache hits and private, project or credential operations do not. Older document observations are not backfilled. `graphHistory` lists at most the latest 50 stored references, not a complete timeline. Capacity limits preserve old records and disclose gaps rather than prune history. `graphHistoryStatus: UNAVAILABLE`, missing legacy support and a successful empty list are different states. A snapshot hash does not independently prove observation time, full history or the current/latest state.

## Why does `did:web` show update authority as `NOT_ESTABLISHED`?

`did:web` has no signed history. Anyone who controls the domain's DNS, hosting or TLS can change the document. Use `did:webvh` if you need verifiable updates.

## Why is my credential `INDETERMINATE`?

A required check could not be completed. Usually the status list was unreachable, its proof did not verify, or it was issued by a different issuer than the credential. See [Status lists](/reference/status-lists/). `INDETERMINATE` is not a pass.

## Why do I get `403 EGRESS_BLOCKED`?

The host resolves to a non-public address (loopback, private network, link-local and others). DID.is fetches only from public addresses. See [Egress protection](/reference/egress/).

## Why do I get `404 NOT_FOUND` for `did:web`?

`https://<domain>/.well-known/did.json` (or `/<path>/did.json`) did not return a document. Check that it is published over HTTPS and that its `id` equals the DID.

## Why do I get `429 RATE_LIMITED`?

Each client has a standard budget of 20 requests per minute overall, with an additional limit of 10 requests per minute for intensive requests (verification, streaming and `did:webvh`). Intensive requests also consume the standard budget. These are per-client limits, not a shared server-wide allowance. On `429 RATE_LIMITED`, read `Retry-After` on that response and wait that many seconds before retrying; the delay is not fixed. See [Errors and rate limits](/build/errors/).

## How do I pass a DID URL with a fragment?

Encode `#` as `%23`: `/v1/dereference/did:web:did.is%23key-1`. The SDKs do this for you.

## Which DID methods are supported?

`did:key`, `did:jwk`, `did:web` and `did:webvh`. Others return `501 METHOD_NOT_SUPPORTED`.

## Is there a CLI?

No. Use `curl` or the [SDKs](/build/sdks/).

## Do I need an API key?

Not for the public API. A project key from the [console](/app/accounts/) gives private resolution. [Identifier monitoring and its signed webhooks](/app/monitoring/) require a Pro or Max team and use its shared watch slots.

## Are my lookups private?

Fresh public lookups can appear in the identifier's public document and graph observation history, not linked to who asked. Cache hits do not collect new graph records. Private/project resolution and credential operations do not contribute graph observations or expose private watch data or raw credential payloads through graph history. Use private resolution in the console for identifiers that must not be disclosed. See [Privacy and data handling](/app/privacy/).
