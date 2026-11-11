import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { GRAPH_RELATIONS, DELEGATION_CASES, evidenceAt, graphRelationPresentation, delegationPresentation, initializeInterviewDemo, displayTime } from '../src/lib/interviewDemo.mjs';

const read = file => JSON.parse(fs.readFileSync(new URL(`../public/demo/interview-20261111/${file}`, import.meta.url), 'utf8'));
const graph = read('graph.json');
const delegation = read('delegation.json');
const clone = value => structuredClone(value);
const item = (bundle, id = 'read') => bundle.cases.find(value => value.id === id);

test('captured resolver bytes match the public file manifest and keep their original observations', () => {
  const provenance = read('provenance.json');
  for (const file of provenance.files) {
    const bytes = fs.readFileSync(new URL(`../public/demo/interview-20261111/${file.file}`, import.meta.url));
    assert.equal(bytes.length, file.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    const response = JSON.parse(bytes);
    assert.equal(response.did, 'did:web:did.is');
    assert.equal(response.observedAt, file.observedAt);
    assert.equal(file.evidenceClass, 'recorded-public-api-response');
  }
  assert.equal(graph.observedAt, '2026-11-11T10:11:34Z');
  assert.equal(graph.coverage.scope, 'SINGLE_DID_EVIDENCE_PROJECTION');
});

test('three selected relationships keep distinct states and cite evidence in the same actual response', () => {
  for (const [id, state] of [['served', 'OBSERVED'], ['listed', 'DECLARED'], ['signed', 'VERIFIED']]) {
    const view = graphRelationPresentation(graph, id);
    assert.equal(view.state, state);
    assert.equal(view.capturedAt, graph.observedAt);
    assert.equal(view.method, GRAPH_RELATIONS[id].method);
    assert.ok(view.references.length > 0);
    for (const ref of view.references) assert.deepEqual(ref.value, evidenceAt(graph, ref.pointer));
    assert.ok(view.boundary.length > 20);
    assert.equal(view.raw.relationship.state, state);
  }
  assert.match(graphRelationPresentation(graph, 'served').boundary, /does not give.*signature/);
  assert.match(graphRelationPresentation(graph, 'listed').boundary, /not a live check/);
  assert.match(graphRelationPresentation(graph, 'signed').summary, /particular.*signature/);
});

test('JSON pointer traversal never leaves the captured evidence or reads inherited properties', () => {
  for (const pointer of ['', '/edges/0', 'https://other.invalid/', '/evidence/missing', '/evidence/__proto__', '/evidence/constructor', '/evidence/source/~2']) assert.throws(() => evidenceAt(graph, pointer));
  const special = { evidence: { 'a/b': { '~name': 7 } } };
  assert.equal(evidenceAt(special, '/evidence/a~1b/~0name'), 7);
});

test('missing, duplicate, contradictory and unrelated graph provenance cannot keep a verified explanation', () => {
  for (const mutate of [
    value => { value.did = 'did:web:other.invalid'; },
    value => { value.edges.push(clone(value.edges.find(edge => edge.provenance.method === GRAPH_RELATIONS.signed.method))); },
    value => { value.evidence.domainBinding.credentials[0].status = 'INVALID'; },
    value => { value.evidence.domainBinding.credentials[0].proofSuite = 'unimplemented'; },
    value => { value.edges.find(edge => edge.provenance.method === GRAPH_RELATIONS.signed.method).provenance.evidenceRefs = ['/evidence/notCollected']; },
    value => { value.edges.find(edge => edge.provenance.method === GRAPH_RELATIONS.signed.method).provenance.observedAt = '2020-01-01T00:00:00Z'; },
    value => { value.evidence.keys[0].id = 'did:web:other.invalid#key-1'; },
    value => { value.evidence.keys[0].curve = 'P-256'; },
    value => { value.evidence.keys[0].jwk.crv = 'P-256'; },
    value => { value.evidence.domainBinding.credentials[0].issuer = 'did:web:other.invalid'; },
    value => { value.edges.find(edge => edge.provenance.method === GRAPH_RELATIONS.signed.method).provenance.sourceUri = 'https://other.invalid/did-configuration.json'; },
    value => { value.edges.find(edge => edge.provenance.method === GRAPH_RELATIONS.signed.method).provenance.evidenceRefs = ['/evidence/domainBinding/credentials/0', '/evidence/source']; },
  ]) { const value = clone(graph); mutate(value); assert.throws(() => graphRelationPresentation(value, 'signed')); }
  const unknown = clone(graph); unknown.edges.find(edge => edge.provenance.method === GRAPH_RELATIONS.signed.method).state = 'UNSUPPORTED';
  const view = graphRelationPresentation(unknown, 'signed');
  assert.equal(view.state, 'UNKNOWN'); assert.equal(view.tone, 'unknown');
  assert.doesNotMatch(view.summary, /checked this particular/);
  assert.equal(view.title, 'This relationship was not established.');
  assert.equal(view.raw.relationship.state, 'UNSUPPORTED');
  const differentState = clone(graph); differentState.edges.find(edge => edge.provenance.method === GRAPH_RELATIONS.listed.method).state = 'VERIFIED';
  const unsupportedPair = graphRelationPresentation(differentState, 'listed');
  assert.equal(unsupportedPair.tone, 'unknown');
  assert.equal(unsupportedPair.state, 'UNKNOWN');
  assert.equal(unsupportedPair.title, 'This relationship was not established.');
});

// A second, offline primitive check of the actual public did:key receipts. This is not a
// replacement chain verifier; real authority/time/attenuation results are captured from the API.
function didKeyBytes(did) {
  assert.ok(did.startsWith('did:key:z'));
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const text = did.slice(9); let value = 0n;
  for (const ch of text) { const i = alphabet.indexOf(ch); assert.ok(i >= 0); value = value * 58n + BigInt(i); }
  let hex = value.toString(16); if (hex.length % 2) hex = `0${hex}`;
  const decoded = Buffer.from(hex, 'hex');
  assert.equal(decoded.length, 34); assert.equal(decoded[0], 0xed); assert.equal(decoded[1], 0x01);
  return decoded.subarray(2);
}
test('all published chain variants have genuine signatures and no retained private key material', () => {
  assert.equal(delegation.publicVerificationInputsOnly, true);
  assert.equal(delegation.notCurrentAuthorization, true);
  assert.equal(delegation.evidenceClass, 'recorded-core-verification');
  assert.doesNotMatch(JSON.stringify(delegation), /PRIVATE KEY|"d"\s*:|privateKey|seedBytes/);
  for (const sample of delegation.cases) {
    for (const [index, compact] of sample.request.chain.entries()) {
      assert.equal(createHash('sha256').update(compact).digest('hex'), sample.response.chain.links[index].digest);
      const [h, p, s] = compact.split('.'); const header = JSON.parse(Buffer.from(h, 'base64url'));
      const payload = JSON.parse(Buffer.from(p, 'base64url'));
      assert.equal(header.alg, 'EdDSA'); assert.equal(header.typ, 'didis-delegation+jwt');
      const publicKey = createPublicKey({ format: 'der', type: 'spki', key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), didKeyBytes(payload.iss)]) });
      assert.equal(verify(null, Buffer.from(`${h}.${p}`), publicKey, Buffer.from(s, 'base64url')), true);
      assert.ok(payload.exp > payload.nbf && payload.exp - payload.nbf <= 7200, 'finite demonstration window, not a forever grant');
    }
  }
});

test('root mismatch, uncovered tool and a signed widened child are separate actual captured negatives', async () => {
  const positive = item(delegation), root = item(delegation, 'wrong-root'), scope = item(delegation, 'outside-scope'), widened = item(delegation, 'widened-child');
  assert.deepEqual(root.request.chain, positive.request.chain);
  assert.equal(root.request.tool, positive.request.tool);
  assert.notDeepEqual(root.request.trustedRoots, positive.request.trustedRoots);
  assert.deepEqual(scope.request.chain, positive.request.chain);
  assert.deepEqual(scope.request.trustedRoots, positive.request.trustedRoots);
  assert.notEqual(scope.request.tool, positive.request.tool);
  assert.equal(widened.request.chain[0], positive.request.chain[0]);
  assert.notEqual(widened.request.chain[1], positive.request.chain[1]);
  assert.deepEqual(widened.request.trustedRoots, positive.request.trustedRoots);
  assert.equal(widened.request.tool, positive.request.tool);
  const payload = compact => JSON.parse(Buffer.from(compact.split('.')[1], 'base64url'));
  const child = payload(positive.request.chain[1]), wide = payload(widened.request.chain[1]);
  for (const key of ['iss', 'aud', 'nbf', 'exp', 'prf']) assert.deepEqual(child[key], wide[key]);
  assert.notDeepEqual(child.cap, wide.cap);
  const views = Object.fromEntries(await Promise.all(Object.keys(DELEGATION_CASES).map(async id => [id, await delegationPresentation(delegation, id)])));
  assert.equal(views.read.tone, 'allowed');
  assert.equal(views.read.decision, 'Allowed at capture');
  for (const id of ['wrong-root', 'outside-scope', 'widened-child']) {
    assert.equal(views[id].tone, 'denied');
    assert.equal(views[id].checks[0].status, 'pass', 'a policy failure is not a forged signature');
  }
  assert.equal(views['wrong-root'].checks[1].status, 'fail');
  assert.equal(views['outside-scope'].checks[2].status, 'pass');
  assert.equal(views['outside-scope'].checks[3].status, 'fail');
  assert.equal(views['widened-child'].checks[2].status, 'fail');
});

test('a recorded result is not recalculated against today or relabeled current authority', async () => {
  const view = await delegationPresentation(delegation);
  assert.equal(view.capturedAt, item(delegation).capturedAt);
  assert.equal(view.expires, item(delegation).response.chain.notAfter);
  assert.equal(view.raw.notCurrentAuthorization, true);
  assert.match(view.explanation, /at capture.*Nothing was executed/);
  assert.equal(displayTime(undefined), 'Not established');
  assert.match(displayTime(view.capturedAt), /UTC$/);
});

test('contradictory or malformed positive display fixtures cannot retain an ALLOW presentation', async () => {
  // Synthetic presentation mutations, not newly signed inputs or core-verifier attacks.
  const mutations = [
    value => { value.notCurrentAuthorization = false; },
    value => { value.cases.push(clone(item(value))); },
    value => { item(value).response.authorization.authorized = false; },
    value => { item(value).response.authorization.tool = 'other:tool'; },
    value => { item(value).request.tool = item(value).response.authorization.tool = 'demo:write'; },
    value => { item(value).response.authorization.matchedCapability = 'demo:*'; },
    value => { item(value).request.chain[1] = item(value, 'widened-child').request.chain[1]; },
    value => { item(value).request.chain[1] = 'not-a-receipt'; },
    value => { item(value).response.chain.links[0].digest = '0'.repeat(64); },
    value => { value.principals[0].did = 'did:key:unrelated'; },
    value => { item(value).response.authorization.agent = 'did:key:someoneElse'; },
    value => { item(value).response.authorization.root = 'did:key:someoneElse'; },
    value => { item(value).request.trustedRoots = []; },
    value => { item(value).response.chain.trustedRoot = false; },
    value => { item(value).response.chain.links[0].signatureValid = false; },
    value => { item(value).response.chain.links[0].checks = [null]; },
    value => { item(value).response.chain.links[0].checks.find(check => check.id === 'signature').status = 'INDETERMINATE'; },
    value => { item(value).response.chain.links[1].status = 'INVALID'; },
    value => { item(value).response.chain.checks.push({ id: 'extra', status: 'UNSUPPORTED' }); },
    value => { item(value).response.chain.effectiveCapabilities = []; },
    value => { item(value).response.authorization.expires = undefined; },
    value => { item(value).response.chain.notAfter = 'forever'; },
    value => { item(value).capturedAt = '2999-01-01T00:00:00Z'; },
  ];
  for (const mutate of mutations) {
    const value = clone(delegation); mutate(value); const view = await delegationPresentation(value);
    assert.equal(view.tone, 'unknown'); assert.equal(view.decision, 'Unknown');
    assert.ok(view.checks.every(check => check.status === 'unknown'));
  }
});

class Node {
  textContent = ''; hidden = false; disabled = false; dataset = {}; attributes = new Map(); handlers = new Map(); focused = false;
  constructor(dataset = {}) { this.dataset = dataset; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(event, handler) { this.handlers.set(event, handler); }
  removeEventListener(event, handler) { if (this.handlers.get(event) === handler) this.handlers.delete(event); }
  focus() { this.focused = true; }
  fire(event = 'click') { return this.handlers.get(event)?.(); }
  querySelector() { return null; }
}
function harness(options = {}) {
  const names = ['chapter-prev', 'chapter-next', 'chapter-progress', 'chapter-next-label', 'graph-result', 'graph-headline', 'graph-summary', 'graph-boundary', 'graph-state', 'graph-raw', 'graph-source', 'graph-time', 'delegation-result', 'delegation-headline', 'delegation-explanation', 'delegation-decision', 'delegation-change', 'delegation-time', 'delegation-expiry', 'delegation-tool', 'delegation-root', 'delegation-principals', 'delegation-raw'];
  const nodes = Object.fromEntries(names.map(name => [name, new Node()]));
  const nav = ['source', 'evidence', 'delegation'].map(chapter => new Node({ chapter }));
  const panels = nav.map(node => { const panel = new Node({ chapterPanel: node.dataset.chapter }); panel.heading = new Node(); panel.querySelector = selector => { assert.equal(selector, '[data-chapter-heading]'); return panel.heading; }; return panel; });
  const relations = Object.keys(GRAPH_RELATIONS).map(relation => new Node({ relation }));
  const relationStates = relations.map(node => new Node({ relationState: node.dataset.relation }));
  const lines = relations.map(node => new Node({ graphLine: node.dataset.relation }));
  const cases = Object.keys(DELEGATION_CASES).map(delegationCase => new Node({ delegationCase }));
  const checks = Array.from({ length: 5 }, () => { const node = new Node(); node.label = new Node(); node.text = new Node(); node.querySelector = selector => selector === '[data-check-label]' ? node.label : node.text; return node; });
  const groups = { chapter: nav, 'chapter-panel': panels, relation: relations, 'relation-state': relationStates, 'graph-line': lines, 'delegation-case': cases, 'delegation-check': checks };
  const root = new Node();
  root.querySelector = selector => { const key = selector.match(/^\[data-([^\]]+)\]$/)?.[1]; assert.ok(nodes[key], selector); return nodes[key]; };
  root.querySelectorAll = selector => { const key = selector.match(/^\[data-([^\]]+)\]$/)?.[1]; assert.ok(groups[key], selector); return groups[key]; };
  root.scrollIntoView = () => {};
  const dispose = initializeInterviewDemo(root, { loadGraph: async () => graph, loadDelegation: async () => delegation, ...options });
  return { root, nodes, nav, panels, relations, relationStates, cases, checks, dispose };
}
function deferred() { let resolve, reject; const promise = new Promise((ok, no) => { resolve = ok; reject = no; }); return { promise, resolve, reject }; }
const tick = () => new Promise(resolve => setImmediate(resolve));

test('actual chapter controller starts simply, reveals one chapter, retains choices and moves keyboard focus', async () => {
  const demo = harness();
  assert.equal(demo.root.attributes.get('data-ready'), 'true');
  assert.deepEqual(demo.panels.map(panel => panel.hidden), [false, true, true]);
  assert.equal(demo.nodes['chapter-prev'].disabled, true);
  await demo.nodes['chapter-next'].fire();
  assert.deepEqual(demo.panels.map(panel => panel.hidden), [true, false, true]);
  assert.equal(demo.panels[1].heading.focused, true);
  assert.equal(demo.nodes['graph-state'].textContent, 'DECLARED');
  await demo.relations[2].fire();
  assert.equal(demo.nodes['graph-state'].textContent, 'VERIFIED');
  await demo.nodes['chapter-next'].fire();
  assert.equal(demo.nodes['delegation-decision'].textContent, 'Allowed at capture');
  assert.equal(demo.nodes['delegation-principals'].textContent, delegation.principals.map(principal => `${principal.role}: ${principal.did}`).join('\n'));
  await demo.cases[2].fire();
  assert.equal(demo.nodes['delegation-decision'].textContent, 'Denied at capture');
  await demo.nodes['chapter-prev'].fire();
  assert.equal(demo.nodes['graph-state'].textContent, 'VERIFIED');
  await demo.nodes['chapter-next'].fire();
  assert.equal(demo.cases[2].attributes.get('aria-pressed'), 'true');
  assert.match(demo.nodes['delegation-headline'].textContent, /outside its scope/);
  assert.equal(demo.nodes['chapter-next'].disabled, true);
  demo.dispose();
});

test('loading and late graph results do not carry the previous selection’s positive state', async () => {
  const waiting = deferred(); let calls = 0;
  const demo = harness({ loadGraph: () => { calls++; return waiting.promise; } });
  const first = demo.nav[1].fire();
  assert.equal(demo.nodes['graph-state'].textContent, 'Not checked');
  const newer = demo.relations[0].fire();
  assert.equal(demo.nodes['graph-result'].attributes.get('data-tone'), 'unknown');
  waiting.resolve(graph); await Promise.all([first, newer]);
  assert.equal(calls, 1);
  assert.equal(demo.nodes['graph-state'].textContent, 'OBSERVED');
  assert.match(demo.nodes['graph-headline'].textContent, /website served/);
  demo.dispose();
});

test('unavailable graph clears every positive field and can retry the failed local capture read', async () => {
  let calls = 0; const demo = harness({ loadGraph: async () => { if (++calls === 1) throw new Error('not available'); return graph; } });
  await demo.nav[1].fire();
  assert.equal(demo.nodes['graph-state'].textContent, 'UNKNOWN');
  assert.ok(demo.relationStates.every(node => node.textContent === 'UNKNOWN'));
  assert.equal(demo.nodes['graph-source'].textContent, 'Not established');
  await demo.relations[2].fire();
  assert.equal(demo.nodes['graph-state'].textContent, 'VERIFIED');
  assert.equal(calls, 2);
  demo.dispose();
});

test('delegation selection uses the newest request tuple and pending is never approval', async () => {
  const waiting = deferred(); const demo = harness({ loadDelegation: () => waiting.promise });
  const first = demo.nav[2].fire();
  assert.equal(demo.nodes['delegation-result'].attributes.get('data-tone'), 'unknown');
  assert.ok(demo.checks.every(node => node.attributes.get('data-status') === 'unknown'));
  const newer = demo.cases[1].fire();
  waiting.resolve(delegation); await Promise.all([first, newer]);
  assert.equal(demo.nodes['delegation-decision'].textContent, 'Denied at capture');
  assert.match(demo.nodes['delegation-headline'].textContent, /Wrong starting authority/);
  assert.equal(demo.checks[0].attributes.get('data-status'), 'pass');
  assert.equal(demo.checks[1].attributes.get('data-status'), 'fail');
  demo.dispose();
});

test('failed delegation load is Unknown, retry is explicit, and disposal prevents late updates', async () => {
  let calls = 0; const demo = harness({ loadDelegation: async () => { if (++calls === 1) throw new Error('missing'); return delegation; } });
  await demo.nav[2].fire();
  assert.equal(demo.nodes['delegation-decision'].textContent, 'Unknown');
  assert.equal(demo.nodes['delegation-tool'].textContent, 'Not established');
  await demo.cases[0].fire(); assert.equal(demo.nodes['delegation-decision'].textContent, 'Allowed at capture');
  demo.dispose();
  const late = deferred(); const other = harness({ loadDelegation: () => late.promise });
  const run = other.nav[2].fire(); await tick(); other.dispose(); const before = other.nodes['delegation-headline'].textContent;
  late.resolve(delegation); await run;
  assert.equal(other.nodes['delegation-headline'].textContent, before);
  assert.ok(other.nav.every(node => node.handlers.size === 0));
});

test('the page adds understandable questions without restoring the canceled approval/execution feature', () => {
  const page = fs.readFileSync(new URL('../src/content/docs/start/official-source-demo.mdx', import.meta.url), 'utf8');
  const component = fs.readFileSync(new URL('../src/components/InterviewDemo.astro', import.meta.url), 'utf8');
  const guide = fs.readFileSync(new URL('../src/content/docs/app/delegation.md', import.meta.url), 'utf8');
  assert.match(page, /<InterviewDemo>\s*<OfficialSourceDemo \/>\s*<\/InterviewDemo>/);
  assert.ok(page.indexOf('<InterviewDemo>') < page.indexOf('<details class="demo-reference">'));
  for (const question of ['Who signed these exact words?', 'Why does this link count as evidence?', 'Can a delegate go beyond its limits?']) assert.ok(component.includes(question));
  assert.equal([...component.matchAll(/data-chapter-panel="/g)].length, 3);
  assert.match(component, /Recorded verification · not current permission/);
  assert.match(component, /Three questions about verifiable evidence/);
  assert.doesNotMatch(component, /One identifier\./);
  assert.match(component, /Separate recorded example:/);
  assert.match(component, /not the website’s signing key/);
  assert.match(component, /data-delegation-principals/);
  assert.match(component, /not a new browser verification or a current grant/);
  assert.match(component, /aria-current="step"/);
  assert.match(component, /No action runs/);
  assert.doesNotMatch(component, /Approve a fresh|Run this example|handler calls|execution counter|non-extractable/);
  assert.doesNotMatch(guide, /Approve a fresh|guided example.*actual sample action|non-extractable/);
  assert.match(guide, /receipt inspector.*does not run an action/);
});

test('the fixed retrieval and declaration shapes reject existing but unrelated references and purposes', () => {
  for (const [selected, mutate] of [
    ['served', value => { value.edges.find(edge => edge.provenance.method === GRAPH_RELATIONS.served.method).provenance.evidenceRefs[0] = '/evidence/keys/0'; }],
    ['served', value => { value.evidence.source.url = 'https://other.invalid/did.json'; }],
    ['listed', value => { value.evidence.document.relationships.authentication = []; }],
    ['listed', value => { value.evidence.keys[0].relationships = ['assertionMethod']; }],
    ['listed', value => { value.evidence.keys[0].controller = 'did:web:other.invalid'; }],
  ]) {
    const value = clone(graph); mutate(value);
    assert.throws(() => graphRelationPresentation(value, selected));
  }
});

test('scope-specific denials cannot be retained when their fixed tool or leaf-capability fields disagree', async () => {
  for (const mutate of [
    value => { const entry = item(value, 'outside-scope'); entry.request.tool = entry.response.authorization.tool = 'demo:read'; },
    value => { item(value, 'outside-scope').response.chain.effectiveCapabilities = ['demo:write']; },
    value => { item(value, 'outside-scope').response.chain.links[1].capabilities = ['demo:write']; },
  ]) {
    const value = clone(delegation); mutate(value);
    const view = await delegationPresentation(value, 'outside-scope');
    assert.equal(view.decision, 'Unknown');
    assert.ok(view.checks.every(check => check.status === 'unknown'));
  }
  for (const subtle of [null, { digest: async () => { throw new Error('unavailable'); } }]) {
    const view = await delegationPresentation(delegation, 'read', { subtle });
    assert.equal(view.decision, 'Unknown');
    assert.match(view.explanation, /digests could not be compared/);
  }
});

test('a later selection wins even if an earlier receipt-digest comparison finishes last', async () => {
  const waiting = deferred(), reached = deferred(); let calls = 0;
  const subtle = { digest: async (...args) => {
    if (++calls <= 2) { reached.resolve(); await waiting.promise; }
    return globalThis.crypto.subtle.digest(...args);
  } };
  const demo = harness({ subtle });
  const first = demo.nav[2].fire(); await reached.promise;
  assert.equal(demo.nodes['delegation-result'].attributes.get('aria-busy'), 'true');
  assert.equal(demo.nodes['delegation-decision'].textContent, 'Unknown');
  await demo.cases[1].fire();
  assert.match(demo.nodes['delegation-headline'].textContent, /Wrong starting authority/);
  waiting.resolve(); await first;
  assert.equal(demo.nodes['delegation-decision'].textContent, 'Denied at capture');
  assert.match(demo.nodes['delegation-headline'].textContent, /Wrong starting authority/);
  demo.dispose();
});

test('disposal during receipt-digest comparison cannot publish its late result', async () => {
  const waiting = deferred(), reached = deferred();
  const subtle = { digest: async (...args) => { reached.resolve(); await waiting.promise; return globalThis.crypto.subtle.digest(...args); } };
  const demo = harness({ subtle });
  const first = demo.nav[2].fire(); await reached.promise;
  const before = demo.nodes['delegation-headline'].textContent; demo.dispose();
  waiting.resolve(); await first;
  assert.equal(demo.nodes['delegation-headline'].textContent, before);
  assert.equal(demo.nodes['delegation-decision'].textContent, 'Unknown');
});

test('source caveats are progressively disclosed while exact timestamps and existing result bindings remain visible', () => {
  const source = fs.readFileSync(new URL('../src/components/OfficialSourceDemo.astro', import.meta.url), 'utf8');
  const disclosure = source.slice(source.indexOf('<details class="technical-details">'), source.indexOf('</details>'));
  for (const id of ['demo-mode-note', 'demo-state', 'demo-details']) {
    assert.ok(disclosure.includes(`id="${id}"`), `${id} remains in the technical disclosure`);
    assert.equal(source.split(`id="${id}"`).length - 1, 1);
  }
  for (const id of ['demo-result-context', 'demo-as-of', 'demo-captured', 'demo-expiry']) {
    assert.ok(source.indexOf(`id="${id}"`) < source.indexOf('<details class="technical-details">'));
    assert.equal(source.split(`id="${id}"`).length - 1, 1);
  }
  assert.match(source, /aria-describedby="demo-result-context"/);
  assert.match(source, /Browser signature check · archived public keys/);
  assert.ok(source.indexOf('id="demo-statement"') < source.indexOf('class="flow check-flow"'));
});
