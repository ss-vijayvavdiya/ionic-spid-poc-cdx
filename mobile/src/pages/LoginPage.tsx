// Login screen with a single "Login with SPID" button.

import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText
} from '@ionic/react';

type LoginPageProps = {
  onLogin: () => void;
  onProcessCallback?: () => void;
  statusMessage: string;
  lastCallbackUrl?: string | null;
};

const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onProcessCallback,
  statusMessage,
  lastCallbackUrl
}) => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>SPID PoC</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Login</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonText>
              This app uses a production-style OIDC Authorization Code flow.
              Tap the button below to start Signicat SPID login in the system browser.
            </IonText>

            <div style={{ marginTop: 16 }}>
              <IonButton expand="block" onClick={onLogin}>
                Login with SPID
              </IonButton>
            </div>

            {lastCallbackUrl && onProcessCallback && (
              <div style={{ marginTop: 12 }}>
                <IonButton expand="block" color="secondary" onClick={onProcessCallback}>
                  Continue Login (Use Callback)
                </IonButton>
              </div>
            )}

            {statusMessage && (
              <p style={{ marginTop: 12 }}>
                <strong>Status:</strong> {statusMessage}
              </p>
            )}

            {lastCallbackUrl && (
              <p style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                <strong>Last callback URL:</strong> {lastCallbackUrl}
              </p>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
