import React from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonText
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import HeaderBar from '../components/HeaderBar';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { loginWithSpid, processLastCallback, statusMessage, lastCallbackUrl, isProcessingCallback } =
    useAuth();

  return (
    <IonPage>
      <IonHeader>
        <HeaderBar title={t('auth.title')} showMenuButton={false} />
      </IonHeader>

      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{t('auth.title')}</IonCardTitle>
          </IonCardHeader>

          <IonCardContent>
            <IonText>
              <p>{t('auth.subtitle')}</p>
            </IonText>

            <IonButton
              expand="block"
              onClick={() => {
                if (isProcessingCallback) {
                  return;
                }
                loginWithSpid();
              }}
            >
              {t('auth.loginWithSpid')}
            </IonButton>

            {lastCallbackUrl ? (
              <IonButton
                expand="block"
                color="secondary"
                onClick={() => {
                  if (isProcessingCallback) {
                    return;
                  }
                  void processLastCallback();
                }}
              >
                {t('auth.continueLogin')}
              </IonButton>
            ) : null}

            {statusMessage ? (
              <p>
                <strong>{t('auth.status')}:</strong> {statusMessage}
              </p>
            ) : null}

            {lastCallbackUrl ? (
              <p style={{ fontSize: 12, color: '#555' }}>
                <strong>{t('auth.lastCallback')}:</strong> {lastCallbackUrl}
              </p>
            ) : null}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
