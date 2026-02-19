import { randomUUID } from 'node:crypto';
import { getDb } from '../index';

export type ReceiptStatus = 'COMPLETED' | 'VOIDED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET' | 'SPLIT';

export interface ReceiptItemRecord {
  id: string;
  receiptId: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  vatRate: number;
  lineTotalCents: number;
}

export interface ReceiptRecord {
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
  createdByUserId: string;
  createdOffline: boolean;
  createdAt: string;
  updatedAt: string;
  items: ReceiptItemRecord[];
}

export interface CreateReceiptInput {
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
}

export interface ListReceiptsFilters {
  merchantId: string;
  from?: string;
  to?: string;
  status?: ReceiptStatus;
  payment?: PaymentMethod;
}

function mapReceiptRow(row: {
  id: string;
  merchant_id: string;
  client_receipt_id: string;
  number: string;
  issued_at: string;
  status: ReceiptStatus;
  payment_method: PaymentMethod;
  currency: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  created_by_user_id: string;
  created_offline: number;
  created_at: string;
  updated_at: string;
}, items: ReceiptItemRecord[]): ReceiptRecord {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    clientReceiptId: row.client_receipt_id,
    number: row.number,
    issuedAt: row.issued_at,
    status: row.status,
    paymentMethod: row.payment_method,
    currency: row.currency,
    subtotalCents: row.subtotal_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    createdByUserId: row.created_by_user_id,
    createdOffline: row.created_offline === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items
  };
}

async function getReceiptItems(receiptId: string): Promise<ReceiptItemRecord[]> {
  const db = await getDb();

  const rows = await db.all<
    {
      id: string;
      receipt_id: string;
      name: string;
      qty: number;
      unit_price_cents: number;
      vat_rate: number;
      line_total_cents: number;
    }[]
  >(
    `SELECT id, receipt_id, name, qty, unit_price_cents, vat_rate, line_total_cents
     FROM receipt_items
     WHERE receipt_id = ?`,
    [receiptId]
  );

  return rows.map((row) => ({
    id: row.id,
    receiptId: row.receipt_id,
    name: row.name,
    qty: row.qty,
    unitPriceCents: row.unit_price_cents,
    vatRate: row.vat_rate,
    lineTotalCents: row.line_total_cents
  }));
}

async function getMerchantPrefix(merchantId: string): Promise<string> {
  const db = await getDb();
  const merchant = await db.get<{ name: string }>('SELECT name FROM merchants WHERE id = ?', [merchantId]);

  if (!merchant?.name) {
    return 'MRC';
  }

  const initials = merchant.name
    .split(/\s+/)
    .map((value) => value[0])
    .join('')
    .toUpperCase();

  return initials.slice(0, 3) || 'MRC';
}

async function buildNextReceiptNumber(merchantId: string): Promise<string> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.run(
    `INSERT OR IGNORE INTO merchant_counters (merchant_id, last_number, updated_at)
     VALUES (?, 0, ?)`,
    [merchantId, now]
  );

  await db.run(
    `UPDATE merchant_counters
     SET last_number = last_number + 1,
         updated_at = ?
     WHERE merchant_id = ?`,
    [now, merchantId]
  );

  const row = await db.get<{ last_number: number }>(
    'SELECT last_number FROM merchant_counters WHERE merchant_id = ?',
    [merchantId]
  );

  const number = row?.last_number ?? 1;
  const prefix = await getMerchantPrefix(merchantId);

  return `${prefix}-${String(number).padStart(6, '0')}`;
}

export const receiptsRepo = {
  async listByMerchant(filters: ListReceiptsFilters): Promise<ReceiptRecord[]> {
    const db = await getDb();

    const rows = await db.all<
      {
        id: string;
        merchant_id: string;
        client_receipt_id: string;
        number: string;
        issued_at: string;
        status: ReceiptStatus;
        payment_method: PaymentMethod;
        currency: string;
        subtotal_cents: number;
        tax_cents: number;
        total_cents: number;
        created_by_user_id: string;
        created_offline: number;
        created_at: string;
        updated_at: string;
      }[]
    >(
      `SELECT
         id,
         merchant_id,
         client_receipt_id,
         number,
         issued_at,
         status,
         payment_method,
         currency,
         subtotal_cents,
         tax_cents,
         total_cents,
         created_by_user_id,
         created_offline,
         created_at,
         updated_at
       FROM receipts
       WHERE merchant_id = ?
         AND (? IS NULL OR issued_at >= ?)
         AND (? IS NULL OR issued_at <= ?)
         AND (? IS NULL OR status = ?)
         AND (? IS NULL OR payment_method = ?)
       ORDER BY issued_at DESC`,
      [
        filters.merchantId,
        filters.from ?? null,
        filters.from ?? null,
        filters.to ?? null,
        filters.to ?? null,
        filters.status ?? null,
        filters.status ?? null,
        filters.payment ?? null,
        filters.payment ?? null
      ]
    );

    const receipts: ReceiptRecord[] = [];

    for (const row of rows) {
      const items = await getReceiptItems(row.id);
      receipts.push(mapReceiptRow(row, items));
    }

    return receipts;
  },

  async getById(params: {
    merchantId: string;
    receiptId: string;
  }): Promise<ReceiptRecord | null> {
    const db = await getDb();

    const row = await db.get<{
      id: string;
      merchant_id: string;
      client_receipt_id: string;
      number: string;
      issued_at: string;
      status: ReceiptStatus;
      payment_method: PaymentMethod;
      currency: string;
      subtotal_cents: number;
      tax_cents: number;
      total_cents: number;
      created_by_user_id: string;
      created_offline: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT
         id,
         merchant_id,
         client_receipt_id,
         number,
         issued_at,
         status,
         payment_method,
         currency,
         subtotal_cents,
         tax_cents,
         total_cents,
         created_by_user_id,
         created_offline,
         created_at,
         updated_at
       FROM receipts
       WHERE id = ? AND merchant_id = ?`,
      [params.receiptId, params.merchantId]
    );

    if (!row) {
      return null;
    }

    const items = await getReceiptItems(row.id);
    return mapReceiptRow(row, items);
  },

  async getByClientReceiptId(params: {
    merchantId: string;
    clientReceiptId: string;
  }): Promise<ReceiptRecord | null> {
    const db = await getDb();

    const row = await db.get<{
      id: string;
      merchant_id: string;
      client_receipt_id: string;
      number: string;
      issued_at: string;
      status: ReceiptStatus;
      payment_method: PaymentMethod;
      currency: string;
      subtotal_cents: number;
      tax_cents: number;
      total_cents: number;
      created_by_user_id: string;
      created_offline: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT
         id,
         merchant_id,
         client_receipt_id,
         number,
         issued_at,
         status,
         payment_method,
         currency,
         subtotal_cents,
         tax_cents,
         total_cents,
         created_by_user_id,
         created_offline,
         created_at,
         updated_at
       FROM receipts
       WHERE merchant_id = ? AND client_receipt_id = ?`,
      [params.merchantId, params.clientReceiptId]
    );

    if (!row) {
      return null;
    }

    const items = await getReceiptItems(row.id);
    return mapReceiptRow(row, items);
  },

  async createOrGet(input: CreateReceiptInput): Promise<{ receipt: ReceiptRecord; idempotent: boolean }> {
    const db = await getDb();

    const existing = await this.getByClientReceiptId({
      merchantId: input.merchantId,
      clientReceiptId: input.clientReceiptId
    });

    if (existing) {
      return { receipt: existing, idempotent: true };
    }

    const now = new Date().toISOString();
    const receiptId = randomUUID();

    await db.exec('BEGIN IMMEDIATE TRANSACTION');

    try {
      const nextNumber = await buildNextReceiptNumber(input.merchantId);

      await db.run(
        `INSERT INTO receipts
         (id, merchant_id, client_receipt_id, number, issued_at, status, payment_method,
          currency, subtotal_cents, tax_cents, total_cents, created_by_user_id,
          created_offline, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptId,
          input.merchantId,
          input.clientReceiptId,
          nextNumber,
          input.issuedAt,
          input.paymentMethod,
          input.currency,
          input.subtotalCents,
          input.taxCents,
          input.totalCents,
          input.createdByUserId,
          input.createdOffline ? 1 : 0,
          now,
          now
        ]
      );

      for (const item of input.items) {
        await db.run(
          `INSERT INTO receipt_items
           (id, receipt_id, name, qty, unit_price_cents, vat_rate, line_total_cents)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            receiptId,
            item.name,
            item.qty,
            item.unitPriceCents,
            item.vatRate,
            item.lineTotalCents
          ]
        );
      }

      await db.run(
        `INSERT INTO sync_events (id, merchant_id, receipt_id, type, at, payload)
         VALUES (?, ?, ?, 'RECEIPT_CREATED', ?, ?)`,
        [
          randomUUID(),
          input.merchantId,
          receiptId,
          now,
          JSON.stringify({ clientReceiptId: input.clientReceiptId, createdOffline: input.createdOffline })
        ]
      );

      await db.exec('COMMIT');

      const created = await this.getById({ merchantId: input.merchantId, receiptId });
      if (!created) {
        throw new Error('Failed to read created receipt.');
      }

      return { receipt: created, idempotent: false };
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  },

  async updateStatus(params: {
    merchantId: string;
    receiptId: string;
    status: Exclude<ReceiptStatus, 'COMPLETED'>;
    actedByUserId?: string;
  }): Promise<ReceiptRecord | null> {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.run(
      `UPDATE receipts
       SET status = ?,
           updated_at = ?
       WHERE id = ? AND merchant_id = ?`,
      [params.status, now, params.receiptId, params.merchantId]
    );

    await db.run(
      `INSERT INTO sync_events (id, merchant_id, receipt_id, type, at, payload)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        params.merchantId,
        params.receiptId,
        params.status === 'VOIDED' ? 'RECEIPT_VOIDED' : 'RECEIPT_REFUNDED',
        now,
        JSON.stringify({ status: params.status, actedByUserId: params.actedByUserId ?? null })
      ]
    );

    return this.getById({ merchantId: params.merchantId, receiptId: params.receiptId });
  }
};
