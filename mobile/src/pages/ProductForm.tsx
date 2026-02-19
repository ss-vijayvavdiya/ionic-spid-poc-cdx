import React, { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
  useIonToast
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import PageScaffold from '../components/PageScaffold';
import { useProducts } from '../contexts/ProductsContext';
import { useMerchant } from '../contexts/MerchantContext';

interface ProductFormParams {
  id?: string;
}

const ProductFormPage: React.FC = () => {
  const { t } = useTranslation();
  const ionRouter = useIonRouter();
  const [presentToast] = useIonToast();
  const { id } = useParams<ProductFormParams>();
  const { selectedMerchant } = useMerchant();
  const { getProductById, saveProduct } = useProducts();

  const isEdit = Boolean(id);

  const [name, setName] = useState<string>('');
  const [priceCents, setPriceCents] = useState<string>('');
  const [vatRate, setVatRate] = useState<string>('22');
  const [category, setCategory] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const product = await getProductById(id);

        if (!product) {
          void presentToast({
            message: t('products.notFound'),
            duration: 1400,
            color: 'warning'
          });
          return;
        }

        setName(product.name);
        setPriceCents(String(product.priceCents));
        setVatRate(String(product.vatRate));
        setCategory(product.category ?? '');
        setSku(product.sku ?? '');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, getProductById, presentToast, t]);

  const validationError = useMemo(() => {
    if (!name.trim()) {
      return t('products.validation.nameRequired');
    }

    if (!priceCents.trim() || Number(priceCents) <= 0) {
      return t('products.validation.priceRequired');
    }

    if (!vatRate.trim() || Number(vatRate) < 0) {
      return t('products.validation.vatRequired');
    }

    if (!selectedMerchant) {
      return t('merchant.notSelected');
    }

    return null;
  }, [name, priceCents, vatRate, selectedMerchant, t]);

  const handleSave = async (): Promise<void> => {
    if (validationError || !selectedMerchant) {
      void presentToast({
        message: validationError ?? t('products.validation.invalid'),
        duration: 1800,
        color: 'danger'
      });
      return;
    }

    setLoading(true);

    try {
      await saveProduct({
        id,
        merchantId: selectedMerchant.id,
        name,
        priceCents: Number(priceCents),
        vatRate: Number(vatRate),
        category,
        sku,
        isActive: true
      });

      void presentToast({
        message: t('products.saved'),
        duration: 1400,
        color: 'success'
      });

      ionRouter.push('/products', 'back');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageScaffold title={isEdit ? t('pages.editProduct') : t('pages.newProduct')}>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{isEdit ? t('products.editTitle') : t('products.newTitle')}</IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonItem>
            <IonLabel position="stacked">{t('products.fields.name')} *</IonLabel>
            <IonInput value={name} onIonInput={(event) => setName(String(event.detail.value ?? ''))} />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">{t('products.fields.priceCents')} *</IonLabel>
            <IonInput
              type="number"
              inputmode="numeric"
              value={priceCents}
              onIonInput={(event) => setPriceCents(String(event.detail.value ?? ''))}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">{t('products.fields.vatRate')} *</IonLabel>
            <IonInput
              type="number"
              inputmode="decimal"
              value={vatRate}
              onIonInput={(event) => setVatRate(String(event.detail.value ?? ''))}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">{t('products.fields.category')}</IonLabel>
            <IonInput
              value={category}
              onIonInput={(event) => setCategory(String(event.detail.value ?? ''))}
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">{t('products.fields.sku')}</IonLabel>
            <IonInput value={sku} onIonInput={(event) => setSku(String(event.detail.value ?? ''))} />
          </IonItem>

          {validationError ? (
            <IonText color="danger">
              <p>{validationError}</p>
            </IonText>
          ) : null}

          <IonButton
            expand="block"
            onClick={() => {
              if (loading) {
                return;
              }
              void handleSave();
            }}
          >
            {loading ? t('common.loading') : t('common.save')}
          </IonButton>
        </IonCardContent>
      </IonCard>
    </PageScaffold>
  );
};

export default ProductFormPage;
