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
- Integers beyond 2<sup>53</sup> − 1 round like in JavaScript: `9007199254740993` becomes `9007199254740992`. Put large exact integers in strings.

## Duplicate members are refused

Different parsers handle duplicate object members differently: some keep the first, some the last. An attacker can use that to make a signer and a verifier see different values.

DID.is parses signed input strictly and rejects any duplicate member anywhere in the tree, after decoding escapes. For example, `{"alg":"none","\u0061lg":"EdDSA"}` is rejected with "duplicate JSON object member".

## Data Integrity hashing

For the JCS cryptosuites, the signed data is:

```text
SHA-256(JCS(proof options without proofValue)) || SHA-256(JCS(document without proof))
```

The 64-byte result is verified against `proofValue` (multibase base58btc) with the key in `verificationMethod`.
