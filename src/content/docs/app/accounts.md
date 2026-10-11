---
title: Accounts, projects and plans
description: "What the DID.is console adds to the public API: projects, API keys, private resolution, team members, control claims and plans."
---

The public API and web app need no account. Create an account at [did.is/account](https://did.is/account) when you need any of the following.

## What the console adds

| Feature | What it does |
| --- | --- |
| **Projects** | Group keys, monitoring, webhooks and usage. Each project has its own plan. |
| **Project API keys** | Authenticate private API requests. A key is shown once, at creation; you can rotate it. Keep keys server-side and never ship them to browsers or mobile apps. |
| **Private resolution** | Metered resolution that is never written to public observation history. Use it for identifiers that must not be disclosed. |
| **Monitoring** | Hourly checks of identifiers you choose, with signed webhooks on changes. See [Monitoring and webhooks](/app/monitoring/). |
| **Team members** | Invite people to a project by email and assign roles. |
| **Control claims** | Prove you control a DID (key signature, `/.well-known/did-is-claim.txt` or a `_didis-claim` DNS TXT record), then optionally list it in the [public directory](https://did.is/discover). Claims are free and valid for 90 days. |

The private API is documented in the console. It is separate from the [public API](/build/api-overview/) described on this site.

## Plans

Plans are Free, Pro, Max and Enterprise. Allowances and prices are on [did.is/pricing](https://did.is/pricing). Payments are handled by Stripe; see the [refund policy](https://did.is/legal/refunds).

## Deleting an account

You can delete your account from the console. Deletion removes your sign-in immediately and closes your projects, keys, webhooks and listings. See [Privacy and data handling](/app/privacy/).
