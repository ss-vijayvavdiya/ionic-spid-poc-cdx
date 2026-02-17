// Express server that implements SPID-style login using Signicat sandbox.
// The mobile app talks ONLY to this backend. This backend talks to Signicat.

import express from 'express';
import cors from 'cors';
import { config } from './config';
import { createAuthSession, getAuthSession, consumeAuthSession } from './authStore';
import { getOidcClient } from './oidc';
import { signAppJwt } from './jwt';
import { requireAuth } from './middleware';
import { buildCallbackHtml } from './utils';
import { generators } from 'openid-client';

const app = express();

// Trust proxy headers because ngrok terminates TLS and forwards to localhost.
app.set('trust proxy', 1);

// Basic middleware: JSON parsing and permissive CORS for the mobile app.
app.use(express.json());
app.use(cors({ origin: true }));

// Health check for quick verification.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve Android App Links association file dynamically.
// This ensures assetlinks.json always matches the current host.
app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.androidPackageName,
        sha256_cert_fingerprints: [config.androidSha256Fingerprint]
      }
    }
  ]);
});

// Start SPID login by redirecting to Signicat OIDC authorization endpoint.
app.get('/auth/spid/start', async (_req, res) => {
  // Create CSRF state and nonce for ID token validation.
  const session = createAuthSession();

  console.log(`[${session.correlationId}] Starting SPID login`);

  const client = await getOidcClient();

  // PKCE: Signicat requires a code challenge for authorization code flow.
  const codeChallenge = generators.codeChallenge(session.codeVerifier);

  // Build the Signicat authorization URL with required parameters.
  const authorizeUrl = client.authorizationUrl({
    response_type: 'code',
    scope: config.signicatScope,
    redirect_uri: config.redirectUri,
    state: session.state,
    nonce: session.nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  console.log(`[${session.correlationId}] Redirecting to Signicat authorize URL`);
  res.redirect(authorizeUrl);
});

// The fixed redirect URI configured in Signicat.
// This endpoint receives ?code=...&state=... and returns HTML that helps
// both App Links and manual fallback.
app.get('/auth/callback', (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';

  // Build the current HTTPS URL (must match Signicat redirect URI).
  const currentUrl = `${config.baseUrl}${req.originalUrl}`;

  // Custom scheme fallback for ngrok free domain changes.
  const appSchemeUrl = `smartsense://auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

  // Return HTML that tries App Links first and offers a fallback button.
  const html = buildCallbackHtml({ currentUrl, appSchemeUrl });

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-store');
  res.send(html);
});

// Exchange the authorization code for tokens, validate ID token,
// then mint our own app JWT.
app.post('/auth/exchange', async (req, res) => {
  const { code, state } = req.body || {};

  if (!code || !state) {
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  // Validate the state against our in-memory store.
  const session = getAuthSession(state);
  if (!session) {
    res.status(400).json({ error: 'Invalid or expired state' });
    return;
  }

  console.log(`[${session.correlationId}] Exchanging code for tokens`);

  try {
    const client = await getOidcClient();

    // Exchange the code and validate the ID token + nonce.
    // Some providers (including Signicat) may not include `iss` in the auth response,
    // while openid-client expects it when the discovery document supports it.
    // We provide `iss` explicitly to satisfy the check.
    const callbackParams = { code, state, iss: config.signicatIssuer };

    const tokenSet = await client.callback(
      config.redirectUri,
      callbackParams,
      { state, nonce: session.nonce, code_verifier: session.codeVerifier }
    );

    // Extract useful user claims from the ID token.
    const claims = tokenSet.claims();

    const user = {
      sub: claims.sub,
      name: claims.name,
      given_name: claims.given_name,
      family_name: claims.family_name,
      email: claims.email
    };

    // Mint our own JWT for the app.
    const appJwt = signAppJwt(user);

    // Consume the state so it cannot be reused (replay protection).
    consumeAuthSession(state);

    console.log(`[${session.correlationId}] Login success for subject ${claims.sub}`);

    res.json({
      access_token: appJwt,
      token_type: 'Bearer',
      expires_in: config.appJwtExpiresInSeconds,
      user
    });
  } catch (error) {
    console.error(`[${session.correlationId}] Token exchange failed`, error);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// Example protected endpoint using our JWT.
app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    message: 'Hello from the protected API!',
    user: req.user
  });
});

// Start server.
app.listen(config.port, () => {
  console.log(`✅ Server running on http://localhost:${config.port}`);
  console.log(`✅ Public BASE_URL: ${config.baseUrl}`);
  console.log(`✅ Signicat redirect URI: ${config.redirectUri}`);
});
