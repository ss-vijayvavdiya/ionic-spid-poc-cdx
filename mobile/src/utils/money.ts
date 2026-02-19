import { CartItem, ReceiptItem } from '../types/models';

export interface CartTotals {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  // Tax grouped by VAT rate. Example key: 22 means 22%.
  taxByVatRate: Record<number, number>;
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR'
  }).format(cents / 100);
}

function lineSubtotalCents(item: CartItem): number {
  return item.unitPriceCents * item.qty;
}

function lineTaxCents(item: CartItem): number {
  const subtotal = lineSubtotalCents(item);
  return Math.round((subtotal * item.vatRate) / 100);
}

export function calculateCartTotals(items: CartItem[]): CartTotals {
  let subtotalCents = 0;
  let taxCents = 0;
  const taxByVatRate: Record<number, number> = {};

  for (const item of items) {
    const subtotal = lineSubtotalCents(item);
    const tax = lineTaxCents(item);

    subtotalCents += subtotal;
    taxCents += tax;

    if (!taxByVatRate[item.vatRate]) {
      taxByVatRate[item.vatRate] = 0;
    }

    taxByVatRate[item.vatRate] += tax;
  }

  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    taxByVatRate
  };
}

export function cartToReceiptItems(items: CartItem[]): ReceiptItem[] {
  return items.map((item) => ({
    name: item.name,
    qty: item.qty,
    unitPriceCents: item.unitPriceCents,
    vatRate: item.vatRate,
    lineTotalCents: item.unitPriceCents * item.qty
  }));
}
