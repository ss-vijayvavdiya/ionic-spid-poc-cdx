import React, { useMemo } from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
  useIonRouter
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/ListSkeleton';
import { useReceipts } from '../contexts/ReceiptsContext';
import { useMerchant } from '../contexts/MerchantContext';
import { formatDate, formatTime, getDateGroupLabel } from '../utils/dates';
import { formatEuro } from '../utils/money';
import { PaymentMethod, Receipt, ReceiptStatus } from '../types/models';

const ALL_STATUS = 'ALL';
const ALL_PAYMENT = 'ALL';

function statusClass(receipt: Receipt): string {
  if (receipt.syncStatus === 'PENDING') {
    return 'pending';
  }

  if (receipt.syncStatus === 'FAILED') {
    return 'failed';
  }

  return 'synced';
}

const ReceiptsPage: React.FC = () => {
  const { t } = useTranslation();
  const ionRouter = useIonRouter();
  const { selectedMerchant } = useMerchant();
  const { receipts, loading, filters, setFilters, pendingSyncCount } = useReceipts();

  const grouped = useMemo(() => {
    const groups: Record<'today' | 'yesterday' | 'other', Receipt[]> = {
      today: [],
      yesterday: [],
      other: []
    };

    for (const receipt of receipts) {
      groups[getDateGroupLabel(receipt.issuedAt)].push(receipt);
    }

    return groups;
  }, [receipts]);

  if (!selectedMerchant) {
    return (
      <PageScaffold title={t('pages.receipts')}>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{t('merchant.notSelected')}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem routerLink="/merchant-select" button>
              <IonLabel>{t('menu.switchMerchant')}</IonLabel>
            </IonItem>
          </IonCardContent>
        </IonCard>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold title={t('pages.receipts')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('receipts.title')}</IonCardTitle>
          <IonText color="medium">
            <p>{t('common.pendingSync', { count: pendingSyncCount })}</p>
          </IonText>
        </IonCardHeader>

        <IonCardContent>
          <IonItem>
            <IonLabel>{t('receipts.filters.status')}</IonLabel>
            <IonSelect
              value={filters.status ?? ALL_STATUS}
              onIonChange={(event) => {
                const value = String(event.detail.value);
                setFilters({
                  ...filters,
                  status: value === ALL_STATUS ? undefined : (value as ReceiptStatus)
                });
              }}
            >
              <IonSelectOption value={ALL_STATUS}>{t('receipts.filters.all')}</IonSelectOption>
              <IonSelectOption value="COMPLETED">{t('receipts.status.completed')}</IonSelectOption>
              <IonSelectOption value="VOIDED">{t('receipts.status.voided')}</IonSelectOption>
              <IonSelectOption value="REFUNDED">{t('receipts.status.refunded')}</IonSelectOption>
              <IonSelectOption value="PENDING_SYNC">{t('receipts.status.pendingSync')}</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel>{t('receipts.filters.payment')}</IonLabel>
            <IonSelect
              value={filters.paymentMethod ?? ALL_PAYMENT}
              onIonChange={(event) => {
                const value = String(event.detail.value);
                setFilters({
                  ...filters,
                  paymentMethod:
                    value === ALL_PAYMENT ? undefined : (value as PaymentMethod)
                });
              }}
            >
              <IonSelectOption value={ALL_PAYMENT}>{t('receipts.filters.all')}</IonSelectOption>
              <IonSelectOption value="CASH">{t('payment.cash')}</IonSelectOption>
              <IonSelectOption value="CARD">{t('payment.card')}</IonSelectOption>
              <IonSelectOption value="WALLET">{t('payment.wallet')}</IonSelectOption>
              <IonSelectOption value="SPLIT">{t('payment.split')}</IonSelectOption>
            </IonSelect>
          </IonItem>

          {loading ? (
            <ListSkeleton rows={6} />
          ) : receipts.length === 0 ? (
            <EmptyState
              title={t('receipts.emptyTitle')}
              message={t('receipts.empty')}
              actionLabel={t('menu.checkout')}
              onAction={() => {
                ionRouter.push('/checkout');
              }}
            />
          ) : (
            <>
              {(['today', 'yesterday', 'other'] as const).map((groupKey) => {
                const list = grouped[groupKey];

                if (!list.length) {
                  return null;
                }

                return (
                  <div key={groupKey}>
                    <IonText>
                      <h3>
                        {groupKey === 'today'
                          ? t('receipts.groups.today')
                          : groupKey === 'yesterday'
                            ? t('receipts.groups.yesterday')
                            : t('receipts.groups.other')}
                      </h3>
                    </IonText>

                    <IonList className="stagger-list">
                      {list.map((receipt) => (
                        <IonItem key={receipt.id} routerLink={`/receipts/${receipt.id}`} detail button>
                          <IonLabel>
                            <h2>{receipt.number ?? receipt.clientReceiptId.slice(0, 8)}</h2>
                            <p>
                              {formatDate(receipt.issuedAt)} - {formatTime(receipt.issuedAt)}
                            </p>
                            <p>
                              {t(`receipts.status.${receipt.status === 'PENDING_SYNC' ? 'pendingSync' : receipt.status.toLowerCase()}`)}
                            </p>
                          </IonLabel>

                          <IonLabel slot="end" className="ion-text-right">
                            <h3>{formatEuro(receipt.totalCents)}</h3>
                            <span className={`status-pill ${statusClass(receipt)}`}>
                              {receipt.syncStatus === 'PENDING'
                                ? t('sync.pending')
                                : receipt.syncStatus === 'FAILED'
                                  ? t('sync.failed')
                                  : t('sync.synced')}
                            </span>
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonList>
                  </div>
                );
              })}
            </>
          )}
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default ReceiptsPage;
