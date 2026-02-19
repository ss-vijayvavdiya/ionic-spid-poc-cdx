import React from 'react';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import {
  callOutline,
  cardOutline,
  cartOutline,
  cubeOutline,
  peopleOutline,
  personCircleOutline,
  printOutline,
  receiptOutline,
  settingsOutline,
  statsChartOutline,
  swapHorizontalOutline,
  logOutOutline
} from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMerchant } from '../contexts/MerchantContext';
import { useReceipts } from '../contexts/ReceiptsContext';

interface MenuProps {
  onLogout: () => void;
}

interface MenuItem {
  key: string;
  route: string;
  icon: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'checkout', route: '/checkout', icon: cartOutline },
  { key: 'receipts', route: '/receipts', icon: receiptOutline },
  { key: 'products', route: '/products', icon: cubeOutline },
  { key: 'customers', route: '/customers', icon: peopleOutline },
  { key: 'profile', route: '/profile', icon: personCircleOutline },
  { key: 'payments', route: '/settings/payments', icon: cardOutline },
  { key: 'printer', route: '/settings/printer', icon: printOutline },
  { key: 'reports', route: '/reports', icon: statsChartOutline },
  { key: 'settings', route: '/settings', icon: settingsOutline },
  { key: 'support', route: '/support', icon: callOutline }
];

const Menu: React.FC<MenuProps> = ({ onLogout }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { merchants, selectedMerchant } = useMerchant();
  const { pendingSyncCount } = useReceipts();

  return (
    <IonMenu contentId="main-content" type="overlay">
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{t('app.name')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonList lines="full">
          <IonItem>
            <IonLabel>
              <h2>{t('menu.currentMerchant')}</h2>
              <p>{selectedMerchant?.name ?? '-'}</p>
            </IonLabel>
          </IonItem>

          {MENU_ITEMS.map((menuItem) => (
            <IonMenuToggle key={menuItem.route} autoHide={false}>
              <IonItem
                button
                detail={false}
                routerLink={menuItem.route}
                routerDirection="root"
                color={location.pathname.startsWith(menuItem.route) ? 'light' : undefined}
              >
                <IonIcon icon={menuItem.icon} slot="start" color="primary" />
                <IonLabel>
                  <h3>{t(`menu.${menuItem.key}`)}</h3>
                  {menuItem.key === 'receipts' && pendingSyncCount > 0 ? (
                    <p>{t('common.pendingSync', { count: pendingSyncCount })}</p>
                  ) : null}
                </IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}

          {merchants.length > 1 ? (
            <IonMenuToggle autoHide={false}>
              <IonItem
                button
                detail={false}
                routerLink="/merchant-select"
                routerDirection="root"
                color={location.pathname === '/merchant-select' ? 'light' : undefined}
              >
                <IonIcon icon={swapHorizontalOutline} slot="start" color="primary" />
                <IonLabel>{t('menu.switchMerchant')}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ) : null}

          <IonItem button detail={false} onClick={onLogout}>
            <IonIcon icon={logOutOutline} slot="start" color="danger" />
            <IonLabel>{t('menu.logout')}</IonLabel>
          </IonItem>
        </IonList>

        <IonNote className="ion-padding">v0.1</IonNote>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
