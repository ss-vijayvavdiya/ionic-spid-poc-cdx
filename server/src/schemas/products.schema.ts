import { z } from 'zod';

export const productsQuerySchema = z.object({
  updatedSince: z.string().datetime().optional()
});

export const upsertProductBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  priceCents: z.number().int().nonnegative(),
  vatRate: z.number().min(0).max(100),
  category: z.string().trim().max(80).optional(),
  sku: z.string().trim().max(80).optional(),
  isActive: z.boolean().optional()
});

export const productIdParamSchema = z.object({
  id: z.string().min(1)
});
