import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { merchantService } from '../services/merchantService';

const router = Router();

router.get('/merchants', requireAuth, async (req, res, next) => {
  try {
    const merchants = await merchantService.ensureUserMerchants(req.user!.sub);
    res.json({ items: merchants });
  } catch (error) {
    next(error);
  }
});

export default router;
