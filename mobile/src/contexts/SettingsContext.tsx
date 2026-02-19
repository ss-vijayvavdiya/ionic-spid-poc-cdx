import React, { createContext, useContext, useMemo, useState } from 'react';
import i18n, { AppLanguage, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from '../i18n';
import { PaymentMethod } from '../types/models';

const PAYMENT_SETTINGS_KEY = 'spid_pos_payment_settings';
const PRINTER_SETTINGS_KEY = 'spid_pos_printer_settings';
const REPORTS_SETTINGS_KEY = 'spid_pos_reports_settings';
const SUPPORT_SETTINGS_KEY = 'spid_pos_support_settings';

export interface PaymentSettings {
  cashEnabled: boolean;
  cardEnabled: boolean;
  walletEnabled: boolean;
  splitEnabled: boolean;
  defaultMethod: PaymentMethod;
  lastSavedAt?: string;
}

export interface PrinterDevice {
  id: string;
  name: string;
}

export interface PrinterSettings {
  selectedPrinterId: string | null;
  selectedPrinterName: string | null;
  isConnected: boolean;
  lastScanAt?: string;
  lastTestPrintAt?: string;
  lastSavedAt?: string;
}

export interface ReportsSettings {
  lastExportAt?: string;
}

export interface SupportSettings {
  preferredChannel: 'email' | 'phone' | 'whatsapp';
  notesDraft: string;
  lastContactAt?: string;
}

interface SettingsContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;

  paymentSettings: PaymentSettings;
  savePaymentSettings: (nextSettings: PaymentSettings) => void;

  printerSettings: PrinterSettings;
  savePrinterSettings: (nextSettings: PrinterSettings) => void;

  reportsSettings: ReportsSettings;
  markReportsExported: () => void;

  supportSettings: SupportSettings;
  saveSupportSettings: (nextSettings: SupportSettings) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  cashEnabled: true,
  cardEnabled: true,
  walletEnabled: false,
  splitEnabled: false,
  defaultMethod: 'CASH'
};

const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  selectedPrinterId: null,
  selectedPrinterName: null,
  isConnected: false
};

const DEFAULT_REPORTS_SETTINGS: ReportsSettings = {};

const DEFAULT_SUPPORT_SETTINGS: SupportSettings = {
  preferredChannel: 'email',
  notesDraft: ''
};

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return {
      ...fallback,
      ...(JSON.parse(raw) as Partial<T>)
    };
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep app usable even if storage is unavailable.
  }
}

function readInitialLanguage(): AppLanguage {
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === 'en' || savedLanguage === 'it' || savedLanguage === 'de') {
      return savedLanguage;
    }
  } catch {
    // Ignore storage read failures.
  }

  if (i18n.language === 'en' || i18n.language === 'it' || i18n.language === 'de') {
    return i18n.language;
  }

  return DEFAULT_LANGUAGE;
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(readInitialLanguage());

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() =>
    safeReadJson(PAYMENT_SETTINGS_KEY, DEFAULT_PAYMENT_SETTINGS)
  );

  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(() =>
    safeReadJson(PRINTER_SETTINGS_KEY, DEFAULT_PRINTER_SETTINGS)
  );

  const [reportsSettings, setReportsSettings] = useState<ReportsSettings>(() =>
    safeReadJson(REPORTS_SETTINGS_KEY, DEFAULT_REPORTS_SETTINGS)
  );

  const [supportSettings, setSupportSettings] = useState<SupportSettings>(() =>
    safeReadJson(SUPPORT_SETTINGS_KEY, DEFAULT_SUPPORT_SETTINGS)
  );

  const setLanguage = async (nextLanguage: AppLanguage): Promise<void> => {
    setLanguageState(nextLanguage);

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // ignore
    }

    await i18n.changeLanguage(nextLanguage);
  };

  const savePaymentSettings = (nextSettings: PaymentSettings): void => {
    const withMetadata: PaymentSettings = {
      ...nextSettings,
      lastSavedAt: new Date().toISOString()
    };

    setPaymentSettings(withMetadata);
    safeWriteJson(PAYMENT_SETTINGS_KEY, withMetadata);
  };

  const savePrinterSettings = (nextSettings: PrinterSettings): void => {
    const withMetadata: PrinterSettings = {
      ...nextSettings,
      lastSavedAt: new Date().toISOString()
    };

    setPrinterSettings(withMetadata);
    safeWriteJson(PRINTER_SETTINGS_KEY, withMetadata);
  };

  const markReportsExported = (): void => {
    const next: ReportsSettings = {
      lastExportAt: new Date().toISOString()
    };

    setReportsSettings(next);
    safeWriteJson(REPORTS_SETTINGS_KEY, next);
  };

  const saveSupportSettings = (nextSettings: SupportSettings): void => {
    setSupportSettings(nextSettings);
    safeWriteJson(SUPPORT_SETTINGS_KEY, nextSettings);
  };

  const value = useMemo<SettingsContextValue>(
    () => ({
      language,
      setLanguage,
      paymentSettings,
      savePaymentSettings,
      printerSettings,
      savePrinterSettings,
      reportsSettings,
      markReportsExported,
      supportSettings,
      saveSupportSettings
    }),
    [language, paymentSettings, printerSettings, reportsSettings, supportSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }

  return context;
}
