import React, { useState } from 'react';
import {
  IonAccordion,
  IonAccordionGroup,
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
  IonTextarea,
  useIonToast
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import { useSettings } from '../contexts/SettingsContext';
import { formatDateTime } from '../utils/dates';

const SupportPage: React.FC = () => {
  const { t } = useTranslation();
  const [presentToast] = useIonToast();
  const { supportSettings, saveSupportSettings } = useSettings();

  const [preferredChannel, setPreferredChannel] = useState(supportSettings.preferredChannel);
  const [notesDraft, setNotesDraft] = useState(supportSettings.notesDraft);

  const handleSaveDraft = (): void => {
    saveSupportSettings({
      ...supportSettings,
      preferredChannel,
      notesDraft
    });

    void presentToast({
      message: t('support.draftSaved'),
      duration: 1400,
      color: 'success'
    });
  };

  const handleContactSupport = (): void => {
    const nextTimestamp = new Date().toISOString();

    saveSupportSettings({
      preferredChannel,
      notesDraft,
      lastContactAt: nextTimestamp
    });

    const encodedSubject = encodeURIComponent('POS Support Request');
    const encodedBody = encodeURIComponent(`${notesDraft || 'No details provided.'}`);
    window.location.href = `mailto:support@example.com?subject=${encodedSubject}&body=${encodedBody}`;

    void presentToast({
      message: t('support.contactStarted'),
      duration: 1600,
      color: 'success'
    });
  };

  return (
    <PageScaffold title={t('pages.support')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('pages.support')}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonAccordionGroup>
            <IonAccordion value="faq-1">
              <IonItem slot="header">
                <IonLabel>{t('support.faqOffline')}</IonLabel>
              </IonItem>
              <div className="ion-padding" slot="content">
                {t('support.faqOfflineAnswer')}
              </div>
            </IonAccordion>

            <IonAccordion value="faq-2">
              <IonItem slot="header">
                <IonLabel>{t('support.faqTenant')}</IonLabel>
              </IonItem>
              <div className="ion-padding" slot="content">
                {t('support.faqTenantAnswer')}
              </div>
            </IonAccordion>
          </IonAccordionGroup>

          <IonList>
            <IonItem>
              <IonLabel>{t('support.preferredChannel')}</IonLabel>
              <IonSelect
                value={preferredChannel}
                onIonChange={(event) => setPreferredChannel(String(event.detail.value) as 'email' | 'phone' | 'whatsapp')}
              >
                <IonSelectOption value="email">{t('support.channel.email')}</IonSelectOption>
                <IonSelectOption value="phone">{t('support.channel.phone')}</IonSelectOption>
                <IonSelectOption value="whatsapp">{t('support.channel.whatsapp')}</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">{t('support.notes')}</IonLabel>
              <IonTextarea
                value={notesDraft}
                autoGrow
                rows={4}
                placeholder={t('support.notesPlaceholder')}
                onIonInput={(event) => setNotesDraft(String(event.detail.value ?? ''))}
              />
            </IonItem>
          </IonList>

          <IonButton expand="block" fill="outline" onClick={handleSaveDraft}>
            {t('support.saveDraft')}
          </IonButton>

          <IonButton expand="block" onClick={handleContactSupport}>
            {t('support.contact')}
          </IonButton>

          {supportSettings.lastContactAt ? (
            <IonNote color="success">
              {t('support.lastContactAt', { date: formatDateTime(supportSettings.lastContactAt) })}
            </IonNote>
          ) : null}
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default SupportPage;
