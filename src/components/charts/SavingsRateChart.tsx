'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { MonthData } from '@/types/finance';
import { CHART_COLORS, CHART_GRID_COLOR, CHART_AXIS_TICK, CHART_TOOLTIP_STYLE, STATUS_COLORS } from '@/lib/constants';

export function SavingsRateChart({ months }: { months: MonthData[] }) {
  const data = months.map((m) => ({
    name: m.label,
    rate: parseFloat(m.savingsRate.toFixed(1)),
  }));
  const maxRate = Math.max(70, ...data.map((d) => d.rate + 10));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={false} />
        <YAxis domain={[0, maxRate]} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={40} />
        <Tooltip formatter={(value) => [`${value}%`, 'Savings Rate']} contentStyle={CHART_TOOLTIP_STYLE} />
        <ReferenceLine y={40} stroke={STATUS_COLORS.good} strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: '40% Target', position: 'right', fontSize: 9, fill: STATUS_COLORS.good }} />
        <ReferenceLine y={20} stroke={STATUS_COLORS.warning} strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: '20% Min', position: 'right', fontSize: 9, fill: STATUS_COLORS.warning }} />
        <Line type="monotone" dataKey="rate" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS[0], strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
