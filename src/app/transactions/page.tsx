'use client';

import { useState, useMemo } from 'react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { fmt } from '@/lib/calculations';
import type { Transaction } from '@/types/finance';

const PER_PAGE = 25;

export default function TransactionsPage() {
  const { months, transactions } = useFinance();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(0);

  const allTx = useMemo(() => {
    const fromMonths: Transaction[] = [];
    months.forEach((m) => {
      Object.entries(m.cats).forEach(([cat, total]) => {
        if (total > 0) fromMonths.push({ date: m.label, description: `${cat} — ${m.label} total`, amount: total, category: cat, type: 'Expense' });
      });
      fromMonths.push({ date: m.label, description: `Salary — ${m.label}`, amount: m.income, category: 'Income', type: 'Income' });
    });
    return [...fromMonths, ...transactions];
  }, [months, transactions]);

  const categories = useMemo(() => [...new Set(allTx.map((t) => t.category))].sort(), [allTx]);
  const monthLabels = useMemo(() => [...new Set(allTx.map((t) => t.date))], [allTx]);

  const filtered = useMemo(() => {
    return allTx.filter((t) => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter && t.category !== catFilter) return false;
      if (monthFilter && t.date !== monthFilter) return false;
      return true;
    });
  }, [allTx, search, catFilter, monthFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const slice = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <>
      <Topbar title="Transactions" />
      <div className="p-7 max-w-[1440px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">Transaction Ledger</h3>
            <p className="text-xs text-gray-400">All parsed transactions from uploaded statements</p>
          </div>
          <div className="flex gap-2">
            <input className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 w-56 focus:border-indigo-400 outline-none" placeholder="Search transactions..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(0); }}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(0); }}>
              <option value="">All Months</option>
              {monthLabels.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <Card>
          <CardBody compact>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    {['Date', 'Description', 'Amount (SGD)', 'Category', 'Type'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slice.map((t, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500">{t.date}</td>
                      <td className="px-4 py-2.5">{t.description}</td>
                      <td className={`px-4 py-2.5 font-semibold ${t.type === 'Income' ? 'text-emerald-600' : ''}`}>
                        {t.type === 'Income' ? '+' : '-'}{fmt(t.amount, 2)}
                      </td>
                      <td className="px-4 py-2.5"><Badge variant={t.type === 'Income' ? 'success' : 'info'}>{t.category}</Badge></td>
                      <td className="px-4 py-2.5 text-gray-500">{t.type}</td>
                    </tr>
                  ))}
                  {slice.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No transactions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">{filtered.length} transactions</span>
              <div className="flex gap-1.5">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                  <button key={i} onClick={() => setPage(i)} className={`px-2.5 py-1 text-xs rounded-md font-medium ${i === page ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{i + 1}</button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
