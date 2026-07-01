'use client';

import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { EmptyState } from '@/components/EmptyState';
import { fmt, fmtPct, generateForecast } from '@/lib/calculations';

export default function ForecastPage() {
  const { months, income, monthlyBudget, currency, t } = useFinance();

  if (months.length === 0) {
    return (
      <>
        <Topbar title={t('forecast.title')} />
        <div className="p-4 sm:p-7 max-w-[1440px]">
          <EmptyState
            title={t('forecast.empty.title')}
            description={t('forecast.empty.desc')}
            showUpload
          />
        </div>
      </>
    );
  }

  const effectiveIncome = income || months[months.length - 1].income;
  const { projected, avgGrowth = 0, avgExpense = 0 } = generateForecast(months);
  const projSavings = projected.map((e) => effectiveIncome - e);
  const avgSavingsRate = months.reduce((s, m) => s + m.savingsRate, 0) / months.length;

  const metrics = [
    { label: t('forecast.avgMonthlyExpense'), value: fmt(projected.reduce((a, b) => a + b, 0) / 6, currency), color: '' },
    { label: t('forecast.projectedFinalMonth'), value: fmt(projected[5] || 0, currency), color: (projected[5] || 0) > monthlyBudget ? 'text-red-500' : 'text-emerald-600' },
    { label: t('forecast.projected6moSavings'), value: fmt(projSavings.reduce((a, b) => a + b, 0), currency), color: 'text-emerald-600' },
    { label: t('forecast.currentSavingsTrend'), value: fmtPct(avgSavingsRate), color: avgSavingsRate >= 40 ? 'text-emerald-600' : 'text-amber-600' },
    { label: t('forecast.monthlyGrowthRate'), value: `${avgGrowth >= 0 ? '+' : ''}${fmt(avgGrowth, currency)}/mo`, color: avgGrowth > 0 ? 'text-red-500' : 'text-emerald-600' },
  ];

  const scenarios = [
    { title: t('forecast.scenario.conservative'), desc: t('forecast.scenario.conservativeDesc'), savings: fmt((effectiveIncome - avgExpense * 0.8) * 6, currency), color: 'text-emerald-600', border: 'border-emerald-200' },
    { title: t('forecast.scenario.statusQuo'), desc: t('forecast.scenario.statusQuoDesc'), savings: fmt(projSavings.reduce((a, b) => a + b, 0), currency), color: 'text-amber-600', border: 'border-amber-200' },
    { title: t('forecast.scenario.aggressive'), desc: t('forecast.scenario.aggressiveDesc'), savings: fmt((effectiveIncome - avgExpense * 1.1) * 6, currency), color: 'text-red-500', border: 'border-red-200' },
  ];

  return (
    <>
      <Topbar title={t('forecast.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-6">
          <Card>
            <CardHeader action={<Badge variant="info">{t('forecast.linearProjection')}</Badge>}>{t('forecast.expenseForecast')}</CardHeader>
            <CardBody><ForecastChart months={months} monthlyBudget={monthlyBudget} /></CardBody>
          </Card>
          <Card>
            <CardHeader>{t('forecast.projectedMetrics')}</CardHeader>
            <CardBody>
              {metrics.map((f) => (
                <div key={f.label} className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-500">{f.label}</span>
                  <span className={`text-sm font-semibold ${f.color}`}>{f.value}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>{t('forecast.scenarioAnalysis')}</CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {scenarios.map((s) => (
                <div key={s.title} className={`bg-gray-50 rounded-xl p-5 text-center border ${s.border}`}>
                  <div className="text-sm font-semibold mb-1">{s.title}</div>
                  <div className="text-xs text-gray-400 mb-3">{s.desc}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.savings}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{t('forecast.sixMonthTotal')}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
