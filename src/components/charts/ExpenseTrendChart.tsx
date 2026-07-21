'use client';

import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine } from 'recharts';
import type { MonthData } from '@/types/finance';
import { fmt, fmtCompact } from '@/lib/calculations';
import { CHART_COLORS, CHART_GRID_COLOR, CHART_AXIS_TICK, CHART_TOOLTIP_STYLE, STATUS_COLORS } from '@/lib/constants';

const EXPENSE_COLOR = CHART_COLORS[1]; // orange — spend
const INCOME_COLOR = CHART_COLORS[0]; // blue — income

export function ExpenseTrendChart({ months, monthlyBudget, currency }: { months: MonthData[]; monthlyBudget: number; currency: string }) {
  const data = months.map((m) => ({
    name: m.label,
    expenses: m.expenses,
    income: m.income,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={false} />
        <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v, currency)} width={64} />
        <Tooltip formatter={(value, name) => [fmt(Number(value), currency), name]} contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        <Bar name="Expenses" dataKey="expenses" fill={EXPENSE_COLOR} fillOpacity={0.18} stroke={EXPENSE_COLOR} strokeWidth={2} radius={[4, 4, 0, 0]} barSize={36} />
        <Line name="Income" dataKey="income" stroke={INCOME_COLOR} strokeWidth={2} dot={{ r: 4, fill: INCOME_COLOR, strokeWidth: 0 }} />
        {monthlyBudget > 0 && (
          <ReferenceLine y={monthlyBudget} stroke={STATUS_COLORS.good} strokeDasharray="6 4" label={{ value: 'Budget', position: 'right', fontSize: 10, fill: STATUS_COLORS.good }} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
