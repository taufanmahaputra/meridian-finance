import type { Category } from '@/types/finance';

export const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#3b82f6', '#a855f7', '#14b8a6',
  '#ef4444', '#6b7280',
];

// Starter category set seeded once for brand-new users. Fully editable afterwards.
export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Housing', budget: 0, color: CHART_COLORS[0] },
  { name: 'Food & Groceries', budget: 0, color: CHART_COLORS[1] },
  { name: 'Transport', budget: 0, color: CHART_COLORS[2] },
  { name: 'Shopping', budget: 0, color: CHART_COLORS[3] },
  { name: 'Entertainment', budget: 0, color: CHART_COLORS[4] },
  { name: 'Utilities', budget: 0, color: CHART_COLORS[5] },
  { name: 'Travel', budget: 0, color: CHART_COLORS[6] },
  { name: 'Subscriptions', budget: 0, color: CHART_COLORS[7] },
  { name: 'Personal Care', budget: 0, color: CHART_COLORS[8] },
  { name: 'Healthcare', budget: 0, color: CHART_COLORS[9] },
  { name: 'Installments', budget: 0, color: CHART_COLORS[10] },
  { name: 'Other', budget: 0, color: CHART_COLORS[11] },
];

export function nextChartColor(usedColors: string[]): string {
  return CHART_COLORS.find((c) => !usedColors.includes(c)) || CHART_COLORS[usedColors.length % CHART_COLORS.length];
}

export interface CurrencyMeta {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
];

export const DEFAULT_CURRENCY = 'IDR';

export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol])
);

// Only this account can post/edit/delete the community stock signal watchlist.
export const ADMIN_EMAIL = 'hacker.indo62@gmail.com';

export const MAX_SIGNAL_BATCHES = 3;

// OlahAtur is in closed beta — only ADMIN_EMAIL can access these routes.
// Everyone else is bounced to /home and shown the beta-access modal.
export const OLAHATUR_BETA_PATHS = [
  '/dashboard', '/monthly', '/transactions', '/budget', '/forecast', '/insights', '/upload',
];

export const WHATSAPP_NUMBER = '6289684679315';
export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
