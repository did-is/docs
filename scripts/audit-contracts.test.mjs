import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, 'src/content/docs', file), 'utf8');

// Table fixtures are shared with the optional offline Rust source-contract check.
export const grantCases = [
  ['payments:*', 'payments:refund', true],
  ['payments:*', 'Payments:Refund', true],
  ['payments:*', 'payments:card:refund', true],
  ['payments:*', 'refund', false],
  ['payments:*', 'payments.refund', false],
  ['payments:*', 'paymentsx:refund', false],
  ['payments:*', 'slack:post', false],
  ['payments:refund', 'payments:refund', true],
  ['payments:refund', 'refund', false],
  ['payments:refund', 'payments:transfer', false],
  ['payments.refund', 'payments.refund', true],
  ['payments.refund', 'payments:refund', false],
  ['payments:*', 'payments:', false],
  ['payments:*', 'payments::refund', false],
  ['payments:*', 'payments:re fund', false],
];

function docsContract(load = read) {
  const accounts = load('app/accounts.md');
  assert.match(accounts, /Projects in the same team share the team’s plan and monthly allowance/);
  assert.match(accounts, /Plans belong to teams, not individual projects/);
  assert.match(accounts, /separate teams have separate plans and allowances/);
  assert.match(accounts, /Invite people to a team/);
  assert.match(accounts, /All projects of a team share one monthly allowance/);
  assert.doesNotMatch(accounts, /each project has its own plan|invite people to a project/i);

  const agents = load('build/agents.mdx');
  // Check every language's request and the literal ALLOW reason, not just a keyword.
  assert.match(agents, /"tool":"payments:refund"/);
  assert.match(agents, /didis\.authorize\(chain, "payments:refund", \{/);
  assert.match(agents, /didis\.authorize\(chain, "payments:refund", trusted_roots=/);
  assert.match(agents, /capability 'payments:\*' grants 'payments:refund'/);
  assert.doesNotMatch(agents, /(?:"tool":|authorize\(chain,\s*)"payments\.refund"/);
  assert.match(agents, /not `refund` or `payments\.refund`/);
  assert.match(agents, /guard-tools\/#capabilities-and-tool-names/);
  for (const file of ['app/delegation.md', 'start/use-cases.mdx', 'start/recipes.mdx']) {
    assert.match(load(file), /payments:refund/, file);
    assert.doesNotMatch(load(file), /payments\.refund/, file);
  }
  const receipts = load('reference/delegation-receipts.md');
  assert.match(receipts, /"cap": \["payments:refund", "payments:read"\]/);
  assert.match(receipts, /not `refund`, `payments\.refund` or `paymentsx:refund`/);

  const errors = load('build/errors.mdx');
  for (const value of ['Native JSON HTTP API', 'application/problem+json', 'application/did-resolution', 'didResolutionMetadata.error', 'text/event-stream', 'JSON-RPC', 'isError: true']) assert.ok(errors.includes(value), value);
  assert.match(errors, /refusal before streaming uses a normal HTTP problem response/);
  for (const file of ['reference/api.mdx', 'reference/standards.md']) {
    const text = load(file);
    for (const value of ['Native JSON HTTP API', 'didResolutionMetadata.error', 'SSE', 'MCP']) assert.ok(text.includes(value), `${file}: ${value}`);
    assert.doesNotMatch(text, /Every (?:API )?error (?:is|\.)/i);
  }
  for (const file of ['start/quickstart.mdx', 'start/recipes.mdx', 'build/api-overview.mdx', 'index.mdx']) assert.match(load(file), /native JSON HTTP API/i, file);
  assert.match(load('build/stream.mdx'), /HTTP response remains `text\/event-stream`, not `application\/problem\+json`/);
}

test('team billing, delegation request/reason and transport scopes remain coherent', () => docsContract());

for (const [label, file, before, after] of [
  ['project plan regression', 'app/accounts.md', 'Projects in the same team share the team’s plan and monthly allowance.', 'Each project has its own plan.'],
  ['project invitation regression', 'app/accounts.md', 'Invite people to a team', 'Invite people to a project'],
  ['curl dot-name regression', 'build/agents.mdx', '"tool":"payments:refund"', '"tool":"payments.refund"'],
  ['ALLOW bare-name regression', 'build/agents.mdx', "capability 'payments:*' grants 'payments:refund'", "capability 'payments:*' grants 'refund'"],
  ['unqualified error regression', 'reference/api.mdx', 'Native JSON HTTP API errors use top-level RFC 9457 problem responses.', 'Every error is an RFC 9457 problem.'],
  ['missing W3C wrapper regression', 'build/errors.mdx', 'didResolutionMetadata.error', 'wrongMetadata.error'],
  ['missing MCP envelope regression', 'build/errors.mdx', 'isError: true', 'isError: false'],
]) {
  test(`guard rejects ${label}`, () => {
    assert.ok(read(file).includes(before), 'mutation must actually change the current document');
    assert.throws(() => docsContract((name) => name === file ? read(name).replaceAll(before, after) : read(name)));
  });
}
