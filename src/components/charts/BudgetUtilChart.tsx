'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import type { MonthData } from '@/types/finance';

export function BudgetUtilChart({ months }: { months: MonthData[] }) {
  const data = months.map((m) => ({
    name: m.label,
    util: parseFloat(m.budgetUtil.toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
        <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} />
        <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Bar dataKey="util" radius={[6, 6, 0, 0]} barSize={36}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.util > 120 ? '#fecaca' : entry.util > 100 ? '#fef3c7' : '#d1fae5'} stroke={entry.util > 120 ? '#ef4444' : entry.util > 100 ? '#f59e0b' : '#10b981'} strokeWidth={2} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
