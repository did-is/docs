// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const site = 'https://docs.did.is';

/** Old URLs that keep working after the 2026-10 restructure. */
const redirects = {
  '/overview/introduction': '/start/introduction/',
  '/overview/quickstart': '/start/quickstart/',
  '/overview/evidence-dimensions': '/start/concepts/',
  '/user-guide': '/app/search/',
  '/user-guide/command-bar': '/app/search/',
  '/user-guide/reading-the-dossier': '/app/reading-a-result/',
  '/user-guide/evidence-graph': '/app/evidence-graph/',
  '/user-guide/credential-studio': '/app/credentials/',
  '/user-guide/agent-trust': '/app/agents/',
  '/user-guide/delegation-receipts': '/app/delegation/',
  '/user-guide/governance': '/app/accounts/',
  '/user-guide/privacy-security': '/app/privacy/',
  '/developer-guide': '/build/api-overview/',
  '/developer-guide/sdks': '/build/sdks/',
  '/developer-guide/environments': '/build/api-overview/',
  '/developer-guide/resolution': '/build/resolution/',
  '/developer-guide/telemetry': '/build/stream/',
  '/developer-guide/agent-middleware': '/build/agents/',
  '/developer-guide/policy-engine': '/build/policies/',
  '/developer-guide/monitoring-webhooks': '/build/webhooks/',
  '/developer-guide/cli': '/build/sdks/',
  '/developer-guide/error-handling': '/build/errors/',
  '/standards': '/reference/standards/',
  '/standards/registry': '/reference/standards/',
  '/standards/conformance-matrix': '/reference/standards/',
  '/standards/did-methods': '/reference/did-methods/',
  '/standards/canonicalization': '/reference/jcs/',
  '/standards/status-lists': '/reference/status-lists/',
  '/standards/agent-protocols': '/build/agents/',
  '/standards/delegation-spec': '/reference/delegation-receipts/',
  '/standards/anti-ssrf': '/reference/egress/',
  '/standards/test-vectors': '/reference/test-vectors/',
  '/api/contract': '/reference/api/',
  '/resources/api-contract': '/reference/api/',
};

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  redirects,
  integrations: [
    starlight({
      title: 'DID.is Docs',
      description:
        'Documentation for DID.is: resolve decentralized identifiers, read the evidence behind each result, verify credentials and check AI agents.',
      logo: {
        dark: './src/assets/logo-dark.svg',
        light: './src/assets/logo-light.svg',
        replacesTitle: false,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/did-is/docs' },
        { icon: 'external', label: 'did.is', href: 'https://did.is' },
      ],
      editLink: { baseUrl: 'https://github.com/did-is/docs/edit/main/' },
      lastUpdated: false,
      favicon: '/favicon.ico',
      customCss: [
        '@fontsource/geist-sans/400.css',
        '@fontsource/geist-sans/500.css',
        '@fontsource/geist-sans/600.css',
        '@fontsource/geist-mono/400.css',
        '@fontsource/geist-mono/500.css',
        './src/styles/custom.css',
      ],
      components: {
        TableOfContents: './src/components/TableOfContents.astro',
      },
      head: [
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.png', type: 'image/png' } },
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        { tag: 'link', attrs: { rel: 'manifest', href: '/site.webmanifest' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#1f3a5f' } },
        { tag: 'meta', attrs: { property: 'og:image', content: `${site}/og.png` } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'DID.is Docs' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: `${site}/og.png` } },
      ],
      defaultLocale: 'root',
      locales: { root: { label: 'English', lang: 'en' } },
      sidebar: [
        {
          label: 'Get started',
          items: [
            { label: 'Introduction', slug: 'start/introduction' },
            { label: 'Quickstart', slug: 'start/quickstart' },
            { label: 'Use cases', slug: 'start/use-cases' },
            { label: 'Core concepts', slug: 'start/concepts' },
          ],
        },
        {
          label: 'Use the web app',
          items: [
            { label: 'Search and explore', slug: 'app/search' },
            { label: 'Reading a result', slug: 'app/reading-a-result' },
            { label: 'Evidence graph', slug: 'app/evidence-graph' },
            { label: 'Verify credentials', slug: 'app/credentials' },
            { label: 'Agents and tools', slug: 'app/agents' },
            { label: 'Delegation receipts', slug: 'app/delegation' },
            { label: 'Accounts, projects and plans', slug: 'app/accounts' },
            { label: 'Monitoring and webhooks', slug: 'app/monitoring' },
            { label: 'Privacy and data handling', slug: 'app/privacy' },
          ],
        },
        {
          label: 'Build',
          items: [
            { label: 'SDKs', slug: 'build/sdks' },
            { label: 'API overview', slug: 'build/api-overview' },
            { label: 'Resolution and dereferencing', slug: 'build/resolution' },
            { label: 'Live stream (SSE)', slug: 'build/stream' },
            { label: 'Credentials', slug: 'build/credentials' },
            { label: 'EU wallet credentials', slug: 'build/eu-credentials' },
            { label: 'Policies', slug: 'build/policies' },
            { label: 'Agent trust APIs', slug: 'build/agents' },
            { label: 'Errors and rate limits', slug: 'build/errors' },
            { label: 'Webhook signatures', slug: 'build/webhooks' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API reference', slug: 'reference/api' },
            { label: 'Standards and conformance', slug: 'reference/standards' },
            { label: 'DID methods', slug: 'reference/did-methods' },
            { label: 'JSON canonicalization', slug: 'reference/jcs' },
            { label: 'Status lists', slug: 'reference/status-lists' },
            { label: 'Egress protection', slug: 'reference/egress' },
            { label: 'Test vectors', slug: 'reference/test-vectors' },
            { label: 'Delegation Receipt v1', slug: 'reference/delegation-receipts' },
          ],
        },
        {
          label: 'Resources',
          items: [
            { label: 'FAQ', slug: 'resources/faq' },
            { label: 'Security and support', slug: 'resources/security' },
          ],
        },
      ],
    }),
  ],
});
