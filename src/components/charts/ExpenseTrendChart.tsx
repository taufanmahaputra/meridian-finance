'use client';

import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine } from 'recharts';
import type { MonthData } from '@/types/finance';

export function ExpenseTrendChart({ months, monthlyBudget }: { months: MonthData[]; monthlyBudget: number }) {
  const data = months.map((m) => ({
    name: m.label,
    expenses: m.expenses,
    income: m.income,
    budget: monthlyBudget,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, undefined]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="expenses" fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeWidth={2} radius={[6, 6, 0, 0]} barSize={40} />
        <Line dataKey="income" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
        <ReferenceLine y={monthlyBudget} stroke="#10b981" strokeDasharray="6 4" label={{ value: 'Budget', position: 'right', fontSize: 10, fill: '#10b981' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
