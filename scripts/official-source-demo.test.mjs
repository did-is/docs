import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPublicKey, verify, webcrypto } from 'node:crypto';
import { assess } from '../public/demo/official-source-20261103/policy.mjs';
import { sourceEvaluationTime, evaluateOfficialSourceExample, officialSourcePresentation, initializeOfficialSourceDemo, SNAPSHOT_CAPTURED_AT } from '../src/lib/officialSourceReplay.mjs';
const base = new URL('../public/demo/official-source-20261103/', import.meta.url);
const bundle = JSON.parse(fs.readFileSync(new URL('bundle.json', base)));
const captured = JSON.parse(fs.readFileSync(new URL('api-capture.json', base)));
const capturedTime = Date.parse(bundle.capturedAt) / 1000;
const decode = p => JSON.parse(Buffer.from(p, 'base64url'));
function inspect(name) {
  const [h, p, s] = bundle.fixtures[name].split('.');
  const header = decode(h), payload = decode(p);
  const vm = bundle.didDocument.verificationMethod.find(vm => vm.id === header.kid);
  const key = vm?.publicKeyJwk ?? bundle.otherPublicJwk;
  return { signatureValid: verify(null, Buffer.from(`${h}.${p}`), createPublicKey({format:'jwk',key}), Buffer.from(s,'base64url')), signer: header.kid.split('#')[0], payload, key, h, p, s };
}
test('official signed original independently verifies and matches fixed expected issuer', () => {
  const r = inspect('original'); assert.equal(r.signatureValid, true); assert.equal(assess(r, capturedTime).state, 'MATCHED');
  assert.ok(bundle.didDocument.assertionMethod.includes(bundle.expectedKid));
  assert.equal(captured.results.original.status, 'VALID');
});
test('changing signed text without re-signing fails both independent crypto and API', () => {
  const r = inspect('tampered'); assert.equal(r.signatureValid, false); assert.equal(assess(r, capturedTime).state, 'REJECTED');
  assert.equal(captured.results.tampered.status,'INVALID');
});
test('attacker-controlled own DID and genuinely valid signature cannot pass official provenance', () => {
  const r = inspect('wrong-issuer'); assert.equal(r.signatureValid,true); assert.equal(captured.results['wrong-issuer'].status,'VALID');
  assert.equal(assess(r,capturedTime).state,'REJECTED');
  assert.deepEqual(decode(r.signer.slice('did:jwk:'.length)),bundle.otherPublicJwk);
  assert.equal(assess({...r,payload:{...r.payload,iss:'did:web:did.is'}},capturedTime).state,'REJECTED');
});
test('expired but genuinely signed input is rejected independently of signature API', () => {
  const r=inspect('expired'); assert.equal(r.signatureValid,true); assert.equal(captured.results.expired.status,'VALID');
  assert.equal(assess(r,capturedTime).state,'REJECTED');
  assert.equal(assess(inspect('original'),Date.parse(bundle.expiresAt)/1000).state,'REJECTED');
});
test('unavailable, not-yet-valid and malformed dates never match', () => {
  assert.equal(assess({available:false},capturedTime).state,'UNKNOWN');
  const r=inspect('original'); assert.equal(assess(r,r.payload.nbf-1).state,'REJECTED');
  for(const exp of [undefined,'tomorrow',Infinity]) assert.equal(assess({...r,payload:{...r.payload,exp}},capturedTime).state,'REJECTED');
});
test('browser-native Web Crypto agrees with independent Node verifier for all fixtures', async () => {
  for(const name of Object.keys(bundle.fixtures)) {
    const r=inspect(name); const key=await webcrypto.subtle.importKey('jwk',r.key,{name:'Ed25519'},false,['verify']);
    const valid=await webcrypto.subtle.verify('Ed25519',key,Buffer.from(r.s,'base64url'),Buffer.from(`${r.h}.${r.p}`));
    assert.equal(valid,r.signatureValid,name);
  }
});
test('public artifacts contain no private key material or personal account metadata', () => {
  for(const file of fs.readdirSync(base)) {
    const text=fs.readFileSync(new URL(file,base),'utf8');
    assert.doesNotMatch(text,/"d"\s*:|PRIVATE KEY|[a-z0-9._%+-]+@gmail\.com/i,file);
  }
  const source=fs.readFileSync(new URL('../src/content/docs/start/official-source-demo.mdx',import.meta.url),'utf8');
  assert.match(source,/not legal certification/i);
  assert.doesNotMatch(source,/ledgerbingo|[a-z0-9._%+-]+@gmail\.com/i);
});
test('X post reference is canonical and describes only independently observed public references', () => {
  const source=fs.readFileSync(new URL('../src/content/docs/start/official-source-demo.mdx',import.meta.url),'utf8');
  const post='https://x.com/didishq/status/2117758329175097403';
  assert.equal(source.split(post).length-1,2);
  assert.doesNotMatch(source,/2117758329175097403[?]|No reciprocal X post has been captured/);
  assert.match(source,/independently retrieved from X on \*\*3 November 2026 at 23:20 UTC\*\*/);
  assert.match(source,/reciprocal public references/i);
  assert.match(source,/No X OAuth verification has been performed/);
  assert.match(source,/not an X OAuth account-control check or an automated linked-account `CONFIRMED` result/);
  assert.match(source,/not itself the exact signed statement/);
  assert.match(source,/10 November 2026 at 21:58:33 UTC/);
});

const interviewTime = Date.parse('2026-11-13T12:00:00.000Z');
const evaluate = (example, mode = 'replay', options = {}) => evaluateOfficialSourceExample({
  bundle, example, mode, assess, subtle: webcrypto.subtle, now: () => interviewTime, ...options,
});
test('real runtime replays original at packaged capture time after expiry, never at the current clock', async () => {
  const result = await evaluate('original', undefined, { now: () => { throw new Error('Replay must not read the current clock'); } });
  assert.equal(result.state, 'MATCHED');
  assert.equal(result.mode, 'replay');
  assert.equal(result.asOf, bundle.capturedAt);
  assert.equal(result.snapshotCapturedAt, bundle.capturedAt);
  assert.equal(result.expiresAt, bundle.expiresAt);
});
test('real runtime current mode reads Date.now and rejects original on and after expiry', async t => {
  for (const milliseconds of [Date.parse(bundle.expiresAt), interviewTime, Date.parse('2030-01-01T00:00:00Z')]) {
    const clock = t.mock.method(Date, 'now', () => milliseconds);
    const result = await evaluateOfficialSourceExample({ bundle, example: 'original', mode: 'current', assess, subtle: webcrypto.subtle });
    assert.equal(result.state, 'REJECTED');
    assert.equal(result.signatureValid, true);
    assert.equal(result.asOf, new Date(milliseconds).toISOString());
    assert.equal(result.snapshotCapturedAt, SNAPSHOT_CAPTURED_AT);
    clock.mock.restore();
  }
  assert.equal((await evaluate('original', 'current', { now: () => Date.parse(bundle.expiresAt) - 1 })).state, 'MATCHED');
});
test('all controlled negative fixtures retain their correct outcomes in both evaluation modes', async () => {
  for (const mode of ['replay', 'current']) {
    for (const example of ['tampered', 'wrong-issuer', 'expired']) {
      const result = await evaluate(example, mode);
      assert.equal(result.state, 'REJECTED', `${mode}: ${example}`);
      assert.equal(result.signatureValid, example !== 'tampered');
      assert.equal(result.asOf, mode === 'replay' ? bundle.capturedAt : new Date(interviewTime).toISOString());
    }
    const unavailable = await evaluate('unavailable', mode, { bundle: undefined, subtle: undefined });
    assert.equal(unavailable.state, 'UNKNOWN');
    assert.equal(unavailable.simulated, true);
    assert.equal(unavailable.signatureValid, undefined);
  }
});
test('runtime rejects invalid mode, invalid clocks, changed snapshot dates and changed archived expiry', async () => {
  assert.throws(() => sourceEvaluationTime('silent-renewal'), /supported evaluation mode/);
  for (const clock of [NaN, Infinity, -Infinity]) assert.throws(() => sourceEvaluationTime('current', SNAPSHOT_CAPTURED_AT, () => clock), /clock/);
  assert.throws(() => sourceEvaluationTime('replay', '2030-01-01T00:00:00Z'), /snapshot date/);
  await assert.rejects(evaluate('original', 'replay', { bundle: { ...bundle, capturedAt: '2026-11-13T12:00:00Z' } }), /bundle/);
  await assert.rejects(evaluate('original', 'replay', { bundle: { ...bundle, expiresAt: '2030-01-01T00:00:00Z' } }), /expiry/);
  await assert.rejects(evaluate('not-a-fixture'), /controlled example/);
});
test('copied current-time API program still fails closed after expiry even with a VALID signature', async () => {
  const source = fs.readFileSync(new URL('../src/content/docs/start/official-source-demo.mdx', import.meta.url), 'utf8');
  const program = source.match(/```js title="check-source\.mjs"\n([\s\S]*?)\n```/)[1];
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const [milliseconds, matched] of [[Date.parse(bundle.expiresAt) - 1, true], [Date.parse(bundle.expiresAt), false], [interviewTime, false]]) {
    let calls = 0, output;
    const process = {};
    const fetch = async (_url, options) => {
      calls++;
      if (options) {
        assert.equal(options.method, 'POST');
        assert.deepEqual(JSON.parse(options.body), JSON.parse(fs.readFileSync(new URL('original-request.json', base))));
      }
      return { ok: true, json: async () => options ? captured.results.original : JSON.parse(fs.readFileSync(new URL('original-request.json', base))) };
    };
    await new AsyncFunction('fetch', 'Date', 'console', 'process', program)(fetch, { now: () => milliseconds }, { log: value => { output = value; } }, process);
    assert.equal(calls, 2, 'one public input download and exactly one signature API call');
    assert.equal(output.signatureStatus, 'VALID');
    assert.equal(output.expectedSourceMatched, matched);
    assert.equal(process.exitCode, matched ? undefined : 1);
  }
});
test('current evaluation reads its clock after asynchronous crypto, including crossing expiry', async () => {
  let milliseconds = Date.parse(bundle.expiresAt) - 1;
  const subtle = {
    importKey: (...args) => webcrypto.subtle.importKey(...args),
    verify: async (...args) => { const valid = await webcrypto.subtle.verify(...args); milliseconds++; return valid; },
  };
  const result = await evaluate('original', 'current', { subtle, now: () => milliseconds });
  assert.equal(result.state, 'REJECTED');
  assert.equal(result.asOf, bundle.expiresAt);
});

const controlledPresentations = mode => [
  ['original', mode === 'replay' ? 'matched' : 'rejected', 'pass', 'pass', mode === 'replay' ? 'pass' : 'fail', mode === 'replay' ? /matched at the recorded time/ : /signature matches.*expired/],
  ['tampered', 'rejected', 'fail', 'unknown', 'unknown', /words changed.*signature fails/],
  ['wrong-issuer', 'rejected', 'pass', 'fail', 'unknown', /real signature.*different source/],
  ['unavailable', 'unknown', 'unknown', 'unknown', 'unknown', /No conclusion.*not a pass/],
  ['expired', 'rejected', 'pass', 'pass', 'fail', /signature matches.*expired/],
];
test('presentation explains all real controlled results in both modes without changing the result', async () => {
  for (const mode of ['replay', 'current']) {
    for (const [example, outcome, signature, source, dates, verdict] of controlledPresentations(mode)) {
      const result = await evaluate(example, mode);
      const original = JSON.stringify(result);
      const view = officialSourcePresentation({ result });
      assert.equal(view.outcome, outcome, `${mode}: ${example}`);
      assert.match(view.verdict, verdict);
      assert.doesNotMatch(view.verdict, /MATCHED|REJECTED|UNKNOWN/);
      assert.equal(view.expectedIssuer, 'did:web:did.is');
      assert.equal(view.signerLabel, example === 'unavailable' ? 'Not established' : example === 'tampered' ? 'Not authenticated' : example === 'wrong-issuer' ? 'Different demonstration key' : 'DID.is website');
      assert.equal(view.checks.signature.status, signature);
      assert.equal(view.checks.source.status, source);
      assert.equal(view.checks.dates.status, dates);
      assert.match(view.modeLabel, mode === 'replay' ? /Historical replay.*not current validity/ : /Current device dates.*archived public keys/);
      assert.ok(view.explanation.includes(result.asOf));
      assert.match(view.explanation, mode === 'replay' ? /does not establish current validity/ : /archived key, not a live DID lookup/);
      if (result.payload) assert.equal(view.statement, result.payload.statement);
      else assert.match(view.statement, /No checked statement/);
      if (example === 'tampered' || example === 'wrong-issuer') assert.match(view.checks.dates.note, /policy stopped at the (signature|source) check/);
      if (example === 'expired') {
        const fixtureExpiry = new Date(result.payload.exp * 1000).toISOString();
        assert.ok(view.checks.dates.note.includes(fixtureExpiry));
        assert.notEqual(fixtureExpiry, result.expiresAt, 'do not confuse the expired fixture with the original deadline');
      }
      assert.equal(JSON.stringify(result), original, 'presentation must not mutate or renew evidence');
    }
  }
});
test('presentation separates current-date acceptance, exact expiry and not-yet-valid dates', async () => {
  for (const [milliseconds, outcome, dateTitle, verdict] of [
    [Date.parse(bundle.expiresAt) - 1, 'matched', /Within dates at device time/, /match at the displayed device time/],
    [Date.parse(bundle.expiresAt), 'rejected', /Expired at this time/, /statement expired/],
    [interviewTime, 'rejected', /Expired at this time/, /statement expired/],
    [inspect('original').payload.nbf * 1000 - 1, 'rejected', /Not yet valid/, /too early/],
  ]) {
    const view = officialSourcePresentation({ result: await evaluate('original', 'current', { now: () => milliseconds }) });
    assert.equal(view.outcome, outcome);
    assert.match(view.checks.dates.title, dateTitle);
    assert.match(view.verdict, verdict);
    assert.equal(view.checks.signature.status, 'pass');
    assert.equal(view.checks.source.status, 'pass');
    assert.match(view.explanation, /archived key, not a live DID lookup/);
  }
});
test('presentation keeps the expected source fixed and unknown or unfinished checks non-positive', async () => {
  const other = await evaluate('wrong-issuer');
  const view = officialSourcePresentation({ result: { ...other, expectedIssuer: other.signer } });
  assert.equal(view.expectedIssuer, 'did:web:did.is', 'never adopt a submitted signer as the expected authority');
  assert.equal(view.checks.source.status, 'fail');
  assert.equal(view.checks.dates.status, 'unknown');
  for (const mode of ['replay', 'current']) {
    const idle = officialSourcePresentation({ mode });
    assert.equal(idle.outcome, 'idle');
    for (const check of Object.values(idle.checks)) assert.equal(check.status, 'waiting');
    const checking = officialSourcePresentation({ mode, example: 'tampered', phase: 'checking' });
    assert.match(checking.verdict, /no verdict yet/);
    assert.equal(checking.outcome, 'checking');
    assert.match(checking.statement, /Loading/);
    for (const check of Object.values(checking.checks)) assert.equal(check.status, 'waiting');
    const error = officialSourcePresentation({ mode, phase: 'error' });
    assert.equal(error.outcome, 'unknown');
    assert.match(error.verdict, /not a pass/);
    assert.match(error.explanation, /Do not treat this as verified/);
    for (const check of Object.values(error.checks)) assert.equal(check.status, 'unknown');
    const unavailable = officialSourcePresentation({ result: await evaluate('unavailable', mode) });
    assert.match(unavailable.explanation, /deliberately simulates missing evidence.*not report a live outage/);
    for (const check of Object.values(unavailable.checks)) assert.equal(check.status, 'unknown');
  }
});
test('synthetic malformed-date presentation does not turn a rejection into acceptance', async () => {
  // Rendering fixtures only; these mutated payloads are not cryptographic evidence.
  const original = await evaluate('original');
  for (const exp of [undefined, 'tomorrow', Infinity]) {
    const payload = { ...original.payload, exp };
    const result = { ...original, payload, ...assess({ signatureValid: true, signer: original.signer, payload }, capturedTime) };
    const view = officialSourcePresentation({ result });
    assert.equal(view.outcome, 'rejected');
    assert.equal(view.checks.dates.status, 'fail');
    assert.match(view.checks.dates.title, /Invalid dates/);
    assert.doesNotMatch(view.verdict, /words match(ed)? at/);
  }
});

// A small event/DOM harness exercises the exact controller imported by Astro,
// with real Web Crypto and archived fixtures, not a second implementation.
class DemoNode {
  textContent = '';
  hidden = false;
  value = '';
  attributes = new Map();
  handlers = new Map();
  constructor(dataset = {}) { this.dataset = dataset; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(event, handler) { this.handlers.set(event, handler); }
  removeEventListener(event, handler) { if (this.handlers.get(event) === handler) this.handlers.delete(event); }
  fire(event) { return this.handlers.get(event)?.(); }
}
function demoRoot(overrides = {}) {
  const nodes = Object.fromEntries([
    'demo-state','demo-explanation','demo-details','demo-mode','demo-mode-note','demo-as-of','demo-error','demo-captured','demo-expiry',
    'demo-verdict','demo-result-context','demo-statement','demo-statement-label','demo-signer',
    'demo-signature-state','demo-signature-note','demo-source-state','demo-source-note','demo-dates-state','demo-dates-note',
  ].map(id => [id, new DemoNode()]));
  const panel = new DemoNode();
  const buttons = Object.fromEntries(['original','tampered','wrong-issuer','unavailable','expired'].map(example => [example, new DemoNode({ example })]));
  const root = {
    querySelector: selector => selector === '.result' ? panel : nodes[selector.slice(1)],
    querySelectorAll: selector => { assert.equal(selector, '[data-example]'); return Object.values(buttons); },
  };
  const dispose = initializeOfficialSourceDemo(root, { loadPolicy: async () => ({ assess }), loadBundle: async () => bundle, subtle: webcrypto.subtle, now: () => interviewTime, ...overrides });
  return { nodes, panel, buttons, dispose, click: example => buttons[example].fire('click'), changeMode: mode => { nodes['demo-mode'].value = mode; return nodes['demo-mode'].fire('change'); } };
}
const deferred = () => { let resolve, reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; };

test('browser controller defaults to labeled replay and reruns the same example on explicit mode change', async () => {
  const demo = demoRoot();
  assert.equal(demo.nodes['demo-mode'].value, 'replay');
  assert.match(demo.nodes['demo-mode-note'].textContent, /Historical replay.*not current validity/);
  await demo.click('original');
  assert.equal(demo.nodes['demo-state'].textContent, 'MATCHED');
  assert.match(demo.nodes['demo-explanation'].textContent, /does not establish current validity/);
  assert.equal(demo.nodes['demo-as-of'].textContent, bundle.capturedAt);
  await demo.changeMode('current');
  assert.equal(demo.nodes['demo-state'].textContent, 'REJECTED');
  assert.equal(demo.nodes['demo-as-of'].textContent, new Date(interviewTime).toISOString());
  assert.equal(demo.nodes['demo-captured'].textContent, bundle.capturedAt);
  assert.match(demo.nodes['demo-mode-note'].textContent, /not a live DID lookup/);
  await demo.changeMode('replay');
  assert.equal(demo.nodes['demo-state'].textContent, 'MATCHED');
  assert.equal(demo.panel.attributes.get('aria-busy'), 'false');
  demo.dispose();
});
test('browser controller keeps every negative outcome and metadata in both modes', async () => {
  const demo = demoRoot();
  for (const mode of ['replay', 'current']) {
    await demo.changeMode(mode);
    for (const example of ['tampered','wrong-issuer','expired','unavailable']) {
      await demo.click(example);
      assert.equal(demo.nodes['demo-state'].textContent, example === 'unavailable' ? 'UNKNOWN' : 'REJECTED');
      const details = JSON.parse(demo.nodes['demo-details'].textContent);
      assert.equal(details.mode, mode);
      assert.equal(details.example, example);
      assert.equal(demo.buttons[example].attributes.get('aria-pressed'), 'true');
    }
  }
});
test('older clicks and their errors cannot overwrite a newer check', async () => {
  for (const failOld of [false, true]) {
    const first = deferred(); let calls = 0;
    const demo = demoRoot({ loadBundle: () => ++calls === 1 ? first.promise : Promise.resolve(bundle) });
    const stale = demo.click('original');
    await demo.click('tampered');
    const finalDetails = demo.nodes['demo-details'].textContent;
    const finalView = presentationSnapshot(demo);
    if (failOld) first.reject(new Error('late unavailable bundle')); else first.resolve(bundle);
    await stale;
    assert.equal(demo.nodes['demo-state'].textContent, 'REJECTED');
    assert.equal(demo.nodes['demo-details'].textContent, finalDetails);
    assert.deepEqual(presentationSnapshot(demo), finalView);
    assert.equal(demo.nodes['demo-error'].hidden, true);
    assert.equal(demo.panel.attributes.get('aria-busy'), 'false');
  }
});
test('a crypto operation already in flight cannot overwrite a newer example', async () => {
  const firstSignature = deferred();
  const enteredVerification = deferred();
  let calls = 0;
  const subtle = {
    importKey: (...args) => webcrypto.subtle.importKey(...args),
    verify: async (...args) => {
      const valid = await webcrypto.subtle.verify(...args);
      if (++calls === 1) { enteredVerification.resolve(); await firstSignature.promise; }
      return valid;
    },
  };
  const demo = demoRoot({ subtle });
  const stale = demo.click('original');
  await enteredVerification.promise;
  await demo.click('tampered');
  const latest = presentationSnapshot(demo);
  firstSignature.resolve(); await stale;
  assert.deepEqual(presentationSnapshot(demo), latest);
  assert.equal(demo.nodes['demo-state'].textContent, 'REJECTED');
  assert.equal(JSON.parse(demo.nodes['demo-details'].textContent).example, 'tampered');
});
test('mode changes invalidate pending replay before it can show a stale MATCHED', async () => {
  const first = deferred(); let calls = 0;
  const demo = demoRoot({ loadBundle: () => ++calls === 1 ? first.promise : Promise.resolve(bundle) });
  const stale = demo.click('original');
  await demo.changeMode('current');
  const current = presentationSnapshot(demo);
  first.resolve(bundle); await stale;
  assert.deepEqual(presentationSnapshot(demo), current);
  assert.equal(demo.nodes['demo-state'].textContent, 'REJECTED');
  assert.equal(JSON.parse(demo.nodes['demo-details'].textContent).mode, 'current');
});
test('component-scoped controller leaves another component untouched and reports inline accessible failures', async () => {
  const other = demoRoot();
  const demo = demoRoot({ loadBundle: async () => { throw new Error('offline'); } });
  await demo.click('original');
  assert.equal(demo.nodes['demo-state'].textContent, 'UNKNOWN');
  assert.equal(demo.nodes['demo-error'].hidden, false);
  assert.match(demo.nodes['demo-error'].textContent, /public demonstration file may be unavailable/);
  assert.match(demo.nodes['demo-as-of'].textContent, /Not evaluated/);
  assert.equal(other.nodes['demo-state'].textContent, '');
  await demo.click('unavailable');
  assert.equal(demo.nodes['demo-state'].textContent, 'UNKNOWN');
  assert.equal(demo.nodes['demo-error'].hidden, true);
  assert.equal(JSON.parse(demo.nodes['demo-details'].textContent).simulated, true);
  const component = fs.readFileSync(new URL('../src/components/OfficialSourceDemo.astro', import.meta.url), 'utf8');
  assert.match(component, /initializeOfficialSourceDemo\(root\)/);
  assert.match(component, /id="demo-error"[^>]*role="alert"/);
  assert.doesNotMatch(component, /document\.querySelectorAll[^\n]*\[data-example\]/);
});

function presentationSnapshot(demo) {
  return {
    nodes: Object.fromEntries(Object.entries(demo.nodes).map(([id, node]) => [id, {
      text: node.textContent, hidden: node.hidden, attributes: Object.fromEntries(node.attributes),
    }])),
    panel: Object.fromEntries(demo.panel.attributes),
  };
}
function assertVisiblePresentation(demo, view) {
  assert.equal(demo.nodes['demo-verdict'].textContent, view.verdict);
  assert.equal(demo.nodes['demo-result-context'].textContent, view.modeLabel);
  assert.equal(demo.nodes['demo-explanation'].textContent, view.explanation);
  assert.equal(demo.nodes['demo-statement'].textContent, view.statement);
  assert.equal(demo.nodes['demo-statement-label'].textContent, view.statementLabel);
  assert.equal(demo.nodes['demo-signer'].textContent, view.signerLabel);
  assert.equal(demo.panel.attributes.get('data-outcome'), view.outcome);
  for (const [name, check] of Object.entries(view.checks)) {
    assert.equal(demo.nodes[`demo-${name}-state`].textContent, check.title);
    assert.equal(demo.nodes[`demo-${name}-state`].attributes.get('data-status'), check.status);
    assert.equal(demo.nodes[`demo-${name}-note`].textContent, check.note);
  }
}
test('controller renders the plain verdict, exact statement and each breakdown for all modes and examples', async () => {
  const demo = demoRoot();
  assertVisiblePresentation(demo, officialSourcePresentation());
  for (const mode of ['replay', 'current']) {
    await demo.changeMode(mode);
    for (const [example, outcome] of controlledPresentations(mode)) {
      await demo.click(example);
      const result = JSON.parse(demo.nodes['demo-details'].textContent);
      assertVisiblePresentation(demo, officialSourcePresentation({ result }));
      assert.equal(demo.panel.attributes.get('data-outcome'), outcome);
      assert.equal(demo.nodes['demo-state'].textContent, result.state, 'raw machine result is preserved');
      assert.equal(demo.nodes['demo-as-of'].textContent, result.asOf);
      assert.equal(demo.nodes['demo-captured'].textContent, bundle.capturedAt);
      assert.equal(demo.nodes['demo-expiry'].textContent, bundle.expiresAt);
      assert.equal(result.verdict, undefined, 'presentation is separate from the machine evidence');
      assert.equal(demo.nodes['demo-error'].hidden, true);
      assert.equal(demo.panel.attributes.get('aria-busy'), 'false');
    }
  }
  demo.dispose();
});
test('an idle time-lens change stays unverified and does not load any policy or example', async () => {
  let loads = 0;
  const demo = demoRoot({
    loadPolicy: async () => { loads++; return { assess }; },
    loadBundle: async () => { loads++; return bundle; },
  });
  await demo.changeMode('current');
  assertVisiblePresentation(demo, officialSourcePresentation({ mode: 'current' }));
  assert.equal(demo.nodes['demo-state'].textContent, '');
  assert.match(demo.nodes['demo-as-of'].textContent, /Choose an example/);
  await demo.changeMode('replay');
  assertVisiblePresentation(demo, officialSourcePresentation());
  assert.equal(loads, 0);
  demo.dispose();
});
test('pending and failed checks clear every earlier positive presentation surface', async () => {
  const pending = deferred(); let calls = 0;
  const demo = demoRoot({ loadBundle: () => ++calls === 1 ? Promise.resolve(bundle) : pending.promise });
  await demo.click('original');
  assert.equal(demo.panel.attributes.get('data-outcome'), 'matched');
  const work = demo.click('tampered');
  assertVisiblePresentation(demo, officialSourcePresentation({ phase: 'checking', example: 'tampered' }));
  assert.equal(demo.nodes['demo-state'].textContent, 'Checking…');
  assert.equal(demo.panel.attributes.get('aria-busy'), 'true');
  pending.reject(new Error('controlled missing public file'));
  await work;
  assertVisiblePresentation(demo, officialSourcePresentation({ phase: 'error', example: 'tampered' }));
  assert.equal(demo.nodes['demo-state'].textContent, 'UNKNOWN');
  assert.equal(demo.nodes['demo-error'].hidden, false);
  assert.equal(demo.panel.attributes.get('aria-busy'), 'false');
  assert.match(demo.nodes['demo-details'].textContent, /No positive conclusion/);
  await demo.click('unavailable');
  assert.equal(demo.nodes['demo-error'].hidden, true, 'a controlled unknown is distinct from a failed load');
  assert.match(demo.nodes['demo-explanation'].textContent, /deliberately simulates missing evidence/);
  demo.dispose();
});
test('late replay completions and errors cannot overwrite any current-time presentation surface', async () => {
  for (const failOld of [false, true]) {
    const first = deferred(); let calls = 0;
    const demo = demoRoot({ loadBundle: () => ++calls === 1 ? first.promise : Promise.resolve(bundle) });
    const stale = demo.click('original');
    await demo.changeMode('current');
    const current = presentationSnapshot(demo);
    assert.match(demo.nodes['demo-verdict'].textContent, /statement expired/);
    assert.equal(demo.nodes['demo-signature-state'].attributes.get('data-status'), 'pass');
    assert.equal(demo.nodes['demo-dates-state'].attributes.get('data-status'), 'fail');
    if (failOld) first.reject(new Error('late archived file error')); else first.resolve(bundle);
    await stale;
    assert.deepEqual(presentationSnapshot(demo), current);
    demo.dispose();
  }
});
test('disposing in-flight work removes controls and prevents all late presentation writes', async () => {
  for (const failLate of [false, true]) {
    const work = deferred(); let loads = 0;
    const demo = demoRoot({ loadBundle: () => { loads++; return work.promise; } });
    const pending = demo.click('original');
    demo.dispose();
    const disposed = presentationSnapshot(demo);
    assert.equal(demo.click('tampered'), undefined);
    assert.equal(demo.changeMode('current'), undefined);
    if (failLate) work.reject(new Error('disposed request failure')); else work.resolve(bundle);
    await pending;
    assert.equal(loads, 1);
    assert.deepEqual(presentationSnapshot(demo), disposed);
    for (const button of Object.values(demo.buttons)) assert.equal(button.handlers.size, 0);
    assert.equal(demo.nodes['demo-mode'].handlers.size, 0);
  }
});
test('a contradictory MATCHED label cannot override failed, unknown or malformed presentation evidence', async () => {
  const good = await evaluateOfficialSourceExample({ bundle, example: 'original', mode: 'replay', assess, subtle: webcrypto.subtle });
  const probes = [
    { ...good, signatureValid: false },
    { ...good, signer: 'did:key:different-demo-owner' },
    { ...good, payload: { ...good.payload, iss: 'did:key:different-demo-owner' } },
    { ...good, nowSeconds: good.payload.exp },
    { ...good, nowSeconds: NaN },
    { ...good, payload: { ...good.payload, exp: 'not-a-date' } },
    { ...good, payload: { ...good.payload, exp: 1e100 } },
    { ...good, payload: { ...good.payload, nbf: -1e100 } },
  ];
  for (const result of probes) {
    const p = officialSourcePresentation({ result: { ...result, state: 'MATCHED' } });
    assert.equal(p.outcome, 'unknown', 'a raw state label is not presentation acceptance');
    assert.match(p.verdict, /Inconsistent/);
    assert.ok(Object.values(p.checks).some(check => check.status !== 'pass'));
  }
  assert.equal(officialSourcePresentation({ result: good }).outcome, 'matched');
  assert.match(officialSourcePresentation().checks.dates.note, /within its allowed dates at the selected time/);
});

test('presentation keeps the live plain-language outcome outside the technical disclosure and preserves selectors', () => {
  const component = fs.readFileSync(new URL('../src/components/OfficialSourceDemo.astro', import.meta.url), 'utf8');
  const resultPanel = component.match(/<div class="result"[^>]*>([\s\S]*?)<\/div>/)[0];
  assert.match(resultPanel, /aria-live="polite"/);
  assert.match(resultPanel, /aria-atomic="true"/);
  assert.match(resultPanel, /id="demo-verdict"/);
  assert.match(resultPanel, /id="demo-explanation"/);
  assert.doesNotMatch(resultPanel, /id="demo-state"|id="demo-details"/);
  const technical = component.match(/<details class="technical-details">([\s\S]*?)<\/details>/)[1];
  assert.match(technical, /id="demo-state"/);
  assert.match(technical, /id="demo-details"/);
  for (const id of ['demo-mode', 'demo-verdict', 'demo-as-of', 'demo-captured', 'demo-expiry', 'demo-expected-source', 'demo-signer']) {
    assert.ok(component.indexOf(`id="${id}"`) < component.indexOf('<details class="technical-details">'), `${id} remains visible`);
  }
  assert.match(component, /<option value="replay" selected>/);
  assert.match(component, /<option value="current">/);
  assert.deepEqual([...component.matchAll(/data-example="([^"]+)"/g)].map(match => match[1]).sort(), ['expired', 'original', 'tampered', 'unavailable', 'wrong-issuer']);
  assert.equal([...component.matchAll(/<button type="button"/g)].length, 5);
  assert.match(component, /\.choices button\{margin:0;/, 'prose sibling margins must not stagger the experiment buttons');
  for (const name of ['signature', 'source', 'dates']) {
    assert.match(component, new RegExp(`id="demo-${name}-state"`));
    assert.match(component, new RegExp(`id="demo-${name}-note"`));
  }
  assert.match(component, /2026-11-10T21:58:33\.000Z/);
  assert.match(component, /never renews the original/);
  assert.match(component, /not the truth of its claims, legal identity, X account control or permission to act/);
});
test('the documentation leads with the experiment rather than account references or API code', () => {
  const source = fs.readFileSync(new URL('../src/content/docs/start/official-source-demo.mdx', import.meta.url), 'utf8');
  const experiment = source.indexOf('<OfficialSourceDemo />');
  const intro = source.slice(source.indexOf('## Is this message'), experiment).trim().split(/\n\n/);
  assert.ok(intro.length <= 3, 'one question and at most two paragraphs before interaction');
  assert.ok(experiment < source.indexOf('**Our declared public sources:**'));
  assert.ok(experiment < source.indexOf('## Reproduce with the existing DID.is API'));
  assert.match(source, /genuine signature from a different source/);
  assert.match(source, /class="proof-pair"/);
  assert.match(source, /including \*\*13 November\*\*/);
  assert.match(source, /which is not a trusted external clock/);
});
