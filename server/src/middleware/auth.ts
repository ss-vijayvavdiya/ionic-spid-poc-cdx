import { NextFunction, Request, Response } from 'express';
import { AppJwtPayload, verifyAppJwt } from '../jwt';

declare global {
  namespace Express {
    interface Request {
      user?: AppJwtPayload;
      merchantId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization;

  if (!authorization) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid Authorization header format' });
    return;
  }

  try {
    req.user = verifyAppJwt(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
