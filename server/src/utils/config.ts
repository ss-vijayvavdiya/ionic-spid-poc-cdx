import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000'),
  BASE_URL: z.string().url(),

  SIGNICAT_ISSUER: z.string().url(),
  SIGNICAT_CLIENT_ID: z.string().min(1),
  SIGNICAT_CLIENT_SECRET: z.string().min(1),
  SIGNICAT_SCOPE: z.string().default('openid profile email'),

  ANDROID_PACKAGE_NAME: z.string().min(1),
  ANDROID_SHA256_FINGERPRINT: z.string().min(1),

  APP_JWT_SECRET: z.string().min(16),
  APP_JWT_EXPIRES_IN_SECONDS: z.string().default('900'),

  SQLITE_PATH: z.string().default('./data/app.sqlite'),
  CORS_ALLOWED_ORIGINS: z.string().optional()
});

let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  // Fail fast with clear action for setup errors.
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration. Check server/.env values.');
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
}

const normalizedBaseUrl = env.BASE_URL.replace(/\/+$/, '');
const configuredOrigins = (env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

// Keep a practical default set for Ionic/Cordova development.
const defaultOrigins = [
  normalizedBaseUrl,
  'http://localhost',
  'https://localhost',
  'http://localhost:8100',
  'https://localhost:8100',
  'http://localhost:5173',
  'https://localhost:5173',
  'ionic://localhost',
  'capacitor://localhost'
];

export const config = {
  nodeEnv: env.NODE_ENV,
  port: Number(env.PORT),
  baseUrl: normalizedBaseUrl,

  signicatIssuer: env.SIGNICAT_ISSUER,
  signicatClientId: env.SIGNICAT_CLIENT_ID,
  signicatClientSecret: env.SIGNICAT_CLIENT_SECRET,
  signicatScope: env.SIGNICAT_SCOPE,
  redirectUri: `${normalizedBaseUrl}/auth/callback`,

  androidPackageName: env.ANDROID_PACKAGE_NAME,
  androidSha256Fingerprint: env.ANDROID_SHA256_FINGERPRINT,

  appJwtSecret: env.APP_JWT_SECRET,
  appJwtIssuer: 'spid-poc-backend',
  appJwtExpiresInSeconds: Number(env.APP_JWT_EXPIRES_IN_SECONDS),

  sqlitePath: env.SQLITE_PATH,

  corsAllowedOrigins:
    configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins
} as const;
