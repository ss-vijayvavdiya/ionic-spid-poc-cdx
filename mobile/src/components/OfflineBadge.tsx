import React, { useEffect, useState } from 'react';
import { IonBadge } from '@ionic/react';
import { useTranslation } from 'react-i18next';

const OfflineBadge: React.FC = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = (): void => setIsOnline(true);
    const handleOffline = (): void => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <IonBadge color={isOnline ? 'success' : 'warning'}>
      {isOnline ? t('app.online') : t('app.offline')}
    </IonBadge>
  );
};

export default OfflineBadge;
