import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { config } from '../utils/config';
import { logInfo } from '../utils/logger';

let database: Database | null = null;

function resolveDatabasePath(): string {
  const configuredPath = config.sqlitePath;

  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  // Keep DB path stable relative to server working directory.
  return path.resolve(process.cwd(), configuredPath);
}

async function runMigrations(db: Database): Promise<void> {
  const migrationCandidates = [
    path.resolve(process.cwd(), 'src', 'db', 'migrations', '001_init.sql'),
    path.resolve(__dirname, 'migrations', '001_init.sql')
  ];

  let sql: string | null = null;

  for (const migrationPath of migrationCandidates) {
    try {
      sql = await fs.readFile(migrationPath, 'utf8');
      break;
    } catch {
      // Try next candidate path.
    }
  }

  if (!sql) {
    throw new Error('Migration file 001_init.sql not found.');
  }

  await db.exec(sql);
}

async function seedDemoData(db: Database): Promise<void> {
  const existingMerchant = await db.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM merchants'
  );

  const now = new Date().toISOString();

  if ((existingMerchant?.count ?? 0) === 0) {
    await db.run(
      `INSERT INTO merchants (id, name, vat_number, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
      [
        'merchant-brew-haven',
        'Brew Haven Coffee',
        'IT12345678901',
        '12 Bean Street, Milan',
        now,
        now,
        'merchant-trattoria-roma',
        'Trattoria Roma',
        'IT10987654321',
        '8 Piazza Centro, Rome',
        now,
        now
      ]
    );

    await db.run(
      `INSERT INTO merchant_counters (merchant_id, last_number, updated_at)
       VALUES (?, 0, ?), (?, 0, ?)`,
      ['merchant-brew-haven', now, 'merchant-trattoria-roma', now]
    );
  }

  const existingProducts = await db.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM products'
  );

  if ((existingProducts?.count ?? 0) === 0) {
    await db.run(
      `INSERT INTO products
        (id, merchant_id, name, price_cents, vat_rate, category, sku, is_active, updated_at, created_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        'prod-espresso', 'merchant-brew-haven', 'Espresso', 180, 10, 'Coffee', 'COF-001', now, now,
        'prod-cappuccino', 'merchant-brew-haven', 'Cappuccino', 320, 10, 'Coffee', 'COF-002', now, now,
        'prod-latte', 'merchant-brew-haven', 'Cafe Latte', 350, 10, 'Coffee', 'COF-003', now, now,
        'prod-croissant', 'merchant-brew-haven', 'Butter Croissant', 250, 10, 'Bakery', 'BAK-001', now, now,
        'prod-club-sandwich', 'merchant-brew-haven', 'Club Sandwich', 720, 10, 'Food', 'FOD-001', now, now,
        'prod-pizza-margherita', 'merchant-trattoria-roma', 'Pizza Margherita', 1150, 10, 'Main Course', 'RST-001', now, now,
        'prod-carbonara', 'merchant-trattoria-roma', 'Spaghetti Carbonara', 1350, 10, 'Main Course', 'RST-002', now, now,
        'prod-lasagna', 'merchant-trattoria-roma', 'Lasagna', 1400, 10, 'Main Course', 'RST-003', now, now,
        'prod-tiramisu', 'merchant-trattoria-roma', 'Tiramisu', 650, 10, 'Dessert', 'RST-004', now, now,
        'prod-house-wine', 'merchant-trattoria-roma', 'House Wine (Glass)', 550, 22, 'Drinks', 'RST-005', now, now
      ]
    );
  }

  logInfo('Seeded demo data (coffee shop + restaurant).');
}

export async function getDb(): Promise<Database> {
  if (database) {
    return database;
  }

  const dbPath = resolveDatabasePath();
  const dbDir = path.dirname(dbPath);
  mkdirSync(dbDir, { recursive: true });

  database = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // SQLite foreign key support is disabled by default.
  await database.exec('PRAGMA foreign_keys = ON');

  await runMigrations(database);
  await seedDemoData(database);

  logInfo(`SQLite initialized at ${dbPath}`);

  return database;
}

// Useful for integration tests so each run can use a clean sqlite file.
export async function closeDb(): Promise<void> {
  if (!database) {
    return;
  }

  await database.close();
  database = null;
}

export async function resetDbForTests(): Promise<void> {
  await closeDb();
}
