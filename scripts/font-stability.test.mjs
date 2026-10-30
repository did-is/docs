import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
test('all five self-hosted font faces keep the initial rendered font', () => {
  const css = fs.readFileSync(new URL('src/styles/fonts.css', root), 'utf8');
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(m => m[1]);
  assert.equal(faces.length, 5);
  const assets = [];
  for (const face of faces) {
    assert.match(face, /font-display:\s*optional;/);
    const asset = face.match(/url\('(@fontsource\/[^']+\.woff2)'\)/)?.[1];
    assert.ok(asset);
    assert.ok(fs.existsSync(new URL(`node_modules/${asset}`, root)));
    assets.push(asset);
  }
  assert.equal(new Set(assets).size, 5);
  const config = fs.readFileSync(new URL('astro.config.mjs', root), 'utf8');
  assert.match(config, /'\.\/src\/styles\/fonts\.css'/);
  assert.doesNotMatch(config, /'@fontsource\/[^']+\.css'/);
  assert.match(config, /Head: '\.\/src\/components\/Head\.astro'/);
  const head = fs.readFileSync(new URL('src/components/Head.astro', root), 'utf8');
  assert.equal([...head.matchAll(/\.woff2\?url/g)].length, 5);
  assert.match(head, /rel="preload"[^>]+as="font"[^>]+crossorigin="anonymous"/);
  assert.match(head, /<DefaultHead/);
});

test('reference describes typed JSON scope without merging W3C or SSE envelopes', () => {
  const text = fs.readFileSync(new URL('src/content/docs/reference/api.mdx', root), 'utf8');
  assert.match(text, /18 JSON success operations/);
  assert.match(text, /omitted optional field is different from a required field whose value can be `null`/);
  assert.match(text, /W3C DID-document\/resolution-result representations and the SSE event stream retain their separate content types/);
});
