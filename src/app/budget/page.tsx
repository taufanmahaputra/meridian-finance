'use client';

import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { BudgetUtilChart } from '@/components/charts/BudgetUtilChart';
import { CategoryStackChart } from '@/components/charts/CategoryStackChart';
import { EmptyState } from '@/components/EmptyState';
import { fmt, fmtPct, getTrendData } from '@/lib/calculations';

export default function BudgetPage() {
  const { months, categories, catBudgets, catColors, monthlyBudget, currency, t } = useFinance();

  if (months.length === 0) {
    return (
      <>
        <Topbar title={t('budget.title')} />
        <div className="p-4 sm:p-7 max-w-[1440px]">
          <EmptyState
            title={t('budget.empty.title')}
            description={t('budget.empty.desc')}
            showUpload
          />
        </div>
      </>
    );
  }

  const m = months[months.length - 1];
  const p = months.length >= 2 ? months[months.length - 2] : null;
  const remaining = monthlyBudget - m.expenses;
  const prevRemaining = p ? monthlyBudget - p.expenses : null;

  const kpis: { icon: React.ReactNode; iconBg: string; label: string; value: string; text?: string; className?: string }[] = [
    { icon: <span>🎯</span>, iconBg: 'bg-indigo-50', label: t('budget.kpi.totalBudget'), value: fmt(monthlyBudget, currency) },
    { icon: <span>💸</span>, iconBg: 'bg-red-50', label: t('budget.kpi.totalSpent'), value: fmt(m.expenses, currency), ...getTrendData(m.expenses, p?.expenses ?? null, true) },
    { icon: <span>🧮</span>, iconBg: remaining >= 0 ? 'bg-emerald-50' : 'bg-red-50', label: t('budget.kpi.remaining'), value: fmt(remaining, currency), ...getTrendData(remaining, prevRemaining) },
    { icon: <span>🚨</span>, iconBg: 'bg-amber-50', label: t('budget.kpi.overBudgetCats'), value: String(m.overBudgetCats) },
  ];

  const anomalies: { msg: string; severity: 'danger' | 'warning' }[] = [];
  Object.entries(m.cats).forEach(([cat, spent]) => {
    const prev = p?.cats?.[cat] || 0;
    if (prev > 0 && spent > prev * 2) anomalies.push({ msg: `${cat} spiked ${((spent / prev - 1) * 100).toFixed(0)}% (${fmt(prev, currency)} → ${fmt(spent, currency)})`, severity: 'danger' });
    const budget = catBudgets[cat] || 0;
    if (budget > 0 && spent > budget * 1.5) anomalies.push({ msg: `${cat} is ${fmtPct((spent / budget) * 100)} of budget (${fmt(spent, currency)} vs ${fmt(budget, currency)})`, severity: 'warning' });
  });

  return (
    <>
      <Topbar title={t('budget.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((k) => (
            <KpiCard key={k.label} icon={k.icon} iconBg={k.iconBg} label={k.label} value={k.value} trendText={k.text} trendClassName={k.className} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>{t('budget.utilization')}</CardHeader>
            <CardBody><BudgetUtilChart months={months} /></CardBody>
          </Card>
          <Card>
            <CardHeader>{t('budget.categoryStackedTrend')}</CardHeader>
            <CardBody><CategoryStackChart months={months} categories={categories} currency={currency} /></CardBody>
          </Card>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">{t('budget.auditTitle')}</h3>
          <Card>
            <CardBody compact>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50">
                      {[
                        t('budget.table.category'), t('budget.table.budget'), t('budget.table.actual'),
                        t('budget.table.variance'), t('budget.table.pctUsed'), t('budget.table.mom'),
                        t('budget.table.status'), t('budget.table.usage'),
                      ].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(m.cats).sort((a, b) => b[1] - a[1]).map(([cat, spent]) => {
                      const budget = catBudgets[cat] || 0;
                      const variance = budget - spent;
                      const pctUsed = budget > 0 ? (spent / budget) * 100 : null;
                      const prevSpent = p?.cats?.[cat] || 0;
                      const mom = prevSpent ? ((spent - prevSpent) / prevSpent) * 100 : null;
                      const status = !budget ? 'neutral' : (pctUsed ?? 0) > 100 ? 'danger' : (pctUsed ?? 0) > 85 ? 'warning' : 'success';
                      const statusLabel = !budget ? t('budget.status.noBudget') : (pctUsed ?? 0) > 100 ? t('budget.status.over') : (pctUsed ?? 0) > 85 ? t('budget.status.nearLimit') : t('budget.status.onTrack');
                      const fillColor = !budget ? '#e2e8f0' : (pctUsed ?? 0) > 100 ? '#ef4444' : (pctUsed ?? 0) > 85 ? '#f59e0b' : '#10b981';

                      return (
                        <tr key={cat} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="px-4 py-2.5">
                            <span className="inline-block w-2 h-2 rounded-sm mr-2" style={{ backgroundColor: catColors[cat] || '#6b7280' }}></span>
                            <strong>{cat}</strong>
                          </td>
                          <td className="px-4 py-2.5">{budget ? fmt(budget, currency) : '—'}</td>
                          <td className="px-4 py-2.5 font-semibold">{fmt(spent, currency, 2)}</td>
                          <td className={`px-4 py-2.5 font-medium ${variance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{budget ? fmt(variance, currency) : '—'}</td>
                          <td className="px-4 py-2.5">{pctUsed != null ? fmtPct(pctUsed) : '—'}</td>
                          <td className={`px-4 py-2.5 text-xs ${mom == null ? 'text-gray-400' : mom > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{mom != null ? `${mom > 0 ? '+' : ''}${mom.toFixed(0)}%` : '—'}</td>
                          <td className="px-4 py-2.5"><Badge variant={status as 'success' | 'warning' | 'danger' | 'neutral'}>{statusLabel}</Badge></td>
                          <td className="px-4 py-2.5 w-20">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pctUsed || 0)}%`, backgroundColor: fillColor }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader action={<Badge variant="info">{t('budget.autoScanned')}</Badge>}>{t('budget.anomalyDetection')}</CardHeader>
          <CardBody compact>
            {anomalies.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">{t('budget.noAnomalies')}</div>
            ) : (
              anomalies.map((a, i) => (
                <div key={i} className="flex gap-3.5 px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${a.severity === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>!</div>
                  <div className="text-[13px]">
                    <strong className="block mb-0.5">{a.severity === 'danger' ? t('budget.spendingSpike') : t('budget.budgetBreach')}</strong>
                    <span className="text-gray-500">{a.msg}</span>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
