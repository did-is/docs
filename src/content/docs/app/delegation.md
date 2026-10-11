---
title: Delegation receipts
description: Verify who delegated which capabilities to an agent, and whether a chain authorises a specific tool.
---

A delegation receipt is a signed statement that one DID grants capabilities to another, for example a person to an organization, and the organization to an agent. A chain of receipts, root first, shows the full path of authority.

:::caution[Experimental]
Delegation Receipt v1 is a DID.is format, not a ratified standard. The full format is in the [Delegation Receipt v1 reference](/reference/delegation-receipts/).
:::

## In the web app

Open [did.is/agents](https://did.is/agents) and choose the **Delegation** tab.

1. Paste the receipts (JWS strings), root first, as a JSON array or one per line.
2. Enter the tool to authorise, for example `payments.refund`.
3. Choose **Authorise tool** for an ALLOW or DENY answer, or **Verify chain only** to see each link.

**Generate signed demo chain** creates a sample chain so you can see a valid result.

## What is checked

Each link is checked for:

| Check | Meaning |
| --- | --- |
| `structure` | Valid compact JWS with `typ: didis-delegation+jwt` and the required claims. |
| `signature` | Signed by a key in the delegator's `capabilityDelegation` relationship. |
| `linkage` | Each receipt's audience is the next receipt's issuer, `prf` is the SHA-256 of the parent receipt, and the validity window lies inside the parent's. |
| `time` | Each receipt is valid now (60 seconds clock skew allowed). |
| `attenuation` | A child never grants more than its parent. |
| `cycle` | No DID appears twice; no self-delegation. |
| `depth` | 1 to 8 receipts. |
| `root` | If you list trusted roots, the chain starts at one of them. |

A tool is authorised when the leaf capabilities grant it: exact match (case-insensitive), `*`, `ns:tool` or `ns:*`.

## What a valid chain means

A valid chain proves who delegated what to whom. It does not prove that the agent stays within that scope.
