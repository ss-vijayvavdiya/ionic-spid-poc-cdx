import React, { useMemo, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonToggle,
  useIonToast
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import { useSettings } from '../contexts/SettingsContext';
import { PaymentMethod } from '../types/models';
import { formatDateTime } from '../utils/dates';

const PaymentsSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [presentToast] = useIonToast();

  const { paymentSettings, savePaymentSettings } = useSettings();
  const [draft, setDraft] = useState(paymentSettings);

  const enabledMethods = useMemo<PaymentMethod[]>(() => {
    const methods: PaymentMethod[] = [];
    if (draft.cashEnabled) methods.push('CASH');
    if (draft.cardEnabled) methods.push('CARD');
    if (draft.walletEnabled) methods.push('WALLET');
    if (draft.splitEnabled) methods.push('SPLIT');
    return methods;
  }, [draft]);

  const handleSave = (): void => {
    const fallbackDefault = enabledMethods[0] ?? 'CASH';
    const nextDefault = enabledMethods.includes(draft.defaultMethod) ? draft.defaultMethod : fallbackDefault;

    savePaymentSettings({
      ...draft,
      defaultMethod: nextDefault
    });

    setDraft((prev) => ({
      ...prev,
      defaultMethod: nextDefault
    }));

    void presentToast({
      message: t('paymentsSettings.saved'),
      duration: 1400,
      color: 'success'
    });
  };

  return (
    <PageScaffold title={t('pages.paymentSettings')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('pages.paymentSettings')}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonList>
            <IonItem>
              <IonLabel>{t('paymentsSettings.cash')}</IonLabel>
              <IonToggle
                checked={draft.cashEnabled}
                onIonChange={(event) => setDraft((prev) => ({ ...prev, cashEnabled: event.detail.checked }))}
              />
            </IonItem>

            <IonItem>
              <IonLabel>{t('paymentsSettings.card')}</IonLabel>
              <IonToggle
                checked={draft.cardEnabled}
                onIonChange={(event) => setDraft((prev) => ({ ...prev, cardEnabled: event.detail.checked }))}
              />
            </IonItem>

            <IonItem>
              <IonLabel>{t('paymentsSettings.wallet')}</IonLabel>
              <IonToggle
                checked={draft.walletEnabled}
                onIonChange={(event) => setDraft((prev) => ({ ...prev, walletEnabled: event.detail.checked }))}
              />
            </IonItem>

            <IonItem>
              <IonLabel>{t('paymentsSettings.split')}</IonLabel>
              <IonToggle
                checked={draft.splitEnabled}
                onIonChange={(event) => setDraft((prev) => ({ ...prev, splitEnabled: event.detail.checked }))}
              />
            </IonItem>

            <IonItem>
              <IonLabel>{t('paymentsSettings.defaultMethod')}</IonLabel>
              <IonSelect
                value={draft.defaultMethod}
                placeholder={t('common.select')}
                onIonChange={(event) =>
                  setDraft((prev) => ({ ...prev, defaultMethod: String(event.detail.value) as PaymentMethod }))
                }
              >
                {enabledMethods.map((method) => (
                  <IonSelectOption key={method} value={method}>
                    {t(`payment.${method.toLowerCase()}`)}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          </IonList>

          {paymentSettings.lastSavedAt ? (
            <IonNote color="success">{t('paymentsSettings.lastSavedAt', { date: formatDateTime(paymentSettings.lastSavedAt) })}</IonNote>
          ) : null}

          <IonButton expand="block" onClick={handleSave}>
            {t('common.save')}
          </IonButton>
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default PaymentsSettingsPage;
