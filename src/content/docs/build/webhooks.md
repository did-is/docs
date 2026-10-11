---
title: Webhook signatures
description: Verify signed monitoring webhooks from DID.is with the SDK helpers, and handle retries safely.
---

Monitoring webhooks are configured in the [console](/app/monitoring/). Each delivery is signed with your webhook secret. Verify every request before you act on it.

## Headers

| Header | Value |
| --- | --- |
| `X-DIDIS-Event-ID` | The event ID, `cevent_…`. Same on every retry. |
| `X-DIDIS-Signature` | `t=<createdAt>,v1=<hex HMAC-SHA256>` |

The signed bytes are `<t>.<raw body>`: the timestamp, a period, then the exact request body. Verify against the raw body before parsing it; re-serialized JSON will not match.

## Verify with the SDK

The helpers check the HMAC-SHA256 signature, the timestamp (not in the future, not older than 30 days by default), `specVersion`, and that the event's `id`, `tenantId` and `projectId` match what you expect.

```ts
import { verifyCustomerMonitorSignature } from "@didis/client";

// Express example: use the raw body.
app.post("/didis/webhook", express.text({ type: "*/*" }), async (req, res) => {
  const ok = await verifyCustomerMonitorSignature(
    process.env.WEBHOOK_SECRET!,
    req.body, // raw string
    req.get("X-DIDIS-Signature") ?? "",
    {
      tenantId: process.env.TENANT_ID!,
      projectId: process.env.PROJECT_ID!,
      eventId: req.get("X-DIDIS-Event-ID") ?? "",
    },
  );
  if (!ok) return res.sendStatus(401);

  const event = JSON.parse(req.body);
  if (await alreadyProcessed(event.id)) return res.sendStatus(200);
  await recordAndHandle(event);
  res.sendStatus(200);
});
```

```python
from didis import verify_customer_monitor_signature

ok = verify_customer_monitor_signature(
    secret,
    raw_body,  # bytes
    headers["X-DIDIS-Signature"],
    tenant_id=tenant_id,
    project_id=project_id,
    event_id=headers["X-DIDIS-Event-ID"],
)
```

Your tenant and project IDs are shown in the console. Keep the secret server-side.

## Retries and duplicates

- A delivery fails if your endpoint does not answer 2xx. DID.is retries up to five attempts in total.
- Retries send the identical event with the same ID and signature timestamp.
- Record the event ID before side effects, and answer duplicates with 2xx.
- Receivers must use HTTPS on port 443 at a public address. Redirects are not followed.

A valid signature shows the event came from DID.is for your project. It says nothing more about the identifier than the event itself.

See [Monitoring and webhooks](/app/monitoring/) for the event types and payload.
