// Centralized configuration with validation.
// Keeping this in one place makes it easy to see what the server needs.

import dotenv from 'dotenv';
import { z } from 'zod';

// Load variables from server/.env into process.env.
// This must run before we read any environment values.
dotenv.config();

// Define a schema so missing values fail fast with a clear error.
const envSchema = z.object({
  // Server
  PORT: z.string().default('4000'),
  BASE_URL: z.string().url(),

  // Signicat (OIDC)
  SIGNICAT_ISSUER: z.string().url(),
  SIGNICAT_CLIENT_ID: z.string().min(1),
  SIGNICAT_CLIENT_SECRET: z.string().min(1),
  SIGNICAT_SCOPE: z.string().default('openid profile email'),

  // Android App Links
  ANDROID_PACKAGE_NAME: z.string().min(1),
  ANDROID_SHA256_FINGERPRINT: z.string().min(1),

  // App JWT
  APP_JWT_SECRET: z.string().min(16)
});

// Parse and validate. If anything is wrong, we show a friendly error and exit.
let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid or missing environment variables.');
  console.error('Check server/.env and try again.');
  console.error(error);
  process.exit(1);
}

// Normalize BASE_URL so we never have a trailing slash.
const baseUrl = env.BASE_URL.replace(/\/+$/, '');

export const config = {
  // Server
  port: Number(env.PORT),
  baseUrl,

  // Signicat
  signicatIssuer: env.SIGNICAT_ISSUER,
  signicatClientId: env.SIGNICAT_CLIENT_ID,
  signicatClientSecret: env.SIGNICAT_CLIENT_SECRET,
  signicatScope: env.SIGNICAT_SCOPE,
  redirectUri: `${baseUrl}/auth/callback`,

  // Android App Links file
  androidPackageName: env.ANDROID_PACKAGE_NAME,
  androidSha256Fingerprint: env.ANDROID_SHA256_FINGERPRINT,

  // App JWT (minted by this backend)
  appJwtSecret: env.APP_JWT_SECRET,
  appJwtExpiresInSeconds: 900, // 15 minutes in seconds
  appJwtIssuer: 'spid-poc-backend'
};
