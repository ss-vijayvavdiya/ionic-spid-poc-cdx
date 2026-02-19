// Root app composition: router + contexts + menu-based shell.

import React from 'react';
import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import AppShell from './app/AppShell';
import { AuthProvider } from './contexts/AuthContext';
import { CheckoutProvider } from './contexts/CheckoutContext';
import { DataProvider } from './contexts/DataContext';
import { MerchantProvider } from './contexts/MerchantContext';
import { ProductsProvider } from './contexts/ProductsContext';
import { ReceiptsProvider } from './contexts/ReceiptsContext';
import { SettingsProvider } from './contexts/SettingsContext';

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <SettingsProvider>
          <AuthProvider>
            <DataProvider>
              <MerchantProvider>
                <ProductsProvider>
                  <ReceiptsProvider>
                    <CheckoutProvider>
                      <AppShell />
                    </CheckoutProvider>
                  </ReceiptsProvider>
                </ProductsProvider>
              </MerchantProvider>
            </DataProvider>
          </AuthProvider>
        </SettingsProvider>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
