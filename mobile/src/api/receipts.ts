import { ApiClient } from './client';
import { PaymentMethod, ReceiptStatus } from '../types/models';

export interface ServerReceipt {
  id: string;
  merchantId: string;
  clientReceiptId: string;
  number: string;
  issuedAt: string;
  status: Exclude<ReceiptStatus, 'PENDING_SYNC'>;
  paymentMethod: PaymentMethod;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  createdOffline: boolean;
  items: Array<{
    name: string;
    qty: number;
    unitPriceCents: number;
    vatRate: number;
    lineTotalCents: number;
  }>;
}

interface ReceiptsResponse {
  items: ServerReceipt[];
}

interface ReceiptResponse {
  item: ServerReceipt;
  idempotent?: boolean;
}

export interface CreateReceiptPayload {
  merchantId: string;
  clientReceiptId: string;
  issuedAt: string;
  paymentMethod: PaymentMethod;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  createdOffline?: boolean;
  items: Array<{
    name: string;
    qty: number;
    unitPriceCents: number;
    vatRate: number;
    lineTotalCents: number;
  }>;
}

export interface ReceiptsFilter {
  from?: string;
  to?: string;
  status?: ReceiptStatus;
  payment?: PaymentMethod;
}

function buildReceiptsQuery(filters: ReceiptsFilter = {}): string {
  const params = new URLSearchParams();

  if (filters.from) {
    params.set('from', filters.from);
  }

  if (filters.to) {
    params.set('to', filters.to);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.payment) {
    params.set('payment', filters.payment);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const receiptsApi = {
  async list(client: ApiClient, filters?: ReceiptsFilter): Promise<ServerReceipt[]> {
    const response = await client.request<ReceiptsResponse>(`/api/receipts${buildReceiptsQuery(filters)}`);
    return response.items;
  },

  async getById(client: ApiClient, receiptId: string): Promise<ServerReceipt> {
    const response = await client.request<ReceiptResponse>(`/api/receipts/${receiptId}`);
    return response.item;
  },

  async create(client: ApiClient, payload: CreateReceiptPayload): Promise<ReceiptResponse> {
    return client.request<ReceiptResponse>('/api/receipts', {
      method: 'POST',
      body: payload,
      merchantId: payload.merchantId
    });
  },

  async void(client: ApiClient, receiptId: string): Promise<ServerReceipt> {
    const response = await client.request<ReceiptResponse>(`/api/receipts/${receiptId}/void`, {
      method: 'POST'
    });

    return response.item;
  },

  async refund(client: ApiClient, receiptId: string): Promise<ServerReceipt> {
    const response = await client.request<ReceiptResponse>(`/api/receipts/${receiptId}/refund`, {
      method: 'POST'
    });

    return response.item;
  }
};
