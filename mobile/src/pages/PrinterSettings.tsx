import React, { useMemo, useState } from 'react';
import {
  IonBadge,
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
  useIonToast
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import { useSettings } from '../contexts/SettingsContext';
import { formatDateTime } from '../utils/dates';

interface PrinterCandidate {
  id: string;
  name: string;
}

const MOCK_PRINTERS: PrinterCandidate[] = [
  { id: 'printer-bt-01', name: 'Sunmi V2 Bluetooth' },
  { id: 'printer-bt-02', name: 'Epson TM-m30II' },
  { id: 'printer-net-01', name: 'Star Micronics LAN' }
];

const PrinterSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [presentToast] = useIonToast();
  const { printerSettings, savePrinterSettings } = useSettings();

  const [availablePrinters, setAvailablePrinters] = useState<PrinterCandidate[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(printerSettings.selectedPrinterId);

  const selectedPrinter = useMemo(() => {
    if (!selectedPrinterId) {
      return null;
    }

    return availablePrinters.find((printer) => printer.id === selectedPrinterId)
      ?? (printerSettings.selectedPrinterName
        ? { id: selectedPrinterId, name: printerSettings.selectedPrinterName }
        : null);
  }, [availablePrinters, selectedPrinterId, printerSettings.selectedPrinterName]);

  const persist = (input: {
    selectedPrinterId: string | null;
    selectedPrinterName: string | null;
    isConnected: boolean;
    lastScanAt?: string;
    lastTestPrintAt?: string;
  }): void => {
    savePrinterSettings({
      ...printerSettings,
      ...input
    });
  };

  const handleScan = (): void => {
    const now = new Date().toISOString();
    setAvailablePrinters(MOCK_PRINTERS);

    const fallbackPrinter = selectedPrinter ?? MOCK_PRINTERS[0] ?? null;
    setSelectedPrinterId((prev) => prev ?? fallbackPrinter?.id ?? null);

    persist({
      selectedPrinterId: selectedPrinterId ?? fallbackPrinter?.id ?? null,
      selectedPrinterName: selectedPrinter?.name ?? fallbackPrinter?.name ?? null,
      isConnected: false,
      lastScanAt: now
    });

    void presentToast({
      message: t('printer.scanSuccess', { count: MOCK_PRINTERS.length }),
      duration: 1500,
      color: 'success'
    });
  };

  const handleToggleConnection = (): void => {
    if (!selectedPrinter) {
      void presentToast({
        message: t('printer.selectPrinterFirst'),
        duration: 1500,
        color: 'warning'
      });
      return;
    }

    const nextConnected = !printerSettings.isConnected;

    persist({
      selectedPrinterId: selectedPrinter.id,
      selectedPrinterName: selectedPrinter.name,
      isConnected: nextConnected
    });

    void presentToast({
      message: nextConnected ? t('printer.connectSuccess', { name: selectedPrinter.name }) : t('printer.disconnectSuccess'),
      duration: 1500,
      color: nextConnected ? 'success' : 'medium'
    });
  };

  const handleTestPrint = (): void => {
    if (!printerSettings.isConnected || !selectedPrinter) {
      void presentToast({
        message: t('printer.connectBeforeTest'),
        duration: 1500,
        color: 'warning'
      });
      return;
    }

    persist({
      selectedPrinterId: selectedPrinter.id,
      selectedPrinterName: selectedPrinter.name,
      isConnected: true,
      lastTestPrintAt: new Date().toISOString()
    });

    void presentToast({
      message: t('printer.testSuccess'),
      duration: 1500,
      color: 'success'
    });
  };

  return (
    <PageScaffold title={t('pages.printerSettings')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{t('pages.printerSettings')}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonList>
            <IonItem>
              <IonLabel>{t('printer.status')}</IonLabel>
              <IonBadge color={printerSettings.isConnected ? 'success' : 'medium'}>
                {printerSettings.isConnected ? t('printer.connected') : t('printer.disconnected')}
              </IonBadge>
            </IonItem>

            <IonItem>
              <IonLabel>{t('printer.selectedDevice')}</IonLabel>
              <IonSelect
                value={selectedPrinterId ?? ''}
                placeholder={t('printer.selectDevice')}
                onIonChange={(event) => {
                  const id = String(event.detail.value || '');
                  const match = availablePrinters.find((printer) => printer.id === id) ?? null;
                  setSelectedPrinterId(match?.id ?? null);

                  if (match) {
                    persist({
                      selectedPrinterId: match.id,
                      selectedPrinterName: match.name,
                      isConnected: false
                    });
                  }
                }}
              >
                {availablePrinters.map((printer) => (
                  <IonSelectOption key={printer.id} value={printer.id}>
                    {printer.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          </IonList>

          <IonButton expand="block" onClick={handleScan}>
            {t('printer.scanDevices')}
          </IonButton>

          <IonButton expand="block" color="secondary" onClick={handleToggleConnection}>
            {printerSettings.isConnected ? t('printer.disconnect') : t('printer.connect')}
          </IonButton>

          <IonButton expand="block" color="tertiary" onClick={handleTestPrint}>
            {t('printer.testPrint')}
          </IonButton>

          {printerSettings.lastScanAt ? (
            <IonNote color="medium">
              {t('printer.lastScanAt', { date: formatDateTime(printerSettings.lastScanAt) })}
            </IonNote>
          ) : null}

          {printerSettings.lastTestPrintAt ? (
            <IonNote color="medium">
              {t('printer.lastTestAt', { date: formatDateTime(printerSettings.lastTestPrintAt) })}
            </IonNote>
          ) : null}

          {printerSettings.lastSavedAt ? (
            <IonNote color="success">
              {t('printer.lastSavedAt', { date: formatDateTime(printerSettings.lastSavedAt) })}
            </IonNote>
          ) : null}
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default PrinterSettingsPage;
