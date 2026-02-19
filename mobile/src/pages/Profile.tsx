import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonSpinner,
  useIonToast
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import { useAuth } from '../contexts/AuthContext';
import { fetchMe } from '../services/api';

interface MeMerchant {
  id: string;
  name: string;
  role?: string;
  vatNumber?: string;
  address?: string;
}

interface MeUser {
  id?: string;
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  merchants?: MeMerchant[];
}

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [presentToast] = useIonToast();
  const { token } = useAuth();

  const [loading, setLoading] = useState<boolean>(false);
  const [profile, setProfile] = useState<MeUser | null>(null);
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadProfile = useCallback(async (): Promise<void> => {
    if (!token) {
      setErrorMessage(t('auth.loginFirst'));
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const me = await fetchMe(token);
      const user = (me?.user ?? me) as MeUser;
      setRawResponse(me);
      setProfile(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      void presentToast({
        message: t('profile.fetchFailed', { message }),
        duration: 2200,
        color: 'danger'
      });
    } finally {
      setLoading(false);
    }
  }, [token, t, presentToast]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const primaryId = profile?.id || profile?.sub || '-';
  const merchants = profile?.merchants ?? [];

  const primaryFields = useMemo(
    () => [
      { label: t('profile.fields.id'), value: primaryId },
      { label: t('profile.fields.name'), value: profile?.name ?? '-' },
      { label: t('profile.fields.givenName'), value: profile?.given_name ?? '-' },
      { label: t('profile.fields.familyName'), value: profile?.family_name ?? '-' },
      { label: t('profile.fields.email'), value: profile?.email ?? '-' },
      { label: t('profile.fields.merchantCount'), value: String(merchants.length) }
    ],
    [t, primaryId, profile, merchants.length]
  );

  return (
    <PageScaffold title={t('pages.profile')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('profile.title')}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonButton
            expand="block"
            onClick={() => {
              if (loading) {
                return;
              }
              void loadProfile();
            }}
          >
            {loading ? <IonSpinner name="crescent" /> : t('profile.refresh')}
          </IonButton>

          {errorMessage ? (
            <IonText color="danger">
              <p>{errorMessage}</p>
            </IonText>
          ) : null}

          <IonList>
            {primaryFields.map((field) => (
              <IonItem key={field.label}>
                <IonLabel>
                  <h3>{field.label}</h3>
                  <p>{field.value}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('profile.merchantsTitle')}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          {merchants.length === 0 ? (
            <IonText color="medium">
              <p>{t('profile.noMerchants')}</p>
            </IonText>
          ) : (
            <IonList className="stagger-list">
              {merchants.map((merchant) => (
                <IonItem key={merchant.id}>
                  <IonLabel>
                    <h3>{merchant.name}</h3>
                    <p>ID: {merchant.id}</p>
                    <p>{t('profile.fields.role')}: {merchant.role ?? '-'}</p>
                    <p>{t('profile.fields.vatNumber')}: {merchant.vatNumber ?? '-'}</p>
                    <p>{t('profile.fields.address')}: {merchant.address ?? '-'}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('profile.rawJson')}</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <pre style={{ background: '#f4f6fa', borderRadius: 12, padding: 12, overflowX: 'auto' }}>
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default ProfilePage;
