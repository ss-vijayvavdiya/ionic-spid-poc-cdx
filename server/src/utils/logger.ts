// Safe logger helpers.
// We avoid printing Authorization headers, bearer tokens, and secrets.

function redact(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]')
    .replace(/"client_secret"\s*:\s*"[^"]+"/gi, '"client_secret":"[REDACTED]"')
    .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[REDACTED]"');
}

function formatMeta(meta?: unknown): string {
  if (meta === undefined) {
    return '';
  }

  try {
    return ` ${redact(JSON.stringify(meta))}`;
  } catch {
    return ' [unserializable-meta]';
  }
}

export function logInfo(message: string, meta?: unknown): void {
  // eslint-disable-next-line no-console
  console.log(`[INFO] ${redact(message)}${formatMeta(meta)}`);
}

export function logWarn(message: string, meta?: unknown): void {
  // eslint-disable-next-line no-console
  console.warn(`[WARN] ${redact(message)}${formatMeta(meta)}`);
}

export function logError(message: string, meta?: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[ERROR] ${redact(message)}${formatMeta(meta)}`);
}
