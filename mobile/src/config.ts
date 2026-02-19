// Base URL of the backend (ngrok HTTPS). This is auto-updated by the script.
// Example: https://abcd-1234.ngrok-free.app
export const BASE_URL = 'https://057b-14-195-76-134.ngrok-free.app';

// Custom scheme used as fallback when App Links do not open the app.
export const CUSTOM_SCHEME = 'smartsense';

// Toggle to simulate server sync behavior during local/offline UI development.
export const USE_MOCK = false;

// Sync policy values used by the offline queue processor.
export const SYNC_MAX_ATTEMPTS = 5;
export const SYNC_BASE_BACKOFF_MS = 2000;
