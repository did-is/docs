---
title: JSON canonicalization
description: How DID.is canonicalizes JSON (RFC 8785) for signatures and fingerprints, and why duplicate members are refused.
---

Signatures and fingerprints need the same bytes every time. DID.is uses the JSON Canonicalization Scheme, [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785), for:

- Data Integrity proofs (`eddsa-jcs-2022`, `ecdsa-jcs-2019`);
- `did:webvh` SCIDs and entry hashes;
- A2A agent card signatures;
- MCP tool fingerprints (`definitionSha256`, `schemaSha256`).

The profile is reported as `rfc8785-binary64-v1`.

## Rules

- Object members are sorted by their UTF-16 code units.
- No whitespace is emitted outside strings.
- Strings use the minimal escaping of RFC 8785 (`\b \t \n \f \r`, lowercase `\u00xx` for other control characters; `/` and non-ASCII are not escaped).
- Numbers are IEEE-754 binary64 values serialized as ECMAScript does: `-0` becomes `0`, exponents are used from `1e21` and below `1e-6`.
- Integers that are not exactly representable round like in JavaScript: `9007199254740993` becomes `9007199254740992`. Some larger integers, including `9007199254740992` and `9007199254740994`, are exactly representable. Put identifiers and large exact integers in strings.

## Exact meaning at signature boundaries

RFC 8785 remains unchanged. The verifier's application profile separately refuses exact integer values that lose precision when transformed to binary64, throughout a supported JCS Data Integrity document and its proof options. A refused credential is `MALFORMED`, not signature-valid, and cannot satisfy required claims. This includes nested arrays, extension properties and contexts; it is not limited to the credential subject. Supported fetched Data Integrity status lists use the same boundary.

This rule distinguishes an exact integer token from a parsed binary64 number. Decimal-point and exponent forms already have binary64 meaning; they are not represented as preserving an arbitrary-precision lexical integer. Large exact identifiers should therefore be strings, not an exponent spelling intended to recover precision. Caller-supplied exact claim requirements are not rounded: a distinct requirement remains unsatisfied. JWT and SD-JWT payload signatures authenticate raw bytes and are not subjected to this JCS integer restriction.

These are local candidate changes pending a separately approved deployment, not a claim that the currently deployed verifier has already changed.

## Duplicate members are refused

Different parsers handle duplicate object members differently: some keep the first, some the last. An attacker can use that to make a signer and a verifier see different values.

DID.is parses signed input strictly and rejects any duplicate member anywhere in the tree, after decoding escapes. For example, `{"alg":"none","\u0061lg":"EdDSA"}` is rejected with "duplicate JSON object member".

## Data Integrity hashing

For the JCS cryptosuites, the signed data is:

```text
SHA-256(JCS(proof options without proofValue)) || SHA-256(JCS(document without proof))
```

The 64-byte result is verified against `proofValue` (multibase base58btc) with the key in `verificationMethod`.
