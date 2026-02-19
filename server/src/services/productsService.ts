import { productsRepo } from '../db/repositories/productsRepo';

export interface ProductDto {
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

function toDto(record: {
  id: string;
  merchantId: string;
  name: string;
  priceCents: number;
  vatRate: number;
  category: string | null;
  sku: string | null;
  isActive: boolean;
  updatedAt: string;
}): ProductDto {
  return {
    id: record.id,
    merchantId: record.merchantId,
    name: record.name,
    priceCents: record.priceCents,
    vatRate: record.vatRate,
    category: record.category ?? undefined,
    sku: record.sku ?? undefined,
    isActive: record.isActive,
    updatedAt: record.updatedAt
  };
}

export const productsService = {
  async listProducts(params: {
    merchantId: string;
    updatedSince?: string;
  }): Promise<ProductDto[]> {
    const records = await productsRepo.listByMerchant(params);
    return records.map(toDto);
  },

  async createProduct(input: {
    merchantId: string;
    name: string;
    priceCents: number;
    vatRate: number;
    category?: string;
    sku?: string;
    isActive?: boolean;
  }): Promise<ProductDto> {
    const saved = await productsRepo.upsert({
      merchantId: input.merchantId,
      name: input.name,
      priceCents: input.priceCents,
      vatRate: input.vatRate,
      category: input.category,
      sku: input.sku,
      isActive: input.isActive ?? true
    });

    return toDto(saved);
  },

  async updateProduct(input: {
    merchantId: string;
    productId: string;
    name: string;
    priceCents: number;
    vatRate: number;
    category?: string;
    sku?: string;
    isActive?: boolean;
  }): Promise<ProductDto | null> {
    const existing = await productsRepo.getById({
      merchantId: input.merchantId,
      productId: input.productId
    });

    if (!existing) {
      return null;
    }

    const updated = await productsRepo.upsert({
      id: input.productId,
      merchantId: input.merchantId,
      name: input.name,
      priceCents: input.priceCents,
      vatRate: input.vatRate,
      category: input.category,
      sku: input.sku,
      isActive: input.isActive ?? existing.isActive
    });

    return toDto(updated);
  }
};
