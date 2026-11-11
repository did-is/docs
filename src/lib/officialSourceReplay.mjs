// Replay only this packaged public demonstration. This is not a general JWT verifier.
export const OFFICIAL_SOURCE_BASE = '/demo/official-source-20261103';
export const SNAPSHOT_CAPTURED_AT = '2026-11-03T21:58:33.730Z';
export const STATEMENT_EXPIRES_AT = '2026-11-10T21:58:33.000Z';
const expectedIssuer = 'did:web:did.is';
const expectedKid = `${expectedIssuer}#key-1`;
const examples = new Set(['original', 'tampered', 'wrong-issuer', 'unavailable', 'expired']);

// Always pass a finite, explicit time to the unchanged archived assess policy.
export function sourceEvaluationTime(mode = 'replay', capturedAt = SNAPSHOT_CAPTURED_AT, now = Date.now) {
  if (capturedAt !== SNAPSHOT_CAPTURED_AT) throw new Error('Unexpected public-key snapshot date.');
  if (mode !== 'replay' && mode !== 'current') throw new Error('Choose a supported evaluation mode.');
  const milliseconds = mode === 'replay' ? Date.parse(capturedAt) : now();
  if (!Number.isFinite(milliseconds)) throw new Error('The evaluation clock is unavailable.');
  return { mode, asOf: new Date(milliseconds).toISOString(), nowSeconds: milliseconds / 1000, snapshotCapturedAt: capturedAt };
}

const bytes = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const decode = text => JSON.parse(new TextDecoder().decode(bytes(text)));

export async function evaluateOfficialSourceExample({ bundle, example, mode = 'replay', assess, subtle = globalThis.crypto?.subtle, now = Date.now }) {
  if (!examples.has(example)) throw new Error('Choose a controlled example.');
  if (example === 'unavailable') {
    const time = sourceEvaluationTime(mode, SNAPSHOT_CAPTURED_AT, now);
    return { ...assess({ available: false }, time.nowSeconds), ...time, example, expectedIssuer, expiresAt: STATEMENT_EXPIRES_AT, simulated: true };
  }
  if (bundle?.capturedAt !== SNAPSHOT_CAPTURED_AT || bundle.expectedIssuer !== expectedIssuer || bundle.expectedKid !== expectedKid || bundle.didDocument?.id !== expectedIssuer) {
    throw new Error('Unexpected public demonstration bundle.');
  }
  if (bundle.expiresAt !== STATEMENT_EXPIRES_AT) throw new Error('Unexpected archived expiry.');
  const parts = bundle.fixtures[example].split('.');
  if (parts.length !== 3) throw new Error('Invalid controlled statement.');
  const [h, p, s] = parts;
  const header = decode(h);
  const payload = decode(p);
  if (header.alg !== 'EdDSA' || header.typ !== 'JWT') throw new Error('Unexpected demonstration header.');
  const vm = bundle.didDocument.verificationMethod.find(method => method.id === header.kid);
  let jwk, signer;
  if (header.kid === expectedKid && vm && bundle.didDocument.assertionMethod.includes(header.kid)) {
    jwk = vm.publicKeyJwk;
    signer = bundle.didDocument.id;
  } else if (example === 'wrong-issuer' && header.kid === `did:jwk:${btoa(JSON.stringify(bundle.otherPublicJwk)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}#0`) {
    jwk = bundle.otherPublicJwk;
    signer = header.kid.split('#')[0];
  } else {
    throw new Error('Key not present in the controlled fixture set.');
  }
  if (!subtle) throw new Error('Ed25519 Web Crypto is unavailable.');
  const key = await subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify']);
  const signatureValid = await subtle.verify('Ed25519', key, bytes(s), new TextEncoder().encode(`${h}.${p}`));
  // Read the real clock after asynchronous crypto, not when a click was queued.
  const time = sourceEvaluationTime(mode, bundle.capturedAt, now);
  return { ...assess({ signatureValid, signer, payload }, time.nowSeconds), ...time, example, signatureValid, signer, expectedIssuer, expiresAt: bundle.expiresAt, payload };
}

// Presentation only: explain the completed policy result, never replace the verifier.
// Later checks are not portrayed as passes when the policy stopped at earlier evidence.
export function officialSourcePresentation({ result, phase = result ? 'complete' : 'idle', mode = result?.mode ?? 'replay', example = result?.example } = {}) {
  const modeLabel = mode === 'current'
    ? 'Current device dates · archived public keys'
    : 'Historical replay · not current validity';
  const label = {
    original: 'Original statement',
    tampered: 'Changed text · controlled fixture',
    'wrong-issuer': 'Different signer · controlled fixture',
    expired: 'Expired statement · controlled fixture',
    unavailable: 'Missing evidence · controlled simulation',
  }[example] ?? 'Message being checked';
  const waiting = phase === 'checking';
  const check = (status, title, note) => ({ status, title, note });
  const presentation = {
    modeLabel, expectedIssuer, statementLabel: label, signerLabel: waiting ? 'Waiting' : 'Not checked',
    outcome: waiting ? 'checking' : 'idle',
    verdict: waiting ? 'Checking the message — no verdict yet.' : 'Start with the original statement.',
    explanation: waiting ? 'Checking the selected controlled example. No positive conclusion has been made.' : 'Then compare changed text and a different signer. The default replays the recorded time; it does not establish current validity.',
    statement: waiting ? 'Loading the selected public example…' : 'Select an example to read its exact statement here.',
    checks: {
      signature: check('waiting', waiting ? 'Checking' : 'Not checked', 'Does the signature match the message shown?'),
      source: check('waiting', waiting ? 'Waiting' : 'Not checked', 'The expected website is fixed before checking, not chosen by the signer.'),
      dates: check('waiting', waiting ? 'Waiting' : 'Not checked', 'Is this statement within its allowed dates at the selected time?'),
    },
  };
  if (phase === 'idle') {
    if (mode === 'current') presentation.explanation = 'Choose an example to check dates at your device time. The public keys are still archived, not looked up live.';
    return presentation;
  }
  if (waiting) return presentation;
  if (phase === 'error' || !['MATCHED', 'REJECTED'].includes(result?.state)) {
    presentation.outcome = 'unknown';
    presentation.verdict = 'No conclusion — this is not a pass.';
    presentation.explanation = result?.simulated
      ? 'This button deliberately simulates missing evidence; it does not report a live outage.'
      : 'The check could not be completed. Do not treat this as verified.';
    presentation.statement = 'No checked statement is available.';
    presentation.signerLabel = 'Not established';
    presentation.checks = {
      signature: check('unknown', 'Unknown', 'No completed signature check.'),
      source: check('unknown', 'Not established', 'Missing evidence cannot establish the expected source.'),
      dates: check('unknown', 'Not established', 'No acceptance decision about a signed statement’s dates.'),
    };
  } else {
    presentation.statement = typeof result.payload?.statement === 'string' ? result.payload.statement : 'No readable statement was supplied.';
    const signatureMatches = result.signatureValid === true;
    const sourceMatches = signatureMatches && result.signer === expectedIssuer && result.payload?.iss === expectedIssuer;
    presentation.signerLabel = !signatureMatches ? 'Not authenticated' : result.signer === expectedIssuer ? 'DID.is website' : 'Different demonstration key';
    presentation.checks.signature = signatureMatches
      ? check('pass', 'Signature matches', result.example === 'wrong-issuer' ? 'The different demonstration key really signed its own words.' : 'Checked now with the archived website public key, not a fresh key lookup.')
      : check('fail', 'Signature does not match', 'The words changed while the archived signature stayed the same.');
    presentation.checks.source = !signatureMatches
      ? check('unknown', 'Not established', 'A claimed issuer is not authenticated when the signature fails.')
      : sourceMatches
        ? check('pass', 'Expected source', 'Both the signing key and signed issuer match did:web:did.is.')
        : check('fail', 'Different source', 'A valid signature from this other demo key is not DID.is provenance.');
    const { nbf, exp } = result.payload ?? {};
    const expiryDate = new Date(exp * 1000);
    const notBeforeDate = new Date(nbf * 1000);
    const finiteDates = Number.isFinite(nbf) && Number.isFinite(exp) && nbf < exp && Number.isFinite(expiryDate.getTime()) && Number.isFinite(notBeforeDate.getTime());
    const expiry = Number.isFinite(expiryDate.getTime()) ? expiryDate.toISOString() : undefined;
    const expired = finiteDates && result.nowSeconds >= exp;
    const early = finiteDates && result.nowSeconds < nbf;
    presentation.checks.dates = !sourceMatches
      ? check('unknown', 'Not relied on', `The acceptance policy stopped at the ${signatureMatches ? 'source' : 'signature'} check; dates cannot repair it.`)
      : !finiteDates
        ? check('fail', 'Invalid dates', 'Missing or malformed dates cannot be accepted.')
        : !Number.isFinite(result.nowSeconds)
          ? check('unknown', 'Not established', 'No finite evaluation time is available.')
          : check(expired || early ? 'fail' : 'pass', expired ? 'Expired at this time' : early ? 'Not yet valid' : mode === 'replay' ? 'Within dates at replay time' : 'Within dates at device time', `Selected statement expires ${expiry ?? 'at an invalid date'} (exclusive).`);
    presentation.outcome = result.state === 'MATCHED' ? 'matched' : 'rejected';
    if (result.state === 'MATCHED') {
      presentation.verdict = mode === 'replay' ? 'These words matched at the recorded time.' : 'These words match at the displayed device time.';
      presentation.explanation = 'The exact statement, expected DID.is source and date window match this archived evidence.';
    } else if (!signatureMatches) {
      presentation.verdict = 'The words changed. The signature fails.';
      presentation.explanation = 'Editing the statement without signing it again breaks the exact-words check.';
    } else if (!sourceMatches) {
      presentation.verdict = 'A real signature — from a different source.';
      presentation.explanation = 'Anyone can sign with their own key. This one is not the expected DID.is website key.';
    } else if (expired) {
      presentation.verdict = 'The signature matches, but the statement expired.';
      presentation.explanation = 'A genuine signature does not extend a deadline. This statement is not accepted at the displayed evaluation time.';
    } else if (early) {
      presentation.verdict = 'The signature matches, but it is too early.';
      presentation.explanation = 'The statement’s date window has not started at the displayed evaluation time.';
    } else {
      presentation.verdict = 'Not accepted as the expected statement.';
      presentation.explanation = 'The demonstration policy is not satisfied; inspect the technical reason below.';
    }
    // A presentation result cannot inherit a positive headline from a contradictory producer label.
    // Preserve the raw machine result for inspection, but require all three completed checks here.
    if (result.state === 'MATCHED' && Object.values(presentation.checks).some(check => check.status !== 'pass')) {
      presentation.outcome = 'unknown';
      presentation.verdict = 'Inconsistent check result — no match claimed.';
      presentation.explanation = 'The raw verdict conflicts with the signature, source or date evidence. Do not treat this as verified; inspect the technical result.';
    }
  }
  if (result?.asOf) presentation.explanation += mode === 'replay'
    ? ` Historical replay at ${result.asOf}; this does not establish current validity.`
    : ` Current-time date policy evaluated at ${result.asOf} using the archived key, not a live DID lookup.`;
  return presentation;
}

// Scope every lookup to this component. Newer clicks/mode changes supersede old work.
export function initializeOfficialSourceDemo(root, {
  loadPolicy = () => import(/* @vite-ignore */ `${OFFICIAL_SOURCE_BASE}/policy.mjs`),
  loadBundle = async () => {
    const response = await fetch(`${OFFICIAL_SOURCE_BASE}/bundle.json`);
    if (!response.ok) throw new Error('Public demonstration bundle unavailable.');
    return response.json();
  },
  subtle = globalThis.crypto?.subtle,
  now = Date.now,
} = {}) {
  const find = id => root.querySelector(`#${id}`);
  const state = find('demo-state');
  const explanation = find('demo-explanation');
  const details = find('demo-details');
  const modeSelect = find('demo-mode');
  const modeNote = find('demo-mode-note');
  const asOf = find('demo-as-of');
  const error = find('demo-error');
  const resultPanel = root.querySelector('.result');
  const verdict = find('demo-verdict');
  const resultContext = find('demo-result-context');
  const statement = find('demo-statement');
  const statementLabel = find('demo-statement-label');
  const signer = find('demo-signer');
  const checkNodes = Object.fromEntries(['signature', 'source', 'dates'].map(name => [name, {
    state: find(`demo-${name}-state`), note: find(`demo-${name}-note`),
  }]));
  const buttons = [...root.querySelectorAll('[data-example]')];
  let sequence = 0;
  let selected;
  modeSelect.value = 'replay';

  function updateModeNote(mode) {
    modeNote.textContent = mode === 'replay'
      ? `Historical replay at ${SNAPSHOT_CAPTURED_AT} — not current validity. Dates are evaluated at the packaged capture time; signatures are checked now against the archived public keys.`
      : 'Current-time date check — uses your device clock and the same archived public keys. This is still not a live DID lookup.';
  }
  function showPresentation(presentation) {
    resultPanel.setAttribute('data-outcome', presentation.outcome);
    verdict.textContent = presentation.verdict;
    resultContext.textContent = presentation.modeLabel;
    explanation.textContent = presentation.explanation;
    statement.textContent = presentation.statement;
    statementLabel.textContent = presentation.statementLabel;
    signer.textContent = presentation.signerLabel;
    for (const [name, nodes] of Object.entries(checkNodes)) {
      const check = presentation.checks[name];
      nodes.state.textContent = check.title;
      nodes.state.setAttribute('data-status', check.status);
      nodes.note.textContent = check.note;
    }
  }
  updateModeNote('replay');
  showPresentation(officialSourcePresentation());

  async function run(example) {
    const request = ++sequence;
    selected = example;
    const mode = modeSelect.value;
    updateModeNote(mode);
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.example === example));
    resultPanel.setAttribute('aria-busy', 'true');
    state.textContent = 'Checking…';
    showPresentation(officialSourcePresentation({ phase: 'checking', mode, example }));
    details.textContent = 'Check in progress; no conclusion yet.';
    asOf.textContent = mode === 'replay' ? SNAPSHOT_CAPTURED_AT : 'Pending — the device clock is read when this check finishes.';
    error.hidden = true;
    error.textContent = '';
    try {
      const [{ assess }, bundle] = await Promise.all([loadPolicy(), example === 'unavailable' ? undefined : loadBundle()]);
      if (request !== sequence) return;
      const result = await evaluateOfficialSourceExample({ bundle, example, mode, assess, subtle, now });
      if (request !== sequence) return;
      state.textContent = result.state;
      showPresentation(officialSourcePresentation({ result }));
      asOf.textContent = result.asOf;
      find('demo-captured').textContent = result.snapshotCapturedAt;
      find('demo-expiry').textContent = result.expiresAt;
      details.textContent = JSON.stringify(result, null, 2);
    } catch {
      if (request !== sequence) return;
      state.textContent = 'UNKNOWN';
      showPresentation(officialSourcePresentation({ phase: 'error', mode, example }));
      asOf.textContent = 'Not evaluated — no completed date-policy check.';
      details.textContent = 'No positive conclusion was made.';
      error.textContent = 'Ed25519 Web Crypto may be unsupported, the device clock may be invalid, or a public demonstration file may be unavailable. Retry or inspect the downloadable current-time API example below.';
      error.hidden = false;
    } finally {
      if (request === sequence) resultPanel.setAttribute('aria-busy', 'false');
    }
  }

  const listeners = buttons.map(button => {
    const handler = () => run(button.dataset.example);
    button.addEventListener('click', handler);
    return [button, 'click', handler];
  });
  const changeMode = () => {
    if (selected) return run(selected);
    sequence++;
    updateModeNote(modeSelect.value);
    showPresentation(officialSourcePresentation({ mode: modeSelect.value }));
    asOf.textContent = modeSelect.value === 'replay' ? SNAPSHOT_CAPTURED_AT : 'Choose an example to evaluate at the current device time.';
  };
  modeSelect.addEventListener('change', changeMode);
  return () => {
    sequence++;
    for (const [button, event, handler] of listeners) button.removeEventListener(event, handler);
    modeSelect.removeEventListener('change', changeMode);
  };
}
