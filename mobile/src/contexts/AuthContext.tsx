import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BASE_URL } from '../config';
import { exchangeCode, fetchMe } from '../services/api';
import {
  clearSelectedMerchantId,
  clearToken,
  getToken,
  saveToken
} from '../services/storage';
import { parseAuthCallback, setupDeepLinks } from '../services/deepLink';
import { Merchant, UserProfile } from '../types/models';
import { useTranslation } from 'react-i18next';

interface RawExchangeUser {
  id?: string;
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  merchants?: Merchant[];
}

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isProcessingCallback: boolean;
  statusMessage: string;
  lastCallbackUrl: string | null;
  loginWithSpid: () => void;
  processLastCallback: () => Promise<void>;
  logout: () => void;
  setStatusMessage: (message: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapRawUserToProfile(user: RawExchangeUser): UserProfile {
  const profileId = user.sub || user.id || '';

  return {
    id: profileId,
    email: user.email,
    merchants: user.merchants ?? [],
    givenName: user.given_name,
    familyName: user.family_name,
    fullName: user.name
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();

  const [token, setToken] = useState<string | null>(getToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastCallbackUrl, setLastCallbackUrl] = useState<string | null>(null);
  const [isProcessingCallback, setIsProcessingCallback] = useState<boolean>(false);

  // Guard to avoid duplicate callback processing caused by lifecycle races.
  const processingRef = useRef(false);
  const deepLinksInitializedRef = useRef(false);

  const processCallbackUrl = async (url: string): Promise<void> => {
    const parsed = parseAuthCallback(url);

    if (!parsed) {
      setStatusMessage(t('auth.missingCodeState'));
      return;
    }

    if (processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessingCallback(true);
    setStatusMessage(t('auth.exchangeInProgress'));

    try {
      const response = await exchangeCode(parsed.code, parsed.state);
      saveToken(response.access_token);
      setToken(response.access_token);
      setUser(mapRawUserToProfile(response.user as RawExchangeUser));
      setStatusMessage(t('auth.loginSuccess'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatusMessage(t('auth.loginFailed', { message }));
    } finally {
      setIsProcessingCallback(false);
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (deepLinksInitializedRef.current) {
      return;
    }

    deepLinksInitializedRef.current = true;

    setupDeepLinks((url: string) => {
      setLastCallbackUrl(url);
      void processCallbackUrl(url);
    });
  }, []);

  // If app restarts with an existing token, attempt to load profile.
  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const meResponse = await fetchMe(token);
        // Keep mapping defensive because /api/me can evolve.
        const payloadUser = (meResponse.user ?? meResponse) as RawExchangeUser;
        setUser(mapRawUserToProfile(payloadUser));
      } catch (_error) {
        setStatusMessage(t('auth.fetchProfileFailed'));
      }
    };

    void loadProfile();
  }, [token, t]);

  const loginWithSpid = (): void => {
    const loginUrl = `${BASE_URL}/auth/spid/start`;

    if ((window as any).cordova?.InAppBrowser) {
      (window as any).cordova.InAppBrowser.open(loginUrl, '_system', 'location=yes');
      return;
    }

    window.open(loginUrl, '_blank', 'noopener');
  };

  const processLastCallback = async (): Promise<void> => {
    if (!lastCallbackUrl) {
      setStatusMessage(t('auth.missingCodeState'));
      return;
    }

    await processCallbackUrl(lastCallbackUrl);
  };

  const logout = (): void => {
    clearToken();
    clearSelectedMerchantId();
    setToken(null);
    setUser(null);
    setStatusMessage(t('auth.loggedOut'));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isProcessingCallback,
      statusMessage,
      lastCallbackUrl,
      loginWithSpid,
      processLastCallback,
      logout,
      setStatusMessage
    }),
    [token, user, isProcessingCallback, statusMessage, lastCallbackUrl]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
