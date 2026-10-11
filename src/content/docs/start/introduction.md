---
title: Introduction
description: What DID.is does, what a result tells you, and what it does not claim.
---

DID.is resolves [decentralized identifiers](https://www.w3.org/TR/did-core/) (DIDs) and reports the evidence behind each result. Instead of a trust score, every result lists what was checked, what that check proves and what it does not prove.

You can use it in two ways:

- **Web app** at [did.is](https://did.is): paste an identifier, a credential or an agent URL and read the result.
- **Public API** at `https://did.is/api`: anonymous, free and rate-limited, with SDKs for [TypeScript and Python](/build/sdks/).

## What DID.is does

| Task | Web app | API |
| --- | --- | --- |
| Resolve a DID and explain the result | [did.is](https://did.is) | [`GET /v1/resolve/{did}`](/build/resolution/) |
| Standard W3C DID Resolution output | — | [`GET /1.0/identifiers/{did}`](/build/resolution/#w3c-did-resolution) |
| Watch a resolution step by step | Result page, telemetry level | [`GET /v1/stream/{did}`](/build/stream/) |
| Verify a verifiable credential | [did.is/verify](https://did.is/verify) | [`POST /v1/credentials/verify`](/build/credentials/) |
| Evaluate a policy | [did.is/policies](https://did.is/policies) | [`POST /v1/policies/evaluate`](/build/policies/) |
| Inspect an MCP server or A2A agent card | [did.is/agents](https://did.is/agents) | [`/v1/mcp/inspect`, `/v1/a2a/inspect`](/build/agents/) |
| Verify a delegation chain for an agent | [did.is/agents](https://did.is/agents) | [`/v1/agents/verify-delegation`](/build/agents/#verify-a-delegation-chain) |
| Find identifiers that opted in to be listed | [did.is/discover](https://did.is/discover) | [`GET /v1/directory`](/reference/api/#directory-and-claims) |

Supported DID methods: `did:key`, `did:jwk`, `did:web` and `did:webvh` (1.0). Other methods return `501 METHOD_NOT_SUPPORTED`.

## What a result tells you

Each resolution returns a **verdict** (one headline plus short statements) and seven **evidence dimensions**: document integrity, key material, update authority, origin binding, transport security, verifiable history and real-world identity. Each dimension has a state such as `ESTABLISHED` or `NOT_ESTABLISHED` and states in plain words what it proves and what it does not. See [Core concepts](/start/concepts/).

## What DID.is does not claim

- **It does not verify legal identity.** The `organization` dimension is always `NOT_ESTABLISHED`. A DID that resolves correctly says nothing about who runs it.
- **It does not score.** There is no aggregate number. Policies are explicit rules you write; a rule that cannot be evaluated is `INDETERMINATE`, never `PASS`.
- **Observations are not history proofs.** For `did:web`, DID.is records what it saw. Only `did:webvh` carries a signed, hash-chained history.
- **A valid credential signature does not make the issuer authoritative** for the claims in it.
- **An agent's self-description is self-reported.** MCP server info and A2A cards are inspected and fingerprinted, not certified.

## Public and private use

Public API requests may appear in an identifier's public observation history. If you resolve identifiers that must not be disclosed, use a project in the [console](/app/accounts/), which adds private resolution, API keys, monitoring and signed webhooks.

## Next steps

- [Quickstart](/start/quickstart/): first request in under five minutes.
- [Reading a result](/app/reading-a-result/): a guided tour of the web app result page.
- [API overview](/build/api-overview/): base URL, budgets and encoding.
