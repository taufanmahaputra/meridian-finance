export interface MonthData {
  id?: string;
  label: string;
  partial: boolean;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  budgetUtil: number;
  avgDaily: number;
  overBudgetCats: number;
  cats: Record<string, number>;
  createdAt?: string;
}

export interface Transaction {
  id?: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'Income' | 'Expense';
  month?: string;
  notes?: string;
}

export interface CategoryBudget {
  name: string;
  budget: number;
  color: string;
}

export interface Category {
  id?: string;
  name: string;
  budget: number;
  color: string;
}

export interface Insight {
  priority: 'high' | 'medium' | 'low' | 'info';
  title: string;
  body: string;
}

export interface ActionItem {
  title: string;
  detail: string;
}

export interface MarketData {
  label: string;
  icon: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface AssetOutlook {
  asset: string;
  view: string;
  viewType: 'success' | 'warning' | 'danger' | 'info';
  outlook: string;
  relevance: string;
  signal: string;
  signalColor: string;
}
