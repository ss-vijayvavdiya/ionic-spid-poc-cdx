import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PaymentMethod, Receipt, ReceiptItem, ReceiptStatus } from '../types/models';
import { receiptsRepo } from '../data/db/repositories/receiptsRepo';
import { useMerchant } from './MerchantContext';
import { useDataContext } from './DataContext';
import { useAuth } from './AuthContext';
import { createApiClient } from '../api/client';
import { receiptsApi } from '../api/receipts';
import { logWarn } from '../utils/logging';
import { generateUuid } from '../utils/uuid';

interface ReceiptFilterState {
  status?: ReceiptStatus;
  paymentMethod?: PaymentMethod;
}

interface CreateReceiptPayload {
  paymentMethod: PaymentMethod;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  items: ReceiptItem[];
}

interface ReceiptsContextValue {
  receipts: Receipt[];
  loading: boolean;
  pendingSyncCount: number;
  filters: ReceiptFilterState;
  setFilters: (filters: ReceiptFilterState) => void;
  refreshReceipts: () => Promise<void>;
  getReceiptById: (receiptId: string) => Promise<Receipt | null>;
  createReceipt: (payload: CreateReceiptPayload) => Promise<Receipt>;
}

const ReceiptsContext = createContext<ReceiptsContextValue | undefined>(undefined);

export const ReceiptsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDbReady } = useDataContext();
  const { selectedMerchant } = useMerchant();
  const { token } = useAuth();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [filters, setFilters] = useState<ReceiptFilterState>({});

  const refreshReceipts = useCallback(async (): Promise<void> => {
    if (!isDbReady || !selectedMerchant) {
      setReceipts([]);
      setPendingSyncCount(0);
      return;
    }

    setLoading(true);

    try {
      if (navigator.onLine && token && selectedMerchant) {
        try {
          const apiClient = createApiClient({
            getToken: () => token,
            getMerchantId: () => selectedMerchant.id
          });

          const remoteReceipts = await receiptsApi.list(apiClient, {
            status: filters.status === 'PENDING_SYNC' ? undefined : filters.status,
            payment: filters.paymentMethod
          });

          for (const remoteReceipt of remoteReceipts) {
            await receiptsRepo.upsertFromServer({
              id: remoteReceipt.id,
              clientReceiptId: remoteReceipt.clientReceiptId,
              merchantId: remoteReceipt.merchantId,
              number: remoteReceipt.number,
              issuedAt: remoteReceipt.issuedAt,
              status: remoteReceipt.status,
              paymentMethod: remoteReceipt.paymentMethod,
              currency: remoteReceipt.currency,
              subtotalCents: remoteReceipt.subtotalCents,
              taxCents: remoteReceipt.taxCents,
              totalCents: remoteReceipt.totalCents,
              items: remoteReceipt.items,
              createdOffline: remoteReceipt.createdOffline
            });
          }
        } catch (error) {
          logWarn('Receipts API refresh failed, using local cache', error);
        }
      }

      const [list, pendingCount] = await Promise.all([
        receiptsRepo.listByMerchant(selectedMerchant.id, filters),
        receiptsRepo.countPendingSync(selectedMerchant.id)
      ]);

      setReceipts(list);
      setPendingSyncCount(pendingCount);
    } finally {
      setLoading(false);
    }
  }, [isDbReady, selectedMerchant, filters, token]);

  useEffect(() => {
    void refreshReceipts();
  }, [refreshReceipts]);

  const getReceiptById = async (receiptId: string): Promise<Receipt | null> => {
    if (!isDbReady) {
      return null;
    }

    return receiptsRepo.getById(receiptId);
  };

  const createReceipt = async (payload: CreateReceiptPayload): Promise<Receipt> => {
    if (!selectedMerchant) {
      throw new Error('No merchant selected.');
    }

    const clientReceiptId = generateUuid();

    if (navigator.onLine && token) {
      try {
        const apiClient = createApiClient({
          getToken: () => token,
          getMerchantId: () => selectedMerchant.id
        });

        const response = await receiptsApi.create(apiClient, {
          merchantId: selectedMerchant.id,
          clientReceiptId,
          issuedAt: new Date().toISOString(),
          paymentMethod: payload.paymentMethod,
          currency: payload.currency,
          subtotalCents: payload.subtotalCents,
          taxCents: payload.taxCents,
          totalCents: payload.totalCents,
          createdOffline: false,
          items: payload.items
        });

        await receiptsRepo.upsertFromServer({
          id: response.item.id,
          clientReceiptId: response.item.clientReceiptId,
          merchantId: response.item.merchantId,
          number: response.item.number,
          issuedAt: response.item.issuedAt,
          status: response.item.status,
          paymentMethod: response.item.paymentMethod,
          currency: response.item.currency,
          subtotalCents: response.item.subtotalCents,
          taxCents: response.item.taxCents,
          totalCents: response.item.totalCents,
          items: response.item.items,
          createdOffline: response.item.createdOffline
        });

        const syncedReceipt = await receiptsRepo.getById(response.item.id);

        if (syncedReceipt) {
          await refreshReceipts();
          return syncedReceipt;
        }
      } catch (error) {
        logWarn('Online receipt issue failed, fallback to offline queue', error);
      }
    }

    const receipt = await receiptsRepo.createReceipt({
      merchantId: selectedMerchant.id,
      clientReceiptId,
      paymentMethod: payload.paymentMethod,
      currency: payload.currency,
      subtotalCents: payload.subtotalCents,
      taxCents: payload.taxCents,
      totalCents: payload.totalCents,
      items: payload.items,
      isOnline: false
    });

    await refreshReceipts();

    return receipt;
  };

  const value = useMemo<ReceiptsContextValue>(
    () => ({
      receipts,
      loading,
      pendingSyncCount,
      filters,
      setFilters,
      refreshReceipts,
      getReceiptById,
      createReceipt
    }),
    [receipts, loading, pendingSyncCount, filters, refreshReceipts]
  );

  return <ReceiptsContext.Provider value={value}>{children}</ReceiptsContext.Provider>;
};

export function useReceipts(): ReceiptsContextValue {
  const context = useContext(ReceiptsContext);

  if (!context) {
    throw new Error('useReceipts must be used inside ReceiptsProvider');
  }

  return context;
}
