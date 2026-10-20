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

## Usage and alerts

All projects of a team share one monthly allowance, split into a standard pool and an expensive pool. The console shows, under each project:

- **This month's usage** for the team, per pool.
- **By operation:** how many requests of each kind were charged, not charged, or are still in progress.
- **Recent requests:** up to 20 of this project's latest requests this month, with request ID, operation, state and time (UTC). The request ID is the same value as the `X-Didis-Request-Id` response header; quote it when you contact support.

The console never shows request inputs, API keys or IP addresses.

**Alert emails.** On every plan, including Free, the team's owners receive an email when a pool reaches 80% of its monthly allowance and again at 100%. Each alert is sent once per pool per month, and only to owners with a verified email address. If both thresholds are crossed before the email goes out, you get only the 100% email. The link in the email opens the usage of that team in the console.

At 100%, keyed requests in that pool are refused with `429 QUOTA_EXHAUSTED` until the next month or until you change plan. The public API without a key keeps working within its own budget.

## Deleting an account

You can delete your account from the console. Deletion removes your sign-in immediately and closes your projects, keys, webhooks and listings. See [Privacy and data handling](/app/privacy/).
