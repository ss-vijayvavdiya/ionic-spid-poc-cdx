import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  IonText
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import { useMerchant } from '../contexts/MerchantContext';

const MerchantSelectPage: React.FC = () => {
  const { t } = useTranslation();
  const ionRouter = useIonRouter();
  const { merchants, selectMerchant } = useMerchant();

  return (
    <PageScaffold title={t('pages.merchantSelect')} showMenuButton={false}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('pages.merchantSelect')}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonList>
            {merchants.map((merchant) => (
              <IonItem
                key={merchant.id}
                button
                detail
                onClick={() => {
                  selectMerchant(merchant.id);
                  ionRouter.push('/checkout', 'root');
                }}
              >
                <IonLabel>
                  <h2>{merchant.name}</h2>
                  <p>{merchant.vatNumber ?? '-'}</p>
                </IonLabel>
              </IonItem>
            ))}

            {!merchants.length ? (
              <IonText color="medium">
                <p>{t('common.noData')}</p>
              </IonText>
            ) : null}
          </IonList>
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default MerchantSelectPage;
