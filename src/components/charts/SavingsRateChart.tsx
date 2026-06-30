'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { MonthData } from '@/types/finance';

export function SavingsRateChart({ months }: { months: MonthData[] }) {
  const data = months.map((m) => ({
    name: m.label,
    rate: parseFloat(m.savingsRate.toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis domain={[0, 70]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(value) => [`${value}%`, 'Savings Rate']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={40} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: '40% Target', position: 'right', fontSize: 9, fill: '#10b981' }} />
        <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: '20% Min', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
        <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
