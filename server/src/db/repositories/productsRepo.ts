import { randomUUID } from 'node:crypto';
import { getDb } from '../index';

export interface ProductRecord {
  id: string;
  merchantId: string;
  name: string;
  priceCents: number;
  vatRate: number;
  category: string | null;
  sku: string | null;
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface UpsertProductInput {
  id?: string;
  merchantId: string;
  name: string;
  priceCents: number;
  vatRate: number;
  category?: string | null;
  sku?: string | null;
  isActive?: boolean;
}

function mapRow(row: {
  id: string;
  merchant_id: string;
  name: string;
  price_cents: number;
  vat_rate: number;
  category: string | null;
  sku: string | null;
  is_active: number;
  updated_at: string;
  created_at: string;
}): ProductRecord {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    priceCents: row.price_cents,
    vatRate: row.vat_rate,
    category: row.category,
    sku: row.sku,
    isActive: row.is_active === 1,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

export const productsRepo = {
  async listByMerchant(params: {
    merchantId: string;
    updatedSince?: string;
  }): Promise<ProductRecord[]> {
    const db = await getDb();

    const rows = await db.all<
      {
        id: string;
        merchant_id: string;
        name: string;
        price_cents: number;
        vat_rate: number;
        category: string | null;
        sku: string | null;
        is_active: number;
        updated_at: string;
        created_at: string;
      }[]
    >(
      `SELECT id, merchant_id, name, price_cents, vat_rate, category, sku, is_active, updated_at, created_at
       FROM products
       WHERE merchant_id = ?
         AND (? IS NULL OR updated_at >= ?)
       ORDER BY name ASC`,
      [params.merchantId, params.updatedSince ?? null, params.updatedSince ?? null]
    );

    return rows.map(mapRow);
  },

  async getById(params: { merchantId: string; productId: string }): Promise<ProductRecord | null> {
    const db = await getDb();

    const row = await db.get<{
      id: string;
      merchant_id: string;
      name: string;
      price_cents: number;
      vat_rate: number;
      category: string | null;
      sku: string | null;
      is_active: number;
      updated_at: string;
      created_at: string;
    }>(
      `SELECT id, merchant_id, name, price_cents, vat_rate, category, sku, is_active, updated_at, created_at
       FROM products
       WHERE id = ? AND merchant_id = ?`,
      [params.productId, params.merchantId]
    );

    return row ? mapRow(row) : null;
  },

  async upsert(input: UpsertProductInput): Promise<ProductRecord> {
    const db = await getDb();

    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    const isActive = input.isActive ?? true;

    await db.run(
      `INSERT INTO products
         (id, merchant_id, name, price_cents, vat_rate, category, sku, is_active, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         price_cents = excluded.price_cents,
         vat_rate = excluded.vat_rate,
         category = excluded.category,
         sku = excluded.sku,
         is_active = excluded.is_active,
         updated_at = excluded.updated_at`,
      [
        id,
        input.merchantId,
        input.name,
        input.priceCents,
        input.vatRate,
        input.category ?? null,
        input.sku ?? null,
        isActive ? 1 : 0,
        now,
        now
      ]
    );

    const saved = await this.getById({ merchantId: input.merchantId, productId: id });

    if (!saved) {
      throw new Error('Failed to save product.');
    }

    return saved;
  }
};
