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
  /** Always in the user's display currency (profiles.currency). */
  amount: number;
  category: string;
  type: 'Income' | 'Expense';
  month?: string;
  notes?: string;
  /** Amount as printed on the source statement, before FX conversion. */
  originalAmount?: number;
  /** ISO code of originalAmount's currency, e.g. 'SGD'. */
  originalCurrency?: string;
  /** originalCurrency -> display currency rate applied at import. */
  fxRate?: number;
  /** Statement template this row was parsed from, e.g. 'bca'. */
  sourceBank?: string;
  /** True only for the placeholder rows buildTransactionLedger synthesizes
   *  for a month with no itemized data — never set on a real saved row. */
  synthetic?: boolean;
}

/** A logged import event — filename + where it landed, never the file
 *  contents — so a user can recall what they already uploaded. */
export interface UploadHistoryEntry {
  id?: string;
  fileName: string;
  bankLabel: string | null;
  month: string;
  mode: 'append' | 'replace';
  rowCount: number;
  currency: string | null;
  createdAt: string;
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
