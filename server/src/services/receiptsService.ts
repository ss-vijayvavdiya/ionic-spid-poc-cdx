import {
  PaymentMethod,
  receiptsRepo,
  ReceiptStatus
} from '../db/repositories/receiptsRepo';
import { logInfo } from '../utils/logger';

export interface ReceiptItemDto {
  name: string;
  qty: number;
  unitPriceCents: number;
  vatRate: number;
  lineTotalCents: number;
}

export interface ReceiptDto {
  id: string;
  merchantId: string;
  clientReceiptId: string;
  number: string;
  issuedAt: string;
  status: ReceiptStatus;
  paymentMethod: PaymentMethod;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  createdOffline: boolean;
  items: ReceiptItemDto[];
}

function toDto(record: {
  id: string;
  merchantId: string;
  clientReceiptId: string;
  number: string;
  issuedAt: string;
  status: ReceiptStatus;
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
}): ReceiptDto {
  return {
    id: record.id,
    merchantId: record.merchantId,
    clientReceiptId: record.clientReceiptId,
    number: record.number,
    issuedAt: record.issuedAt,
    status: record.status,
    paymentMethod: record.paymentMethod,
    currency: record.currency,
    subtotalCents: record.subtotalCents,
    taxCents: record.taxCents,
    totalCents: record.totalCents,
    createdOffline: record.createdOffline,
    items: record.items.map((item) => ({
      name: item.name,
      qty: item.qty,
      unitPriceCents: item.unitPriceCents,
      vatRate: item.vatRate,
      lineTotalCents: item.lineTotalCents
    }))
  };
}

export const receiptsService = {
  async listReceipts(params: {
    merchantId: string;
    from?: string;
    to?: string;
    status?: ReceiptStatus;
    payment?: PaymentMethod;
  }): Promise<ReceiptDto[]> {
    const records = await receiptsRepo.listByMerchant(params);
    return records.map(toDto);
  },

  async getReceipt(params: {
    merchantId: string;
    receiptId: string;
  }): Promise<ReceiptDto | null> {
    const record = await receiptsRepo.getById(params);
    return record ? toDto(record) : null;
  },

  async createReceipt(input: {
    merchantId: string;
    clientReceiptId: string;
    issuedAt: string;
    paymentMethod: PaymentMethod;
    currency: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    createdByUserId: string;
    createdOffline: boolean;
    items: Array<{
      name: string;
      qty: number;
      unitPriceCents: number;
      vatRate: number;
      lineTotalCents: number;
    }>;
  }): Promise<{ receipt: ReceiptDto; idempotent: boolean }> {
    const result = await receiptsRepo.createOrGet(input);
    return {
      receipt: toDto(result.receipt),
      idempotent: result.idempotent
    };
  },

  async voidReceipt(params: {
    merchantId: string;
    receiptId: string;
    actedByUserId: string;
  }): Promise<ReceiptDto | null> {
    logInfo('AUDIT receipt void requested', {
      action: 'VOID',
      merchantId: params.merchantId,
      receiptId: params.receiptId,
      actedByUserId: params.actedByUserId
    });

    const updated = await receiptsRepo.updateStatus({
      merchantId: params.merchantId,
      receiptId: params.receiptId,
      status: 'VOIDED',
      actedByUserId: params.actedByUserId
    });

    return updated ? toDto(updated) : null;
  },

  async refundReceipt(params: {
    merchantId: string;
    receiptId: string;
    actedByUserId: string;
  }): Promise<ReceiptDto | null> {
    logInfo('AUDIT receipt refund requested', {
      action: 'REFUND',
      merchantId: params.merchantId,
      receiptId: params.receiptId,
      actedByUserId: params.actedByUserId
    });

    const updated = await receiptsRepo.updateStatus({
      merchantId: params.merchantId,
      receiptId: params.receiptId,
      status: 'REFUNDED',
      actedByUserId: params.actedByUserId
    });

    return updated ? toDto(updated) : null;
  }
};
