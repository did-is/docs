import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createPublicKey, verify } from 'node:crypto';
import test from 'node:test';
import { recipePrograms } from './verify-recipes.mjs';

const source = fs.readFileSync(new URL('../src/content/docs/start/recipes.mdx', import.meta.url), 'utf8');
const programs = recipePrograms(source);
test('all three workflows have actual curl, TypeScript and Python programs with explicit API bases', () => {
  assert.equal(programs.size, 10);
  for (const name of ['resolve', 'credential', 'authorize']) for (const ext of ['sh', 'ts', 'py']) {
    const code = programs.get(`${name}.${ext}`);
    assert.ok(code?.includes('BASE'), `${name}.${ext}: explicit base URL`);
    assert.doesNotMatch(code, /https:\/\/did\.is|<root receipt>|<JWT|\.\.\./);
  }
  assert.match(source, /published `@didis\/client` 0\.2\.7/);
  assert.match(source, /published `didis-py` 0\.2\.7/);
  assert.match(source, /revocation is `SKIP`/);
  assert.match(source, /not a valid signed credential/);
  assert.doesNotMatch(source, /Each recipe is a whole program you can paste and run|0\.2\.4|didis\.….?hain/);
});

test('copied input generator runs with built-in crypto and produces genuinely signed and tampered synthetic requests', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'didis-docs-recipes-'));
  try {
    fs.writeFileSync(path.join(dir, 'make-inputs.mjs'), programs.get('make-inputs.mjs'));
    const run = spawnSync(process.execPath, ['make-inputs.mjs'], { cwd: dir, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const json = name => JSON.parse(fs.readFileSync(path.join(dir, name + '.json')));
    const valid = json('valid'), tampered = json('tampered');
    const decode = text => JSON.parse(Buffer.from(text, 'base64url'));
    const [header, payload, signature] = valid.credential.split('.');
    const issuer = decode(payload).iss;
    const jwk = decode(issuer.slice('did:jwk:'.length));
    assert.ok(!('d' in jwk), 'No private key saved in DID');
    const key = createPublicKey({ format: 'jwk', key: jwk });
    const verifyJwt = jwt => { const [h, p, s] = jwt.split('.'); return verify(null, Buffer.from(`${h}.${p}`), key, Buffer.from(s, 'base64url')); };
    assert.equal(decode(header).kid, issuer + '#0');
    assert.equal(verifyJwt(valid.credential), true);
    assert.equal(verifyJwt(tampered.credential), false);
    assert.equal(tampered.credential.split('.')[2], signature);
    assert.equal(decode(payload).vc.credentialSubject.age_over_18, true);
    assert.equal(decode(tampered.credential.split('.')[1]).vc.credentialSubject.age_over_18, false);
    assert.deepEqual(valid.requiredClaims, [{ path: '/credentialSubject/age_over_18', equals: true }]);
    const allow = json('allow');
    assert.equal(verifyJwt(allow.chain[0]), true);
    assert.deepEqual(allow.trustedRoots, [issuer]);
    assert.deepEqual(decode(allow.chain[0].split('.')[1]).cap, ['payments:refund']);
    assert.equal(json('wrong-tool').tool, 'payments:transfer');
    assert.notDeepEqual(json('untrusted-root').trustedRoots, allow.trustedRoots);
    assert.deepEqual(json('empty-chain').chain, []);
    assert.equal(json('unsupported').credential.proof.cryptosuite, 'eddsa-rdfc-2022');
    assert.deepEqual(fs.readdirSync(dir).sort(), ['allow.json', 'empty-chain.json', 'make-inputs.mjs', 'tampered.json', 'unsupported.json', 'untrusted-root.json', 'valid.json', 'wrong-tool.json']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
