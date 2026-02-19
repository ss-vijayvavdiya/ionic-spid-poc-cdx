// Helpers for minting and verifying our own app JWT.
// We do NOT return Signicat access tokens to the app.

import jwt from 'jsonwebtoken';
import { config } from './config';

export type AppJwtPayload = {
  sub: string;
  merchantIds: string[];
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
};

// Create a short-lived JWT for the mobile app.
export function signAppJwt(payload: AppJwtPayload): string {
  return jwt.sign(payload, config.appJwtSecret, {
    issuer: config.appJwtIssuer,
    expiresIn: config.appJwtExpiresInSeconds
  });
}

// Verify the JWT and return its payload (throws if invalid/expired).
export function verifyAppJwt(token: string): AppJwtPayload {
  const decoded = jwt.verify(token, config.appJwtSecret, {
    issuer: config.appJwtIssuer
  });

  // jsonwebtoken returns a string or object; we expect an object here.
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as Partial<AppJwtPayload>;

  if (typeof payload.sub !== 'string') {
    throw new Error('Invalid token subject');
  }

  return {
    sub: payload.sub,
    merchantIds: Array.isArray(payload.merchantIds) ? payload.merchantIds : [],
    name: payload.name,
    given_name: payload.given_name,
    family_name: payload.family_name,
    email: payload.email
  };
}
