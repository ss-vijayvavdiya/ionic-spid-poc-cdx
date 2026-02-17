// Express middleware for protecting API routes with our own JWT.

import { Request, Response, NextFunction } from 'express';
import { AppJwtPayload, verifyAppJwt } from './jwt';

// Extend Express.Request so we can attach user info.
declare global {
  namespace Express {
    interface Request {
      user?: AppJwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Expect the header: Authorization: Bearer <token>
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  try {
    const payload = verifyAppJwt(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
