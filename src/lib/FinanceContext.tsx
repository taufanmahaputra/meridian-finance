'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { MonthData, Transaction, Category } from '@/types/finance';
import { computeDerived } from '@/lib/calculations';
import { createClient } from '@/lib/supabase';
import { DEFAULT_CATEGORIES, DEFAULT_CURRENCY, nextChartColor } from '@/lib/constants';
import type { User } from '@supabase/supabase-js';

interface FinanceState {
  months: MonthData[];
  transactions: Transaction[];
  categories: Category[];
  catBudgets: Record<string, number>;
  catColors: Record<string, string>;
  monthlyBudget: number;
  income: number;
  currency: string;
  user: User | null;
  loading: boolean;
  addMonth: (month: MonthData) => void;
  importMonth: (label: string, partial: boolean, txs: Transaction[]) => Promise<void>;
  addCategory: (name: string, budget: number, color?: string) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'budget' | 'color'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateIncome: (income: number) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FinanceContext = createContext<FinanceState | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [income, setIncome] = useState(0);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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
      const [monthsRes, txRes, catRes, profileRes] = await Promise.all([
        supabase.from('months').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('profiles').select('monthly_income, currency').eq('id', userId).single(),
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
      setMonths(loaded);

      if (txRes.data) {
        setTransactions(txRes.data.map((row) => ({
          id: row.id,
          date: row.date,
          description: row.description,
          amount: Number(row.amount),
          category: row.category,
          type: row.type as 'Income' | 'Expense',
          month: row.month,
          notes: row.notes,
        })));
      }

      setIncome(Number(profileRes.data?.monthly_income) || 0);
      setCurrency(profileRes.data?.currency || DEFAULT_CURRENCY);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) loadData(u.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadData(u.id);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMonth = useCallback(async (month: MonthData) => {
    setMonths((prev) => [...prev, month]);

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

  const importMonth = useCallback(async (label: string, partial: boolean, txs: Transaction[]) => {
    const cats: Record<string, number> = {};
    let incomeTotal = 0;
    txs.forEach((t) => {
      if (t.type === 'Expense') cats[t.category] = (cats[t.category] || 0) + t.amount;
      else incomeTotal += t.amount;
    });
    const expenses = Object.values(cats).reduce((a, b) => a + b, 0);
    const existing = months.find((m) => m.label === label);
    const monthIncome = incomeTotal > 0 ? incomeTotal : (existing?.income ?? income);
    const computed = computeDerived({ label, partial, income: monthIncome, expenses, cats }, catBudgets);

    const taggedTxs = txs.map((t) => ({ ...t, month: label }));

    if (user) {
      await supabase.from('transactions').delete().eq('user_id', user.id).eq('month', label);

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
        })));
      }
      computed.id = monthId;
    }

    setMonths((prev) => {
      const without = prev.filter((m) => m.label !== label);
      return [...without, computed].sort((a, b) => a.label.localeCompare(b.label));
    });
    setTransactions((prev) => [...prev.filter((t) => t.month !== label), ...taggedTxs]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, months, catBudgets, income]);

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
    setUser(null);
    setMonths([]);
    setTransactions([]);
    setCategories([]);
    setIncome(0);
    setCurrency(DEFAULT_CURRENCY);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FinanceContext.Provider value={{
      months, transactions, categories, catBudgets, catColors, monthlyBudget, income, currency, user, loading,
      addMonth, importMonth, addCategory, updateCategory, deleteCategory, updateIncome, updateCurrency, clearAllData, signOut,
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
