---
title: Delegation Receipt v1
description: The DID.is Delegation Receipt v1 format for chains of authority from people and organizations to AI agents.
---

:::caution[Experimental]
Delegation Receipt v1 is a DID.is format. It is not a W3C or IETF standard and may change.
:::

A delegation receipt is a compact JWS in which one DID (the delegator) grants capabilities to another DID (the delegatee). Receipts form a chain, root first, for example person → organization → agent → sub-agent.

## Header

```json
{ "alg": "EdDSA", "typ": "didis-delegation+jwt", "kid": "did:web:bank.example#key-1" }
```

- `typ` must be `didis-delegation+jwt`.
- `alg` is `EdDSA`, `ES256` or `ES256K`.
- `kid` is a DID URL for a key in the issuer's `capabilityDelegation` relationship.

## Payload

```json
{
  "iss": "did:web:bank.example",
  "aud": "did:web:agent.example",
  "cap": ["payments.refund", "payments:read"],
  "nbf": 1791676800,
  "exp": 1791763200,
  "iat": 1791676800,
  "jti": "a unique id",
  "prf": "hex SHA-256 of the parent receipt"
}
```

| Claim | Required | Meaning |
| --- | --- | --- |
| `iss` | yes | The delegator DID. |
| `aud` | yes | The delegatee DID. |
| `cap` | yes | Capabilities granted, at most 64. |
| `nbf`, `exp` | yes | Validity window (Unix seconds). |
| `iat` | no | Issue time. |
| `jti` | yes | Unique receipt ID. |
| `prf` | for all but the root | Lowercase hex SHA-256 of the parent receipt's compact serialization. |

## Capabilities

- An exact tool name: `payments.refund` grants only `payments.refund`.
- A namespaced tool: `payments:read` grants only `payments:read`, not a bare `read`.
- A namespace wildcard: `payments:*` grants every tool named `payments:…`, and nothing outside that namespace.
- Everything: `*`.

Matching is case-insensitive. Malformed capabilities (empty segments, `*` inside a name, whitespace) grant nothing. A child may narrow `payments:*` to `payments:read` or `payments:card:*`, but not widen it to `*` or move it to another namespace.

## Chain rules

A chain is valid only if every rule holds:

1. **Structure:** each receipt is a well-formed JWS with the header and claims above.
2. **Signature:** each receipt is signed by a `capabilityDelegation` key of its `iss`.
3. **Linkage:** each receipt's `aud` is the next receipt's `iss`, the next receipt's `prf` is the hash of this one, and each child's validity window lies inside its parent's.
4. **Time:** every receipt is valid now (60 seconds clock skew allowed for `nbf`).
5. **Attenuation:** a child grants nothing its parent did not grant.
6. **No cycles:** no DID appears twice; no receipt delegates to its own issuer.
7. **Depth:** 1 to 8 receipts.
8. **Root:** if trusted roots are given, the first `iss` is one of them.

The leaf's `cap` is the chain's effective capabilities. A tool is authorised when one of them matches it.

## What a valid chain shows

A valid chain proves who delegated which capabilities to whom, and when. It does not prove that the agent acts within those capabilities.

Verify chains with [`/v1/agents/verify-delegation`](/build/agents/#verify-a-delegation-chain) and [`/v1/agents/authorize`](/build/agents/#authorise-a-tool-call), or in the web app under [Delegation receipts](/app/delegation/).
