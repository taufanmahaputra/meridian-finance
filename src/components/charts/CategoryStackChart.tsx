'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthData, Category } from '@/types/finance';
import { fmt, fmtCompact } from '@/lib/calculations';
import { CHART_GRID_COLOR, CHART_AXIS_TICK, CHART_TOOLTIP_STYLE } from '@/lib/constants';

export function CategoryStackChart({ months, categories, currency }: { months: MonthData[]; categories: Category[]; currency: string }) {
  const data = months.map((m) => {
    const row: Record<string, string | number> = { name: m.label };
    categories.forEach((c) => { row[c.name] = Math.max(0, m.cats[c.name] || 0); });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={false} />
        <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v, currency)} width={64} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [fmt(Number(value), currency), name]} />
        <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} iconType="circle" />
        {categories.map((c) => (
          <Bar key={c.name} dataKey={c.name} stackId="a" fill={c.color} fillOpacity={0.85} radius={0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
