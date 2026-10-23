# DID.is Documentation

Official documentation source for [docs.did.is](https://docs.did.is), providing guides, architectural concepts, and reference materials for [DID.is](https://did.is) — the evidence-based resolver for decentralized identifiers (DIDs), verifiable credentials, and AI agents.

[**Read the Docs (docs.did.is)**](https://docs.did.is) &nbsp;|&nbsp; [**Web Application (did.is)**](https://did.is) &nbsp;|&nbsp; [**API Reference**](https://docs.did.is/reference/api/) &nbsp;|&nbsp; [**Quickstart Guide**](https://docs.did.is/start/quickstart/)

---

## What is DID.is?

**DID.is** is a public resolution engine and evidence platform for decentralized identity. It resolves decentralized identifiers (DIDs), verifies credentials, and inspects AI agents — reporting clear, verifiable evidence behind every result.

Traditional identity verification often relies on opaque, black-box scores or vague trust badges. In contrast, DID.is operates on a straightforward principle: **evidence over arbitrary scores**. Every resolution details what checks were performed, what those checks prove, and what they do not prove.

### Core Capabilities

- **Decentralized Identifier Resolution**: Resolve `did:key`, `did:jwk`, `did:web`, and `did:webvh` (1.0), returning standard W3C DID Resolution output alongside detailed evidence.
- **Verifiable Credential Verification**: Verify W3C VC Data Model 2.0 and 1.1 credentials using Data Integrity or JOSE proofs and Bitstring Status Lists.
- **AI Agent Trust & MCP Inspection**: Inspect Model Context Protocol (MCP) servers, audit tool schemas, detect schema drift, and validate A2A (Agent-to-Agent) agent cards and delegation chains.
- **Declarative Policy Evaluation**: Run declarative rules against observed evidence to determine pass, fail, or indeterminate states.
- **Public, Accessible API**: Free, anonymous access to public endpoints with native SDKs for TypeScript and Python.

---

## Background and Philosophy

### The Challenge of Decentralized Trust

The [W3C Decentralized Identifiers (DID Core 1.0)](https://www.w3.org/TR/did-core/) specification provides a powerful foundation for cryptographically verifiable, decentralized identities. However, using DIDs in real-world systems presents subtle challenges:

1. **Resolution Ambiguity**: Knowing that an identifier resolves does not explain who controls it, how update keys are managed, or whether the identifier is tied to a web domain.
2. **The Illusion of "Trust Scores"**: Many services assign a composite number to an identifier. An arbitrary score obscures what was actually verified, creating false confidence.
3. **Overstated Claims**: An identifier's valid cryptographic signature does not verify the real-world legal entity behind it.

### The DID.is Approach: Transparent Evidence

DID.is replaces subjective metrics with transparent verification:

- **No Arbitrary Scores**: Every result presents factual observations across defined dimensions.
- **Objective States**: Each check resolves to a concrete state (`ESTABLISHED`, `SELF_CERTIFYING`, `NOT_ESTABLISHED`, `FAILED`, `INDETERMINATE`, or `NOT_APPLICABLE`).
- **Explicit Limitations**: Every response clearly indicates the boundaries of what was checked, ensuring consumers do not infer unverified properties.

---

## Core Concepts

Every resolution from DID.is (via the web app or the API) delivers two layers of information: a concise **verdict** and **seven evidence dimensions**.

### The Verdict

The verdict offers an immediate plain-language summary:
- **Outcome**: `RESOLVED`, `RESOLVED_WITH_WARNINGS` (e.g., failed dimension or misconfigured key), or `DEACTIVATED`.
- **Headline**: A single sentence explaining control (e.g., *"Controlled by the operator of example.com; publishes Ed25519 verification keys."*).
- **Statements**: Concise factual observations regarding origin, keys, and history.

### The Seven Evidence Dimensions

DID.is evaluates evidence across seven dimensions:

| Dimension | Question It Answers | Supported Evidence |
| :--- | :--- | :--- |
| **`integrity`** | Is this document the exact document committed to by the identifier? | Cryptographic hashes, method specifications, document ID checks. |
| **`keys`** | Are published keys well-formed and assigned to valid verification relationships? | Key format validation, curve checks, verification relationship mapping. |
| **`control`** | Who has the authority to update or rotate this identifier? | Cryptographic update keys (`did:webvh`), self-certifying keys (`did:key`), or domain authority (`did:web`). |
| **`origin`** | Does the web domain explicitly link back to this DID? | DIF Well-Known DID Configuration domain linkage verification. |
| **`transport`** | Was the document retrieved over secure transport? | TLS certificate validation and public root verification for web-hosted DIDs. |
| **`history`** | Is there an auditable, verifiable record of updates and past versions? | Signed, hash-chained logs (`did:webvh`) or recorded observations. |
| **`organization`** | Who legally or organizationally operates this identifier? | Always `NOT_ESTABLISHED` (DID.is does not verify real-world legal identity). |

### Dimension States

- **`ESTABLISHED`**: The verification check ran and succeeded.
- **`SELF_CERTIFYING`**: True by cryptographic construction of the identifier (e.g., `did:key`, `did:jwk`).
- **`NOT_ESTABLISHED`**: No evidence establishes this property. This is a statement of absence, not a failure.
- **`FAILED`**: The check was performed and the evidence is invalid (e.g., mismatched document ID or bad signature).
- **`INDETERMINATE`**: The check could not be completed (e.g., network timeout or unreachable endpoint).
- **`NOT_APPLICABLE`**: The dimension does not apply to the specific method or status.

---

## What DID.is Does Not Claim

Clear boundaries are critical for secure identity systems. DID.is explicitly defines what its results do not imply:

- **Legal identity is never verified**: The `organization` dimension is always `NOT_ESTABLISHED`. A resolving DID does not identify who operates it.
- **Observations are not historical proofs**: For `did:web`, recorded observations are snapshots. Only `did:webvh` provides signed, hash-chained verifiable histories.
- **Valid signatures do not grant authority**: Cryptographic validity proves that a key signed a credential, not that the issuer is authoritative for the claims within it.
- **Agent descriptions are self-reported**: Agent capabilities and MCP server definitions are inspected and fingerprinted, not certified.

---

## Quick Example

Resolving an identifier requires no registration or API keys for public use:

```bash
# Resolve an identifier with full evidence dimensions
curl https://did.is/api/v1/resolve/did:web:did.is
```

```bash
# Standard W3C DID Resolution format
curl https://did.is/api/1.0/identifiers/did:web:did.is
```

TypeScript example using the official SDK:

```typescript
import { DidisClient } from "@didis/client";

const didis = new DidisClient();
const result = await didis.resolve("did:web:did.is");

console.log(result.verdict.headline);
for (const dimension of result.dimensions) {
  console.log(`${dimension.id}: ${dimension.state}`);
}
```

---

## About `docs.did.is`

The documentation site at [docs.did.is](https://docs.did.is) is the comprehensive reference for integrating with DID.is, understanding decentralized identity standards, and building trustworthy agent systems.

### Documentation Structure

- **[Get started](https://docs.did.is/start/introduction/)**: Introduction, 5-minute quickstart, and core concepts.
- **[Use the web app](https://docs.did.is/app/search/)**: Visual tools on did.is — searching identifiers, reading result dossiers, exploring the evidence graph, inspecting agent cards, and managing console projects.
- **[Build](https://docs.did.is/build/api-overview/)**: Implementation guides covering SDKs, resolution, live SSE streams, credential verification, policy evaluation, and webhooks.
- **[Reference](https://docs.did.is/reference/api/)**: Complete OpenAPI specifications, standards conformance matrix, supported DID methods, JSON canonicalization (JCS), and test vectors.
- **[Resources](https://docs.did.is/resources/faq/)**: Answers to common questions, security disclosures, and support resources.

---

## Local Development & Documentation Contribution

This repository hosts the static documentation site, built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

### Running Locally

```bash
npm ci
npm run dev       # Starts local development server
npm run build     # Generates production static build in dist/
npm run check     # Validates links, API paths, and wording rules
```

### Documentation Standards

Contributions must adhere to the following standards:
- **Live OpenAPI Conformance**: Every referenced API endpoint must exist in the published OpenAPI specification.
- **Strict Wording**: Documentation avoids hyperbolic language and clearly distinguishes verified evidence from unverified claims.
- **Link Integrity**: All internal links and anchor references are verified prior to deployment.

## Evidence example maintenance

Resolution observations remain dated captures, not fresh network checks. Their explanatory text is synchronized offline from the service's core-generated copy contract. Run the service's `scripts/docs/sync-evidence-copy.mjs` with this repository path after regenerating that contract. `npm run check` guards the captured origin proof text, self-certifying headline and DID 1.1 lifecycle label against regressions.
