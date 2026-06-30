'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { computeDerived } from '@/lib/calculations';
import type { MonthData, Category } from '@/types/finance';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (month: MonthData) => void;
  categories: Category[];
  catBudgets: Record<string, number>;
  defaultIncome: number;
  currency: string;
}

export function AddMonthModal({ open, onClose, onAdd, categories, catBudgets, defaultIncome, currency }: Props) {
  const [label, setLabel] = useState('');
  const [income, setIncome] = useState(defaultIncome.toString());
  const [expenses, setExpenses] = useState('');
  const [partial, setPartial] = useState(false);
  const [cats, setCats] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((c) => [c.name, '']))
  );
  const [wasOpen, setWasOpen] = useState(open);

  // Reset the form fields each time the modal transitions from closed to open.
  if (open && !wasOpen) {
    setWasOpen(true);
    setIncome(defaultIncome.toString());
    setCats(Object.fromEntries(categories.map((c) => [c.name, ''])));
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const exp = parseFloat(expenses) || 0;
    if (!label || !exp) return;

    const catNums = Object.fromEntries(
      Object.entries(cats).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    const month = computeDerived({
      label,
      partial,
      income: parseFloat(income) || defaultIncome,
      expenses: exp,
      cats: catNums,
    }, catBudgets);
    onAdd(month);
    setLabel('');
    setExpenses('');
    setCats(Object.fromEntries(categories.map((c) => [c.name, ''])));
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[94%] sm:w-[90%] max-w-[640px] max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h3 className="text-base font-semibold">Add Month Data</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Month Label</label>
              <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Jul 2026" required />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Income ({currency})</label>
              <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Total Expenses</label>
            <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} placeholder="0" required />
          </div>

          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-5">Category Breakdown</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((c) => (
              <div key={c.name}>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{c.name}</label>
                <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" type="number" value={cats[c.name] ?? ''} onChange={(e) => setCats({ ...cats, [c.name]: e.target.value })} placeholder="0" />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} className="rounded border-gray-300" />
              Partial month (incomplete data)
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Add Month</button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
