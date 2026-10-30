#!/usr/bin/env node
// Explicit, offline, read-only comparison with a trusted service checkout. Node >=24; no new dependencies.
// Usage: npm run check:source -- <service-checkout>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { publicDocsContract, compareOpenApi } from './public-contracts.mjs';

const service = process.argv[2];
assert.ok(service, 'Usage: npm run check:source -- <service-checkout> (trusted local source; no network calls)');
const root = path.resolve(import.meta.dirname, '..');
const sources = {};
const source = file => {
  const text = fs.readFileSync(path.resolve(service, file), 'utf8');
  sources[file] = createHash('sha256').update(text).digest('hex');
  return text;
};
// Evaluate the actual maintained TypeScript catalogue/generator, not a second status-map implementation.
// Strip only their static relative imports/exports; no module resolution, filesystem or network in the context.
const javascript = text => stripTypeScriptTypes(text.replace(/^import [^\n]+;\n/gm, '').replace(/^export /gm, ''));
const endpoints = source('apps/web/src/lib/endpoints.ts');
const schemas = source('apps/web/src/lib/openapi-schemas.ts');
const examples = source('apps/web/src/lib/openapi-examples.ts');
const openapi = source('apps/web/src/lib/openapi.ts');
const spec = vm.runInNewContext(`${javascript(endpoints)}\n${javascript(schemas)}\n${javascript(examples)}\n${javascript(openapi)}\nbuildOpenApi('docs-contract-check')`, { BASE: 'https://did.is/api' }, { timeout: 1000 });
const operations = publicDocsContract(file => fs.readFileSync(path.join(root, 'src/content/docs', file), 'utf8'));
compareOpenApi(operations, JSON.parse(JSON.stringify(spec)));
assert.match(spec.info.description, /standard 20 requests\/min, intensive 10 requests\/min per client/);
assert.deepEqual([...spec['x-didis-problem-codes']['403']], ['EGRESS_BLOCKED']);
assert.deepEqual([...spec['x-didis-problem-codes']['424']], ['UPSTREAM_UNAVAILABLE']);
assert.deepEqual([...spec['x-didis-problem-codes']['404']], ['NOT_FOUND']);

const server = source('crates/resolver-core/src/server.rs');
for (const [field, rate] of [['anonymous_limiter', 20], ['anonymous_expensive_limiter', 10]]) {
  const initializers = [...server.matchAll(new RegExp(`${field}: Arc::new\\(RateLimiter::new\\((\\d+)\\)\\)`, 'g'))];
  assert.equal(initializers.length, 2, `${field}: review both default and configured state constructors`);
  assert.deepEqual(initializers.map(m => Number(m[1])), [rate, rate], `${field}: documented rate`);
}
assert.match(server, /let key = client_key\(&req, state\.trust_proxy\);[\s\S]*?state\.anonymous_limiter\.take\(&key\)\.and_then\(\|\(\)\| \{\s*if costly_public \{\s*state\.anonymous_expensive_limiter\.take\(&key\)/, 'per-client intensive requests also spend standard tokens');
assert.match(server, /let costly_public = expensive[\s\S]*?starts_with\("\/v1\/stream\/"\)[\s\S]*?contains\("did:webvh:"\)/);
assert.match(server, /limiter\.take\(&client_key\(&req, state\.trust_proxy\)\)/, 'separate broad limiter is per-client, not a server-wide total');
const retry = server.match(/fn rate_limited\([\s\S]*?\n\}/)?.[0];
assert.ok(retry, 'rate_limited function boundary changed; review extraction');
assert.match(retry, /wait_seconds\.max\(1\)/);
assert.match(retry, /HeaderValue::from_str\(&wait\.to_string\(\)\)/);
assert.match(retry, /header::RETRY_AFTER, value/);
assert.match(server, /Err\(\(\(1\.0 - b\.0\) \* 60\.0 \/ self\.per_minute\)\.ceil\(\)\.max\(1\.0\) as u64\)/, 'retry delay comes from time until the next token');

const monitor = source('crates/resolver-core/src/customer_monitor.rs');
assert.match(monitor, /const INTERVAL: i64 = 3600;/);
assert.match(monitor, /const MAX_WATCHES: i64 = 25;/);
assert.match(monitor, /fn watch_limit\(plan: &str\) -> i64 \{\s*match plan \{\s*"max" => MAX_WATCHES,\s*"pro" => 5,\s*_ => 0,/);
assert.match(monitor, /!matches!\(parsed\.method\.as_str\(\), "key" \| "jwk" \| "web"\)/, 'exact monitoring method allowlist excludes webvh');
assert.match(monitor, /if parsed\.did != did/, 'DID URL rejected');
assert.match(monitor, /WHERE w\.tenant_id=\?1 AND w\.active=1[\s\S]*?\[principal\.tenant_id\(\)\]/, 'active watch count is team-wide');
const plans = source('apps/web/src/lib/plans.ts');
const catalogue = vm.runInNewContext(`${javascript(plans)}\nJSON.stringify(PLANS)`, {}, { timeout: 1000 });
const planList = JSON.parse(catalogue);
assert.deepEqual(planList.map(p => p.id).sort(), ['free', 'max', 'pro'], 'exact self-service plan inventory');
for (const plan of planList) {
  assert.equal(plan.monitorTargets, { free: 0, pro: 5, max: 25 }[plan.id], `${plan.id}: published monitor slots`);
  if (plan.id !== 'free') assert.ok(plan.features.some(f => /Daily MCP tool change alerts.*\(not yet enabled\)/.test(f)), `${plan.id}: scheduled MCP remains explicitly not enabled in the catalogue`);
}
const mcp = source('crates/resolver-core/src/mcp_watch.rs');
assert.match(mcp, /Scheduling is off unless the customer monitor worker is enabled AND\s*\/\/! `DIDIS_MCP_WATCH_ALERTS=true`/);
assert.match(server, /mcp_watch_alerts_enabled: false/);
console.log(JSON.stringify({ result: 'PASS', operations: operations.size, exactStatusesAndBudgets: true, rate: { standard: 20, intensive: 10, scope: 'per-client; intensive also consumes standard', retryAfter: 'dynamic seconds' }, monitoring: { free: 0, pro: 5, max: 25, scope: 'team', intervalSeconds: 3600, methods: ['key', 'jwk', 'web'], scheduledMcp: 'separate; catalogue not yet enabled; default off' }, sourceSha256: sources }, null, 2));
