import { getDb } from '../index';

export interface UserRecord {
  id: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export const usersRepo = {
  async upsertUser(params: { id: string; email?: string | null }): Promise<UserRecord> {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO users (id, email, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         updated_at = excluded.updated_at`,
      [params.id, params.email ?? null, now, now]
    );

    const user = await db.get<{
      id: string;
      email: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT id, email, created_at, updated_at FROM users WHERE id = ?', [params.id]);

    if (!user) {
      throw new Error('User upsert failed.');
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
};
