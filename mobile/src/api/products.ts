import { ApiClient } from './client';
import { Product } from '../types/models';

interface ProductsResponse {
  items: Product[];
}

interface ProductResponse {
  item: Product;
}

export interface SaveProductPayload {
  name: string;
  priceCents: number;
  vatRate: number;
  category?: string;
  sku?: string;
  isActive?: boolean;
}

export const productsApi = {
  async list(client: ApiClient, updatedSince?: string): Promise<Product[]> {
    const query = updatedSince ? `?updatedSince=${encodeURIComponent(updatedSince)}` : '';
    const response = await client.request<ProductsResponse>(`/api/products${query}`);
    return response.items;
  },

  async create(client: ApiClient, payload: SaveProductPayload): Promise<Product> {
    const response = await client.request<ProductResponse>('/api/products', {
      method: 'POST',
      body: payload
    });

    return response.item;
  },

  async update(client: ApiClient, productId: string, payload: SaveProductPayload): Promise<Product> {
    const response = await client.request<ProductResponse>(`/api/products/${productId}`, {
      method: 'PUT',
      body: payload
    });

    return response.item;
  }
};
