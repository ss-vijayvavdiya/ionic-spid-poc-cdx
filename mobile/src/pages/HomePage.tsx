// Home screen showing user profile and protected API call results.

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
  IonText,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/react';

type HomePageProps = {
  token: string | null;
  user: any;
  apiResponse: any;
  statusMessage: string;
  onRefresh: () => void;
  onVerify: () => void;
  onLogout: () => void;
};

const HomePage: React.FC<HomePageProps> = ({
  token,
  user,
  apiResponse,
  statusMessage,
  onRefresh,
  onVerify,
  onLogout
}) => {
  // Prefer the user object we got during /auth/exchange.
  // If not present, fall back to /api/me response.
  const effectiveUser = user || apiResponse?.user || apiResponse || {};

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Home</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Your Session</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonText>
              <p><strong>JWT present:</strong> {token ? 'Yes' : 'No'}</p>
            </IonText>

            <IonText>
              <p><strong>User details:</strong></p>
            </IonText>

            <IonList lines="full">
              <IonItem>
                <IonLabel>
                  <strong>Subject (sub)</strong>
                  <div>{effectiveUser.sub || 'N/A'}</div>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <strong>Name</strong>
                  <div>{effectiveUser.name || 'N/A'}</div>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <strong>Given Name</strong>
                  <div>{effectiveUser.given_name || 'N/A'}</div>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <strong>Family Name</strong>
                  <div>{effectiveUser.family_name || 'N/A'}</div>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <strong>Email</strong>
                  <div>{effectiveUser.email || 'N/A'}</div>
                </IonLabel>
              </IonItem>
            </IonList>

            <IonText>
              <p style={{ marginTop: 12 }}><strong>Raw user JSON:</strong></p>
            </IonText>
            <pre style={{ background: '#f4f4f4', padding: 12, borderRadius: 6 }}>
              {JSON.stringify(effectiveUser, null, 2)}
            </pre>

            <IonButton expand="block" onClick={onRefresh}>
              Refresh Profile
            </IonButton>

            <IonButton expand="block" color="secondary" onClick={onVerify}>
              Verify Token
            </IonButton>

            <IonButton expand="block" color="medium" onClick={onLogout}>
              Logout
            </IonButton>

            {statusMessage && (
              <p style={{ marginTop: 12 }}>
                <strong>Status:</strong> {statusMessage}
              </p>
            )}

            {apiResponse && (
              <>
                <p style={{ marginTop: 12 }}><strong>/api/me response:</strong></p>
                <pre style={{ background: '#f4f4f4', padding: 12, borderRadius: 6 }}>
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
