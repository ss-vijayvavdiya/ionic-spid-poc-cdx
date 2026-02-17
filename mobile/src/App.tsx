// Main app shell with routing, deep link handling, and auth state.

import React, { useEffect, useRef, useState } from 'react';
import { IonApp, IonRouterOutlet, useIonRouter } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import { BASE_URL } from './config';
import { exchangeCode, fetchMe } from './services/api';
import { getToken, saveToken, clearToken } from './services/storage';
import { parseAuthCallback, setupDeepLinks } from './services/deepLink';

const AppRoutes: React.FC = () => {
  const ionRouter = useIonRouter();

  const [token, setToken] = useState<string | null>(getToken());
  const [user, setUser] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastCallbackUrl, setLastCallbackUrl] = useState<string | null>(null);

  // Prevent double-processing of the same deep link.
  const isProcessingRef = useRef(false);

  const processCallbackUrl = async (url: string) => {
    // Parse the callback URL for code/state.
    const parsed = parseAuthCallback(url);
    if (!parsed) {
      setStatusMessage('Callback URL did not contain code/state.');
      return;
    }

    // Avoid processing the same callback multiple times.
    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    setStatusMessage('Exchanging code with backend...');

    try {
      const result = await exchangeCode(parsed.code, parsed.state);
      saveToken(result.access_token);
      setToken(result.access_token);
      setUser(result.user);
      setStatusMessage('Login successful.');

      // Navigate to home after login.
      ionRouter.push('/home', 'root');
    } catch (error: any) {
      console.error(error);
      setStatusMessage(`Login failed: ${error.message || 'Unknown error'}`);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Start deep link listeners once.
  useEffect(() => {
    setupDeepLinks(async (url: string) => {
      setLastCallbackUrl(url);
      await processCallbackUrl(url);
    });
  }, [ionRouter]);

  // If we already have a token (e.g., app restart), try loading /api/me.
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const me = await fetchMe(token);
        setUser(me.user || me);
      } catch (error) {
        console.warn('Failed to load /api/me on startup', error);
      }
    };

    loadProfile();
  }, [token]);

  // Open Signicat login in the system browser.
  const handleLogin = () => {
    const loginUrl = `${BASE_URL}/auth/spid/start`;

    // In Cordova, use the system browser for reliability.
    if ((window as any).cordova && (window as any).cordova.InAppBrowser) {
      (window as any).cordova.InAppBrowser.open(loginUrl, '_system', 'location=yes');
    } else {
      // In the browser (ionic serve), just open a new tab.
      window.open(loginUrl, '_blank', 'noopener');
    }
  };

  const handleRefresh = async () => {
    if (!token) {
      setStatusMessage('No token available. Please login first.');
      return;
    }

    setStatusMessage('Refreshing profile...');
    try {
      const me = await fetchMe(token);
      setApiResponse(me);
      setStatusMessage('Success.');
    } catch (error: any) {
      setStatusMessage(`Failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleVerify = async () => {
    if (!token) {
      setStatusMessage('No token available. Please login first.');
      return;
    }

    setStatusMessage('Verifying token with /api/me...');
    try {
      const me = await fetchMe(token);
      setApiResponse(me);
      setStatusMessage('Token is valid.');
    } catch (error: any) {
      setStatusMessage(`Token verification failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleLogout = () => {
    clearToken();
    setToken(null);
    setUser(null);
    setApiResponse(null);
    setStatusMessage('Logged out.');
    ionRouter.push('/login', 'root');
  };

  return (
    <IonRouterOutlet>
      <Route
        exact
        path="/login"
        render={() => (
          <LoginPage
            onLogin={handleLogin}
            onProcessCallback={() => {
              if (lastCallbackUrl) {
                processCallbackUrl(lastCallbackUrl);
              }
            }}
            statusMessage={statusMessage}
            lastCallbackUrl={lastCallbackUrl}
          />
        )}
      />
      <Route
        exact
        path="/home"
        render={() => (
          <HomePage
            token={token}
            user={user}
            apiResponse={apiResponse}
            statusMessage={statusMessage}
            onRefresh={handleRefresh}
            onVerify={handleVerify}
            onLogout={handleLogout}
          />
        )}
      />

      {/* Default route: send the user to login or home based on token */}
      <Route
        exact
        path="/"
        render={() => <Redirect to={token ? '/home' : '/login'} />}
      />

      {/*
        IMPORTANT: In Cordova, the initial route is often "/index.html"
        because the WebView loads https://localhost/index.html.
        If we don't handle this path, the screen will be blank.
      */}
      <Route
        exact
        path="/index.html"
        render={() => <Redirect to={token ? '/home' : '/login'} />}
      />
    </IonRouterOutlet>
  );
};

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
