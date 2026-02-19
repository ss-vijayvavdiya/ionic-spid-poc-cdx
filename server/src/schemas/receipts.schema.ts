import { z } from 'zod';

export const receiptStatusSchema = z.enum(['COMPLETED', 'VOIDED', 'REFUNDED']);
export const paymentMethodSchema = z.enum(['CASH', 'CARD', 'WALLET', 'SPLIT']);

export const receiptsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: receiptStatusSchema.optional(),
  payment: paymentMethodSchema.optional()
});

export const receiptIdParamSchema = z.object({
  id: z.string().min(1)
});

export const createReceiptBodySchema = z.object({
  merchantId: z.string().min(1),
  clientReceiptId: z.string().min(1),
  issuedAt: z.string().datetime(),
  paymentMethod: paymentMethodSchema,
  currency: z.string().length(3),
  subtotalCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
  createdOffline: z.boolean().optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        qty: z.number().int().positive(),
        unitPriceCents: z.number().int().nonnegative(),
        vatRate: z.number().min(0).max(100),
        lineTotalCents: z.number().int().nonnegative()
      })
    )
    .min(1)
});
