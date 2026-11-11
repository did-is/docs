// A reader for the fixed, public interview examples. Not another resolver or verifier.
export const INTERVIEW_BASE = '/demo/interview-20261111';
const subject = 'did:web:did.is';
export const GRAPH_RELATIONS = Object.freeze({
  served: { from: 'origin', to: 'document', relation: 'serves', method: 'DID_DOCUMENT_HTTP_RETRIEVAL', state: 'OBSERVED', refs: ['/evidence/source', '/evidence/document/jcsSha256', '/evidence/document/jcsProfile'], title: 'The website served a document' },
  listed: { from: 'document', to: `key:${subject}#key-1`, relation: 'authentication · assertionMethod', method: 'DID_DOCUMENT_KEY_RELATIONSHIP_DECLARATION', state: 'DECLARED', refs: ['/evidence/keys/0', '/evidence/document/relationships', '/evidence/document/jcsSha256', '/evidence/document/jcsProfile'], title: 'The document listed a signing key' },
  signed: { from: `key:${subject}#key-1`, to: 'linkage', relation: 'signed', method: 'DIF_DOMAIN_LINKAGE_JWT_PROOF', state: 'VERIFIED', refs: ['/evidence/domainBinding/credentials/0', '/evidence/keys/0'], title: 'The key signed a domain-link proof' },
});
export const DELEGATION_CASES = Object.freeze({
  read: { title: 'Within the limits', change: 'No change — start with the read request.' },
  'wrong-root': { title: 'Change the expected owner', change: 'Same signed chain and read request. Only the application’s expected root changes.' },
  'outside-scope': { title: 'Ask to write instead', change: 'Same signed chain and expected root. Only the requested action changes.' },
  'widened-child': { title: 'Delegate too much', change: 'The child claims a broader capability and is genuinely signed again. This is not a broken-signature test.' },
});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const strings = value => Array.isArray(value) && value.every(v => typeof v === 'string');
export function displayTime(value) {
  return time(value) ? new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : 'Not established';
}

// Read only own properties. These pointers refer to this exact captured response, not a URL.
export function evidenceAt(document, pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/evidence/')) throw new Error('Expected a same-response evidence reference.');
  let value = document;
  for (const encoded of pointer.slice(1).split('/')) {
    if (/~(?![01])/u.test(encoded)) throw new Error('Malformed evidence reference.');
    const part = encoded.replace(/~1/g, '/').replace(/~0/g, '~');
    if (['__proto__', 'prototype', 'constructor'].includes(part) || value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) throw new Error('Evidence was not captured.');
    value = value[part];
  }
  return value;
}

export function graphRelationPresentation(graph, selected = 'listed') {
  const spec = GRAPH_RELATIONS[selected];
  if (!spec || graph?.did !== subject || !time(graph.observedAt) || !Array.isArray(graph.edges) || !object(graph.evidence)) throw new Error('This recorded graph is unavailable.');
  const matches = graph.edges.filter(edge => edge.from === spec.from && edge.to === spec.to && edge.relation === spec.relation);
  if (matches.length !== 1) throw new Error('The selected relationship was not captured uniquely.');
  const edge = matches[0], p = edge.provenance;
  if (!object(p) || p.method !== spec.method || p.observedAt !== graph.observedAt || !strings(p.evidenceRefs) || !p.evidenceRefs.length || !strings(p.limitations) || !p.limitations.length || !/^https:\/\//.test(p.sourceUri ?? '')) throw new Error('The relationship has incomplete provenance.');
  if (p.evidenceRefs.length !== spec.refs.length || new Set(p.evidenceRefs).size !== spec.refs.length || !spec.refs.every(ref => p.evidenceRefs.includes(ref))) throw new Error('The references do not describe this fixed relationship.');
  const references = p.evidenceRefs.map(pointer => ({ pointer, value: evidenceAt(graph, pointer) }));
  const state = edge.state;
  const documentUrl = 'https://did.is/.well-known/did.json';
  const configurationUrl = 'https://did.is/.well-known/did-configuration.json';
  const key = graph.evidence.keys?.[0];
  if (selected !== 'signed' && (p.sourceUri !== documentUrl || graph.evidence.source?.url !== p.sourceUri)) throw new Error('The source does not match the displayed document.');
  if (selected === 'served' && state === 'OBSERVED' && (graph.evidence.source?.httpStatus !== 200 || graph.evidence.document?.idMatches !== true)) throw new Error('The retrieval record contradicts its relation.');
  if (selected !== 'served' && (key?.id !== `${subject}#key-1` || key.controller !== subject || key.curve !== 'Ed25519' || key.status !== 'VALID_KEY' || key.jwk?.crv !== 'Ed25519' || key.jwk?.kty !== 'OKP')) throw new Error('The cited key does not match the displayed signing key.');
  if (selected === 'listed' && state === 'DECLARED') {
    if (!['authentication', 'assertionMethod'].every(purpose => key.relationships?.includes(purpose) && graph.evidence.document?.relationships?.[purpose]?.includes(key.id))) throw new Error('The key relationship is not present in the cited document.');
  }
  if (selected === 'signed' && state === 'VERIFIED') {
    const binding = graph.evidence.domainBinding, credential = binding?.credentials?.[0];
    if (p.sourceUri !== configurationUrl || binding?.configurationUrl !== p.sourceUri || binding.status !== 'VERIFIED' || binding.origin !== 'https://did.is' || credential?.origin !== binding.origin || credential.issuer !== subject || credential.subject !== subject || credential.status !== 'VALID' || credential.format !== 'JWT' || credential.proofSuite !== 'JWS EdDSA' || credential.verificationMethod !== key.id) throw new Error('The original credential check does not support this key and source.');
  }
  let summary = 'The captured result does not establish this relationship.';
  let boundary = 'Do not treat incomplete or unsupported evidence as a verified relation.';
  if (selected === 'served' && state === 'OBSERVED') {
    summary = 'The resolver fetched the DID document from the website’s HTTPS address.';
    boundary = 'Fetching a document does not give that document a cryptographic signature.';
  } else if (selected === 'listed' && state === 'DECLARED') {
    summary = 'The document names this key for authentication and signed statements.';
    boundary = 'A listed key is a declaration. It is not a live check that someone possesses its private key.';
  } else if (selected === 'signed' && state === 'VERIFIED') {
    summary = 'The resolver checked this particular domain-link credential’s Ed25519 signature.';
    boundary = 'This proof concerns that domain link at the recorded time, not a legal identity or permission to act.';
  }
  const supported = state === spec.state;
  return { selected, title: supported ? spec.title : 'This relationship was not established.', state: supported ? state : 'UNKNOWN', tone: supported ? (state === 'VERIFIED' ? 'verified' : state === 'OBSERVED' ? 'observed' : 'declared') : 'unknown', summary, boundary, source: p.sourceUri, capturedAt: graph.observedAt, method: p.method, references, raw: { relationship: edge, citedEvidence: references }, coverage: graph.coverage ?? null };
}

const checkState = checks => checks.length && checks.every(check => check.status === 'PASS') ? 'pass' : checks.some(check => check.status === 'FAIL') ? 'fail' : 'unknown';
const checkById = (chain, id) => [...(chain.checks ?? []), ...chain.links.flatMap(link => link.checks ?? [])].filter(check => check.id === id);
const recordedUnknown = (message = 'The recorded result could not be read consistently.') => ({
  tone: 'unknown', decision: 'Unknown', headline: 'No conclusion — not an approval.', explanation: message,
  checks: ['Signatures', 'Expected owner', 'Parent limits', 'Requested action', 'Dates at capture'].map(label => ({ label, status: 'unknown', text: 'Not established' })),
});

// This validates display/binding consistency only. The API produced the cryptographic results.
// A recorded ALLOW never becomes a current authorization or an executed action here.
export async function delegationPresentation(bundle, selected = 'read', { subtle = globalThis.crypto?.subtle } = {}) {
  // Snapshot the displayed record before asynchronous digest comparisons. This is not signature verification.
  try { bundle = structuredClone(bundle); } catch { return recordedUnknown(); }
  const spec = DELEGATION_CASES[selected];
  if (!spec || bundle?.schemaVersion !== 1 || bundle.evidenceClass !== 'recorded-core-verification' || bundle.notCurrentAuthorization !== true || !Array.isArray(bundle.cases) || !time(bundle.capturedAt)) return recordedUnknown();
  const cases = bundle.cases.filter(item => item.id === selected);
  if (cases.length !== 1) return recordedUnknown('This recorded case is missing or ambiguous.');
  const item = cases[0], request = item.request, response = item.response;
  const auth = response?.authorization, chain = response?.chain;
  if (!object(request) || !strings(request.chain) || !request.chain.length || typeof request.tool !== 'string' || !strings(request.trustedRoots) || !request.trustedRoots.length || !object(auth) || !object(chain) || !Array.isArray(chain.links) || !chain.links.length || !Array.isArray(chain.checks) || chain.links.length !== request.chain.length || !time(item.capturedAt)) return recordedUnknown();
  if (auth.tool !== request.tool || auth.root !== chain.root || auth.agent !== chain.leaf || !['ALLOW', 'DENY'].includes(auth.decision) || typeof auth.authorized !== 'boolean' || (auth.decision === 'ALLOW') !== auth.authorized || typeof auth.reason !== 'string' || !['VALID', 'INVALID', 'INDETERMINATE', 'MALFORMED'].includes(chain.status)) return recordedUnknown('The request and recorded answer disagree.');
  const validChecks = checks => Array.isArray(checks) && checks.every(check => object(check) && typeof check.id === 'string' && ['PASS', 'FAIL', 'WARN', 'SKIP', 'UNSUPPORTED', 'INDETERMINATE'].includes(check.status));
  if (!validChecks(chain.checks) || !strings(chain.effectiveCapabilities) || typeof chain.root !== 'string' || typeof chain.leaf !== 'string' || chain.links.some((link, index) => !object(link) || link.index !== index || !validChecks(link.checks) || !strings(link.capabilities) || typeof link.signatureValid !== 'boolean' || !/^[a-f0-9]{64}$/.test(link.digest ?? ''))) return recordedUnknown();
  if (chain.links.length !== 2 || request.tool !== (selected === 'outside-scope' ? 'demo:write' : 'demo:read')) return recordedUnknown('The requested action does not match this fixed example.');
  const expectedCapability = selected === 'widened-child' ? 'other:write' : 'demo:read';
  if (chain.links[0].capabilities.length !== 1 || chain.links[0].capabilities[0] !== 'demo:*' || chain.links[1].capabilities.length !== 1 || chain.links[1].capabilities[0] !== expectedCapability || chain.effectiveCapabilities.length !== 1 || chain.effectiveCapabilities[0] !== expectedCapability) return recordedUnknown('The capability fields disagree with this fixed example.');
  const principals = bundle.principals;
  const roles = ['Demo owner', 'Helper', 'Reader'];
  const dids = [chain.links[0].issuer, chain.links[0].audience, chain.links[1].audience];
  if (chain.links[1].issuer !== dids[1] || !dids.every(did => typeof did === 'string' && did.startsWith('did:key:')) || !Array.isArray(principals) || principals.length !== 3 || principals.some((principal, index) => principal?.role !== roles[index] || principal.did !== dids[index])) return recordedUnknown('The role illustration is not bound to the recorded principals.');
  try {
    if (!subtle) return recordedUnknown('The recorded receipt digests could not be compared.');
    const matches = await Promise.all(request.chain.map(async (compact, index) => {
      if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(compact)) return false;
      const digest = new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(compact)));
      return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('') === chain.links[index].digest;
    }));
    if (!matches.every(Boolean)) return recordedUnknown('The submitted receipts do not match the captured per-link digests.');
  } catch { return recordedUnknown('The recorded receipt digests could not be compared.'); }
  const signature = chain.links.every(link => link.signatureValid === true) && checkState(checkById(chain, 'signature')) === 'pass' ? 'pass' : chain.links.some(link => link.signatureValid === false) ? 'fail' : 'unknown';
  const root = checkState(checkById(chain, 'root'));
  const attenuation = checkState(checkById(chain, 'attenuation'));
  const dates = checkState(checkById(chain, 'time'));
  const expectedRoot = request.trustedRoots.includes(chain.root);
  const finiteDeadline = time(chain.notAfter) && time(auth.expires) && auth.expires === chain.notAfter;
  const linksValid = chain.links.every(link => link.status === 'VALID');
  const bound = chain.root === chain.links[0].issuer && chain.leaf === chain.links.at(-1).audience;
  const allChecks = [...chain.checks, ...chain.links.flatMap(link => link.checks)];
  if (!bound || (chain.trustedRoot === true && !expectedRoot) || (chain.trustedRoot === false && expectedRoot) || (root === 'pass' && (chain.trustedRoot !== true || !expectedRoot)) || (root === 'fail' && chain.trustedRoot !== false)) return recordedUnknown('The recorded authority checks disagree.');
  const scopeCovered = request.tool === 'demo:read' && expectedCapability === 'demo:read';
  if (chain.status === 'VALID' && root === 'pass' && auth.authorized !== scopeCovered) return recordedUnknown('The recorded decision contradicts its requested action and capability.');
  if (auth.authorized && (chain.status !== 'VALID' || !linksValid || signature !== 'pass' || root !== 'pass' || attenuation !== 'pass' || dates !== 'pass' || !finiteDeadline || auth.matchedCapability !== request.tool || !chain.effectiveCapabilities.includes(auth.matchedCapability) || Date.parse(item.capturedAt) > Date.parse(chain.notAfter) || allChecks.some(check => ['FAIL', 'INDETERMINATE', 'UNSUPPORTED'].includes(check.status)))) return recordedUnknown('An ALLOW label conflicts with the captured checks.');
  const scope = chain.status === 'VALID' && root === 'pass' ? (scopeCovered ? 'pass' : 'fail') : 'unknown';
  let headline = auth.authorized ? 'The read request stayed within the limits.' : 'The recorded check rejected this request.';
  let explanation = auth.authorized ? 'The expected owner, signed chain, time window and requested action matched at capture. Nothing was executed.' : auth.reason;
  if (!auth.authorized && selected === 'wrong-root' && signature === 'pass' && root === 'fail') {
    headline = 'Right signatures. Wrong starting authority.';
    explanation = 'The same chain starts with an owner that the application did not choose to trust.';
  } else if (!auth.authorized && selected === 'outside-scope' && chain.status === 'VALID' && scope === 'fail') {
    headline = 'Valid chain. This request is outside its scope.';
    explanation = 'The reader received read access, not write access. A valid chain is not permission for every action.';
  } else if (!auth.authorized && selected === 'widened-child' && signature === 'pass' && attenuation === 'fail') {
    headline = 'A delegate cannot grant more than it received.';
    explanation = 'The child’s signature is genuine, but it claims authority outside its parent’s grant.';
  }
  return { selected, tone: auth.authorized ? 'allowed' : 'denied', decision: auth.authorized ? 'Allowed at capture' : 'Denied at capture', headline, explanation, change: spec.change, tool: request.tool, expectedRoots: request.trustedRoots, capturedAt: item.capturedAt, expires: chain.notAfter, root: chain.root, checks: [
    { label: 'Signatures', status: signature, text: signature === 'pass' ? 'All signatures matched' : signature === 'fail' ? 'A signature did not match' : 'Not established' },
    { label: 'Expected owner', status: root, text: root === 'pass' ? 'Matches the application’s root' : root === 'fail' ? 'Different starting authority' : 'Not established' },
    { label: 'Parent limits', status: attenuation, text: attenuation === 'pass' ? 'No added authority' : attenuation === 'fail' ? 'Child exceeds its parent' : 'Not established' },
    { label: 'Requested action', status: scope, text: scope === 'pass' ? 'Inside the leaf grant' : scope === 'fail' ? 'Outside the leaf grant' : 'Not relied on after chain rejection' },
    { label: 'Dates at capture', status: dates, text: dates === 'pass' ? 'Within the verifier’s time profile' : dates === 'fail' ? 'Outside the date window' : 'Not established' },
  ], raw: { evidenceClass: bundle.evidenceClass, capturedAt: item.capturedAt, notCurrentAuthorization: true, request, response }, principals };
}

async function getJSON(file) {
  const response = await fetch(`${INTERVIEW_BASE}/${file}`);
  if (!response.ok) throw new Error('Recorded public evidence unavailable.');
  return response.json();
}
function cached(loader) {
  let pending;
  return () => pending ??= Promise.resolve().then(loader).catch(error => { pending = undefined; throw error; });
}

export function initializeInterviewDemo(root, { loadGraph = () => getJSON('graph.json'), loadDelegation = () => getJSON('delegation.json'), subtle = globalThis.crypto?.subtle } = {}) {
  const find = name => root.querySelector(`[data-${name}]`);
  const list = name => [...root.querySelectorAll(`[data-${name}]`)];
  const set = (name, value) => { find(name).textContent = value; };
  const graphData = cached(loadGraph), delegationData = cached(loadDelegation);
  const panels = list('chapter-panel'), nav = list('chapter');
  let chapter = 0, graphChoice = 'listed', delegationChoice = 'read', graphSequence = 0, delegationSequence = 0, disposed = false;
  const listeners = [];
  const on = (node, event, handler) => { node.addEventListener(event, handler); listeners.push(() => node.removeEventListener(event, handler)); };
  const choose = (nodes, key, value) => nodes.forEach(node => node.setAttribute('aria-pressed', String(node.dataset[key] === value)));
  function graphPending() {
    find('graph-result').setAttribute('aria-busy', 'true');
    find('graph-result').setAttribute('data-tone', 'unknown');
    set('graph-headline', 'Reading this relationship…'); set('graph-summary', 'No conclusion yet.');
    set('graph-boundary', ''); set('graph-state', 'Not checked'); set('graph-raw', 'Loading the saved evidence, not making a live lookup.');
    set('graph-source', 'Pending'); set('graph-time', 'Pending');
  }
  async function showGraph(selected) {
    graphChoice = selected; const sequence = ++graphSequence;
    choose(list('relation'), 'relation', selected); graphPending();
    list('graph-line').forEach(line => line.setAttribute('data-selected', String(line.dataset.graphLine === selected)));
    try {
      const graph = await graphData();
      if (disposed || sequence !== graphSequence) return;
      const view = graphRelationPresentation(graph, selected);
      set('graph-headline', view.title); set('graph-summary', view.summary); set('graph-boundary', view.boundary); set('graph-state', view.state);
      set('graph-source', view.source); set('graph-time', displayTime(view.capturedAt)); set('graph-raw', JSON.stringify(view.raw, null, 2));
      find('graph-result').setAttribute('data-tone', view.tone);
      for (const node of list('relation-state')) {
        try { node.textContent = graphRelationPresentation(graph, node.dataset.relationState).state; }
        catch { node.textContent = 'UNKNOWN'; }
      }
    } catch {
      if (disposed || sequence !== graphSequence) return;
      set('graph-headline', 'This relationship could not be checked.'); set('graph-summary', 'Missing or inconsistent evidence is not a pass. Try selecting it again or inspect the downloadable record.');
      set('graph-boundary', 'No positive conclusion was made.'); set('graph-state', 'UNKNOWN'); set('graph-source', 'Not established'); set('graph-time', 'Not established'); set('graph-raw', 'No complete recorded result is available.');
      list('relation-state').forEach(node => { node.textContent = 'UNKNOWN'; });
    } finally { if (!disposed && sequence === graphSequence) find('graph-result').setAttribute('aria-busy', 'false'); }
  }
  function renderDelegation(view) {
    find('delegation-result').setAttribute('data-tone', view.tone);
    set('delegation-headline', view.headline); set('delegation-explanation', view.explanation); set('delegation-decision', view.decision);
    set('delegation-change', view.change ?? 'No completed result.'); set('delegation-time', displayTime(view.capturedAt));
    set('delegation-expiry', displayTime(view.expires)); set('delegation-tool', view.tool ?? 'Not established');
    set('delegation-root', view.expectedRoots?.join('\n') ?? 'Not established');
    set('delegation-principals', view.principals?.map(principal => `${principal.role}: ${principal.did}`).join('\n') ?? 'Not established');
    set('delegation-raw', view.raw ? JSON.stringify(view.raw, null, 2) : 'No consistent recorded result is available.');
    const checks = list('delegation-check');
    for (let i = 0; i < checks.length; i++) {
      checks[i].setAttribute('data-status', view.checks[i].status);
      checks[i].querySelector('[data-check-label]').textContent = view.checks[i].label;
      checks[i].querySelector('[data-check-text]').textContent = view.checks[i].text;
    }
  }
  async function showDelegation(selected) {
    delegationChoice = selected; const sequence = ++delegationSequence;
    choose(list('delegation-case'), 'delegationCase', selected);
    renderDelegation(recordedUnknown('Reading the saved answer. No verdict yet.'));
    set('delegation-headline', 'Reading the recorded check…'); set('delegation-change', DELEGATION_CASES[selected]?.change ?? 'Choose a supported example.');
    find('delegation-result').setAttribute('aria-busy', 'true');
    try {
      const bundle = await delegationData();
      if (disposed || sequence !== delegationSequence) return;
      const view = await delegationPresentation(bundle, selected, { subtle });
      if (disposed || sequence !== delegationSequence) return;
      renderDelegation(view);
    } catch {
      if (disposed || sequence !== delegationSequence) return;
      renderDelegation(recordedUnknown('Recorded evidence is unavailable. Nothing is approved or executed. Select a case to try again.'));
    } finally { if (!disposed && sequence === delegationSequence) find('delegation-result').setAttribute('aria-busy', 'false'); }
  }
  function showChapter(index, focus = false) {
    if (!Number.isInteger(index) || index < 0 || index >= panels.length) return;
    chapter = index;
    for (let i = 0; i < panels.length; i++) {
      panels[i].hidden = i !== index;
      if (i === index) nav[i].setAttribute('aria-current', 'step'); else nav[i].removeAttribute('aria-current');
    }
    find('chapter-prev').disabled = index === 0; find('chapter-next').disabled = index === panels.length - 1;
    set('chapter-progress', `Chapter ${index + 1} of ${panels.length}`);
    set('chapter-next-label', ['Next: inspect the evidence', 'Next: check a delegation', 'Walkthrough complete'][index]);
    if (focus) { panels[index].querySelector('[data-chapter-heading]').focus({ preventScroll: true }); root.scrollIntoView({ block: 'start', behavior: 'instant' }); }
    if (index === 1) return showGraph(graphChoice);
    if (index === 2) return showDelegation(delegationChoice);
  }
  nav.forEach((node, index) => on(node, 'click', () => showChapter(index, true)));
  on(find('chapter-prev'), 'click', () => showChapter(chapter - 1, true));
  on(find('chapter-next'), 'click', () => showChapter(chapter + 1, true));
  list('relation').forEach(node => on(node, 'click', () => showGraph(node.dataset.relation)));
  list('delegation-case').forEach(node => on(node, 'click', () => showDelegation(node.dataset.delegationCase)));
  showChapter(0);
  root.setAttribute('data-ready', 'true');
  return () => { disposed = true; graphSequence++; delegationSequence++; listeners.forEach(remove => remove()); };
}
