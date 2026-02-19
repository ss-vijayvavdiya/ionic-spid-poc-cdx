import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initializeLocalDatabase, localDb } from '../data/db';
import { syncManager } from '../data/sync/syncManager';
import { useAuth } from './AuthContext';

interface DataContextValue {
  isDbReady: boolean;
  dbMode: string;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [dbMode, setDbMode] = useState<string>('initializing');

  useEffect(() => {
    let active = true;

    const init = async (): Promise<void> => {
      await initializeLocalDatabase();

      if (!active) {
        return;
      }

      setIsDbReady(true);
      setDbMode(localDb.getCurrentMode() ?? 'unknown');
    };

    void init();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isDbReady) {
      return;
    }

    syncManager.start({
      getToken: () => token
    });

    return () => {
      syncManager.stop();
    };
  }, [isDbReady, token]);

  const value = useMemo<DataContextValue>(
    () => ({
      isDbReady,
      dbMode
    }),
    [isDbReady, dbMode]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export function useDataContext(): DataContextValue {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error('useDataContext must be used inside DataProvider');
  }

  return context;
}
