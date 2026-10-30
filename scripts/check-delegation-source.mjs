// Optional read-only check against an adjacent service checkout. No core files or
// Cargo target directories are written. Compile the exact pure matching functions
// from delegation source, not a second implementation of their semantics.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { grantCases } from './audit-contracts.test.mjs';

const source = process.argv[2];
const out = process.argv[3];
if (!source || !out) throw new Error('Usage: node scripts/check-delegation-source.mjs <delegation source> <evidence directory>');
fs.mkdirSync(out, { recursive: true });
const text = fs.readFileSync(source, 'utf8');
const start = text.indexOf('enum Grant {');
const end = text.indexOf('\nfn ts(', start);
if (start < 0 || end < 0) throw new Error('Source boundaries changed: review matching functions before extracting');
const extracted = text.slice(start, end);
const rust = `${extracted}\n#[test]\nfn documented_payment_grants_match_actual_core_rules() {\n${grantCases.map(([cap, tool, expected]) => `    assert_eq!(capability_grants_tool(${JSON.stringify(cap)}, ${JSON.stringify(tool)}), ${expected}, ${JSON.stringify(`${cap} -> ${tool}`)});`).join('\n')}\n}\n#[test]\nfn documented_payment_attenuation_matches_actual_core_rules() {\n    assert!(capability_covers("payments:*", "payments:refund"));\n    assert!(capability_covers("payments:*", "payments:card:*"));\n    assert!(!capability_covers("payments:*", "payments.refund"));\n    assert!(!capability_covers("payments:*", "refund"));\n    assert!(!capability_covers("payments:*", "*"));\n    assert!(!capability_covers("payments:refund", "payments:*"));\n}\n`;
const file = path.resolve(out, 'delegation-source-contract.rs');
const binary = path.resolve(out, 'delegation-source-contract');
fs.writeFileSync(file, rust);
fs.writeFileSync(path.resolve(out, 'delegation-source.json'), JSON.stringify({source, sha256: crypto.createHash('sha256').update(text).digest('hex'), extractedSha256: crypto.createHash('sha256').update(extracted).digest('hex'), grantAssertions: grantCases.length, attenuationAssertions: 6}, null, 2));
for (const [command, args] of [[process.env.RUSTC ?? 'rustc', ['--edition=2021', '--test', file, '-o', binary]], [binary, ['--nocapture']]]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
