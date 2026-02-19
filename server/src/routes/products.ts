import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireMerchantAccess } from '../middleware/tenantGuard';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import {
  productIdParamSchema,
  productsQuerySchema,
  upsertProductBodySchema
} from '../schemas/products.schema';
import { productsService } from '../services/productsService';

const router = Router();

router.get(
  '/products',
  requireAuth,
  requireMerchantAccess,
  validateQuery(productsQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.query as { updatedSince?: string };

      const items = await productsService.listProducts({
        merchantId: req.merchantId!,
        updatedSince: query.updatedSince
      });

      res.json({ items });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/products',
  requireAuth,
  requireMerchantAccess,
  validateBody(upsertProductBodySchema),
  async (req, res, next) => {
    try {
      const body = req.body as {
        name: string;
        priceCents: number;
        vatRate: number;
        category?: string;
        sku?: string;
        isActive?: boolean;
      };

      const item = await productsService.createProduct({
        merchantId: req.merchantId!,
        name: body.name,
        priceCents: body.priceCents,
        vatRate: body.vatRate,
        category: body.category,
        sku: body.sku,
        isActive: body.isActive
      });

      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/products/:id',
  requireAuth,
  requireMerchantAccess,
  validateParams(productIdParamSchema),
  validateBody(upsertProductBodySchema),
  async (req, res, next) => {
    try {
      const params = req.params as { id: string };
      const body = req.body as {
        name: string;
        priceCents: number;
        vatRate: number;
        category?: string;
        sku?: string;
        isActive?: boolean;
      };

      const item = await productsService.updateProduct({
        merchantId: req.merchantId!,
        productId: params.id,
        name: body.name,
        priceCents: body.priceCents,
        vatRate: body.vatRate,
        category: body.category,
        sku: body.sku,
        isActive: body.isActive
      });

      if (!item) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json({ item });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
