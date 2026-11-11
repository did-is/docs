---
title: Delegation receipts
description: Verify who delegated which capabilities to an agent, and whether a chain authorises a specific tool.
---

You want an assistant to read project notes and prepare a handover—but not invent permission to do more. A delegation receipt records **who allowed which action, and until when**. If an agent passes work to a sub-agent, the signed trail must keep the same limits or narrow them.

That trail is evidence, not enforcement by itself. The receipt inspector checks the chain and a requested capability; it does not run an action. A valid signature alone does not establish the expected authority or permission to run.

:::caution[Experimental]
Delegation Receipt v1 is a DID.is format, not a ratified standard. The full format is in the [Delegation Receipt v1 reference](/reference/delegation-receipts/).
:::

## In the web app

Open [did.is/agents](https://did.is/agents) and choose the **Delegation** tab.

### Start with an understandable verification case

The [three-question walkthrough](/start/official-source-demo/) includes recorded delegation checks. Compare the same valid chain against a different application-selected root, or request an action outside the leaf grant. Its broader-child example uses a genuinely signed receipt: a signature can match while authority attenuation fails.

These are dated verification records, not current permission or a new approval workflow. The walkthrough does not execute tools. For a new diagnostic check, use the receipt inspector below.

### Inspect receipts directly

Use the receipt inspector in the **Delegation** tab:

1. Paste the receipts (JWS strings), root first, as a JSON array or one per line.
2. Enter the capability to authorise, for example `payments:refund`.
3. Enter trusted roots when checking against your application's expected authority. Without them, the result is advisory, not an execution trust decision.
4. Choose **Authorise tool** for an ALLOW or DENY answer, or **Verify chain only** to see each link.

**Generate signed demo chain** creates the original four-principal sample with fresh validity windows. This inspector checks a chain but does not execute tools.

## Use the same guard in an automated agent

A person or trusted application configuration sets the expected root, approved tool definitions and scope. The agent can then run its task without another human prompt for every step. A signature, root, capability, date or definition failure must stop the **wrapped** handler before it runs; an ALLOW answer on its own does not enforce anything.

Use the existing TypeScript or Python SDK at your tool-dispatch hook; see [Guard agent tools](/build/guard-tools/) for the setup and [Agent frameworks and MCP](/build/frameworks/) for the different connection and execution patterns. A tool name such as `documents_read` maps separately to a capability such as `documents:read`. The normal SDK flow registers a verified, short-lived chain and asks `verify-tool` about it. The receipt inspector can instead ask the stateless authorization endpoint about the submitted chain. Neither the inspector nor the recorded walkthrough executes a tool.

An agent calling the DID.is MCP server can request evidence. That connection alone does **not** prevent the agent from calling its other tools. To enforce a permission, wrap the actual handler, or perform the guard check in the one dispatch path before the tool call. Keep unguarded paths out of the agent's available functions.

Keep native OAuth, IAM, API credentials and runtime permissions. This is a pre-execution check on the path actually wrapped, not a sandbox, an argument/resource policy for every action, ongoing cancellation, atomic remote side effects or protection for bypass paths.

## What is checked

Each link is checked for:

| Check | Meaning |
| --- | --- |
| `structure` | Valid compact JWS with `typ: didis-delegation+jwt` and the required claims. |
| `signature` | Signed by a key in the delegator's `capabilityDelegation` relationship. |
| `linkage` | Each receipt's audience is the next receipt's issuer, `prf` is the SHA-256 of the parent receipt, and the validity window lies inside the parent's. |
| `time` | Compared with the verifier’s sampled current time, with up to 60 seconds of not-before skew. A diagnostic result is not an execution-time deadline check. |
| `attenuation` | A child never grants more than its parent. |
| `cycle` | No DID appears twice; no self-delegation. |
| `depth` | 1 to 8 receipts. |
| `root` | If you list trusted roots, the chain starts at one of them. |

A tool is authorised when the leaf capabilities grant it: exact match (case-insensitive), `*`, `ns:tool` or `ns:*`.

## What a valid chain means

A valid chain proves who delegated what to whom. It does not prove that the agent stays within that scope.
