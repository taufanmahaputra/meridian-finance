import type { Category } from '@/types/finance';

// Colorblind-validated categorical palette (fixed hue order — never cycle
// within a single chart). See dataviz skill: worst adjacent CVD ΔE 9.1,
// worst adjacent normal-vision ΔE 19.6 against a white card surface.
export const CHART_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
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
  { name: 'Personal Care', budget: 0, color: CHART_COLORS[0] },
  { name: 'Healthcare', budget: 0, color: CHART_COLORS[1] },
  { name: 'Installments', budget: 0, color: CHART_COLORS[2] },
  { name: 'Other', budget: 0, color: '#6b7280' },
];

export function nextChartColor(usedColors: string[]): string {
  return CHART_COLORS.find((c) => !usedColors.includes(c)) || CHART_COLORS[usedColors.length % CHART_COLORS.length];
}

// Status colors used across charts (budget utilization, health, anomalies).
// Kept aligned with the Tailwind emerald/amber/red shades the Badge
// component already renders, so charts and UI chrome read as one system.
export const STATUS_COLORS = {
  good: '#059669',
  warning: '#f59e0b',
  danger: '#ef4444',
} as const;

// Shared recharts chrome so every chart looks like one system.
export const CHART_GRID_COLOR = '#e6e1d9';
export const CHART_AXIS_TICK = { fontSize: 11, fill: '#a89c87' };
export const CHART_TOOLTIP_STYLE = { borderRadius: 8, border: '1px solid #e6e1d9', fontSize: 12 };

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
  '/dashboard', '/monthly', '/transactions', '/spending', '/budget', '/forecast', '/insights', '/upload',
];

export const WHATSAPP_NUMBER = '6289684679315';
export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
