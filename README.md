# SPID POS PoC (Ionic React + Cordova + Node.js)

This monorepo contains a production-style SPID authentication PoC plus a multi-merchant POS shell with offline-first receipts.

## What is implemented now

- SPID login via Signicat sandbox using OIDC Authorization Code + PKCE.
- Backend token exchange + ID token validation.
- Backend-issued app JWT (mobile app never stores Signicat tokens).
- Multi-merchant guarded APIs (`X-Merchant-Id` + JWT merchant memberships).
- Offline-first receipts with local queue and background sync.
- Idempotent receipt creation on backend (`merchantId + clientReceiptId`).
- Side-menu Ionic app with i18n (`en`, `it`, `de`).
- Persisted settings pages for Payments, Printer, Reports, Support.
- Empty states + skeleton loaders on major pages.
- Integration tests for tenant isolation and receipt idempotency.

---

## Repository structure

- `server/` Express + TypeScript backend
- `mobile/` Ionic React + TypeScript + Cordova Android app
- `scripts/` ngrok URL detection and config update scripts
- `DEVELOPER.md` implementation and architecture guide

---

## Prerequisites

Install:

- Git
- Node.js 20+ and npm
- Java JDK 17
- Android Studio + Android SDK + platform-tools (`adb`)
- ngrok (free)
- Ionic CLI: `npm i -g @ionic/cli`
- Cordova CLI: `npm i -g cordova`

Set Android env (macOS example):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## Required environment values

Create `server/.env` with:

```env
PORT=4000
BASE_URL=https://<current-ngrok-domain>
SIGNICAT_ISSUER=<from-signicat-dashboard>
SIGNICAT_CLIENT_ID=<from-signicat-dashboard>
SIGNICAT_CLIENT_SECRET=<from-signicat-dashboard>
SIGNICAT_SCOPE=openid profile email
ANDROID_PACKAGE_NAME=com.smartsense.spidpoc
ANDROID_SHA256_FINGERPRINT=<debug-keystore-sha256>
APP_JWT_SECRET=<long-random-secret>
SQLITE_PATH=./data/app.sqlite
```

Get debug SHA256:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Signicat redirect URI must be exactly:

`https://<current-ngrok-domain>/auth/callback`

---

## Run the backend

```bash
cd /Users/vijay/projects/poc/ionic-spid-poc-cdx/server
npm install
npm run dev
```

Health check:

- `http://localhost:4000/health`

---

## Run ngrok and sync config

Start tunnel:

```bash
ngrok http 4000
```

Update project files from ngrok URL:

```bash
cd /Users/vijay/projects/poc/ionic-spid-poc-cdx
node scripts/start-ngrok-and-update.js
```

This updates:

- `server/.env` (`BASE_URL`)
- `mobile/src/config.ts` (`BASE_URL`)
- `mobile/config.xml` deep link host fields

Then update Signicat redirect URI with the new ngrok host.

---

## Run mobile app (Android)

```bash
cd /Users/vijay/projects/poc/ionic-spid-poc-cdx/mobile
npm install
ionic build
npx cordova prepare android
npx cordova run android
```

First-time plugin/platform setup:

```bash
cd /Users/vijay/projects/poc/ionic-spid-poc-cdx/mobile
ionic cordova platform add android
ionic cordova plugin add cordova-plugin-inappbrowser
ionic cordova plugin add ionic-plugin-deeplinks \
  --variable URL_SCHEME=smartsense \
  --variable DEEPLINK_SCHEME=https \
  --variable DEEPLINK_HOST=<current-ngrok-domain> \
  --variable ANDROID_PATH_PREFIX=/auth/callback
```

---

## Auth + callback behavior

1. App opens system browser to `https://<ngrok>/auth/spid/start`.
2. Backend redirects to Signicat authorize endpoint.
3. Signicat redirects to `https://<ngrok>/auth/callback?code=...&state=...`.
4. Callback page tries HTTPS app-link reopen and shows fallback button.
5. Fallback deep link is `smartsense://auth/callback?code=...&state=...`.
6. App posts `{ code, state }` to `/auth/exchange`.
7. Backend validates and returns app JWT.
8. App uses JWT for `/api/*` calls.

---

## Backend hardening checks

Run integration tests:

```bash
cd /Users/vijay/projects/poc/ionic-spid-poc-cdx/server
npm run test:integration
```

Covered:

- Tenant isolation (`403` when merchant access is invalid).
- Receipt idempotency (duplicate `clientReceiptId` returns existing record).

Build check:

```bash
npm run build
```

---

## Mobile QA checks

Type check + build:

```bash
cd /Users/vijay/projects/poc/ionic-spid-poc-cdx/mobile
npx tsc --noEmit
npm run build
```

Manual checks:

- Login with SPID from app.
- Merchant selection (if user has multiple merchants).
- Issue receipt offline and verify `Pending Sync`.
- Reconnect network and verify queued receipt syncs.
- Settings persistence across app restart (payments/printer/support).

---

## Security notes

- Do not commit real secrets in any `.md`, `.env`, or source files.
- App JWT is short-lived and should be stored in secure storage plugin for production.
- Backend enforces merchant access via JWT memberships + merchant context header/body consistency.
- Void/refund actions write minimal audit events.

---

## Troubleshooting

- App link not opening app:
  - Re-run ngrok update script.
  - Rebuild/reinstall app so manifest host matches.
  - Verify `https://<ngrok>/.well-known/assetlinks.json`.
- Signicat redirect mismatch:
  - Ensure exact callback URL in dashboard: `https://<ngrok>/auth/callback`.
- Backend token exchange errors:
  - Validate `SIGNICAT_ISSUER`, client ID, client secret.
- Check Android logs:

```bash
adb logcat | grep -Ei "spid|deeplink|cordova"
```
