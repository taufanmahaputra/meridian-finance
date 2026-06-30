'use client';

import { useState } from 'react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { AddMonthModal } from '@/components/AddMonthModal';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ExpenseTrendChart } from '@/components/charts/ExpenseTrendChart';
import { SavingsRateChart } from '@/components/charts/SavingsRateChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { HealthRing } from '@/components/charts/HealthRing';
import { fmt, fmtPct, getTrendData, getHealthScore } from '@/lib/calculations';

export default function DashboardPage() {
  const { months, addMonth } = useFinance();
  const [modalOpen, setModalOpen] = useState(false);
  const [pieIdx, setPieIdx] = useState(months.length - 1);

  const m = months[months.length - 1];
  const p = months.length >= 2 ? months[months.length - 2] : null;
  const healthScore = getHealthScore(months);

  const kpis = [
    { icon: <span>💰</span>, iconBg: 'bg-indigo-50', label: 'Net Savings', value: fmt(m.savings), ...getTrendData(m.savings, p?.savings ?? null) },
    { icon: <span>📊</span>, iconBg: 'bg-emerald-50', label: 'Savings Rate', value: fmtPct(m.savingsRate), ...getTrendData(m.savingsRate, p?.savingsRate ?? null) },
    { icon: <span>💳</span>, iconBg: 'bg-red-50', label: 'Total Expenses', value: fmt(m.expenses), ...getTrendData(m.expenses, p?.expenses ?? null, true) },
    { icon: <span>📈</span>, iconBg: 'bg-amber-50', label: 'Budget Util.', value: fmtPct(m.budgetUtil), ...getTrendData(m.budgetUtil, p?.budgetUtil ?? null, true) },
  ];

  const healthItems = [
    { label: 'Savings Rate', val: fmtPct(m.savingsRate), variant: (m.savingsRate >= 40 ? 'success' : m.savingsRate >= 20 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger' },
    { label: 'Budget Adherence', val: fmtPct(m.budgetUtil), variant: (m.budgetUtil <= 100 ? 'success' : m.budgetUtil <= 120 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger' },
    { label: 'Over-Budget Cats', val: String(m.overBudgetCats), variant: (m.overBudgetCats <= 1 ? 'success' : m.overBudgetCats <= 3 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger' },
    { label: 'Monthly Income', val: fmt(m.income), variant: 'success' as const },
  ];

  return (
    <>
      <Topbar title="Dashboard" onAddMonth={() => setModalOpen(true)} />
      <div className="p-7 max-w-[1440px]">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {kpis.map((k) => (
            <KpiCard key={k.label} icon={k.icon} iconBg={k.iconBg} label={k.label} value={k.value} trendText={k.text} trendClassName={k.className} />
          ))}
        </div>

        <div className="grid grid-cols-[2fr_1fr] gap-4 mb-6">
          <Card>
            <CardHeader>Expense Trend vs Budget</CardHeader>
            <CardBody><ExpenseTrendChart months={months} /></CardBody>
          </Card>
          <Card>
            <CardHeader>Financial Health Score</CardHeader>
            <CardBody>
              <HealthRing score={healthScore} />
              <div className="space-y-0">
                {healthItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <Badge variant={item.variant}>{item.val}</Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>Savings Rate Trend</CardHeader>
            <CardBody><SavingsRateChart months={months} /></CardBody>
          </Card>
          <Card>
            <CardHeader action={
              <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50" value={pieIdx} onChange={(e) => setPieIdx(Number(e.target.value))}>
                {months.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
              </select>
            }>Spending by Category</CardHeader>
            <CardBody><CategoryPieChart month={months[pieIdx] || months[months.length - 1]} /></CardBody>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>Monthly Overview</CardHeader>
          <CardBody compact>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    {['Month', 'Income', 'Expenses', 'Net Savings', 'Savings Rate', 'Budget Util.', 'Over-Budget', 'Avg Daily'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {months.map((mo) => (
                    <tr key={mo.label} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold">{mo.label} {mo.partial && <Badge variant="warning" className="ml-1 text-[9px]">Partial</Badge>}</td>
                      <td className="px-4 py-3">{fmt(mo.income)}</td>
                      <td className="px-4 py-3 font-semibold">{fmt(mo.expenses)}</td>
                      <td className={`px-4 py-3 font-semibold ${mo.savings >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(mo.savings)}</td>
                      <td className="px-4 py-3"><Badge variant={mo.savingsRate >= 40 ? 'success' : mo.savingsRate >= 20 ? 'warning' : 'danger'}>{fmtPct(mo.savingsRate)}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={mo.budgetUtil <= 100 ? 'success' : mo.budgetUtil <= 120 ? 'warning' : 'danger'}>{fmtPct(mo.budgetUtil)}</Badge></td>
                      <td className={`px-4 py-3 font-semibold ${mo.overBudgetCats > 3 ? 'text-red-500' : mo.overBudgetCats > 1 ? 'text-amber-600' : 'text-emerald-600'}`}>{mo.overBudgetCats}</td>
                      <td className="px-4 py-3">{fmt(mo.avgDaily)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
      <AddMonthModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addMonth} />
    </>
  );
}
