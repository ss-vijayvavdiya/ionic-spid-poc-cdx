import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonText } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';

const CustomersPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageScaffold title={t('pages.customers')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('pages.customers')}</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonText>
            <p>{t('common.comingSoon')}</p>
          </IonText>
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default CustomersPage;
