import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPublicKey, verify, webcrypto } from 'node:crypto';
import { assess } from '../public/demo/official-source-20261103/policy.mjs';
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
  assert.match(source,/No reciprocal X post has been captured/);assert.match(source,/not legal certification/i);
});
