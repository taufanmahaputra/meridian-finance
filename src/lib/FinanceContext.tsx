'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { MonthData, Transaction } from '@/types/finance';
import { seedMonths } from '@/data/seed';
import { computeDerived } from '@/lib/calculations';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface FinanceState {
  months: MonthData[];
  transactions: Transaction[];
  user: User | null;
  loading: boolean;
  addMonth: (month: MonthData) => void;
  addTransactions: (txs: Transaction[]) => void;
  signOut: () => Promise<void>;
}

const FinanceContext = createContext<FinanceState | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<MonthData[]>(seedMonths);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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

  async function loadData(userId: string) {
    setLoading(true);
    try {
      const [monthsRes, txRes] = await Promise.all([
        supabase.from('months').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      if (monthsRes.data && monthsRes.data.length > 0) {
        const loaded = monthsRes.data.map((row) =>
          computeDerived({
            label: row.label,
            partial: row.partial,
            income: Number(row.income),
            expenses: Number(row.expenses),
            cats: row.cats as Record<string, number>,
          })
        );
        setMonths(loaded);
      } else {
        await seedUserData(userId);
      }

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
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function seedUserData(userId: string) {
    const rows = seedMonths.map((m) => ({
      user_id: userId,
      label: m.label,
      partial: m.partial,
      income: m.income,
      expenses: m.expenses,
      cats: m.cats,
    }));
    await supabase.from('months').insert(rows);
    setMonths(seedMonths);
  }

  const addMonth = useCallback(async (month: MonthData) => {
    setMonths((prev) => [...prev, month]);

    if (user) {
      await supabase.from('months').insert({
        user_id: user.id,
        label: month.label,
        partial: month.partial,
        income: month.income,
        expenses: month.expenses,
        cats: month.cats,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addTransactions = useCallback(async (txs: Transaction[]) => {
    setTransactions((prev) => [...prev, ...txs]);

    if (user) {
      const rows = txs.map((t) => ({
        user_id: user.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category,
        type: t.type,
        month: t.month || null,
        notes: t.notes || null,
      }));
      await supabase.from('transactions').insert(rows);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMonths(seedMonths);
    setTransactions([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FinanceContext.Provider value={{ months, transactions, user, loading, addMonth, addTransactions, signOut }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
