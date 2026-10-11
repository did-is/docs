// Writes dist/sitemap.xml (copy of the sitemap index) and dist/llms.txt (page index).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const docs = path.join(root, 'src/content/docs');
const site = 'https://docs.did.is';

fs.copyFileSync(path.join(dist, 'sitemap-index.xml'), path.join(dist, 'sitemap.xml'));

const config = fs.readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
const sidebar = config.slice(config.indexOf('sidebar:'));
const groups = [...sidebar.matchAll(/label: '([^']+)',\s*items: \[([\s\S]*?)\]/g)];

function frontmatter(slug) {
  for (const ext of ['.md', '.mdx']) {
    const file = path.join(docs, slug + ext);
    if (!fs.existsSync(file)) continue;
    const fm = fs.readFileSync(file, 'utf8').split('\n---')[0];
    const get = (k) => (fm.match(new RegExp(`^${k}: (.*)$`, 'm'))?.[1] ?? '').replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
    return { title: get('title'), description: get('description') };
  }
  throw new Error(`missing page for sidebar slug ${slug}`);
}

const out = [
  '# DID.is Docs',
  '',
  '> Documentation for DID.is: resolve decentralized identifiers (did:key, did:jwk, did:web, did:webvh), read the evidence behind each result in seven dimensions, verify credentials and check AI agents. Public API base URL: https://did.is/api (anonymous, OpenAPI at https://did.is/api/openapi.json).',
  '',
];
for (const [, label, items] of groups) {
  out.push(`## ${label}`, '');
  for (const [, slug] of items.matchAll(/slug: '([^']+)'/g)) {
    const { title, description } = frontmatter(slug);
    out.push(`- [${title}](${site}/${slug}/): ${description}`);
  }
  out.push('');
}
fs.writeFileSync(path.join(dist, 'llms.txt'), out.join('\n'));
console.log('postbuild: wrote sitemap.xml and llms.txt');
// Cloudflare Pages _redirects: real 301s for the old URLs (applied before static assets).
const redirectBlock = config.slice(config.indexOf('const redirects = {'), config.indexOf('};', config.indexOf('const redirects = {')));
const rules = [];
for (const [, from, to] of redirectBlock.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
  rules.push(`${from} ${to} 301`, `${from}/ ${to} 301`);
}
fs.writeFileSync(path.join(dist, '_redirects'), rules.join('\n') + '\n');
console.log(`postbuild: wrote _redirects (${rules.length} rules)`);

