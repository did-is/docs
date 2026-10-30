import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { publicDocsContract, compareOpenApi } from './public-contracts.mjs';
const root = path.resolve(import.meta.dirname, '../src/content/docs');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('public rates, scoped response statuses and team monitoring remain coherent', () => publicDocsContract(read));
for (const [label, file, before, after] of [
  ['old intensive rate', 'resources/faq.md', '10 requests per minute', '2 requests per minute'],
  ['server-wide rates', 'resources/faq.md', 'per-client limits, not a shared server-wide allowance', 'server-wide limits'],
  ['unshared intensive budget', 'resources/faq.md', 'Intensive requests also consume the standard budget', 'Intensive requests have an independent budget'],
  ['fixed retry delay', 'resources/faq.md', 'delay is not fixed', 'delay is fixed at one second'],
  ['FAQ free monitoring promise', 'resources/faq.md', 'require a Pro or Max team', 'are included on Free'],
  ['missing outbound status', 'reference/api.mdx', 'Responses: `200`, `400`, `403`, `424`, `429`, `503`.', 'Responses: `200`, `400`, `429`, `503`.'],
  ['outbound statuses on SSE', 'reference/api.mdx', 'Responses: `200`, `400`, `429`, `503`.', 'Responses: `200`, `400`, `403`, `424`, `429`, `503`.'],
  ['missing A2A 404', 'reference/api.mdx', 'Responses: `200`, `400`, `403`, `404`, `424`, `429`, `503`.', 'Responses: `200`, `400`, `403`, `424`, `429`, `503`.'],
  ['Pro capacity', 'app/monitoring.md', '| Pro | 5 |', '| Pro | 25 |'],
  ['Max capacity', 'app/monitoring.md', '| Max | 25 |', '| Max | 50 |'],
  ['free monitoring', 'app/monitoring.md', '| Free | 0 |', '| Free | 5 |'],
  ['per-project slots', 'app/monitoring.md', 'pooled **per team**, across all its projects', 'allocated per project'],
  ['webvh monitoring', 'app/monitoring.md', '`did:webvh` is not supported for monitoring', '`did:webvh` is supported for monitoring'],
  ['missing hourly interval', 'app/monitoring.md', '**hourly**', '**daily**'],
  ['enabled scheduled MCP', 'app/monitoring.md', '**not yet enabled**', '**enabled**'],
  ['missing sampled-observation limit', 'app/monitoring.md', 'reverted between checks may not be detected', 'reverted between checks is always detected'],
]) test(`public contract guard rejects ${label}`, () => {
  assert.ok(read(file).includes(before), 'mutation changes the current document');
  assert.throws(() => publicDocsContract(name => name === file ? read(name).replaceAll(before, after) : read(name)));
});

test('source comparison rejects status, budget and operation inventory drift', () => {
  const operations = publicDocsContract(read);
  const paths = Object.fromEntries([...operations].map(([key, op]) => {
    const [method, path] = key.split(' ');
    return [path, { [method.toLowerCase()]: { responses: Object.fromEntries([...op.responses, 'default'].map(s => [s, {}])), 'x-didis-budget': op.budget } }];
  }));
  compareOpenApi(operations, { paths });
  for (const change of [
    p => { p['/v1/history/{did}'].get.responses['424'] = {}; },
    p => { delete p['/v1/a2a/inspect'].get.responses['404']; },
    p => { p['/v1/resolve/{did}'].get['x-didis-budget'] = 'intensive'; },
    p => { delete p['/health']; },
  ]) {
    const mutated = structuredClone(paths); change(mutated);
    assert.throws(() => compareOpenApi(operations, { paths: mutated }));
  }
});
