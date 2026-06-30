'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { MonthData } from '@/types/finance';
import { MONTHLY_BUDGET } from '@/lib/constants';
import { generateForecast } from '@/lib/calculations';

export function ForecastChart({ months }: { months: MonthData[] }) {
  const { projected, labels } = generateForecast(months);

  const data = [
    ...months.map((m) => ({ name: m.label, actual: m.expenses, forecast: null as number | null })),
    ...labels.map((l, i) => ({
      name: l,
      actual: null as number | null,
      forecast: projected[i],
    })),
  ];

  if (months.length > 0 && labels.length > 0) {
    data[months.length - 1].forecast = months[months.length - 1].expenses;
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value) => value != null ? [`$${Number(value).toLocaleString()}`, undefined] : ['-', undefined]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={MONTHLY_BUDGET} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.4} />
        <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} connectNulls={false} />
        <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
