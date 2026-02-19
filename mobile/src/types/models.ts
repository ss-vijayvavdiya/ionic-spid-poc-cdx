// Shared frontend models for POS domain entities.

export interface Merchant {
  id: string;
  name: string;
  vatNumber?: string;
  address?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  merchants: Merchant[];
  givenName?: string;
  familyName?: string;
  fullName?: string;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  priceCents: number;
  vatRate: number;
  category?: string;
  sku?: string;
  isActive: boolean;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  vatRate: number;
}

export type ReceiptStatus = 'COMPLETED' | 'VOIDED' | 'REFUNDED' | 'PENDING_SYNC';

export type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED';

export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET' | 'SPLIT';

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPriceCents: number;
  vatRate: number;
  lineTotalCents: number;
}

export interface Receipt {
  id: string;
  clientReceiptId: string;
  merchantId: string;
  number?: string;
  issuedAt: string;
  status: ReceiptStatus;
  syncStatus: SyncStatus;
  paymentMethod: PaymentMethod;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  items: ReceiptItem[];
  createdOffline: boolean;
  syncAttempts: number;
}
