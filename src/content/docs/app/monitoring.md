---
title: Monitoring and webhooks
description: Hourly identifier monitoring in the console, the events it sends and how webhook delivery works.
---

Identifier monitoring is a paid console feature on **Pro and Max**. It checks watched identifiers **hourly** and sends a signed webhook when a change is observed.

| Team plan | Active identifier watches |
| --- | --- |
| Free | 0 |
| Pro | 5 |
| Max | 25 |

Slots are pooled **per team**, across all its projects; creating another project does not add slots. See [plans and prices](https://did.is/pricing).

Supported monitoring methods are **`did:key`, `did:jwk` and `did:web` only**. `did:webvh` is not supported for monitoring, even though the public resolver supports it. Add a DID, not a DID URL with a path, query or fragment.

Hourly checks are observations, not real-time detection. A change that happens and is reverted between checks may not be detected. Monitoring does not establish legal identity or certify an operator’s behaviour.

## Identifier monitoring is not scheduled MCP inspection

The limits above cover identifier watches, not MCP servers. [MCP inspection](/app/agents/) is an on-demand check; running it once does not enable continuous monitoring. Scheduled MCP tool-change alerts are a separate feature and are **not yet enabled**. Do not rely on them for background checks or notifications.

## Set it up

1. In the [console](https://did.is/account), choose a team on Pro or Max and open a project.
2. Add supported identifiers to watch within the team’s shared slots (5 on Pro, 25 on Max; hourly).
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
