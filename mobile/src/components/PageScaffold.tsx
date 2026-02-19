import React from 'react';
import { IonContent, IonHeader, IonPage, IonText } from '@ionic/react';
import HeaderBar from './HeaderBar';
import { useTranslation } from 'react-i18next';

interface PageScaffoldProps {
  title: string;
  children?: React.ReactNode;
  showMenuButton?: boolean;
}

const PageScaffold: React.FC<PageScaffoldProps> = ({
  title,
  children,
  showMenuButton = true
}) => {
  const { t } = useTranslation();

  return (
    <IonPage>
      <IonHeader>
        <HeaderBar title={title} showMenuButton={showMenuButton} />
      </IonHeader>

      <IonContent className="ion-padding">
        {children ?? (
          <IonText color="medium">
            <p>{t('common.comingSoon')}</p>
          </IonText>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PageScaffold;
