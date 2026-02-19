import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';

// Configure test env before importing app/config modules.
const testDbPath = path.join(os.tmpdir(), `spid-pos-it-${Date.now()}.sqlite`);

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.BASE_URL = 'https://test.ngrok-free.app';
process.env.SIGNICAT_ISSUER = 'https://issuer.example.test';
process.env.SIGNICAT_CLIENT_ID = 'test-client';
process.env.SIGNICAT_CLIENT_SECRET = 'test-secret';
process.env.SIGNICAT_SCOPE = 'openid profile email';
process.env.ANDROID_PACKAGE_NAME = 'com.smartsense.spidpoc';
process.env.ANDROID_SHA256_FINGERPRINT = 'AA:BB:CC';
process.env.APP_JWT_SECRET = 'test-secret-key-with-minimum-length-12345';
process.env.SQLITE_PATH = testDbPath;

let app: import('express').Express;
let dbApi: typeof import('../db');

function signTestJwt(input: { sub: string; merchantIds: string[] }): string {
  return jwt.sign(
    {
      sub: input.sub,
      merchantIds: input.merchantIds,
      email: `${input.sub}@example.com`
    },
    process.env.APP_JWT_SECRET!,
    {
      issuer: 'spid-poc-backend',
      expiresIn: 3600
    }
  );
}

before(async () => {
  const appModule = await import('../app');
  dbApi = await import('../db');
  app = appModule.createApp();

  // Ensure DB and seed data are present.
  const db = await dbApi.getDb();
  const now = new Date().toISOString();

  // Users must exist because user_merchants has FK constraints.
  await db.run(
    `INSERT OR REPLACE INTO users (id, email, created_at, updated_at)
     VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
    [
      'tenant-user',
      'tenant@example.com',
      now,
      now,
      'receipt-user',
      'receipt@example.com',
      now,
      now
    ]
  );

  // Ensure memberships exist for test users.
  await db.run(
    `INSERT OR IGNORE INTO user_merchants (user_id, merchant_id, role, created_at)
     VALUES (?, ?, 'OWNER', ?), (?, ?, 'OWNER', ?)`,
    ['tenant-user', 'merchant-brew-haven', now, 'receipt-user', 'merchant-brew-haven', now]
  );
});

after(async () => {
  await dbApi.resetDbForTests();

  try {
    await fs.unlink(testDbPath);
  } catch {
    // ignore
  }
});

describe('API integration: tenant isolation', () => {
  it('denies cross-merchant access and allows authorized merchant', async () => {
    const token = signTestJwt({
      sub: 'tenant-user',
      merchantIds: ['merchant-brew-haven']
    });

    const denied = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Merchant-Id', 'merchant-trattoria-roma');

    assert.equal(denied.status, 403);

    const allowed = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Merchant-Id', 'merchant-brew-haven');

    assert.equal(allowed.status, 200);
    assert.ok(Array.isArray(allowed.body.items));
    assert.ok(allowed.body.items.length > 0);
  });
});

describe('API integration: receipt idempotency', () => {
  it('returns existing receipt for duplicate clientReceiptId', async () => {
    const token = signTestJwt({
      sub: 'receipt-user',
      merchantIds: ['merchant-brew-haven']
    });

    const clientReceiptId = `it-client-${Date.now()}`;
    const payload = {
      merchantId: 'merchant-brew-haven',
      clientReceiptId,
      issuedAt: new Date().toISOString(),
      paymentMethod: 'CARD',
      currency: 'EUR',
      subtotalCents: 1000,
      taxCents: 100,
      totalCents: 1100,
      createdOffline: true,
      items: [
        {
          name: 'Integration Espresso',
          qty: 2,
          unitPriceCents: 500,
          vatRate: 10,
          lineTotalCents: 1000
        }
      ]
    };

    const first = await request(app)
      .post('/api/receipts')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Merchant-Id', 'merchant-brew-haven')
      .send(payload);

    assert.equal(first.status, 201);
    assert.equal(first.body.idempotent, false);
    assert.ok(first.body.item?.id);

    const second = await request(app)
      .post('/api/receipts')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Merchant-Id', 'merchant-brew-haven')
      .send(payload);

    assert.equal(second.status, 200);
    assert.equal(second.body.idempotent, true);
    assert.equal(second.body.item.id, first.body.item.id);

    const db = await dbApi.getDb();
    const row = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM receipts
       WHERE merchant_id = ? AND client_receipt_id = ?`,
      ['merchant-brew-haven', clientReceiptId]
    );

    assert.equal(row?.count, 1);
  });
});
