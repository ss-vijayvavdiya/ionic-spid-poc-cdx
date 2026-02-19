import { Merchant, Product, Receipt } from '../../types/models';
import { toIsoNow } from '../../utils/dates';

const now = toIsoNow();

export const SEED_MERCHANTS: Merchant[] = [
  {
    id: 'merchant-brew-haven',
    name: 'Brew Haven Coffee',
    vatNumber: 'IT12345678901',
    address: '12 Bean Street, Milan'
  },
  {
    id: 'merchant-trattoria-roma',
    name: 'Trattoria Roma',
    vatNumber: 'IT10987654321',
    address: '8 Piazza Centro, Rome'
  }
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-espresso',
    merchantId: 'merchant-brew-haven',
    name: 'Espresso',
    priceCents: 180,
    vatRate: 10,
    category: 'Coffee',
    sku: 'COF-001',
    isActive: true,
    updatedAt: now
  },
  {
    id: 'prod-cappuccino',
    merchantId: 'merchant-brew-haven',
    name: 'Cappuccino',
    priceCents: 320,
    vatRate: 10,
    category: 'Coffee',
    sku: 'COF-002',
    isActive: true,
    updatedAt: now
  },
  {
    id: 'prod-latte',
    merchantId: 'merchant-brew-haven',
    name: 'Cafe Latte',
    priceCents: 350,
    vatRate: 10,
    category: 'Coffee',
    sku: 'COF-003',
    isActive: true,
    updatedAt: now
  },
  {
    id: 'prod-croissant',
    merchantId: 'merchant-brew-haven',
    name: 'Butter Croissant',
    priceCents: 250,
    vatRate: 10,
    category: 'Bakery',
    sku: 'BAK-001',
    isActive: true,
    updatedAt: now
  },
  {
    id: 'prod-club-sandwich',
    merchantId: 'merchant-brew-haven',
    name: 'Club Sandwich',
    priceCents: 720,
    vatRate: 10,
    category: 'Food',
    sku: 'FOD-001',
    isActive: true,
    updatedAt: now
  },
  {
    id: 'prod-pizza-margherita',
    merchantId: 'merchant-trattoria-roma',
    name: 'Pizza Margherita',
    priceCents: 1150,
    vatRate: 10,
    category: 'Main Course',
    sku: 'RST-001',
    isActive: true,
    updatedAt: now
  },
  {
    id: 'prod-carbonara',
    merchantId: 'merchant-trattoria-roma',
    name: 'Spaghetti Carbonara',
    priceCents: 1350,
    vatRate: 10,
    category: 'Main Course',
    sku: 'RST-002',
    isActive: true,
    updatedAt: now
  },
  {
    id: 'prod-lasagna',
    merchantId: 'merchant-trattoria-roma',
    name: 'Lasagna',
    priceCents: 1400,
    vatRate: 10,
    category: 'Main Course',
    sku: 'RST-003',
    isActive: true,
    updatedAt: now
  },
  {
    id: 'prod-tiramisu',
    merchantId: 'merchant-trattoria-roma',
    name: 'Tiramisu',
    priceCents: 650,
    vatRate: 10,
    category: 'Dessert',
    sku: 'RST-004',
    isActive: true,
    updatedAt: now
  },
  {
    id: 'prod-house-wine',
    merchantId: 'merchant-trattoria-roma',
    name: 'House Wine (Glass)',
    priceCents: 550,
    vatRate: 22,
    category: 'Drinks',
    sku: 'RST-005',
    isActive: true,
    updatedAt: now
  }
];

export const SEED_RECEIPTS: Receipt[] = [
  {
    id: 'rcpt-local-001',
    clientReceiptId: 'client-rcpt-001',
    merchantId: 'merchant-brew-haven',
    number: 'BH-0001',
    issuedAt: now,
    status: 'COMPLETED',
    syncStatus: 'SYNCED',
    paymentMethod: 'CARD',
    currency: 'EUR',
    subtotalCents: 500,
    taxCents: 50,
    totalCents: 550,
    items: [
      {
        name: 'Espresso',
        qty: 1,
        unitPriceCents: 180,
        vatRate: 10,
        lineTotalCents: 180
      },
      {
        name: 'Butter Croissant',
        qty: 1,
        unitPriceCents: 250,
        vatRate: 10,
        lineTotalCents: 250
      }
    ],
    createdOffline: false,
    syncAttempts: 0
  },
  {
    id: 'rcpt-local-002',
    clientReceiptId: 'client-rcpt-002',
    merchantId: 'merchant-trattoria-roma',
    issuedAt: now,
    status: 'PENDING_SYNC',
    syncStatus: 'PENDING',
    paymentMethod: 'CASH',
    currency: 'EUR',
    subtotalCents: 1800,
    taxCents: 180,
    totalCents: 1980,
    items: [
      {
        name: 'Pizza Margherita',
        qty: 1,
        unitPriceCents: 1150,
        vatRate: 10,
        lineTotalCents: 1150
      },
      {
        name: 'House Wine (Glass)',
        qty: 1,
        unitPriceCents: 550,
        vatRate: 22,
        lineTotalCents: 550
      }
    ],
    createdOffline: true,
    syncAttempts: 0
  }
];
