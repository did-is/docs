# DID.is documentation

Source for [docs.did.is](https://docs.did.is), the documentation of [DID.is](https://did.is): resolve decentralized identifiers, read the evidence behind each result, verify credentials and check AI agents.

Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build). Pushing to `main` deploys to Cloudflare Pages.

## Develop

```bash
npm ci
npm run dev       # local preview with hot reload
npm run build     # static site in dist/
npm run check     # build checks over dist/ (run after build)
```

## Structure

```text
src/content/docs/
  start/       Introduction, quickstart, core concepts
  app/         Using the web app and console
  build/       SDKs and the public API
  reference/   API reference, standards, methods, formats
  resources/   FAQ, security and support
src/components/  Custom Astro components
src/data/        Example data captured from the live API
scripts/         Documentation checks
```

## Contributing

Open an issue or pull request at [github.com/did-is/docs](https://github.com/did-is/docs). Every API path must exist in the [OpenAPI document](https://did.is/api/openapi.json), and every claim must match the live service. `npm run check` enforces the path list, internal links and wording rules.
