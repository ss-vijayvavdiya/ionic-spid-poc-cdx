import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { Merchant, Product, Receipt, ReceiptItem, SyncStatus } from '../../types/models';
import { toIsoNow } from '../../utils/dates';
import { generateUuid } from '../../utils/uuid';
import { logInfo, logWarn } from '../../utils/logging';
import { SEED_MERCHANTS, SEED_PRODUCTS, SEED_RECEIPTS } from './seed';
import { LOCAL_DB_NAME, LOCAL_DB_VERSION, SQLITE_SCHEMA_STATEMENTS } from './schema';

export type SyncQueueStatus = 'PENDING' | 'PROCESSING' | 'FAILED';

export interface SyncQueueRecord {
  id: string;
  merchantId: string;
  receiptId: string;
  payload: Receipt;
  attempts: number;
  nextAttemptAt: string;
  status: SyncQueueStatus;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalDbSchema extends DBSchema {
  merchants: {
    key: string;
    value: Merchant;
  };
  products: {
    key: string;
    value: Product;
    indexes: {
      merchantId: string;
      updatedAt: string;
    };
  };
  receipts: {
    key: string;
    value: Receipt;
    indexes: {
      merchantId: string;
      issuedAt: string;
      syncStatus: SyncStatus;
      merchantClientReceipt: [string, string];
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueRecord;
    indexes: {
      statusNextAttempt: [SyncQueueStatus, string];
      merchantId: string;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: string;
      updatedAt: string;
    };
  };
}

type SQLiteValue = string | number | null;

interface SQLiteError {
  message?: string;
}

interface SQLiteResultRows {
  length: number;
  item: (index: number) => Record<string, unknown>;
}

interface SQLiteResultSet {
  rows: SQLiteResultRows;
  rowsAffected: number;
  insertId?: number;
}

interface SQLiteTransaction {
  executeSql: (
    sql: string,
    params: SQLiteValue[],
    successCallback?: (tx: SQLiteTransaction, result: SQLiteResultSet) => void,
    errorCallback?: (tx: SQLiteTransaction, error: SQLiteError) => boolean | void
  ) => void;
}

interface SQLiteDatabase {
  transaction: (
    callback: (tx: SQLiteTransaction) => void,
    errorCallback?: (error: SQLiteError) => void,
    successCallback?: () => void
  ) => void;
}

interface SQLitePlugin {
  openDatabase: (options: { name: string; location: string }) => SQLiteDatabase;
}

type DbMode = 'sqlite' | 'indexeddb';

class LocalDatabase {
  private mode: DbMode | null = null;

  private sqliteDatabase: SQLiteDatabase | null = null;

  private indexedDatabase: IDBPDatabase<LocalDbSchema> | null = null;

  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeInternal();
    return this.initPromise;
  }

  getCurrentMode(): DbMode | null {
    return this.mode;
  }

  private async initializeInternal(): Promise<void> {
    const sqlitePlugin = (window as Window & { sqlitePlugin?: SQLitePlugin }).sqlitePlugin;

    if (sqlitePlugin?.openDatabase) {
      this.mode = 'sqlite';
      this.sqliteDatabase = sqlitePlugin.openDatabase({
        name: `${LOCAL_DB_NAME}.db`,
        location: 'default'
      });

      for (const statement of SQLITE_SCHEMA_STATEMENTS) {
        await this.sqliteExecute(statement);
      }

      logInfo('Local DB initialized with SQLite engine.');
    } else {
      this.mode = 'indexeddb';
      this.indexedDatabase = await openDB<LocalDbSchema>(LOCAL_DB_NAME, LOCAL_DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('merchants')) {
            db.createObjectStore('merchants', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('products')) {
            const store = db.createObjectStore('products', { keyPath: 'id' });
            store.createIndex('merchantId', 'merchantId', { unique: false });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }

          if (!db.objectStoreNames.contains('receipts')) {
            const store = db.createObjectStore('receipts', { keyPath: 'id' });
            store.createIndex('merchantId', 'merchantId', { unique: false });
            store.createIndex('issuedAt', 'issuedAt', { unique: false });
            store.createIndex('syncStatus', 'syncStatus', { unique: false });
            store.createIndex('merchantClientReceipt', ['merchantId', 'clientReceiptId'], {
              unique: true
            });
          }

          if (!db.objectStoreNames.contains('syncQueue')) {
            const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
            store.createIndex('statusNextAttempt', ['status', 'nextAttemptAt'], { unique: false });
            store.createIndex('merchantId', 'merchantId', { unique: false });
          }

          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        }
      });

      logWarn('SQLite plugin unavailable. Using IndexedDB fallback.');
    }

    await this.seedDataIfRequired();
  }

  private async ensureReady(): Promise<void> {
    await this.init();

    if (!this.mode) {
      throw new Error('Local database is not initialized.');
    }
  }

  private sqliteExecute(sql: string, params: SQLiteValue[] = []): Promise<SQLiteResultSet> {
    return new Promise((resolve, reject) => {
      if (!this.sqliteDatabase) {
        reject(new Error('SQLite database is not open.'));
        return;
      }

      this.sqliteDatabase.transaction(
        (tx) => {
          tx.executeSql(
            sql,
            params,
            (_tx, result) => {
              resolve(result);
            },
            (_tx, error) => {
              reject(new Error(error.message || 'SQLite execution error'));
              return true;
            }
          );
        },
        (error) => {
          reject(new Error(error.message || 'SQLite transaction error'));
        }
      );
    });
  }

  private sqliteExecuteBatch(commands: Array<{ sql: string; params?: SQLiteValue[] }>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.sqliteDatabase) {
        reject(new Error('SQLite database is not open.'));
        return;
      }

      this.sqliteDatabase.transaction(
        (tx) => {
          for (const command of commands) {
            tx.executeSql(command.sql, command.params ?? []);
          }
        },
        (error) => {
          reject(new Error(error.message || 'SQLite batch transaction error'));
        },
        () => {
          resolve();
        }
      );
    });
  }

  private mapSqlRows<T>(result: SQLiteResultSet): T[] {
    const rows: T[] = [];

    for (let index = 0; index < result.rows.length; index += 1) {
      rows.push(result.rows.item(index) as T);
    }

    return rows;
  }

  private async seedDataIfRequired(): Promise<void> {
    // Always ensure demo merchants/products exist so checkout demos are ready
    // even if app data was partially initialized in an older build.
    for (const merchant of SEED_MERCHANTS) {
      await this.upsertMerchant(merchant);
    }

    for (const product of SEED_PRODUCTS) {
      await this.upsertProduct(product);
    }

    const hasSeed = await this.getSetting('seed.version');
    if (hasSeed === '1') {
      return;
    }

    for (const receipt of SEED_RECEIPTS) {
      await this.saveReceipt(receipt);
      if (receipt.syncStatus === 'PENDING') {
        await this.enqueueReceiptSync(receipt);
      }
    }

    await this.setSetting('seed.version', '1');
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.ensureReady();

    const updatedAt = toIsoNow();

    if (this.mode === 'sqlite') {
      await this.sqliteExecute(
        `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
        [key, value, updatedAt]
      );
      return;
    }

    await this.indexedDatabase!.put('settings', {
      key,
      value,
      updatedAt
    });
  }

  async getSetting(key: string): Promise<string | null> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      const result = await this.sqliteExecute(`SELECT value FROM app_settings WHERE key = ?`, [key]);
      const rows = this.mapSqlRows<{ value: string }>(result);
      return rows.length ? rows[0].value : null;
    }

    const record = await this.indexedDatabase!.get('settings', key);
    return record?.value ?? null;
  }

  async upsertMerchant(merchant: Merchant): Promise<void> {
    await this.ensureReady();

    const updatedAt = toIsoNow();

    if (this.mode === 'sqlite') {
      await this.sqliteExecute(
        `INSERT OR REPLACE INTO merchants (id, name, vat_number, address, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [merchant.id, merchant.name, merchant.vatNumber ?? null, merchant.address ?? null, updatedAt]
      );
      return;
    }

    await this.indexedDatabase!.put('merchants', merchant);
  }

  async getMerchants(): Promise<Merchant[]> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      const result = await this.sqliteExecute(
        `SELECT id, name, vat_number as vatNumber, address FROM merchants ORDER BY name ASC`
      );
      return this.mapSqlRows<Merchant>(result);
    }

    const merchants = await this.indexedDatabase!.getAll('merchants');
    return merchants.sort((a, b) => a.name.localeCompare(b.name));
  }

  async upsertProduct(product: Product): Promise<void> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      await this.sqliteExecute(
        `INSERT OR REPLACE INTO products
        (id, merchant_id, name, price_cents, vat_rate, category, sku, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.merchantId,
          product.name,
          product.priceCents,
          product.vatRate,
          product.category ?? null,
          product.sku ?? null,
          product.isActive ? 1 : 0,
          product.updatedAt
        ]
      );
      return;
    }

    await this.indexedDatabase!.put('products', product);
  }

  async getProductById(productId: string): Promise<Product | null> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      const result = await this.sqliteExecute(
        `SELECT
          id,
          merchant_id as merchantId,
          name,
          price_cents as priceCents,
          vat_rate as vatRate,
          category,
          sku,
          is_active as isActive,
          updated_at as updatedAt
        FROM products
        WHERE id = ?`,
        [productId]
      );

      const rows = this.mapSqlRows<
        Omit<Product, 'isActive'> & {
          isActive: number;
        }
      >(result);

      if (!rows.length) {
        return null;
      }

      return {
        ...rows[0],
        isActive: rows[0].isActive === 1
      };
    }

    return (await this.indexedDatabase!.get('products', productId)) ?? null;
  }

  async getProductsByMerchant(merchantId: string, searchTerm?: string): Promise<Product[]> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      const hasSearch = Boolean(searchTerm?.trim());

      const result = await this.sqliteExecute(
        `SELECT
          id,
          merchant_id as merchantId,
          name,
          price_cents as priceCents,
          vat_rate as vatRate,
          category,
          sku,
          is_active as isActive,
          updated_at as updatedAt
         FROM products
         WHERE merchant_id = ?
           AND is_active = 1
           ${hasSearch ? 'AND LOWER(name) LIKE LOWER(?)' : ''}
         ORDER BY name ASC`,
        hasSearch ? [merchantId, `%${searchTerm!.trim()}%`] : [merchantId]
      );

      const rows = this.mapSqlRows<
        Omit<Product, 'isActive'> & {
          isActive: number;
        }
      >(result);

      return rows.map((row) => ({
        ...row,
        isActive: row.isActive === 1
      }));
    }

    const records = await this.indexedDatabase!.getAllFromIndex('products', 'merchantId', merchantId);

    const filtered = records.filter((item) => {
      if (!item.isActive) {
        return false;
      }

      if (!searchTerm?.trim()) {
        return true;
      }

      return item.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  async saveReceipt(receipt: Receipt): Promise<void> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      const commands: Array<{ sql: string; params?: SQLiteValue[] }> = [
        {
          sql: `INSERT OR REPLACE INTO receipts
              (id, client_receipt_id, merchant_id, number, issued_at, status, sync_status, payment_method,
               currency, subtotal_cents, tax_cents, total_cents, created_offline, sync_attempts,
               server_receipt_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          params: [
            receipt.id,
            receipt.clientReceiptId,
            receipt.merchantId,
            receipt.number ?? null,
            receipt.issuedAt,
            receipt.status,
            receipt.syncStatus,
            receipt.paymentMethod,
            receipt.currency,
            receipt.subtotalCents,
            receipt.taxCents,
            receipt.totalCents,
            receipt.createdOffline ? 1 : 0,
            receipt.syncAttempts,
            null,
            toIsoNow()
          ]
        },
        {
          sql: `DELETE FROM receipt_items WHERE receipt_id = ?`,
          params: [receipt.id]
        }
      ];

      for (const item of receipt.items) {
        commands.push({
          sql: `INSERT INTO receipt_items
                (id, receipt_id, name, qty, unit_price_cents, vat_rate, line_total_cents)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          params: [
            generateUuid(),
            receipt.id,
            item.name,
            item.qty,
            item.unitPriceCents,
            item.vatRate,
            item.lineTotalCents
          ]
        });
      }

      await this.sqliteExecuteBatch(commands);
      return;
    }

    await this.indexedDatabase!.put('receipts', receipt);
  }

  private async getReceiptItemsForSql(receiptId: string): Promise<ReceiptItem[]> {
    const result = await this.sqliteExecute(
      `SELECT name, qty, unit_price_cents as unitPriceCents, vat_rate as vatRate, line_total_cents as lineTotalCents
       FROM receipt_items
       WHERE receipt_id = ?`,
      [receiptId]
    );

    return this.mapSqlRows<ReceiptItem>(result);
  }

  private mapReceiptRow(row: {
    id: string;
    clientReceiptId: string;
    merchantId: string;
    number?: string | null;
    issuedAt: string;
    status: Receipt['status'];
    syncStatus: SyncStatus;
    paymentMethod: Receipt['paymentMethod'];
    currency: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    createdOffline: number;
    syncAttempts: number;
  }, items: ReceiptItem[]): Receipt {
    return {
      id: row.id,
      clientReceiptId: row.clientReceiptId,
      merchantId: row.merchantId,
      number: row.number ?? undefined,
      issuedAt: row.issuedAt,
      status: row.status,
      syncStatus: row.syncStatus,
      paymentMethod: row.paymentMethod,
      currency: row.currency,
      subtotalCents: row.subtotalCents,
      taxCents: row.taxCents,
      totalCents: row.totalCents,
      items,
      createdOffline: row.createdOffline === 1,
      syncAttempts: row.syncAttempts
    };
  }

  async getReceiptById(receiptId: string): Promise<Receipt | null> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      const result = await this.sqliteExecute(
        `SELECT
          id,
          client_receipt_id as clientReceiptId,
          merchant_id as merchantId,
          number,
          issued_at as issuedAt,
          status,
          sync_status as syncStatus,
          payment_method as paymentMethod,
          currency,
          subtotal_cents as subtotalCents,
          tax_cents as taxCents,
          total_cents as totalCents,
          created_offline as createdOffline,
          sync_attempts as syncAttempts
         FROM receipts
         WHERE id = ?`,
        [receiptId]
      );

      const rows = this.mapSqlRows<{
        id: string;
        clientReceiptId: string;
        merchantId: string;
        number?: string | null;
        issuedAt: string;
        status: Receipt['status'];
        syncStatus: SyncStatus;
        paymentMethod: Receipt['paymentMethod'];
        currency: string;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        createdOffline: number;
        syncAttempts: number;
      }>(result);

      if (!rows.length) {
        return null;
      }

      const items = await this.getReceiptItemsForSql(receiptId);
      return this.mapReceiptRow(rows[0], items);
    }

    return (await this.indexedDatabase!.get('receipts', receiptId)) ?? null;
  }

  async getReceiptsByMerchant(merchantId: string): Promise<Receipt[]> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      const result = await this.sqliteExecute(
        `SELECT
          id,
          client_receipt_id as clientReceiptId,
          merchant_id as merchantId,
          number,
          issued_at as issuedAt,
          status,
          sync_status as syncStatus,
          payment_method as paymentMethod,
          currency,
          subtotal_cents as subtotalCents,
          tax_cents as taxCents,
          total_cents as totalCents,
          created_offline as createdOffline,
          sync_attempts as syncAttempts
         FROM receipts
         WHERE merchant_id = ?
         ORDER BY issued_at DESC`,
        [merchantId]
      );

      const rows = this.mapSqlRows<{
        id: string;
        clientReceiptId: string;
        merchantId: string;
        number?: string | null;
        issuedAt: string;
        status: Receipt['status'];
        syncStatus: SyncStatus;
        paymentMethod: Receipt['paymentMethod'];
        currency: string;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        createdOffline: number;
        syncAttempts: number;
      }>(result);

      const receipts: Receipt[] = [];
      for (const row of rows) {
        const items = await this.getReceiptItemsForSql(row.id);
        receipts.push(this.mapReceiptRow(row, items));
      }
      return receipts;
    }

    const receipts = await this.indexedDatabase!.getAllFromIndex('receipts', 'merchantId', merchantId);
    return receipts.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  async countPendingReceipts(merchantId: string): Promise<number> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      const result = await this.sqliteExecute(
        `SELECT COUNT(*) as count FROM receipts WHERE merchant_id = ? AND sync_status = 'PENDING'`,
        [merchantId]
      );

      const rows = this.mapSqlRows<{ count: number }>(result);
      return rows[0]?.count ?? 0;
    }

    const receipts = await this.indexedDatabase!.getAllFromIndex('receipts', 'merchantId', merchantId);
    return receipts.filter((receipt) => receipt.syncStatus === 'PENDING').length;
  }

  async updateReceiptSyncState(params: {
    receiptId: string;
    syncStatus: SyncStatus;
    status?: Receipt['status'];
    number?: string;
    syncAttempts: number;
  }): Promise<void> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      await this.sqliteExecute(
        `UPDATE receipts
         SET sync_status = ?,
             status = COALESCE(?, status),
             number = COALESCE(?, number),
             sync_attempts = ?
         WHERE id = ?`,
        [
          params.syncStatus,
          params.status ?? null,
          params.number ?? null,
          params.syncAttempts,
          params.receiptId
        ]
      );
      return;
    }

    const receipt = await this.indexedDatabase!.get('receipts', params.receiptId);
    if (!receipt) {
      return;
    }

    await this.indexedDatabase!.put('receipts', {
      ...receipt,
      syncStatus: params.syncStatus,
      status: params.status ?? receipt.status,
      number: params.number ?? receipt.number,
      syncAttempts: params.syncAttempts
    });
  }

  async enqueueReceiptSync(receipt: Receipt): Promise<void> {
    await this.ensureReady();

    const now = toIsoNow();
    const queueRecord: SyncQueueRecord = {
      id: generateUuid(),
      merchantId: receipt.merchantId,
      receiptId: receipt.id,
      payload: receipt,
      attempts: receipt.syncAttempts,
      nextAttemptAt: now,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };

    if (this.mode === 'sqlite') {
      await this.sqliteExecute(
        `INSERT OR REPLACE INTO sync_queue
         (id, merchant_id, receipt_id, payload_json, attempts, next_attempt_at, status, last_error, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          queueRecord.id,
          queueRecord.merchantId,
          queueRecord.receiptId,
          JSON.stringify(queueRecord.payload),
          queueRecord.attempts,
          queueRecord.nextAttemptAt,
          queueRecord.status,
          queueRecord.lastError ?? null,
          queueRecord.createdAt,
          queueRecord.updatedAt
        ]
      );
      return;
    }

    await this.indexedDatabase!.put('syncQueue', queueRecord);
  }

  async getDueSyncQueueItems(nowIso: string): Promise<SyncQueueRecord[]> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      const result = await this.sqliteExecute(
        `SELECT
          id,
          merchant_id as merchantId,
          receipt_id as receiptId,
          payload_json as payloadJson,
          attempts,
          next_attempt_at as nextAttemptAt,
          status,
          last_error as lastError,
          created_at as createdAt,
          updated_at as updatedAt
         FROM sync_queue
         WHERE next_attempt_at <= ?
           AND status IN ('PENDING', 'FAILED')
         ORDER BY created_at ASC`,
        [nowIso]
      );

      const rows = this.mapSqlRows<{
        id: string;
        merchantId: string;
        receiptId: string;
        payloadJson: string;
        attempts: number;
        nextAttemptAt: string;
        status: SyncQueueStatus;
        lastError?: string;
        createdAt: string;
        updatedAt: string;
      }>(result);

      return rows.map((row) => ({
        id: row.id,
        merchantId: row.merchantId,
        receiptId: row.receiptId,
        payload: JSON.parse(row.payloadJson) as Receipt,
        attempts: row.attempts,
        nextAttemptAt: row.nextAttemptAt,
        status: row.status,
        lastError: row.lastError,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }));
    }

    const items = await this.indexedDatabase!.getAll('syncQueue');
    return items
      .filter((item) =>
        (item.status === 'PENDING' || item.status === 'FAILED') && item.nextAttemptAt <= nowIso
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async updateSyncQueueItem(item: SyncQueueRecord): Promise<void> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      await this.sqliteExecute(
        `INSERT OR REPLACE INTO sync_queue
         (id, merchant_id, receipt_id, payload_json, attempts, next_attempt_at, status, last_error, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.merchantId,
          item.receiptId,
          JSON.stringify(item.payload),
          item.attempts,
          item.nextAttemptAt,
          item.status,
          item.lastError ?? null,
          item.createdAt,
          item.updatedAt
        ]
      );
      return;
    }

    await this.indexedDatabase!.put('syncQueue', item);
  }

  async deleteSyncQueueItem(queueId: string): Promise<void> {
    await this.ensureReady();

    if (this.mode === 'sqlite') {
      await this.sqliteExecute(`DELETE FROM sync_queue WHERE id = ?`, [queueId]);
      return;
    }

    await this.indexedDatabase!.delete('syncQueue', queueId);
  }
}

export const localDb = new LocalDatabase();

export async function initializeLocalDatabase(): Promise<void> {
  await localDb.init();
}
