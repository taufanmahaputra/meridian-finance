'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { MonthData, Transaction, Category, UploadHistoryEntry } from '@/types/finance';
import { computeDerived, sortMonths, monthLabelFromDate } from '@/lib/calculations';
import { createClient } from '@/lib/supabase';
import { DEFAULT_CATEGORIES, DEFAULT_CURRENCY, nextChartColor } from '@/lib/constants';
import { t as translate, DEFAULT_LANGUAGE, type Language } from '@/lib/i18n';
import type { User } from '@supabase/supabase-js';

const UPLOAD_HISTORY_LIMIT = 20;

export interface TransactionInput {
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'Income' | 'Expense';
  notes?: string;
}

interface FinanceState {
  months: MonthData[];
  transactions: Transaction[];
  categories: Category[];
  catBudgets: Record<string, number>;
  catColors: Record<string, string>;
  monthlyBudget: number;
  income: number;
  currency: string;
  language: Language;
  t: (key: string, vars?: Record<string, string | number>) => string;
  user: User | null;
  loading: boolean;
  uploadHistory: UploadHistoryEntry[];
  addMonth: (month: MonthData) => void;
  importMonth: (label: string, partial: boolean, txs: Transaction[], mode?: 'replace' | 'append') => Promise<void>;
  deleteMonth: (label: string) => Promise<void>;
  logUpload: (entry: Omit<UploadHistoryEntry, 'id' | 'createdAt'>) => Promise<void>;
  clearUploadHistory: () => Promise<void>;
  updateMonthIncome: (label: string, income: number) => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<TransactionInput>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (name: string, budget: number, color?: string) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'budget' | 'color'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateIncome: (income: number) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  updateLanguage: (language: Language) => Promise<void>;
  clearAllData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FinanceContext = createContext<FinanceState | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransactionRow(row: any): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    type: row.type as 'Income' | 'Expense',
    month: row.month,
    notes: row.notes,
    // Nullable until the v6 migration backfill runs (and for rows created
    // by older app versions) — leave undefined rather than coercing null
    // to 0, so the UI can tell "no FX data" apart from a genuine zero.
    originalAmount: row.original_amount != null ? Number(row.original_amount) : undefined,
    originalCurrency: row.original_currency ?? undefined,
    fxRate: row.fx_rate != null ? Number(row.fx_rate) : undefined,
    sourceBank: row.source_bank ?? undefined,
  };
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryEntry[]>([]);
  const [income, setIncome] = useState(0);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  // Tracks which user's data is currently loaded so a Supabase auth event
  // that re-fires for the *same* user (e.g. the background token-refresh
  // check that runs whenever the tab regains focus) doesn't trigger a
  // full reload — that flips `loading` back to true and blanks the whole
  // app behind the spinner even though nothing actually changed.
  const loadedUserIdRef = useRef<string | null>(null);

  const catBudgets = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.budget])),
    [categories]
  );
  const catColors = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.color])),
    [categories]
  );
  const monthlyBudget = useMemo(() => categories.reduce((s, c) => s + c.budget, 0), [categories]);

  async function loadData(userId: string) {
    setLoading(true);
    try {
      const [monthsRes, txRes, catRes, profileRes, uploadHistoryRes] = await Promise.all([
        supabase.from('months').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('profiles').select('monthly_income, currency, language').eq('id', userId).single(),
        supabase.from('upload_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(UPLOAD_HISTORY_LIMIT),
      ]);

      let cats = catRes.data ?? [];
      if (cats.length === 0) {
        const { data: inserted } = await supabase
          .from('categories')
          .insert(DEFAULT_CATEGORIES.map((c) => ({ user_id: userId, name: c.name, budget: c.budget, color: c.color })))
          .select();
        cats = inserted ?? [];
      }
      const loadedCats: Category[] = cats.map((row) => ({ id: row.id, name: row.name, budget: Number(row.budget), color: row.color }));
      setCategories(loadedCats);

      const catBudgetMap = Object.fromEntries(loadedCats.map((c) => [c.name, c.budget]));
      const loaded = (monthsRes.data ?? []).map((row) =>
        computeDerived({
          id: row.id,
          label: row.label,
          partial: row.partial,
          income: Number(row.income),
          expenses: Number(row.expenses),
          cats: row.cats as Record<string, number>,
        }, catBudgetMap)
      );
      setMonths(sortMonths(loaded));

      if (txRes.data) {
        setTransactions(txRes.data.map(mapTransactionRow));
      }

      setIncome(Number(profileRes.data?.monthly_income) || 0);
      setCurrency(profileRes.data?.currency || DEFAULT_CURRENCY);
      setLanguage((profileRes.data?.language as Language) || DEFAULT_LANGUAGE);

      setUploadHistory((uploadHistoryRes.data ?? []).map((row) => ({
        id: row.id,
        fileName: row.file_name,
        bankLabel: row.bank_label,
        month: row.month,
        mode: row.mode as 'append' | 'replace',
        rowCount: row.row_count,
        currency: row.currency,
        createdAt: row.created_at,
      })));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) {
        loadedUserIdRef.current = u.id;
        loadData(u.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u && loadedUserIdRef.current !== u.id) {
        loadedUserIdRef.current = u.id;
        loadData(u.id);
      } else if (!u) {
        loadedUserIdRef.current = null;
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMonth = useCallback(async (month: MonthData) => {
    setMonths((prev) => sortMonths([...prev, month]));

    if (user) {
      const { data } = await supabase.from('months').insert({
        user_id: user.id,
        label: month.label,
        partial: month.partial,
        income: month.income,
        expenses: month.expenses,
        cats: month.cats,
      }).select().single();
      if (data) {
        setMonths((prev) => prev.map((m) => (m.label === month.label && !m.id ? { ...m, id: data.id } : m)));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const importMonth = useCallback(async (label: string, partial: boolean, txs: Transaction[], mode: 'replace' | 'append' = 'replace') => {
    const existing = months.find((m) => m.label === label);
    // Append keeps whatever is already saved for this month and layers the
    // new rows on top — for when a second statement for the same month
    // (a different bank, or a later e-statement cut-off date) arrives
    // separately. Replace still exists for correcting an import mistake.
    //
    // Read prior rows from the DATABASE, not the `transactions` closure —
    // two uploads for the same month done back-to-back (e.g. BCA then UOB,
    // each its own "Confirm & Save") can race the client-side state update
    // between them, silently computing the month's totals from whichever
    // batch happened to be in React state at that instant instead of
    // everything actually saved. The DB is always current.
    let priorTxs: Transaction[] = [];
    if (mode === 'append' && user) {
      const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).eq('month', label);
      priorTxs = (data ?? []).map(mapTransactionRow);
    }
    const combined = [...priorTxs, ...txs];

    const cats: Record<string, number> = {};
    let incomeTotal = 0;
    combined.forEach((t) => {
      if (t.type === 'Expense') cats[t.category] = (cats[t.category] || 0) + t.amount;
      else incomeTotal += t.amount;
    });
    const expenses = Object.values(cats).reduce((a, b) => a + b, 0);
    const monthIncome = incomeTotal > 0 ? incomeTotal : (existing?.income ?? income);
    const computed = computeDerived({ label, partial, income: monthIncome, expenses, cats }, catBudgets);

    const taggedTxs = txs.map((t) => ({ ...t, month: label }));

    if (user) {
      if (mode === 'replace') {
        await supabase.from('transactions').delete().eq('user_id', user.id).eq('month', label);
      }

      let monthId = existing?.id;
      if (monthId) {
        await supabase.from('months').update({
          partial, income: monthIncome, expenses, cats,
        }).eq('id', monthId);
      } else {
        const { data } = await supabase.from('months').insert({
          user_id: user.id, label, partial, income: monthIncome, expenses, cats,
        }).select().single();
        monthId = data?.id;
      }

      if (taggedTxs.length > 0) {
        await supabase.from('transactions').insert(taggedTxs.map((t) => ({
          user_id: user.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category,
          type: t.type,
          month: t.month,
          notes: t.notes || null,
          // Default to a 1:1 same-currency import when the caller didn't do
          // any FX work (e.g. a plain single-currency CSV), so these columns
          // are never null for newly-created rows.
          original_amount: t.originalAmount ?? t.amount,
          original_currency: t.originalCurrency ?? currency,
          fx_rate: t.fxRate ?? 1,
          source_bank: t.sourceBank ?? null,
        })));
      }
      computed.id = monthId;
    }

    setMonths((prev) => {
      const without = prev.filter((m) => m.label !== label);
      return sortMonths([...without, computed]);
    });
    setTransactions((prev) => [...prev.filter((t) => t.month !== label), ...combined]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, months, catBudgets, income, currency]);

  /** Deletes every transaction (and the aggregate row) for one month — the
   *  reset control for a bad import, without touching any other month. */
  const deleteMonth = useCallback(async (label: string) => {
    const existing = months.find((m) => m.label === label);
    if (user) {
      await supabase.from('transactions').delete().eq('user_id', user.id).eq('month', label);
      if (existing?.id) await supabase.from('months').delete().eq('id', existing.id);
    }
    setMonths((prev) => prev.filter((m) => m.label !== label));
    setTransactions((prev) => prev.filter((t) => t.month !== label));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, months]);

  /** Logs an import event (filename + month it landed in) — never the file
   *  itself — so "what did I already upload" is answerable later. */
  const logUpload = useCallback(async (entry: Omit<UploadHistoryEntry, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data } = await supabase.from('upload_history').insert({
      user_id: user.id,
      file_name: entry.fileName,
      bank_label: entry.bankLabel,
      month: entry.month,
      mode: entry.mode,
      row_count: entry.rowCount,
      currency: entry.currency,
    }).select().single();
    if (data) {
      setUploadHistory((prev) => [{
        id: data.id,
        fileName: data.file_name,
        bankLabel: data.bank_label,
        month: data.month,
        mode: data.mode,
        rowCount: data.row_count,
        currency: data.currency,
        createdAt: data.created_at,
      }, ...prev].slice(0, UPLOAD_HISTORY_LIMIT));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const clearUploadHistory = useCallback(async () => {
    setUploadHistory([]);
    if (user) {
      await supabase.from('upload_history').delete().eq('user_id', user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /** Overrides one month's income (independent of the global default in
   *  Settings) — recomputes savings/savingsRate locally and persists just
   *  the income column, leaving expenses/cats untouched. */
  const updateMonthIncome = useCallback(async (label: string, newIncome: number) => {
    const existing = months.find((m) => m.label === label);
    if (!existing) return;
    const computed = computeDerived(
      { id: existing.id, label, partial: existing.partial, income: newIncome, expenses: existing.expenses, cats: existing.cats },
      catBudgets
    );
    setMonths((prev) => prev.map((m) => (m.label === label ? computed : m)));
    if (user && existing.id) {
      await supabase.from('months').update({ income: newIncome }).eq('id', existing.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, months, catBudgets]);

  /** Recomputes and persists one month's cats/expenses from whatever is
   *  currently in the database for that month — always a fresh read, never
   *  local state, so a single-transaction add/edit/delete can't drift out
   *  of sync the same way the append-import race did. Auto-creates the
   *  month row if a manually added transaction is the first thing in it. */
  const resyncMonth = useCallback(async (label: string) => {
    if (!user) return;
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).eq('month', label);
    const rows = (data ?? []).map(mapTransactionRow);

    const cats: Record<string, number> = {};
    let incomeTotal = 0;
    rows.forEach((t) => {
      if (t.type === 'Expense') cats[t.category] = (cats[t.category] || 0) + t.amount;
      else incomeTotal += t.amount;
    });
    const expenses = Object.values(cats).reduce((a, b) => a + b, 0);
    const existing = months.find((m) => m.label === label);
    const monthIncome = incomeTotal > 0 ? incomeTotal : (existing?.income ?? income);

    let monthId = existing?.id;
    if (monthId) {
      await supabase.from('months').update({ expenses, cats, income: monthIncome }).eq('id', monthId);
    } else if (rows.length > 0) {
      const { data: inserted } = await supabase.from('months').insert({
        user_id: user.id, label, partial: false, income: monthIncome, expenses, cats,
      }).select().single();
      monthId = inserted?.id;
    } else {
      return; // month row deleted and now has zero transactions — nothing to resync
    }

    const computed = computeDerived(
      { id: monthId, label, partial: existing?.partial ?? false, income: monthIncome, expenses, cats },
      catBudgets
    );
    setMonths((prev) => sortMonths([...prev.filter((m) => m.label !== label), computed]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, months, catBudgets, income]);

  /** Adds a single transaction that didn't come from a statement — the
   *  month it belongs to is derived from its date and created if it
   *  doesn't exist yet. */
  const addTransaction = useCallback(async (input: TransactionInput) => {
    if (!user) return;
    const label = monthLabelFromDate(input.date);
    const { data } = await supabase.from('transactions').insert({
      user_id: user.id,
      date: input.date,
      description: input.description,
      amount: input.amount,
      category: input.category,
      type: input.type,
      month: label,
      notes: input.notes || null,
      original_amount: input.amount,
      original_currency: currency,
      fx_rate: 1,
      source_bank: null,
    }).select().single();
    if (data) setTransactions((prev) => [mapTransactionRow(data), ...prev]);
    await resyncMonth(label);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currency, resyncMonth]);

  /** Edits an existing transaction (e.g. correcting a wrong category from
   *  an import) and resyncs whichever month(s) are affected — both the old
   *  and new one, if the edit moved the date across a month boundary. */
  const updateTransaction = useCallback(async (id: string, updates: Partial<TransactionInput>) => {
    if (!user) return;
    const existingTx = transactions.find((t) => t.id === id);
    if (!existingTx) return;
    const newDate = updates.date ?? existingTx.date;
    const newLabel = monthLabelFromDate(newDate);
    const oldLabel = existingTx.month ?? monthLabelFromDate(existingTx.date);

    const { data } = await supabase.from('transactions').update({
      date: newDate,
      description: updates.description ?? existingTx.description,
      amount: updates.amount ?? existingTx.amount,
      category: updates.category ?? existingTx.category,
      type: updates.type ?? existingTx.type,
      month: newLabel,
    }).eq('id', id).select().single();
    if (data) setTransactions((prev) => prev.map((t) => (t.id === id ? mapTransactionRow(data) : t)));

    await resyncMonth(newLabel);
    if (oldLabel !== newLabel) await resyncMonth(oldLabel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, transactions, resyncMonth]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return;
    const existingTx = transactions.find((t) => t.id === id);
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    const label = existingTx?.month ?? (existingTx ? monthLabelFromDate(existingTx.date) : null);
    if (label) await resyncMonth(label);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, transactions, resyncMonth]);

  const addCategory = useCallback(async (name: string, budget: number, color?: string) => {
    const finalColor = color || nextChartColor(categories.map((c) => c.color));
    if (user) {
      const { data } = await supabase.from('categories').insert({
        user_id: user.id, name, budget, color: finalColor,
      }).select().single();
      if (data) setCategories((prev) => [...prev, { id: data.id, name: data.name, budget: Number(data.budget), color: data.color }]);
    } else {
      setCategories((prev) => [...prev, { name, budget, color: finalColor }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, categories]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Pick<Category, 'name' | 'budget' | 'color'>>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    if (user) {
      await supabase.from('categories').update(updates).eq('id', id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const deleteCategory = useCallback(async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (user) {
      await supabase.from('categories').delete().eq('id', id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateIncome = useCallback(async (newIncome: number) => {
    setIncome(newIncome);
    if (user) {
      await supabase.from('profiles').update({ monthly_income: newIncome }).eq('id', user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateCurrency = useCallback(async (newCurrency: string) => {
    setCurrency(newCurrency);
    if (user) {
      await supabase.from('profiles').update({ currency: newCurrency }).eq('id', user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateLanguage = useCallback(async (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (user) {
      await supabase.from('profiles').update({ language: newLanguage }).eq('id', user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const clearAllData = useCallback(async () => {
    setMonths([]);
    setTransactions([]);
    if (user) {
      await Promise.all([
        supabase.from('months').delete().eq('user_id', user.id),
        supabase.from('transactions').delete().eq('user_id', user.id),
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    loadedUserIdRef.current = null;
    setUser(null);
    setMonths([]);
    setTransactions([]);
    setCategories([]);
    setIncome(0);
    setCurrency(DEFAULT_CURRENCY);
    setLanguage(DEFAULT_LANGUAGE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(language, key, vars), [language]);

  return (
    <FinanceContext.Provider value={{
      months, transactions, categories, catBudgets, catColors, monthlyBudget, income, currency, language, t, user, loading,
      uploadHistory,
      addMonth, importMonth, deleteMonth, logUpload, clearUploadHistory, updateMonthIncome,
      addTransaction, updateTransaction, deleteTransaction,
      addCategory, updateCategory, deleteCategory, updateIncome, updateCurrency, updateLanguage, clearAllData, signOut,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
