---
title: FAQ
description: Answers to common questions about DID.is results, errors and limits.
---

## Does a resolved DID mean I can trust it?

No. Resolution shows that a document exists and what its evidence establishes, one dimension at a time. DID.is does not verify legal identity: the `organization` dimension is always `NOT_ESTABLISHED`. Decide which evidence your use case needs, for example with a [policy](/build/policies/).

## Why is the result `RESOLVED_WITH_WARNINGS`?

The document resolved, but something needs attention. The warnings are in `verdict.statements` and in the dimension states. Common causes: a domain binding that does not verify, a certificate close to expiry, or keys that are not in any verification relationship.

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

Public lookups can appear in the identifier's public observation history, not linked to who asked. Use private resolution in the console for identifiers that must not be disclosed. See [Privacy and data handling](/app/privacy/).
