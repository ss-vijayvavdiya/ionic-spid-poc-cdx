import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { generators } from 'openid-client';
import { createAuthSession, consumeAuthSession, getAuthSession } from './authStore';
import { config } from './utils/config';
import { signAppJwt } from './jwt';
import { getOidcClient } from './oidc';
import { buildCallbackHtml } from './utils';
import { logError, logInfo, logWarn } from './utils/logger';
import meRoutes from './routes/me';
import merchantsRoutes from './routes/merchants';
import productsRoutes from './routes/products';
import receiptsRoutes from './routes/receipts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { usersRepo } from './db/repositories/usersRepo';
import { merchantService } from './services/merchantService';

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) {
    return true;
  }

  if (config.corsAllowedOrigins.includes(origin)) {
    return true;
  }

  // Practical localhost allowances for Cordova WebView and local browser testing.
  if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) {
    return true;
  }

  return false;
}

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Origin not allowed by CORS'));
      }
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

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

  app.get('/auth/spid/start', async (_req, res, next) => {
    try {
      const session = createAuthSession();
      const client = await getOidcClient();

      const codeChallenge = generators.codeChallenge(session.codeVerifier);

      const authorizeUrl = client.authorizationUrl({
        response_type: 'code',
        scope: config.signicatScope,
        redirect_uri: config.redirectUri,
        state: session.state,
        nonce: session.nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      logInfo(`[${session.correlationId}] Redirecting to Signicat authorize`);
      res.redirect(authorizeUrl);
    } catch (error) {
      next(error);
    }
  });

  app.get('/auth/callback', (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';

    const currentUrl = `${config.baseUrl}${req.originalUrl}`;
    const appSchemeUrl = `smartsense://auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

    const html = buildCallbackHtml({ currentUrl, appSchemeUrl });

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    res.send(html);
  });

  app.post('/auth/exchange', async (req, res, next) => {
    const { code, state } = req.body || {};

    if (!code || !state) {
      res.status(400).json({ error: 'Missing code or state' });
      return;
    }

    const session = getAuthSession(state);

    if (!session) {
      res.status(400).json({ error: 'Invalid or expired state' });
      return;
    }

    try {
      logInfo(`[${session.correlationId}] Exchanging authorization code`);
      const client = await getOidcClient();

      const tokenSet = await client.callback(
        config.redirectUri,
        { code, state, iss: config.signicatIssuer },
        {
          state,
          nonce: session.nonce,
          code_verifier: session.codeVerifier
        }
      );

      const claims = tokenSet.claims();
      const userId = claims.sub;

      await usersRepo.upsertUser({
        id: userId,
        email: typeof claims.email === 'string' ? claims.email : null
      });

      const merchants = await merchantService.ensureUserMerchants(userId);
      const merchantIds = merchants.map((merchant) => merchant.id);

      const appJwt = signAppJwt({
        sub: userId,
        merchantIds,
        name: typeof claims.name === 'string' ? claims.name : undefined,
        given_name: typeof claims.given_name === 'string' ? claims.given_name : undefined,
        family_name: typeof claims.family_name === 'string' ? claims.family_name : undefined,
        email: typeof claims.email === 'string' ? claims.email : undefined
      });

      consumeAuthSession(state);
      logInfo(`[${session.correlationId}] Auth exchange complete`, { userId, merchantCount: merchantIds.length });

      res.json({
        access_token: appJwt,
        token_type: 'Bearer',
        expires_in: config.appJwtExpiresInSeconds,
        user: {
          sub: userId,
          name: typeof claims.name === 'string' ? claims.name : undefined,
          given_name: typeof claims.given_name === 'string' ? claims.given_name : undefined,
          family_name: typeof claims.family_name === 'string' ? claims.family_name : undefined,
          email: typeof claims.email === 'string' ? claims.email : undefined,
          merchants
        }
      });
    } catch (error) {
      logError(`[${session.correlationId}] Token exchange failed`, error);
      res.status(500).json({ error: 'Token exchange failed' });
    }
  });

  app.use('/api', meRoutes);
  app.use('/api', merchantsRoutes);
  app.use('/api', productsRoutes);
  app.use('/api', receiptsRoutes);

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof Error && error.message.includes('Origin not allowed by CORS')) {
      logWarn('Blocked CORS origin');
      res.status(403).json({ error: 'CORS origin denied' });
      return;
    }

    next(error);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
