---
title: Errors and rate limits
description: RFC 9457 problem responses, stable error codes, HTTP status mapping, rate limits and Retry-After.
---

## Problem responses

Every error is an RFC 9457 problem object with `Content-Type: application/problem+json` and a stable `code`. Use `code` in your logic, not `title` or `detail`.

```bash
curl https://did.is/api/v1/resolve/did:example:123
```

```json
{
  "type": "https://www.w3.org/ns/did#METHOD_NOT_SUPPORTED",
  "title": "DID method not supported",
  "status": 501,
  "detail": "did:example is not supported (supported: did:key, did:jwk, did:web, did:webvh)",
  "code": "METHOD_NOT_SUPPORTED",
  "trace": [
    { "stage": "syntax.parse", "label": "DID syntax (DID Core §3.1)", "status": "FAIL", "detail": "did:example is not supported" }
  ]
}
```

Resolution errors include the `trace` up to the failing stage. Error types defined by the W3C DID specifications use `https://www.w3.org/ns/did#<CODE>`; DID.is-specific types use `https://did.is/problems#<CODE>`.

## Codes

| `code` | Status | Meaning | What to do |
| --- | --- | --- | --- |
| `INVALID_DID` | 400 | The identifier is not valid DID syntax. | Check the format `did:<method>:<id>`. |
| `INVALID_DID_URL` | 400 | The DID URL is malformed. | Encode `#` as `%23`. |
| `INVALID_OPTIONS` | 400 | A query option is invalid. | Check the parameters. |
| `INVALID_REQUEST` | 400 | The request body or parameters are invalid. | Check the body against the [API reference](/reference/api/). |
| `EGRESS_BLOCKED` | 403 | The target resolves to a non-public address. | The host must resolve only to public addresses. See [Egress protection](/reference/egress/). |
| `NOT_FOUND` | 404 | The DID document or resource does not exist. | For `did:web`, check that `/.well-known/did.json` is published over HTTPS. |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method for this path. | Check GET vs POST. |
| `REPRESENTATION_NOT_SUPPORTED` | 406 | The `Accept` type is not available. | Use `application/did` or `application/did-resolution`. |
| `PAYLOAD_TOO_LARGE` | 413 | The request body is over 512 KiB, or a fetched resource is over its size limit. | Send a smaller body. |
| `INVALID_DID_DOCUMENT` | 422 | A fetched document is invalid (for example its `id` does not match the DID, or it is not JSON). | Fix the published document. |
| `RATE_LIMITED` | 429 | A request budget is used up. | Wait for `Retry-After` seconds. |
| `INTERNAL_ERROR` | 500 | Unexpected error. | Retry later; report it if it persists. |
| `METHOD_NOT_SUPPORTED` | 501 | The DID method is not supported. | Use `did:key`, `did:jwk`, `did:web` or `did:webvh`. |
| `FEATURE_NOT_SUPPORTED` | 501 | The feature is not implemented (for example DID URL paths). | — |
| `UPSTREAM_UNAVAILABLE` | 502 | The remote host did not answer in time or failed. | Check the remote host; retry later. |
| `CAPACITY_EXHAUSTED` | 503 | DID.is is at its work capacity. | Retry after `Retry-After` with backoff. |

A request that runs longer than 45 seconds is ended with `408`.

### W3C endpoint

`/1.0/identifiers/{did}` follows the DID Resolution specification instead: 400 for invalid DIDs, DID URLs and options, 404 not found, 406 representation not supported, 410 for a deactivated DID, 501 method or feature not supported, and 500 for every other error. The problem object is in `didResolutionMetadata.error`.

## Rate limits

Each client has a standard budget (20 requests per minute) and an intensive budget (2 requests per minute). The [API overview](/build/api-overview/#request-budgets) lists which endpoints use which.

Budgets refill continuously. When one is empty, the API answers:

```http
HTTP/2 429
Content-Type: application/problem+json
Retry-After: 27
```

`Retry-After` is the number of whole seconds until your next request in that budget is allowed (at least 1). It changes with each response, so read it every time; do not hard-code a delay.

`503 CAPACITY_EXHAUSTED` means the service as a whole is busy, not that you exceeded your budget. It also carries `Retry-After`. Retry with exponential backoff and jitter.

## Handling errors in the SDKs

Both SDKs raise `DidisError` for non-2xx responses. The problem body is in `problem`, and the `Retry-After` value in `problem.retryAfter` (TypeScript) or `problem["retryAfter"]` (Python).

```ts
import { DidisClient, DidisError } from "@didis/client";

const didis = new DidisClient();

async function resolveWithRetry(did: string, attempts = 3) {
  for (let i = 0; ; i++) {
    try {
      return await didis.resolve(did);
    } catch (e) {
      const retryable = e instanceof DidisError && (e.status === 429 || e.status === 503);
      if (!retryable || i + 1 >= attempts) throw e;
      const seconds = Number(e.problem.retryAfter ?? 1);
      await new Promise((r) => setTimeout(r, seconds * 1000 + Math.random() * 500));
    }
  }
}
```

```python
import random, time
from didis import DidisClient, DidisError

def resolve_with_retry(didis: DidisClient, did: str, attempts: int = 3):
    for i in range(attempts):
        try:
            return didis.resolve(did)
        except DidisError as e:
            if e.status not in (429, 503) or i + 1 >= attempts:
                raise
            time.sleep(float(e.problem.get("retryAfter", 1)) + random.random() / 2)
```

Do not retry 4xx errors other than 429: the same request will fail again.
