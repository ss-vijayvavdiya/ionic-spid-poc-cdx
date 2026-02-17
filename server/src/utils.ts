// Small utilities shared across routes.

export function buildCallbackHtml(options: {
  currentUrl: string;
  appSchemeUrl: string;
}): string {
  const { currentUrl, appSchemeUrl } = options;

  // This HTML tries to open the app via HTTPS App Links first.
  // If App Links do not work (common with changing ngrok hosts), the
  // user can tap the custom scheme fallback button.
  //
  // IMPORTANT: Avoid auto-refresh loops. We do not reload the same URL.
  // Instead, we attempt the custom scheme once via JS as a fallback.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SPID Login Received</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.5; }
    .btn { display: inline-block; margin-top: 12px; padding: 10px 14px; background: #1976d2; color: #fff; text-decoration: none; border-radius: 6px; }
    .btn.secondary { background: #2e7d32; }
    code { background: #f2f2f2; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <h2>Login received</h2>
  <p>If the app did not open automatically, tap <strong>Continue</strong>.</p>

  <!-- Continue by navigating to the same HTTPS URL (App Links) -->
  <a class="btn" href="${currentUrl}">Continue</a>

  <!-- Fallback: Custom scheme for ngrok free domains -->
  <p style="margin-top: 16px;">If that still does not open the app, use the fallback:</p>
  <a class="btn secondary" href="${appSchemeUrl}">Open in app (fallback)</a>

  <p style="margin-top: 16px; font-size: 13px; color: #666;">Current URL: <code>${currentUrl}</code></p>

  <script>
    // Best-effort auto-open attempt using the custom scheme ONCE.
    // This avoids infinite reload loops in the browser.
    try {
      var key = 'spid_poc_open_attempted';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        setTimeout(function () {
          window.location.href = "${appSchemeUrl}";
        }, 800);
      }
    } catch (e) {
      // If sessionStorage fails, do nothing.
    }
  </script>
</body>
</html>`;
}
