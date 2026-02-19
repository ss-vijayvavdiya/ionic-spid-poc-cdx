// Deep link handling for both HTTPS App Links and custom scheme fallback.
// Uses ionic-plugin-deeplinks if available, and falls back to handleOpenURL.

import { CUSTOM_SCHEME } from '../config';

export type DeepLinkHandler = (url: string) => void;

const CALLBACK_PATH = '/auth/callback';

// Keep the last deep link in a global slot so we don't miss early calls.
const globalAny = window as any;
if (globalAny.__lastDeepLink === undefined) {
  globalAny.__lastDeepLink = null;
}
if (globalAny.__initialDeepLink === undefined) {
  globalAny.__initialDeepLink = null;
}

// Lightweight Cordova detection.
function isCordova(): boolean {
  return !!(window as any).cordova;
}

// Register deep link listeners.
export function setupDeepLinks(onUrl: DeepLinkHandler): void {
  // Helper to emit only non-empty URLs.
  const emit = (url: string) => {
    if (!url) return;
    // Avoid logging deep link URLs because they can contain auth codes.
    onUrl(url);
  };

  // Some plugins call window.handleOpenURL directly (custom scheme).
  // We store the URL in a global slot and emit it when possible.
  (window as any).handleOpenURL = (url: string) => {
    globalAny.__lastDeepLink = url;
    globalAny.__initialDeepLink = url;
    // Defer so the WebView is ready.
    setTimeout(() => emit(url), 0);
  };

  // If Cordova is available, wait for device ready then wire plugin handlers.
  if (isCordova()) {
    document.addEventListener('deviceready', () => {
      const deeplinks = (window as any).IonicDeeplink;

      // ionic-plugin-deeplinks exposes a route() method we can use.
      if (deeplinks && typeof deeplinks.route === 'function') {
        deeplinks.route(
          {
            // We only care about this one callback path.
            [CALLBACK_PATH]: 'auth-callback'
          },
          (match: any) => {
            // match.$link.url typically contains the full URL.
            const url = match?.$link?.url || '';
            emit(url);
          },
          (nomatch: any) => {
            // If no route matched, we can still try the raw URL.
            const url = nomatch?.$link?.url || '';
            emit(url);
          }
        );
      } else {
        console.warn('[deeplink] IonicDeeplink plugin not found');
      }

      // If a deep link arrived before deviceready, process it now.
      if (globalAny.__initialDeepLink) {
        emit(globalAny.__initialDeepLink);
      } else if (globalAny.__lastDeepLink) {
        emit(globalAny.__lastDeepLink);
      }
    });

    // Also re-check on resume (some devices deliver URL on resume).
    document.addEventListener('resume', () => {
      if (globalAny.__lastDeepLink) {
        emit(globalAny.__lastDeepLink);
      }
    });
  } else {
    // In the browser (ionic serve), just check the current URL once.
    emit(window.location.href);
  }
}

// Parse code/state from either HTTPS App Links or custom scheme URLs.
export function parseAuthCallback(url: string): { code: string; state: string } | null {
  try {
    const parsed = new URL(url);

    // For custom scheme, host + pathname represent the full path.
    let path = parsed.pathname;
    if (parsed.protocol === `${CUSTOM_SCHEME}:`) {
      path = `/${parsed.host}${parsed.pathname}`;
    }

    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');

    if (!code || !state) {
      return null;
    }

    // For this PoC, if code/state exist we accept them even if the path mismatches.
    // This avoids edge cases with custom schemes that parse paths differently.
    return { code, state };
  } catch (_error) {
    // Fallback parsing for very old WebViews.
    const parts = url.split('?');
    if (parts.length < 2) return null;
    const query = parts[1];
    const params = new URLSearchParams(query);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) return null;
    return { code, state };
  }
}
