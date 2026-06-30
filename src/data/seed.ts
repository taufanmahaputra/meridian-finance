import type { MonthData } from '@/types/finance';
import { computeDerived } from '@/lib/calculations';

const raw = [
  {
    label: 'Apr 2026', partial: false, income: 13333, expenses: 6223.58,
    cats: { 'Housing': 3283.20, 'Food & Groceries': 740.19, 'Transport': 24.87, 'Shopping': 268.22, 'Entertainment': 53.58, 'Utilities': 15.56, 'Travel': 208.26, 'Subscriptions': 65.64, 'Personal Care': 0, 'Orang Tua': 400, 'Installments': 1164.06, 'Other': 0 },
  },
  {
    label: 'May 2026', partial: false, income: 13333, expenses: 7578.83,
    cats: { 'Housing': 3283.20, 'Food & Groceries': 1230.03, 'Transport': 119.50, 'Shopping': 157.55, 'Entertainment': 0, 'Utilities': 266.90, 'Travel': 990.67, 'Subscriptions': 59.87, 'Personal Care': 88.20, 'Orang Tua': 217.39, 'Installments': 1140.72, 'Other': 24.80 },
  },
  {
    label: 'Jun 2026', partial: true, income: 13333, expenses: 7865.19,
    cats: { 'Housing': 3359.20, 'Food & Groceries': 790.38, 'Transport': 199.13, 'Shopping': 156.76, 'Entertainment': 41.10, 'Utilities': 281.88, 'Travel': 660.34, 'Subscriptions': 84.92, 'Personal Care': 394.77, 'Orang Tua': 840.21, 'Installments': 1057.89, 'Other': -1.39 },
  },
];

export const seedMonths: MonthData[] = raw.map(computeDerived);
