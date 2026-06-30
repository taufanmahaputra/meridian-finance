'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MonthData } from '@/types/finance';
import { CAT_COLORS } from '@/lib/constants';

export function CategoryPieChart({ month }: { month: MonthData }) {
  const data = Object.entries(month.cats)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={65} outerRadius={100} dataKey="value" paddingAngle={2} stroke="#fff" strokeWidth={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#6b7280'} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, undefined]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10, lineHeight: '18px' }} iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
