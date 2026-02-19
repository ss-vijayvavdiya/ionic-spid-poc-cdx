import React, { useEffect, useMemo, useState } from 'react';
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
  useIonRouter,
  useIonToast
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import PageScaffold from '../components/PageScaffold';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/ListSkeleton';
import { useReceipts } from '../contexts/ReceiptsContext';
import { Receipt } from '../types/models';
import { formatDate, formatTime } from '../utils/dates';
import { formatEuro } from '../utils/money';

interface ReceiptDetailParams {
  id: string;
}

const ReceiptDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const ionRouter = useIonRouter();
  const [presentToast] = useIonToast();
  const { id } = useParams<ReceiptDetailParams>();
  const { getReceiptById } = useReceipts();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const result = await getReceiptById(id);
        setReceipt(result);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, getReceiptById]);

  const syncLabel = useMemo(() => {
    if (!receipt) {
      return '-';
    }

    if (receipt.syncStatus === 'PENDING') {
      return t('sync.pending');
    }

    if (receipt.syncStatus === 'FAILED') {
      return t('sync.failed');
    }

    return t('sync.synced');
  }, [receipt, t]);

  const showToast = (message: string, color: string = 'medium'): void => {
    void presentToast({ message, duration: 1300, color });
  };

  const guardOnlineAction = (): boolean => {
    if (navigator.onLine) {
      return true;
    }

    showToast(t('receipts.onlineOnlyAction'), 'warning');
    return false;
  };

  if (loading) {
    return (
      <PageScaffold title={t('pages.receiptDetail')}>
        <ListSkeleton rows={5} />
      </PageScaffold>
    );
  }

  if (!receipt) {
    return (
      <PageScaffold title={t('pages.receiptDetail')}>
        <EmptyState
          title={t('receipts.notFoundTitle')}
          message={t('receipts.notFound')}
          actionLabel={t('common.back')}
          onAction={() => {
            ionRouter.push('/receipts');
          }}
        />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold title={t('pages.receiptDetail')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{receipt.number ?? receipt.clientReceiptId}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonText>
            <p>
              {formatDate(receipt.issuedAt)} {formatTime(receipt.issuedAt)}
            </p>
            <p>
              {t('receipts.filters.payment')}: {t(`payment.${receipt.paymentMethod.toLowerCase()}`)}
            </p>
            <p>
              {t('receipts.filters.status')}:{' '}
              {t(`receipts.status.${receipt.status === 'PENDING_SYNC' ? 'pendingSync' : receipt.status.toLowerCase()}`)}
            </p>
            <p>
              {t('sync.title')}: {syncLabel}
            </p>
          </IonText>

          <IonList>
            {receipt.items.map((item, index) => (
              <IonItem key={`${receipt.id}-${index}`}>
                <IonLabel>
                  <h3>{item.name}</h3>
                  <p>
                    {item.qty} x {formatEuro(item.unitPriceCents)} ({t('checkout.vat')} {item.vatRate}%)
                  </p>
                </IonLabel>
                <IonLabel slot="end" className="ion-text-right">
                  {formatEuro(item.lineTotalCents)}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>

          <IonCard color="light">
            <IonCardContent>
              <p>{t('checkout.subtotal')}: {formatEuro(receipt.subtotalCents)}</p>
              <p>{t('checkout.tax')}: {formatEuro(receipt.taxCents)}</p>
              <p><strong>{t('checkout.total')}: {formatEuro(receipt.totalCents)}</strong></p>
            </IonCardContent>
          </IonCard>

          <IonButton expand="block" onClick={() => showToast(t('receipts.actions.send'))}>
            {t('receipts.actions.send')}
          </IonButton>
          <IonButton expand="block" color="secondary" onClick={() => showToast(t('receipts.actions.print'))}>
            {t('receipts.actions.print')}
          </IonButton>
          <IonButton
            expand="block"
            color="warning"
            onClick={() => {
              if (!guardOnlineAction()) {
                return;
              }
              showToast(t('receipts.actions.void'));
            }}
          >
            {t('receipts.actions.void')}
          </IonButton>
          <IonButton
            expand="block"
            color="danger"
            onClick={() => {
              if (!guardOnlineAction()) {
                return;
              }
              showToast(t('receipts.actions.refund'));
            }}
          >
            {t('receipts.actions.refund')}
          </IonButton>
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default ReceiptDetailPage;
