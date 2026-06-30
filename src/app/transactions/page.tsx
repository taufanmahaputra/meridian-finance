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
  const { months, transactions, currency, t } = useFinance();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(0);

  const allTx = useMemo(() => {
    const monthsWithItemized = new Set(transactions.map((t) => t.month).filter(Boolean));
    const fromMonths: Transaction[] = [];
    months.forEach((m) => {
      if (monthsWithItemized.has(m.label)) return;
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
      <Topbar title={t('transactions.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold">{t('transactions.ledger')}</h3>
            <p className="text-xs text-gray-400">{t('transactions.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 w-full sm:w-56 focus:border-indigo-400 outline-none" placeholder={t('transactions.search')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 flex-1 sm:flex-none" value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(0); }}>
              <option value="">{t('transactions.allCategories')}</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 flex-1 sm:flex-none" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(0); }}>
              <option value="">{t('transactions.allMonths')}</option>
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
                    {[t('transactions.date'), t('transactions.description'), `${t('transactions.amount')} (${currency})`, t('transactions.category'), t('transactions.type')].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slice.map((tx, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500">{tx.date}</td>
                      <td className="px-4 py-2.5">{tx.description}</td>
                      <td className={`px-4 py-2.5 font-semibold ${tx.type === 'Income' ? 'text-emerald-600' : ''}`}>
                        {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount, currency, 2)}
                      </td>
                      <td className="px-4 py-2.5"><Badge variant={tx.type === 'Income' ? 'success' : 'info'}>{tx.category}</Badge></td>
                      <td className="px-4 py-2.5 text-gray-500">{tx.type}</td>
                    </tr>
                  ))}
                  {slice.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">{t('transactions.noneFound')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">{filtered.length} {t('transactions.count')}</span>
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
