'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MonthData } from '@/types/finance';
import { fmt } from '@/lib/calculations';

export function CategoryPieChart({ month, catColors, currency }: { month: MonthData; catColors: Record<string, string>; currency: string }) {
  const data = Object.entries(month.cats)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="38%" cy="50%" innerRadius={65} outerRadius={100} dataKey="value" paddingAngle={2} stroke="#fff" strokeWidth={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={catColors[entry.name] || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [fmt(Number(value), currency, 2), undefined]} contentStyle={{ borderRadius: 8, border: '1px solid #e6e1d9', fontSize: 12 }} />
          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10, lineHeight: '18px' }} iconSize={8} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center" style={{ left: '38%', top: '50%', transform: 'translate(-50%, -50%)', width: 110 }}>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Total</span>
        <span className="text-base font-bold text-gray-900 leading-tight">{fmt(total, currency)}</span>
      </div>
    </div>
  );
}
