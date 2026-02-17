# SPID-Style SSO PoC (Ionic React + Cordova + Node.js)

This repo is a complete, production-style proof of concept for SPID-style login using the Signicat sandbox with OIDC Authorization Code flow. The mobile app uses a system browser for login, receives the callback via App Links, and exchanges the code with the backend. The backend validates the ID token and mints its own JWT for app APIs.

Add secret
Client ID:
sandbox-poised-snake-501
content_copy
Secret name
oidc-client-secret-spid-poc
Client secret
1GYyOSpP5lumBxaIYvyHyNvZvA2d0oKt2Qu0RwdukGCuRbQN

The callback path is fixed and must be exactly:

`https://<domain>/auth/callback`

Because ngrok free domains change, the app includes a custom scheme fallback so you can still log in even if App Links do not auto-open.

---

## Repo Layout

- `server/` Node.js TypeScript backend (Express + openid-client)
- `mobile/` Ionic React TypeScript + Cordova Android app
- `scripts/` ngrok helper scripts
- `README.md` (this file)

---

## 1) Tools to Install

Install the following tools before running the PoC.

- Git
- Node.js + npm (already installed)
- Java JDK 17
- Android Studio
- Android SDK + Platform Tools (`adb`)
- Set `ANDROID_HOME` and add `platform-tools` to your PATH
- ngrok (free)
- Ionic CLI: `npm i -g @ionic/cli`
- Cordova CLI: `npm i -g cordova`

---

## 2) Android Emulator Setup

1. Open Android Studio.
1. Open **Device Manager**.
1. Create a new AVD (Pixel device is fine).
1. Start the emulator.
1. Verify the emulator is connected:

```bash
adb devices
```

You should see a device like `emulator-5554`.

---

## 3) Debug Keystore SHA256 Fingerprint

Android App Links require the SHA256 fingerprint of the app signing key. For development, use the default debug keystore.

Run:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA256** fingerprint and put it into:

`server/.env` -> `ANDROID_SHA256_FINGERPRINT`

---

## 4) Signicat Sandbox Setup

In the Signicat dashboard (sandbox):

1. Create or open your OIDC client.
1. Obtain these values and put them into `server/.env`:

- `SIGNICAT_ISSUER`
- `SIGNICAT_CLIENT_ID`
- `SIGNICAT_CLIENT_SECRET`

3. Configure the redirect URI to the exact path:

`https://<your-current-ngrok-domain>/auth/callback`

4. Enable SPID in the sandbox and ensure SPID test is enabled.

---

## 5) Running the PoC (Exact Commands)

### Backend

```bash
cd /Users/vijay/projects/poc/ionic-spid-poc-cdx/server
npm install
npm run dev
```

The server will start on `http://localhost:4000`.

### ngrok

In a new terminal:

```bash
ngrok http 4000
```

### Auto-update BASE_URL

In another terminal:

```bash
cd /Users/vijay/projects/poc/ionic-spid-poc-cdx
node scripts/start-ngrok-and-update.js
```

This script updates:

- `server/.env` -> `BASE_URL`
- `mobile/src/config.ts` -> `BASE_URL`
- `mobile/config.xml` -> `DEEPLINK_HOST` and `<universal-links>` host

After the script runs:

- Update your Signicat redirect URI to: `https://<ngrok-domain>/auth/callback`
- Test backend health: `https://<ngrok-domain>/health`

### Mobile App

```bash
cd /Users/vijay/projects/poc/ionic-spid-poc-cdx/mobile
npm install

# Add Cordova platform and plugins (first time only)
ionic cordova platform add android
ionic cordova plugin add cordova-plugin-inappbrowser
ionic cordova plugin add ionic-plugin-deeplinks \
  --variable URL_SCHEME=smartsense \
  --variable DEEPLINK_SCHEME=https \
  --variable DEEPLINK_HOST=<your-current-ngrok-domain> \
  --variable ANDROID_PATH_PREFIX=/auth/callback

# Build web assets and run on Android
ionic build
ionic cordova run android
```

If the ngrok host changes later, re-run the ngrok script and **rebuild the Android app** to update App Links. Even if App Links do not work, the custom scheme fallback will still open the app.

---

## 6) Login Flow (What to Expect)

1. App opens the system browser at `https://<ngrok-domain>/auth/spid/start`.
1. Backend redirects to Signicat OIDC authorize endpoint.
1. User logs in with SPID (Signicat sandbox).
1. Signicat redirects to `https://<ngrok-domain>/auth/callback?code=...&state=...`.
1. App Links try to open the app.
1. If App Links fail, the callback page shows a **fallback button** that opens:

`smartsense://auth/callback?code=...&state=...`

1. App calls `/auth/exchange` and receives its own JWT.
1. App calls `/api/me` and displays user info.

---

## 7) Troubleshooting

### App Links not opening the app

- Confirm the current ngrok host matches `mobile/config.xml`.
- Rebuild and reinstall the app after changing the host.
- Check that `https://<ngrok-domain>/.well-known/assetlinks.json` returns JSON.
- Verify `ANDROID_SHA256_FINGERPRINT` is correct.
- Use the fallback button in the callback page (custom scheme).

### assetlinks.json not accessible

- Ensure the server is running and reachable via ngrok.
- Visit `https://<ngrok-domain>/.well-known/assetlinks.json` directly.

### Signature mismatch

- Re-run the keytool command and verify the SHA256 fingerprint.
- Update `server/.env` and restart the server.

### Redirect URI mismatch (Signicat)

- Update the Signicat redirect URI to match the **current** ngrok domain:

`https://<ngrok-domain>/auth/callback`

### View Android logs (logcat)

```bash
adb logcat | grep -i spid
```

---

## Notes for Production

- Replace ngrok with a stable HTTPS domain.
- Replace in-memory session store with Redis or a database.
- Use a secure storage plugin for JWT on device.
- Add proper logging and monitoring.
