---
title: Search and explore
description: Use the input on did.is to resolve identifiers, verify credentials and inspect agents, and browse the public directory.
---

The input on the [did.is](https://did.is) home page accepts more than DIDs. It recognises what you paste and sends you to the right tool.

## What you can paste

| Input | Example | Opens |
| --- | --- | --- |
| DID | `did:web:did.is` | The result page for that identifier |
| DID URL | `did:web:did.is#key-1` | The result page with the selected resource |
| Domain | `did.is` | The result page for `did:web:did.is` |
| Credential (JSON-LD or JWT) | `{"@context": [...], "type": ["VerifiableCredential"], ...}` | [Verify credentials](/app/credentials/) |
| Compact JWS | `eyJhbGciOi...` | JWS verification against the DID in its `kid` |
| Delegation receipt or chain | a receipt JWS, or a JSON array of receipts | [Delegation receipts](/app/delegation/) |
| MCP endpoint URL | `https://mcp.example.com/mcp` | [Agents and tools](/app/agents/), MCP tab |
| Agent origin or card URL | `https://agent.example.com` | [Agents and tools](/app/agents/), A2A tab |

If the input is malformed, the hint under the input explains why, for example "Method names are lowercase letters and digits: did:&lt;method&gt;:&lt;id&gt;".

You can also open a result directly by URL: `https://did.is/did:web:did.is`.

## Supported methods

`did:key`, `did:jwk`, `did:web` and `did:webvh` (1.0). Other methods are reported as not supported.

## Discover

[did.is/discover](https://did.is/discover) lists identifiers whose controller proved control and chose to be listed. A listing:

- is free and cannot be bought;
- requires a current **control claim**: a signature with a key in the DID, a line served at `/.well-known/did-is-claim.txt`, or a `_didis-claim` DNS TXT record;
- is valid for 90 days per claim;
- is **not** legal identity.

You can search by name or DID and filter by method. The same data is available from [`GET /v1/directory`](/reference/api/#directory-and-claims). Claims are created in the [console](/app/accounts/).
