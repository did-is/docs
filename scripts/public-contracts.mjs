// Offline documentation contracts. Keep source-checkout access in check-service-contract.mjs.
import assert from 'node:assert/strict';

export function documentedOperations(api) {
  const operations = new Map();
  for (const section of api.split(/^### /m).slice(1)) {
    const request = section.match(/```http\n(GET|POST) ([^\n]+)\n```/);
    const responses = section.match(/^Responses: (.+)$/m);
    const budget = section.match(/^Budget: \*\*(\w+)\*\*/m);
    assert.ok(request && responses && budget, `Incomplete operation: ${section.split('\n')[0]}`);
    const key = `${request[1]} ${request[2]}`;
    assert.ok(!operations.has(key), `Duplicate operation: ${key}`);
    operations.set(key, {
      responses: [...responses[1].matchAll(/`(\d{3})`/g)].map(m => m[1]).sort(),
      budget: budget[1],
    });
  }
  return operations;
}

export function publicDocsContract(load) {
  const faq = load('resources/faq.md');
  assert.match(faq, /standard budget of 20 requests per minute overall/);
  assert.match(faq, /10 requests per minute for intensive requests/);
  assert.match(faq, /Intensive requests also consume the standard budget/);
  assert.match(faq, /per-client limits, not a shared server-wide allowance/);
  assert.match(faq, /read `Retry-After` on that response.*wait that many seconds/);
  assert.match(faq, /delay is not fixed/);
  assert.doesNotMatch(faq, /\b2 (?:requests )?per minute/);
  assert.match(faq, /Identifier monitoring and its signed webhooks\]\(\/app\/monitoring\/\) require a Pro or Max team/);

  const api = load('reference/api.mdx');
  assert.match(api, /standard\* 20 requests per minute, \*intensive\* 10 requests per minute, per client/);
  assert.match(api, /Intensive requests also consume the standard budget/);
  assert.match(api, /`did:webvh` requests use the intensive limit/);
  assert.match(api, /`403 EGRESS_BLOCKED`/);
  assert.match(api, /`424 UPSTREAM_UNAVAILABLE`/);
  assert.match(api, /A2A inspection also returns `404 NOT_FOUND`/);
  const operations = documentedOperations(api);
  assert.equal(operations.size, 20);
  const outbound = new Set([
    'GET /v1/resolve/{did}', 'GET /v1/dereference/{didUrl}',
    'GET /v1/fast-verify/did/{did}', 'GET /v1/graph/{did}',
    'GET /v1/mcp/inspect', 'GET /v1/a2a/inspect',
  ]);
  for (const [key, operation] of operations) {
    for (const status of ['403', '424']) assert.equal(operation.responses.includes(status), outbound.has(key), `${key}: ${status} scope`);
  }
  assert.ok(operations.get('GET /v1/a2a/inspect').responses.includes('404'), 'A2A missing-card response');

  const monitor = load('app/monitoring.md');
  assert.match(monitor, /paid console feature on \*\*Pro and Max\*\*/);
  for (const [plan, limit] of [['Free', 0], ['Pro', 5], ['Max', 25]]) assert.ok(monitor.includes(`| ${plan} | ${limit} |`), `${plan} watch slots`);
  assert.match(monitor, /\*\*hourly\*\*/);
  assert.match(monitor, /pooled \*\*per team\*\*, across all its projects/);
  assert.match(monitor, /\*\*`did:key`, `did:jwk` and `did:web` only\*\*/);
  assert.match(monitor, /`did:webvh` is not supported for monitoring/);
  assert.match(monitor, /reverted between checks may not be detected/);
  assert.match(monitor, /Scheduled MCP tool-change alerts are a separate feature and are \*\*not yet enabled\*\*/);
  assert.match(monitor, /on-demand check; running it once does not enable continuous monitoring/);
  assert.match(load('app/accounts.md'), /Pro\/Max hourly identifier checks \(5\/25 active watches per team\)/);
  assert.match(load('start/introduction.md'), /Pro and Max also add \[hourly identifier monitoring/);
  assert.match(load('start/use-cases.mdx'), /Pro or Max team \(5 or 25 active watches per team, shared across projects\)/);
  return operations;
}

export function compareOpenApi(operations, spec) {
  const source = new Map();
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const key = `${method.toUpperCase()} ${path}`;
      source.set(key, operation);
      assert.deepEqual(operations.get(key)?.responses, Object.keys(operation.responses).filter(s => /^\d{3}$/.test(s)).sort(), `${key}: exact numeric response statuses`);
      assert.equal(operations.get(key)?.budget, operation['x-didis-budget'], `${key}: budget`);
    }
  }
  assert.deepEqual([...operations.keys()].sort(), [...source.keys()].sort(), 'exact operation inventory');
}
