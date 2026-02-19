import { NextFunction, Request, Response } from 'express';

function readMerchantFromRequest(req: Request): string | null {
  const headerValue = req.header('x-merchant-id');
  if (headerValue) {
    return headerValue;
  }

  const bodyValue = typeof req.body?.merchantId === 'string' ? req.body.merchantId : null;
  if (bodyValue) {
    return bodyValue;
  }

  const paramValue = typeof req.params?.merchantId === 'string' ? req.params.merchantId : null;
  if (paramValue) {
    return paramValue;
  }

  return null;
}

export function requireMerchantAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const merchantId = readMerchantFromRequest(req);

  if (!merchantId) {
    res.status(400).json({ error: 'Missing merchant context (x-merchant-id or merchantId)' });
    return;
  }

  if (typeof req.body?.merchantId === 'string' && req.body.merchantId !== merchantId) {
    res.status(400).json({ error: 'merchantId mismatch between header and body' });
    return;
  }

  const merchantIds = Array.isArray(req.user.merchantIds) ? req.user.merchantIds : [];
  const hasAccess = merchantIds.includes(merchantId);

  if (!hasAccess) {
    res.status(403).json({ error: 'Forbidden for this merchant' });
    return;
  }

  req.merchantId = merchantId;
  next();
}
