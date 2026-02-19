import React from 'react';
import { IonButtons, IonMenuButton, IonTitle, IonToolbar } from '@ionic/react';
import OfflineBadge from './OfflineBadge';

interface HeaderBarProps {
  title: string;
  showMenuButton?: boolean;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ title, showMenuButton = true }) => {
  return (
    <IonToolbar color="primary">
      {showMenuButton ? (
        <IonButtons slot="start">
          <IonMenuButton />
        </IonButtons>
      ) : null}
      <IonTitle>{title}</IonTitle>
      <IonButtons slot="end">
        <OfflineBadge />
      </IonButtons>
    </IonToolbar>
  );
};

export default HeaderBar;
