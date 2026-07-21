'use client';

import { useMemo, useState } from 'react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { CategoryStackChart } from '@/components/charts/CategoryStackChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { TopCategoriesBar } from '@/components/charts/TopCategoriesBar';
import { EmptyState } from '@/components/EmptyState';
import { fmt, getTrendData, buildTransactionLedger } from '@/lib/calculations';

const SPARK_WINDOW = 6;

export default function SpendingPage() {
  const { months, transactions, categories, catBudgets, catColors, currency, t } = useFinance();
  const [pieIdx, setPieIdx] = useState(months.length - 1);
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const allTx = useMemo(() => buildTransactionLedger(months, transactions), [months, transactions]);

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
            <CardBody><CategoryPieChart month={pieMonth} catColors={catColors} currency={currency} /></CardBody>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-gray-50">
                        {[t('transactions.date'), t('transactions.description'), t('transactions.amount')].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map((tx, i) => (
                        <tr key={tx.id ?? i} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-gray-500">{tx.date}</td>
                          <td className="px-4 py-2.5">{tx.description}</td>
                          <td className="px-4 py-2.5 font-semibold">{fmt(tx.amount, currency, 2)}</td>
                        </tr>
                      ))}
                      {filteredTx.length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">{t('spending.drilldown.noTransactions')}</td></tr>
                      )}
                    </tbody>
                  </table>
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
                  <div key={cat} className="flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-0">
                    <span className="flex items-center gap-2 text-[13px] font-medium">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColors[cat] || '#6b7280' }} />
                      {cat}
                    </span>
                    <span className="text-[13px]">
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
