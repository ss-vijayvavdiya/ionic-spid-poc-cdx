import { useMemo } from 'react';
import { createApiClient } from './client';
import { useAuth } from '../contexts/AuthContext';
import { useMerchant } from '../contexts/MerchantContext';

export function useApiClient() {
  const { token, logout } = useAuth();
  const { selectedMerchant } = useMerchant();

  return useMemo(
    () =>
      createApiClient({
        getToken: () => token,
        getMerchantId: () => selectedMerchant?.id ?? null,
        onUnauthorized: logout
      }),
    [token, selectedMerchant?.id, logout]
  );
}
