import { ApiClient } from './client';
import { Merchant } from '../types/models';

interface MerchantsResponse {
  items: Array<Merchant & { role?: string }>;
}

interface MeResponse {
  user: {
    id: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    merchants: Array<Merchant & { role?: string }>;
  };
}

export const merchantsApi = {
  async list(client: ApiClient): Promise<Array<Merchant & { role?: string }>> {
    const response = await client.request<MerchantsResponse>('/api/merchants');
    return response.items;
  },

  async me(client: ApiClient): Promise<MeResponse['user']> {
    const response = await client.request<MeResponse>('/api/me');
    return response.user;
  }
};
