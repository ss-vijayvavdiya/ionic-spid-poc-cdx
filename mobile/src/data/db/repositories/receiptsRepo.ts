import { PaymentMethod, Receipt, ReceiptItem, ReceiptStatus } from '../../../types/models';
import { toIsoNow } from '../../../utils/dates';
import { generateUuid } from '../../../utils/uuid';
import { localDb } from '../index';

export interface CreateReceiptInput {
  merchantId: string;
  clientReceiptId?: string;
  paymentMethod: PaymentMethod;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  items: ReceiptItem[];
  isOnline: boolean;
}

export interface ReceiptFilters {
  status?: ReceiptStatus;
  paymentMethod?: PaymentMethod;
  from?: string;
  to?: string;
}

function matchesFilters(receipt: Receipt, filters: ReceiptFilters): boolean {
  if (filters.status && receipt.status !== filters.status) {
    return false;
  }

  if (filters.paymentMethod && receipt.paymentMethod !== filters.paymentMethod) {
    return false;
  }

  if (filters.from && receipt.issuedAt < filters.from) {
    return false;
  }

  if (filters.to && receipt.issuedAt > filters.to) {
    return false;
  }

  return true;
}

export const receiptsRepo = {
  async listByMerchant(merchantId: string, filters: ReceiptFilters = {}): Promise<Receipt[]> {
    const receipts = await localDb.getReceiptsByMerchant(merchantId);
    return receipts.filter((receipt) => matchesFilters(receipt, filters));
  },

  async getById(receiptId: string): Promise<Receipt | null> {
    return localDb.getReceiptById(receiptId);
  },

  async createReceipt(input: CreateReceiptInput): Promise<Receipt> {
    const issuedAt = toIsoNow();

    const receipt: Receipt = {
      id: generateUuid(),
      clientReceiptId: input.clientReceiptId ?? generateUuid(),
      merchantId: input.merchantId,
      issuedAt,
      status: input.isOnline ? 'COMPLETED' : 'PENDING_SYNC',
      syncStatus: input.isOnline ? 'SYNCED' : 'PENDING',
      paymentMethod: input.paymentMethod,
      currency: input.currency,
      subtotalCents: input.subtotalCents,
      taxCents: input.taxCents,
      totalCents: input.totalCents,
      items: input.items,
      createdOffline: !input.isOnline,
      syncAttempts: 0
    };

    await localDb.saveReceipt(receipt);

    if (!input.isOnline) {
      await localDb.enqueueReceiptSync(receipt);
    }

    return receipt;
  },

  async upsertFromServer(input: {
    id: string;
    clientReceiptId: string;
    merchantId: string;
    number?: string;
    issuedAt: string;
    status: Exclude<ReceiptStatus, 'PENDING_SYNC'>;
    paymentMethod: PaymentMethod;
    currency: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    items: ReceiptItem[];
    createdOffline: boolean;
  }): Promise<void> {
    await localDb.saveReceipt({
      id: input.id,
      clientReceiptId: input.clientReceiptId,
      merchantId: input.merchantId,
      number: input.number,
      issuedAt: input.issuedAt,
      status: input.status,
      syncStatus: 'SYNCED',
      paymentMethod: input.paymentMethod,
      currency: input.currency,
      subtotalCents: input.subtotalCents,
      taxCents: input.taxCents,
      totalCents: input.totalCents,
      items: input.items,
      createdOffline: input.createdOffline,
      syncAttempts: 0
    });
  },

  async markAsSynced(receiptId: string, receiptNumber?: string): Promise<void> {
    const receipt = await localDb.getReceiptById(receiptId);

    if (!receipt) {
      return;
    }

    await localDb.updateReceiptSyncState({
      receiptId,
      syncStatus: 'SYNCED',
      status: 'COMPLETED',
      number: receiptNumber,
      syncAttempts: receipt.syncAttempts
    });
  },

  async markSyncFailed(receiptId: string, nextAttempts: number): Promise<void> {
    await localDb.updateReceiptSyncState({
      receiptId,
      syncStatus: 'FAILED',
      syncAttempts: nextAttempts
    });
  },

  async countPendingSync(merchantId: string): Promise<number> {
    return localDb.countPendingReceipts(merchantId);
  }
};
