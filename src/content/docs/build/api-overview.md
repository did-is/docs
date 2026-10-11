---
title: API overview
description: Base URL, authentication, request budgets, identifier encoding and response conventions of the DID.is public API.
---

The public API is anonymous and free. It has 20 operations, described in a machine-readable [OpenAPI document](https://did.is/api/openapi.json) and on the [API reference](/reference/api/) page.

## Base URL

```text
https://did.is/api
```

No API key is needed. All requests use HTTPS.

```bash
curl https://did.is/api/v1/resolve/did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

## Request budgets

Each client has two budgets:

| Budget | Limit | Endpoints |
| --- | --- | --- |
| Standard | 20 requests per minute | Resolution, dereferencing, history, diff, graph, fast verify, claims, directory, `verify-tool`, status |
| Intensive | 2 requests per minute | `/v1/stream`, `/v1/credentials/verify`, `/v1/policies/evaluate`, `/v1/mcp/inspect`, `/v1/a2a/inspect`, `/v1/agents/verify-delegation`, `/v1/agents/authorize` |

Resolving a `did:webvh` identifier also uses the intensive budget. `/health` is not budgeted.

When a budget is used up, the API answers `429` with a `Retry-After` header. See [Errors and rate limits](/build/errors/).

If you need higher volume or identifiers that must stay private, use a project API key from the [console](/app/accounts/).

## Encoding identifiers

Put the DID in the path as is. Percent-encoding is also accepted; the API decodes the path exactly once.

- `#` must be encoded as `%23`, otherwise HTTP clients drop the fragment: `/v1/dereference/did:web:did.is%23key-1`.
- The SDKs encode identifiers for you.

## Responses

- Success responses are JSON (`application/json`), except the W3C endpoint (`application/did` or `application/did-resolution`) and the live stream (`text/event-stream`).
- Errors are RFC 9457 problem objects (`application/problem+json`) with a stable `code`.
- Responses carry `Cache-Control: no-store`.
- Request bodies are limited to 512 KiB.
- A request that takes longer than 45 seconds is ended with `408`.

## Public history

Public resolutions may appear in the identifier's public observation history. The history is not linked to who asked. For identifiers you must not disclose, use private resolution in the [console](/app/accounts/).

## Service status

- `GET /health` reports the supported methods and standards.
- `GET /v1/status` reports the status of each component. The same information is on [did.is/status](https://did.is/status).
