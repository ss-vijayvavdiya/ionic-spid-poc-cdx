// API calls to the backend.

import { BASE_URL } from '../config';

export type ExchangeResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
  };
};

function buildBaseHeaders(): Record<string, string> {
  return {
    // Required for ngrok free browser interstitial bypass in API requests.
    'ngrok-skip-browser-warning': 'true'
  };
}

// Exchange the Signicat authorization code for our own app JWT.
export async function exchangeCode(code: string, state: string): Promise<ExchangeResponse> {
  const response = await fetch(`${BASE_URL}/auth/exchange`, {
    method: 'POST',
    headers: {
      ...buildBaseHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, state })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Exchange failed: ${response.status} ${text}`);
  }

  return (await response.json()) as ExchangeResponse;
}

// Call a protected endpoint using our app JWT.
export async function fetchMe(token: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/me`, {
    headers: {
      ...buildBaseHeaders(),
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`/api/me failed: ${response.status} ${text}`);
  }

  return response.json();
}
