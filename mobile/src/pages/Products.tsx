import React from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonText,
  useIonRouter,
  useIonToast
} from '@ionic/react';
import { addCircleOutline, cafeOutline, createOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import PageScaffold from '../components/PageScaffold';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/ListSkeleton';
import { useProducts } from '../contexts/ProductsContext';
import { useMerchant } from '../contexts/MerchantContext';
import { formatEuro } from '../utils/money';

const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const ionRouter = useIonRouter();
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

  if (!selectedMerchant) {
    return (
      <PageScaffold title={t('pages.products')}>
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
    <PageScaffold title={t('pages.products')}>
      <div className="fade-in-up">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{t('products.title')}</IonCardTitle>
            <IonText color="medium">
              <p>{selectedMerchant?.name ?? '-'}</p>
            </IonText>
          </IonCardHeader>

          <IonCardContent>
            <IonSearchbar
              value={searchTerm}
              debounce={150}
              onIonInput={(event) => setSearchTerm(String(event.detail.value ?? ''))}
              placeholder={t('products.searchPlaceholder')}
            />

            <IonButton fill="outline" onClick={() => void refreshProducts()}>
              {t('products.refresh')}
            </IonButton>

            <IonButton
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

            <IonButton routerLink="/products/new" color="primary">
              <IonIcon icon={addCircleOutline} slot="start" />
              {t('products.addProduct')}
            </IonButton>

            {loading ? (
              <ListSkeleton rows={5} />
            ) : products.length === 0 ? (
              <EmptyState
                title={t('products.emptyTitle')}
                message={t('products.empty')}
                actionLabel={t('products.addProduct')}
                onAction={() => {
                  ionRouter.push('/products/new');
                }}
              />
            ) : (
              <IonList className="stagger-list">
                {products.map((product) => (
                  <IonItem key={product.id} routerLink={`/products/${product.id}/edit`} detail button>
                    <IonLabel>
                      <h2>{product.name}</h2>
                      <p>
                        {formatEuro(product.priceCents)} - {t('checkout.vat')} {product.vatRate}%
                      </p>
                      {product.category ? <p>{product.category}</p> : null}
                    </IonLabel>

                    {product.sku ? <IonChip>{product.sku}</IonChip> : null}

                    <IonIcon icon={createOutline} slot="end" color="primary" />
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>
      </div>
    </PageScaffold>
  );
};

export default ProductsPage;
