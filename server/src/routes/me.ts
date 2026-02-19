import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { merchantService } from '../services/merchantService';

const router = Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const merchants = await merchantService.ensureUserMerchants(user.sub);

    res.json({
      user: {
        id: user.sub,
        email: user.email,
        name: user.name,
        given_name: user.given_name,
        family_name: user.family_name,
        merchants
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
