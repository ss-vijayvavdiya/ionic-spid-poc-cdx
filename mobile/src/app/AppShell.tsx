import React, { useEffect } from 'react';
import { IonRouterOutlet, useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import Menu from '../components/Menu';
import { useAuth } from '../contexts/AuthContext';
import { useMerchant } from '../contexts/MerchantContext';
import { ROUTES, renderAppRoutes } from './routes';

const AppShell: React.FC = () => {
  const ionRouter = useIonRouter();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const { merchants, selectedMerchant } = useMerchant();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (location.pathname === ROUTES.login) {
      ionRouter.push(ROUTES.checkout, 'root');
    }
  }, [isAuthenticated, location.pathname, ionRouter]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (merchants.length > 1 && !selectedMerchant && location.pathname !== ROUTES.merchantSelect) {
      ionRouter.push(ROUTES.merchantSelect, 'root');
    }
  }, [isAuthenticated, merchants.length, selectedMerchant, location.pathname, ionRouter]);

  const handleLogout = (): void => {
    logout();
    ionRouter.push(ROUTES.login, 'root');
  };

  return (
    <>
      {isAuthenticated ? <Menu onLogout={handleLogout} /> : null}
      <IonRouterOutlet id="main-content">{renderAppRoutes(isAuthenticated)}</IonRouterOutlet>
    </>
  );
};

export default AppShell;
