---
title: Monitoring and webhooks
description: Hourly identifier monitoring in the console, the events it sends and how webhook delivery works.
---

Monitoring is a console feature. It checks identifiers you choose every hour and sends a signed webhook when something changes.

## Set it up

1. In the [console](https://did.is/account), open a project.
2. Add the identifiers to watch (hourly).
3. Configure a webhook URL. The signing secret is shown once; store it server-side.

## Events

| `type` | Sent when |
| --- | --- |
| `document.changed` | The DID document hash changed. `data` includes the old and new hash, the diff and the domain binding before and after. |
| `domain_binding.changed` | The origin binding status changed. |
| `linked_accounts.changed` | The DID document is unchanged, but a linked website started or stopped linking back. `data.changes` lists each website with its status before and after. See [Link your websites](/build/linked-websites/). |
| `resolution.failed` | The identifier stopped resolving. |
| `resolution.recovered` | It resolves again. |

Every event has the same envelope:

```json
{
  "specVersion": "didis.customer-monitor.v1",
  "id": "cevent_…",
  "tenantId": "tenant_…",
  "projectId": "project_…",
  "watchId": "…",
  "type": "document.changed",
  "createdAt": 1791678083,
  "data": { }
}
```

## Delivery

- Receivers must be HTTPS on port 443 at a public address. Redirects are not followed.
- Failed deliveries are retried up to five attempts in total (after 1, 2, 4 and 8 minutes).
- Retries resend the identical event. Record the event ID before side effects and answer duplicates with 2xx.

Each request carries `X-DIDIS-Event-ID` and `X-DIDIS-Signature`. Verify the signature before you trust the body: see [Webhook signatures](/build/webhooks/).
