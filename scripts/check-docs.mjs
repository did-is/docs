#!/usr/bin/env node
// Documentation gates. Run after `npm run build`.
//   1. internal-content denylist over dist/ (HTML, XML, TXT), src/ and README.md
//   2. every API path mentioned in src/ exists in the public OpenAPI document
//   3. every internal link and anchor in dist/ resolves
//   4. wording denylist (no hype)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const rel = (f) => path.relative(root, f);

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ is missing: run `npm run build` first.');
  process.exit(2);
}

function walk(dir, filter) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'pagefind', '.git'].includes(e.name)) continue;
      out.push(...walk(p, filter));
    } else if (filter(p)) out.push(p);
  }
  return out;
}

const srcFiles = walk(path.join(root, 'src'), (p) => /\.(md|mdx|astro|ts|mjs|css|json)$/.test(p));
const distText = walk(dist, (p) => /\.(html|xml|txt)$/.test(p));
const scanned = [...srcFiles, ...distText, path.join(root, 'README.md'), path.join(root, 'astro.config.mjs')];

const failures = [];
const fail = (gate, file, msg) => failures.push(`[${gate}] ${rel(file)}: ${msg}`);

/** Text without HTML tags, so attribute values do not cause false positives. */
const textOf = (file) => {
  const raw = fs.readFileSync(file, 'utf8');
  return file.endsWith('.html') ? raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ') : raw;
};

// ---- 1. internal-content denylist ----------------------------------------------------------
const leakTerms = [
  /127\.0\.0\.1/, /\blocalhost\b/i, /(?<![\d.])0\.0\.0\.0(?!\/\d)/, /\bdocker\b/i, /\bcrates\//, /\bcargo (?:build|run|test|install)\b/i,
  /apps\/web/, /\b[\w/-]+\.rs\b/, /\b[\w/-]+\.tsx\b/, /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\.md\b/,
  /\b(?:USER_GUIDE|STANDARDS_REFERENCE|DEVELOPER_GUIDE|API_CONTRACT)\b/, /\bDIDIS_[A-Z]/, /\bpilot\b/i,
  /operator runbook/i, /\bdaemon\b/i, /\/v1\/(?:session|control|monitoring|customer)\//,
  /adminToken|admin[_ ]token/i, /self-host/i, /next\.js/i, /\bsqlite\b/i, /VACUUM INTO/,
  /resolver-core/, /\bwritten in Rust\b|\bRust (?:server|backend|core|crate|workspace)\b/i, /verifyWebhookSignature/,
  /github\.com\/did-is\/did\//, /github\.com\/did-is\/blob\//,
];
// ---- 4. wording denylist ---------------------------------------------------------------------
const hypeTerms = [
  /world-class/i, /mathematical/i, /guarantee/i, /forensic/i, /mastery/i, /bulletproof/i,
  /zero-trust/i, /\bimpossible\b/i, /military-grade/i, /industry-leading/i, /\buniversal\b/i,
];

for (const file of scanned) {
  const text = textOf(file);
  for (const re of leakTerms) {
    const m = text.match(re);
    if (m) fail('leak', file, `"${m[0]}"`);
  }
  for (const re of hypeTerms) {
    const m = text.match(re);
    if (m) fail('wording', file, `"${m[0]}"`);
  }
}

// ---- 2. API paths ----------------------------------------------------------------------------
const templates = JSON.parse(fs.readFileSync(path.join(root, 'scripts/openapi-paths.json'), 'utf8'));
const full = templates.map((t) => new RegExp('^' + t.replace(/[.]/g, '\\.').replace(/\{[^}]+\}/g, '[^/?#\\s]+') + '$'));
const prefixes = new Set(templates.map((t) => t.split('/{')[0]));
let apiPaths = 0;
for (const file of [...srcFiles.filter((f) => /\.(md|mdx|astro|json)$/.test(f) && !f.endsWith('openapi-paths.json')), path.join(root, 'README.md')]) {
  const text = fs.readFileSync(file, 'utf8').replace(/&#123;/g, '{').replace(/&#125;/g, '}');
  for (const m of text.matchAll(/(?<![\w.])(\/(?:v1|1\.0)\/[A-Za-z0-9_\-/{}.:%~]*|\/health\b)/g)) {
    let p = m[1].replace(/[.:]+$/, '');
    apiPaths++;
    if (prefixes.has(p) || full.some((re) => re.test(p))) continue;
    fail('api-path', file, p);
  }
}

// ---- 3. internal links and anchors -----------------------------------------------------------
const htmlFiles = walk(dist, (p) => p.endsWith('.html'));
const idCache = new Map();
function ids(file) {
  if (!idCache.has(file)) {
    const html = fs.readFileSync(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}
function target(urlPath) {
  const clean = decodeURIComponent(urlPath).replace(/\/+$/, '');
  const candidates = [path.join(dist, clean, 'index.html'), path.join(dist, clean), path.join(dist, clean + '.html')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
}
let links = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const pageUrl = '/' + path.relative(dist, file).replace(/index\.html$/, '').replace(/\\/g, '/');
  for (const m of html.matchAll(/\shref="([^"]+)"/g)) {
    let href = m[1].replace(/&amp;/g, '&');
    if (/^(?:[a-z]+:|\/\/)/i.test(href)) {
      if (!href.startsWith('https://docs.did.is/')) continue;
      href = href.slice('https://docs.did.is'.length);
    }
    if (href.startsWith('/_astro/') || href.startsWith('/pagefind/')) continue;
    links++;
    const [pathPart, hash] = href.split('#');
    const resolved = pathPart === '' ? pageUrl : new URL(pathPart, 'https://x' + pageUrl).pathname;
    const t = target(resolved);
    if (!t) { fail('link', file, href); continue; }
    if (hash && t.endsWith('.html') && !ids(t).has(decodeURIComponent(hash))) fail('anchor', file, href);
  }
}

// ---- report ----------------------------------------------------------------------------------
console.log(`scanned ${scanned.length} files, ${apiPaths} API path mentions, ${links} internal links in ${htmlFiles.length} pages`);
if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\n${failures.length} problem(s).`);
  process.exit(1);
}
console.log('all documentation checks passed');

// Captured examples must not reintroduce stale successful proof text for negative states.
const copy = JSON.parse(fs.readFileSync(path.join(root, 'src/data/evidence-copy.json')));
const examples = JSON.parse(fs.readFileSync(path.join(root, 'src/data/resolve-examples.json')));
for (const example of examples) {
  const origin = example.dimensions.find(d => d.id === 'origin');
  const expected = Object.values(copy.origin).find(d => d.state === origin.state);
  if (expected && (origin.proves !== expected.proves || origin.doesNotProve !== expected.doesNotProve)) throw new Error('Origin example copy differs from core contract');
  if (/^did:(key|jwk):/.test(example.did) && /Ed25519/.test(example.verdict.headline) && example.verdict.headline !== copy.keyHeadline) throw new Error('Self-certifying headline differs from core contract');
}
const standardsSource = fs.readFileSync(path.join(root, 'src/content/docs/reference/standards.md'), 'utf8');
if (!standardsSource.includes('CR-did-1.1-20260305') || !standardsSource.includes('Candidate Recommendation Snapshot, 05 March 2026')) throw new Error('DID 1.1 lifecycle snapshot missing');
console.log('Evidence-copy and DID edition guards passed.');
