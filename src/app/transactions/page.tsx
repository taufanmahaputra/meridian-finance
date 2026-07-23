'use client';

import { useState, useMemo } from 'react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { TopCategoriesBar } from '@/components/charts/TopCategoriesBar';
import { CategoryIcon } from '@/components/CategoryIcon';
import { fmt, buildTransactionLedger } from '@/lib/calculations';
import { cn } from '@/lib/utils';

const PER_PAGE = 25;

export default function TransactionsPage() {
  const { months, transactions, catColors, currency, t } = useFinance();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(0);

  const allTx = useMemo(() => buildTransactionLedger(months, transactions), [months, transactions]);

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

  const totalIn = filtered.filter((tx) => tx.type === 'Income').reduce((s, tx) => s + tx.amount, 0);
  const totalOut = filtered.filter((tx) => tx.type === 'Expense').reduce((s, tx) => s + tx.amount, 0);
  const filteredCats = useMemo(() => {
    const cats: Record<string, number> = {};
    filtered.forEach((tx) => {
      if (tx.type === 'Expense') cats[tx.category] = (cats[tx.category] || 0) + tx.amount;
    });
    return cats;
  }, [filtered]);

  const kpis = [
    { icon: <span>📥</span>, iconBg: 'bg-emerald-50', label: t('transactions.kpi.totalIn'), value: fmt(totalIn, currency) },
    { icon: <span>📤</span>, iconBg: 'bg-red-50', label: t('transactions.kpi.totalOut'), value: fmt(totalOut, currency) },
    { icon: <span>⚖️</span>, iconBg: totalIn - totalOut >= 0 ? 'bg-emerald-50' : 'bg-red-50', label: t('transactions.kpi.net'), value: fmt(totalIn - totalOut, currency) },
    { icon: <span>🧾</span>, iconBg: 'bg-indigo-50', label: t('transactions.kpi.count'), value: String(filtered.length) },
  ];

  return (
    <>
      <Topbar title={t('transactions.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((k) => (
            <KpiCard key={k.label} icon={k.icon} iconBg={k.iconBg} label={k.label} value={k.value} />
          ))}
        </div>

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

        {Object.keys(filteredCats).length > 0 && (
          <Card className="mb-4">
            <CardHeader>{t('transactions.breakdown')}</CardHeader>
            <CardBody><TopCategoriesBar cats={filteredCats} catColors={catColors} currency={currency} /></CardBody>
          </Card>
        )}

        <Card>
          <CardBody compact>
            <div className="divide-y divide-gray-100">
              {slice.map((tx, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <CategoryIcon name={tx.category} color={catColors[tx.category] || '#6b7280'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 truncate">{tx.description}</div>
                    <div className="text-[11px] text-gray-400">{tx.date} · {tx.category}</div>
                  </div>
                  <span className={cn('text-[13px] font-semibold font-mono flex-shrink-0', tx.type === 'Income' ? 'text-emerald-600' : 'text-gray-900')}>
                    {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount, currency, 2)}
                  </span>
                </div>
              ))}
              {slice.length === 0 && (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">{t('transactions.noneFound')}</div>
              )}
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
