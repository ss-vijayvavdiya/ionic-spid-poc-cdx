import { localDb, SyncQueueRecord } from '../db';

export const syncQueue = {
  async getDueItems(nowIso: string): Promise<SyncQueueRecord[]> {
    return localDb.getDueSyncQueueItems(nowIso);
  },

  async save(item: SyncQueueRecord): Promise<void> {
    await localDb.updateSyncQueueItem(item);
  },

  async remove(queueId: string): Promise<void> {
    await localDb.deleteSyncQueueItem(queueId);
  }
};
