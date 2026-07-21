'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import type { MonthData } from '@/types/finance';
import { CHART_GRID_COLOR, CHART_AXIS_TICK, CHART_TOOLTIP_STYLE, STATUS_COLORS } from '@/lib/constants';

export function BudgetUtilChart({ months }: { months: MonthData[] }) {
  const data = months.map((m) => ({
    name: m.label,
    util: parseFloat(m.budgetUtil.toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={false} />
        <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={44} />
        <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} contentStyle={CHART_TOOLTIP_STYLE} />
        <ReferenceLine y={100} stroke={STATUS_COLORS.good} strokeDasharray="4 4" strokeOpacity={0.6} />
        <ReferenceLine y={120} stroke={STATUS_COLORS.danger} strokeDasharray="4 4" strokeOpacity={0.6} />
        <Bar dataKey="util" radius={[4, 4, 0, 0]} barSize={32}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.util > 120 ? '#fecaca' : entry.util > 100 ? '#fef3c7' : '#d1fae5'} stroke={entry.util > 120 ? STATUS_COLORS.danger : entry.util > 100 ? STATUS_COLORS.warning : STATUS_COLORS.good} strokeWidth={2} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
