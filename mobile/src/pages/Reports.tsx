import React, { useMemo } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  useIonToast
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import EmptyState from '../components/EmptyState';
import { useReceipts } from '../contexts/ReceiptsContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatDateTime } from '../utils/dates';
import { formatEuro } from '../utils/money';

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  );
}

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [presentToast] = useIonToast();
  const { receipts, refreshReceipts } = useReceipts();
  const { reportsSettings, markReportsExported } = useSettings();

  const todayReceipts = useMemo(() => receipts.filter((receipt) => isToday(receipt.issuedAt)), [receipts]);

  const todayTotalCents = useMemo(
    () => todayReceipts.reduce((sum, receipt) => sum + receipt.totalCents, 0),
    [todayReceipts]
  );

  const todayTaxCents = useMemo(
    () => todayReceipts.reduce((sum, receipt) => sum + receipt.taxCents, 0),
    [todayReceipts]
  );

  const handleExportCsv = async (): Promise<void> => {
    if (!receipts.length) {
      void presentToast({
        message: t('reports.noDataToExport'),
        duration: 1500,
        color: 'warning'
      });
      return;
    }

    const header = 'receiptId,number,merchantId,issuedAt,paymentMethod,status,syncStatus,totalCents,taxCents,currency';
    const rows = receipts.map((receipt) => [
      receipt.id,
      receipt.number ?? '',
      receipt.merchantId,
      receipt.issuedAt,
      receipt.paymentMethod,
      receipt.status,
      receipt.syncStatus,
      receipt.totalCents,
      receipt.taxCents,
      receipt.currency
    ].join(','));

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = `receipts-${new Date().toISOString().slice(0, 10)}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    markReportsExported();

    void presentToast({
      message: t('reports.exportDone', { count: receipts.length }),
      duration: 1600,
      color: 'success'
    });
  };

  return (
    <PageScaffold title={t('pages.reports')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('pages.reports')}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonButton fill="outline" onClick={() => void refreshReceipts()}>
            {t('reports.refresh')}
          </IonButton>

          {!todayReceipts.length ? (
            <EmptyState
              title={t('reports.emptyTitle')}
              message={t('reports.emptyDescription')}
            />
          ) : (
            <IonList>
              <IonItem>
                <IonLabel>{t('reports.todaySales')}</IonLabel>
                <strong>{formatEuro(todayTotalCents)}</strong>
              </IonItem>
              <IonItem>
                <IonLabel>{t('reports.todayTax')}</IonLabel>
                <strong>{formatEuro(todayTaxCents)}</strong>
              </IonItem>
              <IonItem>
                <IonLabel>{t('reports.receiptsCount')}</IonLabel>
                <strong>{todayReceipts.length}</strong>
              </IonItem>
            </IonList>
          )}

          <IonButton expand="block" onClick={() => void handleExportCsv()}>
            {t('reports.exportCsv')}
          </IonButton>

          {reportsSettings.lastExportAt ? (
            <IonNote color="success">
              {t('reports.lastExportAt', { date: formatDateTime(reportsSettings.lastExportAt) })}
            </IonNote>
          ) : null}
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default ReportsPage;
