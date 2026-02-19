import React, { createContext, useContext, useMemo, useState } from 'react';
import { CartItem, PaymentMethod, Product, Receipt } from '../types/models';
import { calculateCartTotals, cartToReceiptItems } from '../utils/money';
import { useReceipts } from './ReceiptsContext';

interface CheckoutContextValue {
  cart: CartItem[];
  addProductToCart: (product: Product) => void;
  increaseQty: (productId: string) => void;
  decreaseQty: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  taxByVatRate: Record<number, number>;
  issueReceipt: (paymentMethod: PaymentMethod) => Promise<Receipt>;
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined);

export const CheckoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { createReceipt } = useReceipts();
  const [cart, setCart] = useState<CartItem[]>([]);

  const addProductToCart = (product: Product): void => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);

      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          unitPriceCents: product.priceCents,
          vatRate: product.vatRate
        }
      ];
    });
  };

  const increaseQty = (productId: string): void => {
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, qty: item.qty + 1 } : item))
    );
  };

  const decreaseQty = (productId: string): void => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, qty: Math.max(item.qty - 1, 0) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (productId: string): void => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = (): void => {
    setCart([]);
  };

  const totals = calculateCartTotals(cart);

  const issueReceipt = async (paymentMethod: PaymentMethod): Promise<Receipt> => {
    const receipt = await createReceipt({
      paymentMethod,
      currency: 'EUR',
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      items: cartToReceiptItems(cart)
    });

    setCart([]);

    return receipt;
  };

  const value = useMemo<CheckoutContextValue>(
    () => ({
      cart,
      addProductToCart,
      increaseQty,
      decreaseQty,
      removeFromCart,
      clearCart,
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      taxByVatRate: totals.taxByVatRate,
      issueReceipt
    }),
    [cart, totals]
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
};

export function useCheckout(): CheckoutContextValue {
  const context = useContext(CheckoutContext);

  if (!context) {
    throw new Error('useCheckout must be used inside CheckoutProvider');
  }

  return context;
}
