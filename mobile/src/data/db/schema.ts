// Schema definitions for local persistence.
// We keep SQL here so the same logical model can be reused if we switch engines later.

export const LOCAL_DB_NAME = 'spid_pos_local_db';
export const LOCAL_DB_VERSION = 1;

export const SQLITE_SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    vat_number TEXT,
    address TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    vat_rate REAL NOT NULL,
    category TEXT,
    sku TEXT,
    is_active INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_products_merchant_updated ON products(merchant_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    client_receipt_id TEXT NOT NULL,
    merchant_id TEXT NOT NULL,
    number TEXT,
    issued_at TEXT NOT NULL,
    status TEXT NOT NULL,
    sync_status TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    currency TEXT NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    tax_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    created_offline INTEGER NOT NULL,
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    server_receipt_id TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_merchant_client_id ON receipts(merchant_id, client_receipt_id)`,
  `CREATE INDEX IF NOT EXISTS idx_receipts_merchant_issued_at ON receipts(merchant_id, issued_at)`,
  `CREATE TABLE IF NOT EXISTS receipt_items (
    id TEXT PRIMARY KEY,
    receipt_id TEXT NOT NULL,
    name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    vat_rate REAL NOT NULL,
    line_total_cents INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    receipt_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT NOT NULL,
    status TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status_next_attempt ON sync_queue(status, next_attempt_at)`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`
];
