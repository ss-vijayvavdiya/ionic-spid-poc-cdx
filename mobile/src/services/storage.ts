// Tiny wrapper around localStorage for app/session preferences.
// NOTE: For production, move JWT to a secure keystore plugin.

const TOKEN_KEY = 'spid_poc_token';
const MERCHANT_ID_KEY = 'spid_pos_merchant_id';

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function saveSelectedMerchantId(merchantId: string): void {
  localStorage.setItem(MERCHANT_ID_KEY, merchantId);
}

export function getSelectedMerchantId(): string | null {
  return localStorage.getItem(MERCHANT_ID_KEY);
}

export function clearSelectedMerchantId(): void {
  localStorage.removeItem(MERCHANT_ID_KEY);
}
