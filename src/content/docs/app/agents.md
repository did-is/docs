---
title: Agents and tools
description: Inspect MCP servers and A2A agent cards on did.is/agents, and understand fingerprints, drift and risk signals.
---

[did.is/agents](https://did.is/agents) inspects the servers and agents your AI systems talk to. It has three tabs: **MCP**, **A2A** and **Delegation** (see [Delegation receipts](/app/delegation/)).

## MCP servers

Enter an MCP endpoint URL (Streamable HTTP), for example `https://mcp.example.com/mcp`. DID.is:

1. Tries the current protocol (`2026-07-28`, `server/discover`) and falls back to the `2025-11-25` session handshake.
2. Lists all tools (paginated) and computes a SHA-256 fingerprint of each tool definition and input schema, using [JSON canonicalization](/reference/jcs/).
3. Classifies each tool's side effects by heuristic (`read_only`, `write`, `network_egress`, `system_execution`) and compares that with the server's own annotations.
4. Flags risk signals, such as hidden instructions in descriptions.
5. Compares the tool inventory with DID.is's previous observation of the same endpoint (**drift**).

Result fields you will see: status (`INSPECTED`, or `AUTH_REQUIRED` when the server answers 401; DID.is reports it and does not bypass it), negotiated version, server info, tools, inventory hash, drift and checks (`transport`, `identity`, `protocol`, `auth`, `inventory`, `drift`).

Limitations shown with every result:

- Side-effect classes are DID.is heuristics over names, descriptions and schemas; declared annotations are the server's own claims.
- `serverInfo` is self-reported; MCP has no server identity attestation.
- Drift is measured against DID.is's previous observation of the same endpoint.

## A2A agent cards

Enter an agent origin or card URL. DID.is fetches `/.well-known/agent-card.json` (falling back to the legacy `agent.json`), validates the A2A 1.0 shape (0.3 cards are recognised), checks interfaces and security schemes, and verifies `signatures[]` (JWS over the canonicalized card) with keys from a DID `kid` or an HTTPS `jku`.

Checks: `fetch`, `schema`, `version`, `interfaces`, `origin`, `provider`, `security`, `signature`.

A verified signature shows who signed the card. It does not show that the agent behaves as described.

From code: [Agent trust APIs](/build/agents/).
