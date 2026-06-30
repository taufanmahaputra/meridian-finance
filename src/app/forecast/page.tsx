'use client';

import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { fmt, fmtPct, generateForecast } from '@/lib/calculations';
import { INCOME, MONTHLY_BUDGET } from '@/lib/constants';

export default function ForecastPage() {
  const { months } = useFinance();
  const { projected, avgGrowth = 0, avgExpense = 0 } = generateForecast(months);
  const projSavings = projected.map((e) => INCOME - e);
  const avgSavingsRate = months.reduce((s, m) => s + m.savingsRate, 0) / months.length;

  const metrics = [
    { label: 'Avg Monthly Expense (Projected)', value: fmt(projected.reduce((a, b) => a + b, 0) / 6), color: '' },
    { label: 'Projected Dec 2026 Expense', value: fmt(projected[5] || 0), color: (projected[5] || 0) > MONTHLY_BUDGET ? 'text-red-500' : 'text-emerald-600' },
    { label: 'Projected 6-Month Savings', value: fmt(projSavings.reduce((a, b) => a + b, 0)), color: 'text-emerald-600' },
    { label: 'Current Savings Trend', value: fmtPct(avgSavingsRate), color: avgSavingsRate >= 40 ? 'text-emerald-600' : 'text-amber-600' },
    { label: 'Monthly Growth Rate', value: `${avgGrowth >= 0 ? '+' : ''}${fmt(avgGrowth)}/mo`, color: avgGrowth > 0 ? 'text-red-500' : 'text-emerald-600' },
  ];

  const scenarios = [
    { title: 'Conservative', desc: 'Reduce discretionary by 20%', savings: fmt((INCOME - avgExpense * 0.8) * 6), color: 'text-emerald-600', border: 'border-emerald-200' },
    { title: 'Status Quo', desc: 'Continue current trend', savings: fmt(projSavings.reduce((a, b) => a + b, 0)), color: 'text-amber-600', border: 'border-amber-200' },
    { title: 'Aggressive Growth', desc: 'Expenses grow 10% more', savings: fmt((INCOME - avgExpense * 1.1) * 6), color: 'text-red-500', border: 'border-red-200' },
  ];

  return (
    <>
      <Topbar title="Forecast" />
      <div className="p-7 max-w-[1440px]">
        <div className="grid grid-cols-[2fr_1fr] gap-4 mb-6">
          <Card>
            <CardHeader action={<Badge variant="info">Linear Projection</Badge>}>6-Month Expense Forecast</CardHeader>
            <CardBody><ForecastChart months={months} /></CardBody>
          </Card>
          <Card>
            <CardHeader>Projected Metrics</CardHeader>
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
          <CardHeader>Scenario Analysis</CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4">
              {scenarios.map((s) => (
                <div key={s.title} className={`bg-gray-50 rounded-xl p-5 text-center border ${s.border}`}>
                  <div className="text-sm font-semibold mb-1">{s.title}</div>
                  <div className="text-xs text-gray-400 mb-3">{s.desc}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.savings}</div>
                  <div className="text-[10px] text-gray-400 mt-1">6-month total savings</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
