import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Merchant } from '../types/models';
import { useAuth } from './AuthContext';
import { getSelectedMerchantId, saveSelectedMerchantId } from '../services/storage';
import { useDataContext } from './DataContext';
import { merchantsRepo } from '../data/db/repositories/merchantsRepo';

interface MerchantContextValue {
  merchants: Merchant[];
  selectedMerchant: Merchant | null;
  selectMerchant: (merchantId: string) => void;
}

const MerchantContext = createContext<MerchantContextValue | undefined>(undefined);

export const MerchantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { isDbReady } = useDataContext();
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [localMerchants, setLocalMerchants] = useState<Merchant[]>([]);

  useEffect(() => {
    if (!isDbReady) {
      return;
    }

    const loadLocalMerchants = async (): Promise<void> => {
      const list = await merchantsRepo.listMerchants();
      setLocalMerchants(list);
    };

    void loadLocalMerchants();
  }, [isDbReady]);

  const merchants = useMemo<Merchant[]>(() => {
    const userMerchants = user?.merchants ?? [];

    if (!userMerchants.length) {
      return localMerchants;
    }

    // Merge only merchants present in auth claims to preserve tenant isolation.
    const mergedMap = new Map<string, Merchant>();

    for (const merchant of userMerchants) {
      mergedMap.set(merchant.id, merchant);
    }

    for (const merchant of localMerchants) {
      const existing = mergedMap.get(merchant.id);
      if (!existing) {
        continue;
      }

      mergedMap.set(merchant.id, {
        ...merchant,
        ...existing
      });
    }

    return Array.from(mergedMap.values());
  }, [user?.merchants, localMerchants]);

  useEffect(() => {
    if (!merchants.length) {
      setSelectedMerchant(null);
      return;
    }

    const savedMerchantId = getSelectedMerchantId();

    if (savedMerchantId) {
      const matched = merchants.find((merchant) => merchant.id === savedMerchantId);
      if (matched) {
        setSelectedMerchant(matched);
        return;
      }
    }

    // For multi-merchant users we require explicit selection.
    if (merchants.length > 1) {
      setSelectedMerchant(null);
      return;
    }

    // Auto-select the only merchant available.
    setSelectedMerchant(merchants[0]);
    saveSelectedMerchantId(merchants[0].id);
  }, [merchants]);

  const selectMerchant = (merchantId: string): void => {
    const merchant = merchants.find((item) => item.id === merchantId);

    if (!merchant) {
      return;
    }

    setSelectedMerchant(merchant);
    saveSelectedMerchantId(merchant.id);
  };

  const value = useMemo<MerchantContextValue>(
    () => ({
      merchants,
      selectedMerchant,
      selectMerchant
    }),
    [merchants, selectedMerchant]
  );

  return <MerchantContext.Provider value={value}>{children}</MerchantContext.Provider>;
};

export function useMerchant(): MerchantContextValue {
  const context = useContext(MerchantContext);

  if (!context) {
    throw new Error('useMerchant must be used inside MerchantProvider');
  }

  return context;
}
