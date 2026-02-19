// Safe logger: avoid printing tokens and secrets.

function sanitizeMessage(message: string): string {
  return message.replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]');
}

export function logInfo(message: string, context?: unknown): void {
  if (context !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${sanitizeMessage(message)}`, context);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[INFO] ${sanitizeMessage(message)}`);
}

export function logWarn(message: string, context?: unknown): void {
  if (context !== undefined) {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${sanitizeMessage(message)}`, context);
    return;
  }

  // eslint-disable-next-line no-console
  console.warn(`[WARN] ${sanitizeMessage(message)}`);
}

export function logError(message: string, context?: unknown): void {
  if (context !== undefined) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${sanitizeMessage(message)}`, context);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`[ERROR] ${sanitizeMessage(message)}`);
}
