---
title: Egress protection
description: Which outbound requests DID.is makes on your behalf, and the limits that stop them reaching internal networks.
---

To resolve `did:web` and `did:webvh`, check domain linkage, read status lists and inspect MCP servers or agent cards, DID.is fetches URLs derived from your input. Every fetch follows these rules.

## Rules

- **HTTPS only.** URLs with credentials (`user:pass@`) are refused.
- **Public addresses only.** Every DNS answer must be public. If any answer is in a blocked range, the request fails with `403 EGRESS_BLOCKED`.
- **Pinned connections.** The connection is made to the address that was checked. There is no second DNS lookup, so DNS rebinding cannot redirect it.
- **IP literals and loopback hostnames** are refused in identifiers.
- **Redirects:** at most 2, each checked again; never from HTTPS to HTTP.
- **Timeout:** 4 seconds per upstream request.
- **Size limits:** 1 MiB for documents and most resources; 4 MiB for `did:webvh` logs; 2 MiB for MCP responses; 512 KiB for agent cards.
- **TLS:** the certificate chain, validity and host name are checked.

## Blocked ranges

IPv4:

```text
0.0.0.0/8        10.0.0.0/8       100.64.0.0/10    127.0.0.0/8
169.254.0.0/16   172.16.0.0/12    192.0.0.0/24     192.0.2.0/24
192.88.99.0/24   192.168.0.0/16   198.18.0.0/15    198.51.100.0/24
203.0.113.0/24   224.0.0.0/4      240.0.0.0/4      255.255.255.255/32
```

IPv6:

```text
::/128           ::1/128          ::ffff:0:0/96    64:ff9b::/96
64:ff9b:1::/48   100::/64         2001::/32        2001:db8::/32
2002::/16        fc00::/7         fe80::/10        fec0::/10
ff00::/8
```

These cover loopback addresses, private networks, link-local and cloud metadata addresses, multicast, documentation ranges and IPv6 translation prefixes that could reach them.

## Example

`localtest.me` is a public name that resolves to a loopback address:

```bash
curl https://did.is/api/v1/resolve/did:web:localtest.me
```

```json
{
  "type": "https://did.is/problems#EGRESS_BLOCKED",
  "title": "Egress blocked",
  "status": 403,
  "code": "EGRESS_BLOCKED",
  "detail": "destination ::1 is inside the non-public range ::1/128"
}
```

(Abridged: the response also includes the `trace`.)
