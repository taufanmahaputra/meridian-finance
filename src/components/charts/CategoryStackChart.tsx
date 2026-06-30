'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthData, Category } from '@/types/finance';

export function CategoryStackChart({ months, categories }: { months: MonthData[]; categories: Category[] }) {
  const data = months.map((m) => {
    const row: Record<string, string | number> = { name: m.label };
    categories.forEach((c) => { row[c.name] = Math.max(0, m.cats[c.name] || 0); });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} formatter={(value) => [`$${Number(value).toLocaleString()}`, undefined]} />
        <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} />
        {categories.map((c) => (
          <Bar key={c.name} dataKey={c.name} stackId="a" fill={c.color} fillOpacity={0.7} radius={0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
