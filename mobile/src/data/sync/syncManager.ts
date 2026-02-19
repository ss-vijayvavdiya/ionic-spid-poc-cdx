import { SYNC_BASE_BACKOFF_MS, SYNC_MAX_ATTEMPTS, USE_MOCK } from '../../config';
import { receiptsRepo } from '../db/repositories/receiptsRepo';
import { SyncQueueRecord } from '../db';
import { syncQueue } from './syncQueue';
import { toIsoNow } from '../../utils/dates';
import { logError, logInfo } from '../../utils/logging';
import { createApiClient, ApiError } from '../../api/client';
import { receiptsApi } from '../../api/receipts';

interface SyncManagerOptions {
  getToken: () => string | null;
}

class SyncManager {
  private timerId: number | null = null;

  private running = false;

  private options: SyncManagerOptions | null = null;

  start(options: SyncManagerOptions): void {
    if (this.running) {
      return;
    }

    this.options = options;
    this.running = true;

    // Try once immediately.
    void this.processQueue();

    // Keep processing in the background.
    this.timerId = window.setInterval(() => {
      void this.processQueue();
    }, 5000);

    window.addEventListener('online', this.handleOnline);
  }

  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.running = false;
    window.removeEventListener('online', this.handleOnline);
  }

  private handleOnline = (): void => {
    void this.processQueue();
  };

  private async processQueue(): Promise<void> {
    if (!this.running || !navigator.onLine || !this.options) {
      return;
    }

    const dueItems = await syncQueue.getDueItems(toIsoNow());

    if (!dueItems.length) {
      return;
    }

    const token = this.options.getToken();

    if (!token && !USE_MOCK) {
      return;
    }

    for (const item of dueItems) {
      await this.processItem(item, token);
    }
  }

  private async processItem(item: SyncQueueRecord, token: string | null): Promise<void> {
    try {
      const result = await this.syncReceipt(item, token);

      await receiptsRepo.markAsSynced(item.receiptId, result.number);
      await syncQueue.remove(item.id);

      logInfo(`Receipt ${item.receiptId} synced successfully.`);
    } catch (error) {
      const attempts = item.attempts + 1;
      const nextAttemptDelayMs = SYNC_BASE_BACKOFF_MS * Math.pow(2, Math.min(attempts, 6));
      const nextAttemptAt = new Date(Date.now() + nextAttemptDelayMs).toISOString();

      await receiptsRepo.markSyncFailed(item.receiptId, attempts);

      const updated: SyncQueueRecord = {
        ...item,
        attempts,
        nextAttemptAt,
        status: attempts >= SYNC_MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        lastError: error instanceof Error ? error.message : 'Unknown sync error',
        updatedAt: toIsoNow()
      };

      await syncQueue.save(updated);

      logError(`Receipt sync failed for ${item.receiptId}`, error);
    }
  }

  private async syncReceipt(item: SyncQueueRecord, token: string | null): Promise<{ number?: string }> {
    if (USE_MOCK) {
      // Simulate a successful sync so UI behavior can be tested without backend APIs.
      await new Promise((resolve) => {
        setTimeout(resolve, 350);
      });
      return {};
    }

    const apiClient = createApiClient({
      getToken: () => token,
      getMerchantId: () => item.merchantId
    });

    try {
      const response = await receiptsApi.create(apiClient, {
        merchantId: item.merchantId,
        clientReceiptId: item.payload.clientReceiptId,
        issuedAt: item.payload.issuedAt,
        paymentMethod: item.payload.paymentMethod,
        currency: item.payload.currency,
        subtotalCents: item.payload.subtotalCents,
        taxCents: item.payload.taxCents,
        totalCents: item.payload.totalCents,
        items: item.payload.items,
        createdOffline: true
      });

      return { number: response.item.number };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Server considers this clientReceiptId already processed.
        return {};
      }

      throw error;
    }
  }
}

export const syncManager = new SyncManager();
