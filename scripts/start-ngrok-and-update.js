#!/usr/bin/env node
//
// This script reads the current ngrok public HTTPS URL and updates:
//  - server/.env (BASE_URL)
//  - mobile/src/config.ts (BASE_URL)
//  - mobile/config.xml (DEEPLINK_HOST + universal-links host)
//
// It assumes ngrok is already running locally and exposes its API at:
// http://127.0.0.1:4040/api/tunnels
//
// Run:
//   node scripts/start-ngrok-and-update.js
//

const fs = require('fs');
const path = require('path');

const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';

async function main() {
  const baseUrl = await getNgrokHttpsUrl();
  const host = new URL(baseUrl).host;

  updateServerEnv(baseUrl);
  updateMobileConfig(baseUrl);
  updateMobileConfigXml(host);

  console.log('\n✅ Updated BASE_URL in server/.env and mobile/src/config.ts');
  console.log('✅ Updated host in mobile/config.xml (DEEPLINK_HOST + universal-links)');
  console.log(`\n🔁 Update Signicat redirect URI to: ${baseUrl}/auth/callback`);
  console.log(`🔎 Test backend health: ${baseUrl}/health`);
  console.log('\n⚠️  If you changed ngrok host, rebuild the Android app so App Links match.');
}

async function getNgrokHttpsUrl() {
  const response = await fetch(NGROK_API);
  if (!response.ok) {
    throw new Error(`Failed to read ngrok API at ${NGROK_API}. Is ngrok running?`);
  }

  const data = await response.json();
  const tunnel = (data.tunnels || []).find((t) => t.public_url && t.public_url.startsWith('https://'));

  if (!tunnel) {
    throw new Error('No HTTPS ngrok tunnel found. Start ngrok with: ngrok http 4000');
  }

  return tunnel.public_url;
}

function updateServerEnv(baseUrl) {
  const envPath = path.join(__dirname, '..', 'server', '.env');
  let content = '';

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  if (content.includes('BASE_URL=')) {
    content = content.replace(/^BASE_URL=.*$/m, `BASE_URL=${baseUrl}`);
  } else {
    content += `\nBASE_URL=${baseUrl}\n`;
  }

  fs.writeFileSync(envPath, content, 'utf8');
}

function updateMobileConfig(baseUrl) {
  const configPath = path.join(__dirname, '..', 'mobile', 'src', 'config.ts');

  // If the file exists, update the existing BASE_URL line.
  if (fs.existsSync(configPath)) {
    let content = fs.readFileSync(configPath, 'utf8');
    if (content.includes('export const BASE_URL')) {
      content = content.replace(/export const BASE_URL = '.*';/, `export const BASE_URL = '${baseUrl}';`);
      fs.writeFileSync(configPath, content, 'utf8');
      return;
    }
  }

  // Fallback: write a fresh config file with the base URL.
  const freshContent = `// Base URL of the backend (ngrok HTTPS). This is auto-updated by the script.\n` +
    `// Example: https://abcd-1234.ngrok-free.app\n` +
    `export const BASE_URL = '${baseUrl}';\n\n` +
    `// Custom scheme used as fallback when App Links do not open the app.\n` +
    `export const CUSTOM_SCHEME = 'smartsense';\n`;

  fs.writeFileSync(configPath, freshContent, 'utf8');
}

function updateMobileConfigXml(host) {
  const xmlPath = path.join(__dirname, '..', 'mobile', 'config.xml');
  if (!fs.existsSync(xmlPath)) {
    return;
  }

  let content = fs.readFileSync(xmlPath, 'utf8');

  // Replace deeplink host variable if present.
  content = content.replace(
    /(<variable\s+name="DEEPLINK_HOST"\s+value=")([^"]+)("\s*\/?>)/,
    `$1${host}$3`
  );

  // Replace universal-links host if present.
  content = content.replace(
    /(<host\s+name=")([^"]+)("\s+scheme="https")/,
    `$1${host}$3`
  );

  fs.writeFileSync(xmlPath, content, 'utf8');
}

main().catch((error) => {
  console.error('❌', error.message);
  process.exit(1);
});
