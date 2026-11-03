// Narrow demonstration policy, not a general JWT or credential verifier.
// A cryptographic verifier supplies signatureValid and the resolved signer.
export function assess({ signatureValid, signer, payload, available = true }, now = Date.now() / 1000) {
  if (!available) return { state: 'UNKNOWN', reason: 'The check could not be completed. Do not treat this as verified.' };
  if (!signatureValid) return { state: 'REJECTED', reason: 'The signature does not match these bytes.' };
  if (signer !== 'did:web:did.is' || payload?.iss !== 'did:web:did.is') return { state: 'REJECTED', reason: 'The signature can be valid, but the signer is not the expected DID.is issuer.' };
  if (!Number.isFinite(payload.nbf) || !Number.isFinite(payload.exp) || now < payload.nbf || now >= payload.exp) return { state: 'REJECTED', reason: 'The statement is outside its validity dates, or its dates are missing.' };
  if (payload.purpose !== 'public-source-demonstration-only') return { state: 'REJECTED', reason: 'This is not the expected demonstration statement.' };
  return { state: 'MATCHED', reason: 'These exact bytes match the captured DID.is assertion key, expected issuer and validity dates. No X account control or other message is verified.' };
}
