import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireMerchantAccess } from '../middleware/tenantGuard';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import {
  createReceiptBodySchema,
  receiptIdParamSchema,
  receiptsQuerySchema
} from '../schemas/receipts.schema';
import { receiptsService } from '../services/receiptsService';

const router = Router();

router.get(
  '/receipts',
  requireAuth,
  requireMerchantAccess,
  validateQuery(receiptsQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.query as {
        from?: string;
        to?: string;
        status?: 'COMPLETED' | 'VOIDED' | 'REFUNDED';
        payment?: 'CASH' | 'CARD' | 'WALLET' | 'SPLIT';
      };

      const items = await receiptsService.listReceipts({
        merchantId: req.merchantId!,
        from: query.from,
        to: query.to,
        status: query.status,
        payment: query.payment
      });

      res.json({ items });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/receipts/:id',
  requireAuth,
  requireMerchantAccess,
  validateParams(receiptIdParamSchema),
  async (req, res, next) => {
    try {
      const params = req.params as { id: string };

      const item = await receiptsService.getReceipt({
        merchantId: req.merchantId!,
        receiptId: params.id
      });

      if (!item) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      res.json({ item });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/receipts',
  requireAuth,
  requireMerchantAccess,
  validateBody(createReceiptBodySchema),
  async (req, res, next) => {
    try {
      const body = req.body as {
        merchantId: string;
        clientReceiptId: string;
        issuedAt: string;
        paymentMethod: 'CASH' | 'CARD' | 'WALLET' | 'SPLIT';
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
      };

      const result = await receiptsService.createReceipt({
        merchantId: req.merchantId!,
        clientReceiptId: body.clientReceiptId,
        issuedAt: body.issuedAt,
        paymentMethod: body.paymentMethod,
        currency: body.currency,
        subtotalCents: body.subtotalCents,
        taxCents: body.taxCents,
        totalCents: body.totalCents,
        createdByUserId: req.user!.sub,
        createdOffline: body.createdOffline ?? false,
        items: body.items
      });

      res.status(result.idempotent ? 200 : 201).json({
        item: result.receipt,
        idempotent: result.idempotent
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/receipts/:id/void',
  requireAuth,
  requireMerchantAccess,
  validateParams(receiptIdParamSchema),
  async (req, res, next) => {
    try {
      const params = req.params as { id: string };

      const item = await receiptsService.voidReceipt({
        merchantId: req.merchantId!,
        receiptId: params.id,
        actedByUserId: req.user!.sub
      });

      if (!item) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      res.json({ item });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/receipts/:id/refund',
  requireAuth,
  requireMerchantAccess,
  validateParams(receiptIdParamSchema),
  async (req, res, next) => {
    try {
      const params = req.params as { id: string };

      const item = await receiptsService.refundReceipt({
        merchantId: req.merchantId!,
        receiptId: params.id,
        actedByUserId: req.user!.sub
      });

      if (!item) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      res.json({ item });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
