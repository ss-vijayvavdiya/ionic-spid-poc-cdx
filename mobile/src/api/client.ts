import { BASE_URL, USE_MOCK } from '../config';

export interface ApiClientOptions {
  getToken: () => string | null;
  getMerchantId?: () => string | null;
  onUnauthorized?: () => void;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  merchantId?: string;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status: number;

  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface ApiClient {
  request<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  isMockMode: boolean;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return {
    isMockMode: USE_MOCK,

    async request<T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> {
      if (USE_MOCK) {
        throw new ApiError(501, 'Mock response is not configured for this endpoint.');
      }

      const token = options.getToken();

      if (!token) {
        throw new ApiError(401, 'Missing auth token');
      }

      const merchantId = requestOptions.merchantId ?? options.getMerchantId?.() ?? null;

      const response = await fetch(`${BASE_URL}${path}`, {
        method: requestOptions.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Required to bypass ngrok free browser warning responses in WebView fetch calls.
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${token}`,
          ...(merchantId ? { 'X-Merchant-Id': merchantId } : {})
        },
        body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
        signal: requestOptions.signal
      });

      if (response.status === 401) {
        options.onUnauthorized?.();
      }

      if (!response.ok) {
        const details = await response.text();
        throw new ApiError(response.status, `API request failed (${response.status})`, details);
      }

      return (await response.json()) as T;
    }
  };
}
