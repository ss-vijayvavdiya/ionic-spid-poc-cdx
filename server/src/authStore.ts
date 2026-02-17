// In-memory store for OIDC sessions keyed by `state`.
// This protects against CSRF and replay attacks.
// NOTE: This is NOT suitable for production because it does not persist across restarts.

import crypto from 'crypto';
import { generators } from 'openid-client';

export type AuthSession = {
  state: string;
  nonce: string;
  codeVerifier: string;
  correlationId: string;
  createdAt: number; // epoch ms
};

// Five minutes is typical for an auth code flow window.
const AUTH_SESSION_TTL_MS = 5 * 60 * 1000;

// Map<state, AuthSession>
const sessionStore = new Map<string, AuthSession>();

// Create a new session and store it by state.
export function createAuthSession(): AuthSession {
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  // PKCE code_verifier is required by Signicat in many tenants.
  // We generate it here and later derive the code_challenge.
  const codeVerifier = generators.codeVerifier();
  const correlationId = crypto.randomUUID();
  const createdAt = Date.now();

  const session: AuthSession = {
    state,
    nonce,
    codeVerifier,
    correlationId,
    createdAt
  };

  sessionStore.set(state, session);
  return session;
}

// Get a session if it exists and is not expired.
export function getAuthSession(state: string): AuthSession | null {
  // Cleanup old sessions before checking.
  purgeExpiredSessions();

  const session = sessionStore.get(state);
  if (!session) {
    return null;
  }

  // Expire if too old.
  if (Date.now() - session.createdAt > AUTH_SESSION_TTL_MS) {
    sessionStore.delete(state);
    return null;
  }

  return session;
}

// Mark a state as used by removing it from memory.
export function consumeAuthSession(state: string): void {
  sessionStore.delete(state);
}

// Remove expired sessions from memory so the store does not grow forever.
function purgeExpiredSessions(): void {
  const now = Date.now();
  for (const [state, session] of sessionStore.entries()) {
    if (now - session.createdAt > AUTH_SESSION_TTL_MS) {
      sessionStore.delete(state);
    }
  }
}
