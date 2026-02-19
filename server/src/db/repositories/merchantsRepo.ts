import { getDb } from '../index';

export interface MerchantRecord {
  id: string;
  name: string;
  vatNumber: string | null;
  address: string | null;
}

export interface UserMerchantRecord {
  userId: string;
  merchantId: string;
  role: string;
  merchant: MerchantRecord;
}

export const merchantsRepo = {
  async listUserMerchants(userId: string): Promise<UserMerchantRecord[]> {
    const db = await getDb();

    const rows = await db.all<{
      user_id: string;
      merchant_id: string;
      role: string;
      merchant_name: string;
      merchant_vat_number: string | null;
      merchant_address: string | null;
    }[]>(
      `SELECT
        um.user_id,
        um.merchant_id,
        um.role,
        m.name as merchant_name,
        m.vat_number as merchant_vat_number,
        m.address as merchant_address
       FROM user_merchants um
       INNER JOIN merchants m ON m.id = um.merchant_id
       WHERE um.user_id = ?
       ORDER BY m.name ASC`,
      [userId]
    );

    return rows.map((row) => ({
      userId: row.user_id,
      merchantId: row.merchant_id,
      role: row.role,
      merchant: {
        id: row.merchant_id,
        name: row.merchant_name,
        vatNumber: row.merchant_vat_number,
        address: row.merchant_address
      }
    }));
  },

  async assignDefaultMemberships(userId: string): Promise<void> {
    const db = await getDb();

    const existing = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_merchants WHERE user_id = ?',
      [userId]
    );

    if ((existing?.count ?? 0) > 0) {
      return;
    }

    const merchants = await db.all<{ id: string }[]>('SELECT id FROM merchants ORDER BY name ASC');
    const now = new Date().toISOString();

    // For PoC onboarding, assign the authenticated user to all demo merchants.
    for (const merchant of merchants) {
      await db.run(
        `INSERT OR IGNORE INTO user_merchants (user_id, merchant_id, role, created_at)
         VALUES (?, ?, 'OWNER', ?)`,
        [userId, merchant.id, now]
      );
    }
  },

  async userHasMerchantAccess(userId: string, merchantId: string): Promise<boolean> {
    const db = await getDb();

    const row = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM user_merchants
       WHERE user_id = ? AND merchant_id = ?`,
      [userId, merchantId]
    );

    return (row?.count ?? 0) > 0;
  },

  async getMerchantById(merchantId: string): Promise<MerchantRecord | null> {
    const db = await getDb();

    const row = await db.get<{
      id: string;
      name: string;
      vat_number: string | null;
      address: string | null;
    }>('SELECT id, name, vat_number, address FROM merchants WHERE id = ?', [merchantId]);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      vatNumber: row.vat_number,
      address: row.address
    };
  }
};
