---
title: Privacy and data handling
description: What DID.is stores when you use the public API, the web app and the console.
---

This page summarises how DID.is handles data. The [privacy policy](https://did.is/legal/privacy) is authoritative.

## Public resolution

When anyone resolves a public identifier, the public documents fetched and the checks performed are stored as evidence history. This history is public data published by the identifier's controller and is **not linked to who asked**. Because public lookups can appear in an identifier's history, use [private resolution](/app/accounts/) for identifiers that must not be disclosed.

## Usage statistics

DID.is keeps per-project operation counts for plan allowances and aggregate service statistics (totals per endpoint and status). These aggregates do not contain IP addresses, identifiers you looked up, API keys, request bodies or user agents.

To stop abuse, rate-limit counters are kept in memory per client. Sign-in and email endpoints keep short-lived counters keyed by IP address, deleted within a day.

## Accounts

For an account, DID.is stores your name, email, a password hash (never the password), email verification state and creation date. Sign-in sessions expire one hour after last activity. Card details are held by Stripe, not DID.is.

## Credentials and agents you submit

Credentials, JWS values and delegation chains you send to the public API are processed to produce the result. Chains are stored only when you explicitly register them (`register: true`) for [`verify-tool`](/build/agents/#check-a-registered-agent). MCP inspections store the tool inventory fingerprint so later inspections can report drift.

## Outbound requests

DID.is fetches documents, configurations, status lists and agent cards only from public HTTPS addresses. See [Egress protection](/reference/egress/).

## Deletion

Deleting your account removes your sign-in immediately and closes your projects, keys, webhooks and listings. Encrypted backups rotate out within 90 days. Questions: [ai@did.is](mailto:ai@did.is).
