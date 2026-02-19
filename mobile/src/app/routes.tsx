import React from 'react';
import { Redirect, Route, RouteProps } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/Login';
import CheckoutPage from '../pages/Checkout';
import ReceiptsPage from '../pages/Receipts';
import ReceiptDetailPage from '../pages/ReceiptDetail';
import ProductsPage from '../pages/Products';
import ProductFormPage from '../pages/ProductForm';
import SettingsPage from '../pages/Settings';
import LanguageSettingsPage from '../pages/LanguageSettings';
import PaymentsSettingsPage from '../pages/PaymentsSettings';
import PrinterSettingsPage from '../pages/PrinterSettings';
import ReportsPage from '../pages/Reports';
import SupportPage from '../pages/Support';
import CustomersPage from '../pages/Customers';
import MerchantSelectPage from '../pages/MerchantSelect';
import ProfilePage from '../pages/Profile';

export const ROUTES = {
  login: '/login',
  checkout: '/checkout',
  receipts: '/receipts',
  products: '/products',
  settings: '/settings',
  reports: '/reports',
  support: '/support',
  customers: '/customers',
  merchantSelect: '/merchant-select',
  profile: '/profile'
} as const;

interface PrivateRouteProps extends RouteProps {
  component: React.ComponentType<any>;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ component: Component, ...rest }) => {
  const { isAuthenticated } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? <Component {...props} /> : <Redirect to={ROUTES.login} />
      }
    />
  );
};

export function renderAppRoutes(isAuthenticated: boolean): React.ReactNode {
  return (
    <>
      <Route
        exact
        path={ROUTES.login}
        render={() => (isAuthenticated ? <Redirect to={ROUTES.checkout} /> : <LoginPage />)}
      />

      <PrivateRoute exact path={ROUTES.checkout} component={CheckoutPage} />
      <PrivateRoute exact path={ROUTES.receipts} component={ReceiptsPage} />
      <PrivateRoute exact path="/receipts/:id" component={ReceiptDetailPage} />

      <PrivateRoute exact path={ROUTES.products} component={ProductsPage} />
      <PrivateRoute exact path="/products/new" component={ProductFormPage} />
      <PrivateRoute exact path="/products/:id/edit" component={ProductFormPage} />

      <PrivateRoute exact path={ROUTES.settings} component={SettingsPage} />
      <PrivateRoute exact path="/settings/language" component={LanguageSettingsPage} />
      <PrivateRoute exact path="/settings/payments" component={PaymentsSettingsPage} />
      <PrivateRoute exact path="/settings/printer" component={PrinterSettingsPage} />

      <PrivateRoute exact path={ROUTES.reports} component={ReportsPage} />
      <PrivateRoute exact path={ROUTES.support} component={SupportPage} />
      <PrivateRoute exact path={ROUTES.customers} component={CustomersPage} />
      <PrivateRoute exact path={ROUTES.merchantSelect} component={MerchantSelectPage} />
      <PrivateRoute exact path={ROUTES.profile} component={ProfilePage} />

      <Route
        exact
        path="/home"
        render={() => <Redirect to={isAuthenticated ? ROUTES.checkout : ROUTES.login} />}
      />

      <Route
        exact
        path="/"
        render={() => <Redirect to={isAuthenticated ? ROUTES.checkout : ROUTES.login} />}
      />

      <Route
        exact
        path="/index.html"
        render={() => <Redirect to={isAuthenticated ? ROUTES.checkout : ROUTES.login} />}
      />
    </>
  );
}
