import React from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonText } from '@ionic/react';
import { informationCircleOutline } from 'ionicons/icons';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, message, actionLabel, onAction }) => {
  return (
    <IonCard className="empty-state-card">
      <IonCardHeader>
        <IonCardTitle>
          <IonIcon icon={informationCircleOutline} /> {title}
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonText color="medium">
          <p>{message}</p>
        </IonText>
        {actionLabel && onAction ? (
          <IonButton expand="block" fill="outline" onClick={onAction}>
            {actionLabel}
          </IonButton>
        ) : null}
      </IonCardContent>
    </IonCard>
  );
};

export default EmptyState;
