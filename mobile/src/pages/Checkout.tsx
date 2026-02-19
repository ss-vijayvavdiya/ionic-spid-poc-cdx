import React, { useMemo, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  useIonToast
} from '@ionic/react';
import {
  addCircleOutline,
  addOutline,
  cafeOutline,
  cardOutline,
  cashOutline,
  removeOutline,
  walletOutline
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/ListSkeleton';
import { useProducts } from '../contexts/ProductsContext';
import { useCheckout } from '../contexts/CheckoutContext';
import { useMerchant } from '../contexts/MerchantContext';
import { formatEuro } from '../utils/money';
import { PaymentMethod } from '../types/models';

const PAYMENT_METHODS: Array<{ method: PaymentMethod; icon: string; color: string }> = [
  { method: 'CASH', icon: cashOutline, color: 'success' },
  { method: 'CARD', icon: cardOutline, color: 'primary' },
  { method: 'WALLET', icon: walletOutline, color: 'secondary' },
  { method: 'SPLIT', icon: walletOutline, color: 'tertiary' }
];

const CheckoutPage: React.FC = () => {
  const { t } = useTranslation();
  const [presentToast] = useIonToast();
  const { selectedMerchant } = useMerchant();

  const {
    products,
    loading,
    searchTerm,
    setSearchTerm,
    refreshProducts,
    seedDemoProducts
  } = useProducts();
  const {
    cart,
    addProductToCart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    subtotalCents,
    taxCents,
    totalCents,
    taxByVatRate,
    issueReceipt
  } = useCheckout();

  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [issuing, setIssuing] = useState<boolean>(false);

  const isCartEmpty = cart.length === 0;

  const sortedTaxBreakdown = useMemo(() => {
    return Object.entries(taxByVatRate)
      .map(([rate, amount]) => ({ rate: Number(rate), amount }))
      .sort((a, b) => a.rate - b.rate);
  }, [taxByVatRate]);

  const handleIssueReceipt = async (method: PaymentMethod): Promise<void> => {
    if (isCartEmpty) {
      void presentToast({
        message: t('checkout.emptyCartError'),
        duration: 1400,
        color: 'warning'
      });
      return;
    }

    setIssuing(true);

    try {
      const receipt = await issueReceipt(method);

      void presentToast({
        message:
          receipt.syncStatus === 'PENDING'
            ? t('checkout.queuedForSync')
            : t('checkout.issuedSuccess'),
        duration: 1800,
        color: 'success'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      void presentToast({
        message: `${t('checkout.issueFailed')}: ${message}`,
        duration: 2200,
        color: 'danger'
      });
    } finally {
      setIssuing(false);
      setPaymentModalOpen(false);
    }
  };

  if (!selectedMerchant) {
    return (
      <PageScaffold title={t('pages.checkout')}>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{t('merchant.notSelected')}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonButton routerLink="/merchant-select">{t('menu.switchMerchant')}</IonButton>
          </IonCardContent>
        </IonCard>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold title={t('pages.checkout')}>
      <div className="fade-in-up">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{t('checkout.products')}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonSearchbar
              value={searchTerm}
              debounce={150}
              onIonInput={(event) => setSearchTerm(String(event.detail.value ?? ''))}
              placeholder={t('checkout.searchProducts')}
            />

            <IonButton fill="outline" size="small" onClick={() => void refreshProducts()}>
              {t('checkout.refreshProducts')}
            </IonButton>

            <IonButton
              fill="solid"
              size="small"
              color="secondary"
              onClick={() => {
                void (async () => {
                  const count = await seedDemoProducts();
                  void presentToast({
                    message: t('products.demoSeeded', { count }),
                    duration: 1700,
                    color: 'success'
                  });
                })();
              }}
            >
              <IonIcon icon={cafeOutline} slot="start" />
              {t('products.loadDemo')}
            </IonButton>

            {loading ? (
              <ListSkeleton rows={4} />
            ) : products.length === 0 ? (
              <EmptyState
                title={t('checkout.emptyProductsTitle')}
                message={t('checkout.emptyProductsDescription')}
                actionLabel={t('checkout.refreshProducts')}
                onAction={() => {
                  void refreshProducts();
                }}
              />
            ) : (
              <IonList className="stagger-list">
                {products.map((product) => (
                  <IonItem key={product.id} button detail={false} onClick={() => addProductToCart(product)}>
                    <IonLabel>
                      <h2>{product.name}</h2>
                      <p>
                        {formatEuro(product.priceCents)} - {t('checkout.vat')} {product.vatRate}%
                      </p>
                    </IonLabel>
                    <IonButton slot="end" fill="clear" color="primary">
                      <IonIcon icon={addCircleOutline} />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{t('checkout.cart')}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              {cart.map((item) => (
                <IonItem key={item.productId}>
                  <IonLabel>
                    <h3>{item.name}</h3>
                    <p>
                      {formatEuro(item.unitPriceCents)} x {item.qty}
                    </p>
                  </IonLabel>

                  <IonButtons slot="end">
                    <IonButton fill="clear" onClick={() => decreaseQty(item.productId)}>
                      <IonIcon icon={removeOutline} />
                    </IonButton>
                    <IonChip>{item.qty}</IonChip>
                    <IonButton fill="clear" onClick={() => increaseQty(item.productId)}>
                      <IonIcon icon={addOutline} />
                    </IonButton>
                    <IonButton fill="clear" color="danger" onClick={() => removeFromCart(item.productId)}>
                      {t('checkout.remove')}
                    </IonButton>
                  </IonButtons>
                </IonItem>
              ))}
            </IonList>

            {isCartEmpty ? (
              <EmptyState
                title={t('checkout.emptyCartTitle')}
                message={t('checkout.emptyCart')}
              />
            ) : null}

            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">{t('checkout.subtotal')}</div>
                <div className="metric-value">{formatEuro(subtotalCents)}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">{t('checkout.tax')}</div>
                <div className="metric-value">{formatEuro(taxCents)}</div>
              </div>
            </div>

            {sortedTaxBreakdown.map((item) => (
              <IonText key={item.rate} color="medium">
                <p>
                  {t('checkout.vat')} {item.rate}%: {formatEuro(item.amount)}
                </p>
              </IonText>
            ))}

            <IonCard color="light">
              <IonCardContent>
                <div className="metric-label">{t('checkout.total')}</div>
                <div className="metric-value">{formatEuro(totalCents)}</div>
              </IonCardContent>
            </IonCard>

            <IonButton
              expand="block"
              size="large"
              onClick={() => {
                if (isCartEmpty || issuing) {
                  return;
                }
                setPaymentModalOpen(true);
              }}
            >
              {issuing ? <IonSpinner name="crescent" /> : t('checkout.issueReceipt')}
            </IonButton>
          </IonCardContent>
        </IonCard>
      </div>

      <IonModal isOpen={paymentModalOpen} onDidDismiss={() => setPaymentModalOpen(false)}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>{t('checkout.selectPayment')}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setPaymentModalOpen(false)}>{t('common.cancel')}</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonText>
            <p className="page-subtitle">{t('checkout.selectPaymentSubtitle')}</p>
          </IonText>
          <IonList>
            {PAYMENT_METHODS.map((item) => (
              <IonItem
                key={item.method}
                button
                detail
                onClick={() => {
                  void handleIssueReceipt(item.method);
                }}
              >
                <IonIcon icon={item.icon} color={item.color} slot="start" />
                <IonLabel>{t(`payment.${item.method.toLowerCase()}`)}</IonLabel>
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>
    </PageScaffold>
  );
};

export default CheckoutPage;
