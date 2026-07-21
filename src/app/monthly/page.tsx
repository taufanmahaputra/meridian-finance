'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { EmptyState } from '@/components/EmptyState';
import { fmt, fmtPct, getTrendData } from '@/lib/calculations';

function MonthlyDetailContent() {
  const { months, transactions, catBudgets, catColors, currency, t } = useFinance();
  const searchParams = useSearchParams();
  const requested = searchParams.get('m');
  const [selected, setSelected] = useState<string | null>(null);

  const label = selected ?? requested ?? (months.length > 0 ? months[months.length - 1].label : null);
  const idx = months.findIndex((m) => m.label === label);
  const m = idx >= 0 ? months[idx] : null;
  const p = idx > 0 ? months[idx - 1] : null;

  const monthTx = useMemo(
    () => transactions.filter((t) => t.month === label).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions, label]
  );

  if (months.length === 0 || !m) {
    return (
      <>
        <Topbar title={t('monthly.title')} />
        <div className="p-4 sm:p-7 max-w-[1440px]">
          <EmptyState
            title={t('monthly.empty.title')}
            description={t('monthly.empty.desc')}
            showUpload
          />
        </div>
      </>
    );
  }

  const kpis = [
    { icon: <span>💰</span>, iconBg: 'bg-indigo-50', label: t('dashboard.kpi.netSavings'), value: fmt(m.savings, currency), ...getTrendData(m.savings, p?.savings ?? null) },
    { icon: <span>📊</span>, iconBg: 'bg-emerald-50', label: t('dashboard.kpi.savingsRate'), value: fmtPct(m.savingsRate), ...getTrendData(m.savingsRate, p?.savingsRate ?? null) },
    { icon: <span>💳</span>, iconBg: 'bg-red-50', label: t('dashboard.kpi.totalExpenses'), value: fmt(m.expenses, currency), ...getTrendData(m.expenses, p?.expenses ?? null, true) },
    { icon: <span>📈</span>, iconBg: 'bg-amber-50', label: t('dashboard.kpi.budgetUtil'), value: fmtPct(m.budgetUtil), ...getTrendData(m.budgetUtil, p?.budgetUtil ?? null, true) },
  ];

  const catRows = Object.entries(m.cats)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, spent]) => {
      const budget = catBudgets[cat] || 0;
      const pctUsed = budget > 0 ? (spent / budget) * 100 : null;
      const prevSpent = p?.cats?.[cat] || 0;
      const mom = prevSpent ? ((spent - prevSpent) / prevSpent) * 100 : null;
      return { cat, spent, budget, pctUsed, mom };
    });

  return (
    <>
      <Topbar title={t('monthly.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {m.label} {m.partial && <Badge variant="warning" className="text-[9px]">{t('dashboard.partial')}</Badge>}
            </h3>
            <p className="text-xs text-gray-400">{t('monthly.subtitle')}</p>
          </div>
          <select
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50"
            value={m.label}
            onChange={(e) => setSelected(e.target.value)}
          >
            {months.map((mo) => <option key={mo.label} value={mo.label}>{mo.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((k) => (
            <KpiCard key={k.label} icon={k.icon} iconBg={k.iconBg} label={k.label} value={k.value} trendText={k.text} trendClassName={k.className} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4 mb-6">
          <Card>
            <CardHeader>{t('monthly.categorySplit')}</CardHeader>
            <CardBody><CategoryPieChart month={m} catColors={catColors} currency={currency} /></CardBody>
          </Card>
          <Card>
            <CardHeader>{t('monthly.categoryDetail')}</CardHeader>
            <CardBody compact>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50">
                      {[
                        t('monthly.table.category'), t('monthly.table.spent'), t('monthly.table.budget'),
                        t('monthly.table.pctUsed'), t('monthly.table.mom'),
                      ].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catRows.map((r) => (
                      <tr key={r.cat} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <span className="inline-block w-2 h-2 rounded-sm mr-2" style={{ backgroundColor: catColors[r.cat] || '#6b7280' }}></span>
                          {r.cat}
                        </td>
                        <td className="px-4 py-2.5 font-semibold">{fmt(r.spent, currency, 2)}</td>
                        <td className="px-4 py-2.5 text-gray-500">{r.budget ? fmt(r.budget, currency) : '—'}</td>
                        <td className="px-4 py-2.5">{r.pctUsed != null ? fmtPct(r.pctUsed) : '—'}</td>
                        <td className={`px-4 py-2.5 text-xs ${r.mom == null ? 'text-gray-400' : r.mom > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{r.mom != null ? `${r.mom > 0 ? '+' : ''}${r.mom.toFixed(0)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader action={<Badge variant="neutral">{monthTx.length} {t('monthly.transactionsCount')}</Badge>}>{t('monthly.transactionsThisMonth')}</CardHeader>
          <CardBody compact>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    {[
                      t('transactions.date'), t('transactions.description'), t('transactions.amount'),
                      t('transactions.category'), t('transactions.type'),
                    ].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthTx.map((t, i) => (
                    <tr key={t.id ?? i} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-500">{t.date}</td>
                      <td className="px-4 py-2.5">{t.description}</td>
                      <td className={`px-4 py-2.5 font-semibold ${t.type === 'Income' ? 'text-emerald-600' : ''}`}>{t.type === 'Income' ? '+' : '-'}{fmt(t.amount, currency, 2)}</td>
                      <td className="px-4 py-2.5"><Badge variant={t.type === 'Income' ? 'success' : 'info'}>{t.category}</Badge></td>
                      <td className="px-4 py-2.5 text-gray-500">{t.type}</td>
                    </tr>
                  ))}
                  {monthTx.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">{t('monthly.noTransactions')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

export default function MonthlyDetailPage() {
  return (
    <Suspense fallback={null}>
      <MonthlyDetailContent />
    </Suspense>
  );
}
