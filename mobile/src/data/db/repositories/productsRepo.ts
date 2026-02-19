import { Product } from '../../../types/models';
import { toIsoNow } from '../../../utils/dates';
import { generateUuid } from '../../../utils/uuid';
import { localDb } from '../index';
import { SEED_PRODUCTS } from '../seed';

export interface SaveProductInput {
  id?: string;
  merchantId: string;
  name: string;
  priceCents: number;
  vatRate: number;
  category?: string;
  sku?: string;
  isActive?: boolean;
}

export const productsRepo = {
  async listByMerchant(merchantId: string, searchTerm?: string): Promise<Product[]> {
    return localDb.getProductsByMerchant(merchantId, searchTerm);
  },

  async getById(productId: string): Promise<Product | null> {
    return localDb.getProductById(productId);
  },

  async upsertFromServer(product: Product): Promise<void> {
    await localDb.upsertProduct(product);
  },

  async seedDemoProducts(merchantId?: string): Promise<number> {
    const candidates = merchantId
      ? SEED_PRODUCTS.filter((item) => item.merchantId === merchantId)
      : SEED_PRODUCTS;

    for (const product of candidates) {
      await localDb.upsertProduct({
        ...product,
        updatedAt: toIsoNow()
      });
    }

    return candidates.length;
  },

  async save(input: SaveProductInput): Promise<Product> {
    const product: Product = {
      id: input.id ?? generateUuid(),
      merchantId: input.merchantId,
      name: input.name.trim(),
      priceCents: input.priceCents,
      vatRate: input.vatRate,
      category: input.category?.trim() || undefined,
      sku: input.sku?.trim() || undefined,
      isActive: input.isActive ?? true,
      updatedAt: toIsoNow()
    };

    await localDb.upsertProduct(product);

    return product;
  }
};
