#!/usr/bin/env node
// Opt-in real-engine integration test: no production requests, no mocks, no new dependencies.
// See --help. SDK artifacts must already be extracted from the published registries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function recipePrograms(source) {
  return new Map([...source.matchAll(/```(?:js|ts|python|bash) title="([\w.-]+)"\n([\s\S]*?)\n```/g)].map(m => [m[1], m[2] + '\n']));
}
export function checkResult(kind, rows) {
  const results = rows.map(row => row.result ?? row);
  if (kind === 'resolve') {
    assert.equal(results.length, 1);
    const r = results[0];
    assert.equal(r.didDocument.id, 'did:key:z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2');
    assert.equal(r.verdict.outcome, 'RESOLVED');
    assert.equal(r.evidence.source.kind, 'LOCAL_DERIVATION');
    for (const [id, state] of [['integrity', 'SELF_CERTIFYING'], ['origin', 'NOT_APPLICABLE'], ['organization', 'NOT_ESTABLISHED']]) assert.equal(r.dimensions.find(d => d.id === id)?.state, state);
  } else if (kind === 'credential') {
    assert.deepEqual(results.map(r => r.status), ['VALID', 'INVALID', 'UNSUPPORTED']);
    assert.equal(results[0].requirements.met, true);
    assert.equal(results[0].requirements.results[0].result, 'SATISFIED');
    assert.equal(results[0].checks.find(c => c.id === 'proof')?.status, 'PASS');
    assert.equal(results[0].checks.find(c => c.id === 'status')?.status, 'SKIP');
    assert.equal(results[1].checks.find(c => c.id === 'proof')?.status, 'FAIL');
    for (const r of results.slice(1)) assert.notEqual(r.requirements?.met, true);
    if (rows[0].result) assert.deepEqual(rows.map(r => r.accept), [true, false, false]);
  } else {
    assert.deepEqual(results.map(r => r.authorization.decision), ['ALLOW', 'DENY', 'DENY', 'DENY']);
    assert.deepEqual(results.map(r => r.authorization.authorized), [true, false, false, false]);
    assert.equal(results[0].authorization.matchedCapability, 'payments:refund');
    assert.equal(results[0].chain.status, 'VALID');
    assert.equal(results[0].chain.trustedRoot, true);
    assert.equal(results[0].chain.links.length, 1);
    assert.equal(results[0].chain.links[0].signatureValid, true);
    assert.equal(results[3].chain.root, null); // Current serializer's nullable contract.
    assert.equal(results[3].chain.trustedRoot, null);
    if (rows[0].result) assert.deepEqual(rows.map(r => r.accept), [true, false, false, false]);
  }
  return results;
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  await new Promise(r => server.close(r));
  return port;
}
async function run(args) {
  const option = name => { const index = args.indexOf(name); assert.ok(index >= 0 && args[index + 1], `Missing ${name}`); return path.resolve(args[index + 1]); };
  const core = option('--core'), runtime = option('--runtime'), python = option('--python'), evidence = option('--evidence'), serializers = option('--serializers');
  const root = path.resolve(import.meta.dirname, '..');
  const source = fs.readFileSync(path.join(root, 'src/content/docs/start/recipes.mdx'), 'utf8');
  const programs = recipePrograms(source);
  assert.equal(programs.size, 10, 'One actual input generator plus three cases in three languages');
  const jsPackage = path.join(runtime, 'node_modules/@didis/client');
  assert.equal(JSON.parse(fs.readFileSync(path.join(jsPackage, 'package.json'))).version, '0.2.5');
  assert.match(fs.readFileSync(path.join(runtime, 'python/didis_py-0.2.5.dist-info/METADATA'), 'utf8'), /^Version: 0\.2\.5$/m);
  const npm = JSON.parse(fs.readFileSync(path.join(evidence, 'npm-metadata.json')));
  const py = JSON.parse(fs.readFileSync(path.join(evidence, 'pypi-metadata.json')));
  assert.equal('sha512-' + createHash('sha512').update(fs.readFileSync(path.join(evidence, 'client-0.2.5.tgz'))).digest('base64'), npm.dist.integrity);
  assert.equal(sha(fs.readFileSync(path.join(evidence, 'didis_py-0.2.5-py3-none-any.whl'))), py.urls.find(x => x.filename.endsWith('.whl')).digests.sha256);
  // Compare key serializer shape with freshly executed existing engine contract fixtures.
  const fixtures = Object.fromEntries(['resolve', 'credential-valid', 'credential-malformed', 'authorize-allow', 'authorize-deny'].map(name => [name, JSON.parse(fs.readFileSync(path.join(serializers, name + '.json')))]));
  assert.equal(fixtures['credential-valid'].status, 'VALID');
  assert.equal(fixtures['credential-valid'].checks.find(c => c.id === 'status').status, 'SKIP');
  assert.equal(fixtures['credential-malformed'].status, 'MALFORMED');
  assert.equal(fixtures['authorize-deny'].chain.root, null);
  const report = { result: 'PASS', evidence: 'A: current local real engine / HTTP, not production', executedAt: new Date().toISOString(), cases: 3, languages: 3, programs: 9, requests: 24, productionRequests: 0, sdkVersions: { npm: npm.version, pypi: py.info.version }, sdkArtifactHashesVerified: true, coreBinarySha256: sha(fs.readFileSync(core)), programSha256: Object.fromEntries([...programs].map(([name, text]) => [name, sha(text)])), runs: [] };
  fs.mkdirSync(evidence, { recursive: true });
  for (const language of ['curl', 'typescript', 'python']) {
    const dir = path.join(runtime, language);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(runtime, 'package.json'), '{"type":"module"}\n');
    for (const [name, text] of programs) fs.writeFileSync(path.join(dir, name), text);
    const generation = spawnSync(process.execPath, ['make-inputs.mjs'], { cwd: dir, encoding: 'utf8' });
    assert.equal(generation.status, 0, generation.stderr);
    const port = await freePort();
    const log = fs.openSync(path.join(evidence, `engine-${language}.log`), 'w');
    // Deliberately do not inherit deployment, database, loopback-egress or limiter settings.
    const server = spawn(core, [], { cwd: dir, env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), DIDIS_BIND_ADDRESS: '127.0.0.1', RUST_LOG: 'warn' }, stdio: ['ignore', log, log] });
    fs.closeSync(log);
    let requests = 0;
    try {
      const base = `http://127.0.0.1:${port}`;
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) { try { if ((await fetch(base + '/health')).ok) { ready = true; break; } } catch {} await sleep(100); }
      assert.ok(ready, 'Isolated engine health check failed');
      for (const kind of ['resolve', 'credential', 'authorize']) {
        const suffix = { curl: 'sh', typescript: 'ts', python: 'py' }[language];
        const command = language === 'curl' ? 'bash' : language === 'typescript' ? process.execPath : python;
        const result = spawnSync(command, [`${kind}.${suffix}`], { cwd: dir, encoding: 'utf8', timeout: 60000, env: { ...process.env, BASE: base, PYTHONPATH: path.join(runtime, 'python'), NO_PROXY: '127.0.0.1', no_proxy: '127.0.0.1' } });
        fs.writeFileSync(path.join(evidence, `${kind}-${language}.stdout`), result.stdout ?? '');
        fs.writeFileSync(path.join(evidence, `${kind}-${language}.stderr`), result.stderr ?? '');
        assert.equal(result.status, 0, `${kind}/${language}: ${result.stderr}`);
        const rows = result.stdout.trim().split('\n').map(line => JSON.parse(line));
        const results = checkResult(kind, rows);
        // Nullable/omitted field expectations come from the actual Rust serializers, not a mock.
        if (kind === 'resolve') for (const key of Object.keys(fixtures.resolve)) assert.ok(Object.hasOwn(results[0], key), `Resolution serializer field disappeared: ${key}`);
        if (kind === 'authorize') for (const key of Object.keys(fixtures['authorize-deny'].chain)) assert.ok(Object.hasOwn(results[3].chain, key), `Chain serializer field disappeared: ${key}`);
        requests += rows.length;
        report.runs.push({ language, kind, program: `${kind}.${suffix}`, exitCode: 0, http: 'real isolated engine; default egress protection and public limits', responses: rows.length, verdicts: results.map(r => r.status ?? r.verdict?.outcome ?? r.authorization.decision) });
      }
      assert.equal(requests, 8);
    } finally {
      server.kill('SIGINT');
      await Promise.race([new Promise(r => server.once('exit', r)), sleep(3000)]);
      if (server.exitCode === null) server.kill('SIGKILL');
    }
  }
  fs.writeFileSync(path.join(evidence, 'example-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--help')) console.log('node scripts/verify-recipes.mjs --core <current-built-binary> --runtime <published-SDK-extraction-dir> --python <existing-httpx-python> --evidence <ignored-output-dir-with-registry-metadata-and-artifacts> --serializers <fresh-openapi-contract-fixtures-dir>\nRuns extracted docs snippets on three isolated loopback HTTP servers; no production calls or egress-guard overrides.');
  else run(process.argv.slice(2)).catch(error => { console.error(error); process.exitCode = 1; });
}
