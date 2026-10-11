---
title: Status lists
description: How DID.is checks Bitstring Status List entries for revocation and suspension, and when the result is INDETERMINATE.
---

When a credential has a `credentialStatus` entry, DID.is checks it as part of [credential verification](/build/credentials/).

```json
{
  "type": "BitstringStatusListEntry",
  "statusPurpose": "revocation",
  "statusListIndex": "131075",
  "statusListCredential": "https://issuer.example/status/revocation-2026.json"
}
```

Supported entry types: `BitstringStatusListEntry` ([Bitstring Status List v1.0](https://www.w3.org/TR/vc-bitstring-status-list/)) and the older `StatusList2021Entry`. A credential may have up to 8 entries.

## How an entry is checked

1. Fetch `statusListCredential` over HTTPS from a public address (at most 1 MiB).
2. Verify the status list credential's own proof.
3. Check that its issuer is the **same** as the credential's issuer, its `statusPurpose` matches the entry, and it is within its validity period.
4. Decode `encodedList` (multibase base64url, prefix `u`) and decompress it (at most 16 MiB).
5. Check the list has at least 131,072 entries (16 KiB), as the specification requires for privacy.
6. Read the bit at `statusListIndex`: `0` is clear, `1` means revoked or suspended, depending on the purpose.

Only single-bit entries (`statusSize` 1) are supported. Other sizes return `UNSUPPORTED`.

## Results

| Outcome | Credential status |
| --- | --- |
| Bit clear | Status check passes. |
| Bit set, purpose `revocation` | `REVOKED` |
| Bit set, purpose `suspension` | `SUSPENDED` |
| List unreachable, proof invalid, different issuer, mismatched purpose, expired list, index out of range, list too short | `INDETERMINATE` |

`INDETERMINATE` is never treated as valid. Status lists published by a different issuer are not accepted, because DID.is cannot establish that the other party is authorised to revoke.
