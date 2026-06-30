import type { CategoryBudget } from '@/types/finance';

export const INCOME = 13333;
export const MONTHLY_BUDGET = 6102;

export const CATEGORIES: CategoryBudget[] = [
  { name: 'Housing', budget: 3300, color: '#6366f1' },
  { name: 'Food & Groceries', budget: 1500, color: '#10b981' },
  { name: 'Transport', budget: 150, color: '#f59e0b' },
  { name: 'Shopping', budget: 200, color: '#ec4899' },
  { name: 'Entertainment', budget: 100, color: '#8b5cf6' },
  { name: 'Utilities', budget: 250, color: '#06b6d4' },
  { name: 'Travel', budget: 0, color: '#f97316' },
  { name: 'Subscriptions', budget: 100, color: '#3b82f6' },
  { name: 'Personal Care', budget: 100, color: '#a855f7' },
  { name: 'Orang Tua', budget: 400, color: '#14b8a6' },
  { name: 'Installments', budget: 0, color: '#ef4444' },
  { name: 'Other', budget: 0, color: '#6b7280' },
];

export const CAT_BUDGETS: Record<string, number> = Object.fromEntries(
  CATEGORIES.map((c) => [c.name, c.budget])
);

export const CAT_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.name, c.color])
);

export const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#3b82f6', '#a855f7', '#14b8a6',
  '#ef4444', '#6b7280',
];
