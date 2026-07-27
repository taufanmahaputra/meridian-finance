'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { CategoryStackChart } from '@/components/charts/CategoryStackChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { TopCategoriesBar } from '@/components/charts/TopCategoriesBar';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import {
  fmt, fmtPct, getTrendData, buildTransactionLedger, isIsoDate, effectiveTxMonth,
} from '@/lib/calculations';

const SPARK_WINDOW = 6;

export default function SpendingPage() {
  const { months, transactions, categories, catBudgets, catColors, currency, t } = useFinance();
  const [pieIdx, setPieIdx] = useState(months.length - 1);
  const [catFilter, setCatFilter] = useState<string | null>(null);

  // ── Filterable summary (moved here from Transactions — this is the
  // analysis page; Transactions is purely the raw ledger). ──────────────
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'Income' | 'Expense'>('');
  const [summaryCatFilter, setSummaryCatFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const allTx = useMemo(() => buildTransactionLedger(months, transactions), [months, transactions]);
  const categoryNames = useMemo(() => [...new Set(allTx.map((tx) => tx.category))].sort(), [allTx]);
  const monthLabels = useMemo(() => {
    const order = months.map((mo) => mo.label);
    return [...new Set(allTx.map(effectiveTxMonth))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [allTx, months]);

  const summaryFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTx.filter((tx) => {
      if (q && !tx.description.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) return false;
      if (typeFilter && tx.type !== typeFilter) return false;
      if (summaryCatFilter && tx.category !== summaryCatFilter) return false;
      if (monthFilter && effectiveTxMonth(tx) !== monthFilter) return false;
      if (dateFrom || dateTo) {
        if (!isIsoDate(tx.date)) return false;
        if (dateFrom && tx.date < dateFrom) return false;
        if (dateTo && tx.date > dateTo) return false;
      }
      return true;
    });
  }, [allTx, search, typeFilter, summaryCatFilter, monthFilter, dateFrom, dateTo]);

  const totalIn = useMemo(() => summaryFiltered.filter((tx) => tx.type === 'Income').reduce((s, tx) => s + tx.amount, 0), [summaryFiltered]);
  const totalOut = useMemo(() => summaryFiltered.filter((tx) => tx.type === 'Expense').reduce((s, tx) => s + tx.amount, 0), [summaryFiltered]);
  const net = totalIn - totalOut;

  const summaryCats = useMemo(() => {
    const cats: Record<string, number> = {};
    summaryFiltered.forEach((tx) => { if (tx.type === 'Expense') cats[tx.category] = (cats[tx.category] || 0) + tx.amount; });
    return cats;
  }, [summaryFiltered]);
  const summaryCatTotal = Object.values(summaryCats).reduce((a, b) => a + b, 0);
  const rankedCats = useMemo(() => Object.entries(summaryCats).sort((a, b) => b[1] - a[1]), [summaryCats]);

  const cashFlowData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    summaryFiltered.forEach((tx) => {
      const key = effectiveTxMonth(tx);
      const entry = map.get(key) ?? { income: 0, expense: 0 };
      if (tx.type === 'Income') entry.income += tx.amount; else entry.expense += tx.amount;
      map.set(key, entry);
    });
    const order = months.map((mo) => mo.label);
    return [...map.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([name, v]) => ({ name, ...v }));
  }, [summaryFiltered, months]);

  const summarySparkWindow = months.slice(-SPARK_WINDOW);
  const inSpark = summarySparkWindow.map((mo) => mo.income);
  const outSpark = summarySparkWindow.map((mo) => mo.expenses);
  const netSpark = summarySparkWindow.map((mo) => mo.income - mo.expenses);

  const hasActiveFilters = !!(search || typeFilter || summaryCatFilter || monthFilter || dateFrom || dateTo);
  function resetFilters() {
    setSearch(''); setTypeFilter(''); setSummaryCatFilter(''); setMonthFilter(''); setDateFrom(''); setDateTo('');
  }

  if (months.length === 0) {
    return (
      <>
        <Topbar title={t('spending.title')} />
        <div className="p-4 sm:p-7 max-w-[1440px]">
          <EmptyState title={t('spending.empty.title')} description={t('spending.empty.desc')} showUpload />
        </div>
      </>
    );
  }

  const m = months[months.length - 1];
  const p = months.length >= 2 ? months[months.length - 2] : null;
  const sparkWindow = months.slice(-SPARK_WINDOW);
  const pieMonth = months[pieIdx] || m;

  const topCatEntry = Object.entries(m.cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];

  const kpis: { icon: React.ReactNode; iconBg: string; label: string; value: string; text?: string; className?: string; trendSuffix?: string; spark?: number[] }[] = [
    { icon: <span>🧾</span>, iconBg: 'bg-red-50', label: t('spending.kpi.totalSpend'), value: fmt(m.expenses, currency), spark: sparkWindow.map((x) => x.expenses), ...getTrendData(m.expenses, p?.expenses ?? null, true) },
    { icon: <span>📅</span>, iconBg: 'bg-indigo-50', label: t('spending.kpi.avgDaily'), value: fmt(m.avgDaily, currency), spark: sparkWindow.map((x) => x.avgDaily), ...getTrendData(m.avgDaily, p?.avgDaily ?? null, true) },
    { icon: <span>🏷️</span>, iconBg: 'bg-amber-50', label: t('spending.kpi.topCategory'), value: topCatEntry ? topCatEntry[0] : '—', text: topCatEntry ? fmt(topCatEntry[1], currency) : undefined, className: 'text-gray-500 bg-gray-100', trendSuffix: '' },
    { icon: <span>⚠️</span>, iconBg: 'bg-emerald-50', label: t('spending.kpi.overBudgetCats'), value: String(m.overBudgetCats) },
  ];

  const filteredTx = catFilter
    ? allTx.filter((tx) => tx.category === catFilter).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 50)
    : [];

  return (
    <>
      <Topbar title={t('spending.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        {/* ── Filterable summary ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold">{t('transactions.summary')}</h3>
            <p className="text-xs text-gray-400">{t('transactions.summarySubtitle')}</p>
          </div>
          <Link href="/transactions"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors flex-shrink-0">
            {t('spending.viewRawTransactions')}
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl p-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:border-indigo-400 outline-none"
              placeholder={t('transactions.search')} value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
            value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as '' | 'Income' | 'Expense')}>
            <option value="">{t('transactions.allTypes')}</option>
            <option value="Income">{t('upload.typeIncome')}</option>
            <option value="Expense">{t('upload.typeExpense')}</option>
          </select>
          <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
            value={summaryCatFilter} onChange={(e) => setSummaryCatFilter(e.target.value)}>
            <option value="">{t('transactions.allCategories')}</option>
            {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
            value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="">{t('transactions.allMonths')}</option>
            {monthLabels.map((mo) => <option key={mo} value={mo}>{mo}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <input type="date" className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
              value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title={t('transactions.dateFrom')} />
            <span className="text-xs text-gray-400">{t('transactions.dateRangeTo')}</span>
            <input type="date" className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
              value={dateTo} onChange={(e) => setDateTo(e.target.value)} title={t('transactions.dateTo')} />
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              <X className="w-3.5 h-3.5" /> {t('transactions.resetFilters')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard icon={<span>📥</span>} iconBg="bg-emerald-100" tone="emerald"
            label={t('transactions.kpi.totalIn')} value={fmt(totalIn, currency)}
            sparkline={inSpark} sparklineGood />
          <KpiCard icon={<span>📤</span>} iconBg="bg-red-100" tone="red"
            label={t('transactions.kpi.totalOut')} value={fmt(totalOut, currency)}
            sparkline={outSpark} sparklineGood={false} />
          <KpiCard icon={<span>⚖️</span>} iconBg={net >= 0 ? 'bg-emerald-100' : 'bg-red-100'} tone={net >= 0 ? 'emerald' : 'red'}
            label={t('transactions.kpi.net')} value={fmt(net, currency)}
            sparkline={netSpark} sparklineGood={net >= 0} />
          <KpiCard icon={<span>🧾</span>} iconBg="bg-indigo-100" tone="indigo"
            label={t('transactions.kpi.count')} value={String(summaryFiltered.length)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-4 mb-4">
          <Card>
            <CardHeader>{t('transactions.categoryBreakdown')}</CardHeader>
            <CardBody>
              {rankedCats.length === 0 ? (
                <div className="py-14 text-center text-gray-400 text-sm">{t('transactions.noSpending')}</div>
              ) : (
                <CategoryPieChart cats={summaryCats} catColors={catColors} currency={currency} />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>{t('transactions.topCategories')}</CardHeader>
            <CardBody compact>
              {rankedCats.length === 0 ? (
                <div className="py-14 text-center text-gray-400 text-sm">{t('transactions.noSpending')}</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
                  {rankedCats.map(([name, amount]) => {
                    const pct = summaryCatTotal > 0 ? (amount / summaryCatTotal) * 100 : 0;
                    const color = catColors[name] || '#6b7280';
                    return (
                      <div key={name} className="flex items-center gap-3 pl-3 pr-4 py-3" style={{ borderLeft: `3px solid ${color}` }}>
                        <CategoryIcon name={name} color={color} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-gray-900 truncate">{name}</div>
                          <div className="text-[11px] text-gray-400">{t('transactions.ofSpend')}</div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${color}1f`, color }}>
                          {fmtPct(pct)}
                        </span>
                        <span className="text-[14px] font-bold font-mono text-gray-900 flex-shrink-0 w-[92px] text-right">{fmt(amount, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>{t('transactions.cashFlowTrend')}</CardHeader>
          <CardBody><CashFlowChart data={cashFlowData} currency={currency} /></CardBody>
        </Card>

        {/* ── Existing month-scoped analysis ─────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((k) => (
            <KpiCard key={k.label} icon={k.icon} iconBg={k.iconBg} label={k.label} value={k.value} trendText={k.text} trendClassName={k.className} trendSuffix={k.trendSuffix} sparkline={k.spark} sparklineGood={(k.className ?? '').includes('emerald')} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mb-6">
          <Card>
            <CardHeader>{t('spending.categoryTrend')}</CardHeader>
            <CardBody><CategoryStackChart months={months} categories={categories} currency={currency} /></CardBody>
          </Card>
          <Card>
            <CardHeader>{t('spending.topCategories')}</CardHeader>
            <CardBody>
              <TopCategoriesBar cats={m.cats} catColors={catColors} catBudgets={catBudgets} currency={currency} />
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4 mb-6">
          <Card>
            <CardHeader action={
              <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50" value={pieIdx} onChange={(e) => setPieIdx(Number(e.target.value))}>
                {months.map((mo, i) => <option key={i} value={i}>{mo.label}</option>)}
              </select>
            }>{t('spending.categorySplit')}</CardHeader>
            <CardBody><CategoryPieChart cats={pieMonth.cats} catColors={catColors} currency={currency} /></CardBody>
          </Card>

          <Card>
            <CardHeader action={
              <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50" value={catFilter ?? ''} onChange={(e) => setCatFilter(e.target.value || null)}>
                <option value="">{t('spending.drilldown.selectCategory')}</option>
                {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            }>{t('spending.drilldown.title')}</CardHeader>
            <CardBody compact>
              {!catFilter ? (
                <div className="py-10 text-center text-gray-400 text-sm">{t('spending.drilldown.prompt')}</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredTx.map((tx, i) => (
                    <div key={tx.id ?? i} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-gray-900 truncate">{tx.description}</div>
                        <div className="text-[11px] text-gray-400">{tx.date}</div>
                      </div>
                      <span className="text-[13px] font-semibold font-mono flex-shrink-0">{fmt(tx.amount, currency, 2)}</span>
                    </div>
                  ))}
                  {filteredTx.length === 0 && (
                    <div className="py-10 text-center text-gray-400 text-sm">{t('spending.drilldown.noTransactions')}</div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {m.overBudgetCats > 0 && (
          <Card>
            <CardHeader action={<Badge variant="danger">{m.overBudgetCats}</Badge>}>{t('spending.overBudgetTitle')}</CardHeader>
            <CardBody compact>
              {Object.entries(m.cats)
                .filter(([cat, spent]) => (catBudgets[cat] || 0) > 0 && spent > (catBudgets[cat] || 0))
                .sort((a, b) => (b[1] - (catBudgets[b[0]] || 0)) - (a[1] - (catBudgets[a[0]] || 0)))
                .map(([cat, spent]) => (
                  <div key={cat} className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 last:border-0">
                    <span className="flex items-center gap-2.5 text-[13px] font-medium min-w-0">
                      <CategoryIcon name={cat} color={catColors[cat] || '#6b7280'} size="sm" />
                      <span className="truncate">{cat}</span>
                    </span>
                    <span className="text-[13px] flex-shrink-0">
                      <span className="font-semibold text-red-500">{fmt(spent, currency)}</span>
                      <span className="text-gray-400"> / {fmt(catBudgets[cat] || 0, currency)}</span>
                    </span>
                  </div>
                ))}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
