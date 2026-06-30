'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { MonthData, Transaction } from '@/types/finance';
import { seedMonths } from '@/data/seed';

interface FinanceState {
  months: MonthData[];
  transactions: Transaction[];
  addMonth: (month: MonthData) => void;
  addTransactions: (txs: Transaction[]) => void;
}

const FinanceContext = createContext<FinanceState | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<MonthData[]>(seedMonths);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addMonth = useCallback((month: MonthData) => {
    setMonths((prev) => [...prev, month]);
  }, []);

  const addTransactions = useCallback((txs: Transaction[]) => {
    setTransactions((prev) => [...prev, ...txs]);
  }, []);

  return (
    <FinanceContext.Provider value={{ months, transactions, addMonth, addTransactions }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
