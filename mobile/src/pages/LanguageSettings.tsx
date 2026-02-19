import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  IonRadio,
  IonRadioGroup,
  IonText
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import { useSettings } from '../contexts/SettingsContext';
import { AppLanguage } from '../i18n';

const LanguageSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage } = useSettings();

  return (
    <PageScaffold title={t('pages.language')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('pages.language')}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonText color="medium">
            <p>{t('settings.languageDescription')}</p>
          </IonText>

          <IonRadioGroup
            value={language}
            onIonChange={(event) => {
              void setLanguage(event.detail.value as AppLanguage);
            }}
          >
            <IonList>
              <IonItem>
                <IonLabel>{t('settings.languageEnglish')}</IonLabel>
                <IonRadio slot="end" value="en" />
              </IonItem>
              <IonItem>
                <IonLabel>{t('settings.languageItalian')}</IonLabel>
                <IonRadio slot="end" value="it" />
              </IonItem>
              <IonItem>
                <IonLabel>{t('settings.languageGerman')}</IonLabel>
                <IonRadio slot="end" value="de" />
              </IonItem>
            </IonList>
          </IonRadioGroup>
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default LanguageSettingsPage;
