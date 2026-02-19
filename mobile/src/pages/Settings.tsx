import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  useIonToast
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [presentToast] = useIonToast();

  return (
    <PageScaffold title={t('pages.settings')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('pages.settings')}</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonList>
            <IonItem
              button
              detail={false}
              onClick={() =>
                presentToast({
                  message: t('common.comingSoon'),
                  duration: 1200,
                  color: 'medium'
                })
              }
            >
              <IonLabel>{t('settings.businessProfile')}</IonLabel>
            </IonItem>

            <IonItem button detail routerLink="/settings/language">
              <IonLabel>{t('pages.language')}</IonLabel>
            </IonItem>

            <IonItem button detail routerLink="/settings/payments">
              <IonLabel>{t('settings.payments')}</IonLabel>
            </IonItem>

            <IonItem button detail routerLink="/settings/printer">
              <IonLabel>{t('settings.printer')}</IonLabel>
            </IonItem>

            <IonItem button detail routerLink="/reports">
              <IonLabel>{t('settings.reports')}</IonLabel>
            </IonItem>

            <IonItem button detail routerLink="/support">
              <IonLabel>{t('settings.support')}</IonLabel>
            </IonItem>
          </IonList>
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default SettingsPage;
