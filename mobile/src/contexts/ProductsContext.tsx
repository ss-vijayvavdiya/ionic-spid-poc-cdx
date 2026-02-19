import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '../types/models';
import { productsRepo, SaveProductInput } from '../data/db/repositories/productsRepo';
import { useMerchant } from './MerchantContext';
import { useDataContext } from './DataContext';
import { createApiClient } from '../api/client';
import { productsApi } from '../api/products';
import { useAuth } from './AuthContext';
import { logWarn } from '../utils/logging';

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  refreshProducts: () => Promise<void>;
  getProductById: (productId: string) => Promise<Product | null>;
  saveProduct: (input: SaveProductInput) => Promise<Product>;
  seedDemoProducts: () => Promise<number>;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDbReady } = useDataContext();
  const { selectedMerchant } = useMerchant();
  const { token } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const refreshProducts = useCallback(async (): Promise<void> => {
    if (!isDbReady || !selectedMerchant) {
      setProducts([]);
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

          const remoteProducts = await productsApi.list(apiClient);

          for (const remoteProduct of remoteProducts) {
            await productsRepo.upsertFromServer(remoteProduct);
          }
        } catch (error) {
          // Offline-first behavior: local DB remains source of truth if API fails.
          logWarn('Products API refresh failed, using local cache', error);
        }
      }

      const result = await productsRepo.listByMerchant(selectedMerchant.id, searchTerm);
      setProducts(result);
    } finally {
      setLoading(false);
    }
  }, [isDbReady, selectedMerchant, searchTerm, token]);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  const getProductById = async (productId: string): Promise<Product | null> => {
    if (!isDbReady) {
      return null;
    }

    return productsRepo.getById(productId);
  };

  const saveProduct = async (input: SaveProductInput): Promise<Product> => {
    const saved = await productsRepo.save(input);
    await refreshProducts();
    return saved;
  };

  const seedDemoProducts = async (): Promise<number> => {
    if (!selectedMerchant) {
      return 0;
    }

    const inserted = await productsRepo.seedDemoProducts(selectedMerchant.id);
    await refreshProducts();
    return inserted;
  };

  const value = useMemo<ProductsContextValue>(
    () => ({
      products,
      loading,
      searchTerm,
      setSearchTerm,
      refreshProducts,
      getProductById,
      saveProduct,
      seedDemoProducts
    }),
    [products, loading, searchTerm, refreshProducts, seedDemoProducts]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
};

export function useProducts(): ProductsContextValue {
  const context = useContext(ProductsContext);

  if (!context) {
    throw new Error('useProducts must be used inside ProductsProvider');
  }

  return context;
}
