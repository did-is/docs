---
title: Security and support
description: How to report a vulnerability, where to get help, and where the DID.is security model is described.
---

## Report a vulnerability

Email [ai@did.is](mailto:ai@did.is). Contact details are also published in [security.txt](https://did.is/.well-known/security.txt). Please include the affected URL or endpoint, steps to reproduce and the impact you observed. Do not run load tests or access other users' data.

## Security model

[did.is/security](https://did.is/security) describes how DID.is treats untrusted input, the threats it addresses, its controls and the risks that remain. In short:

- Everything fetched (documents, logs, status lists, agent cards, MCP servers) is treated as untrusted.
- When a check cannot be completed, the result is `INDETERMINATE` or `UNSUPPORTED`, never a pass.
- Each dimension is reported on its own; nothing is averaged into a score.
- No plan, payment or listing changes a verdict or a claim.
- Outbound requests follow the [egress rules](/reference/egress/).

No external penetration test or formal verification has been published yet.

## Get help

- Service status: [did.is/status](https://did.is/status) or `GET /v1/status`.
- Documentation issues: [github.com/did-is/docs/issues](https://github.com/did-is/docs/issues/new).
- SDK issues: [didis-js](https://github.com/did-is/didis-js/issues) and [didis-py](https://github.com/did-is/didis-py/issues).
- Everything else: [ai@did.is](mailto:ai@did.is).
