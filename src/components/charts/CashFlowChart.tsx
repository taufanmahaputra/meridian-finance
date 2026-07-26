'use client';

import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { fmt, fmtCompact } from '@/lib/calculations';
import { CHART_COLORS, CHART_GRID_COLOR, CHART_AXIS_TICK, CHART_TOOLTIP_STYLE } from '@/lib/constants';

const EXPENSE_COLOR = CHART_COLORS[1]; // orange — spend
const INCOME_COLOR = CHART_COLORS[0]; // blue — income

export interface CashFlowPoint {
  name: string;
  income: number;
  expense: number;
}

/** Income-vs-expense bars/line across whatever periods are passed in —
 *  reused on the Transactions page scoped to the current filter, so it
 *  reads as "this slice's trend" rather than a fixed dashboard chart. */
export function CashFlowChart({ data, currency }: { data: CashFlowPoint[]; currency: string }) {
  if (data.length === 0) {
    return <div className="py-16 text-center text-gray-400 text-sm">No data for this selection</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={false} />
        <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v, currency)} width={64} />
        <Tooltip formatter={(value, name) => [fmt(Number(value), currency), name]} contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        <Bar name="Expense" dataKey="expense" fill={EXPENSE_COLOR} fillOpacity={0.18} stroke={EXPENSE_COLOR} strokeWidth={2} radius={[4, 4, 0, 0]} barSize={32} />
        <Line name="Income" dataKey="income" stroke={INCOME_COLOR} strokeWidth={2} dot={{ r: 4, fill: INCOME_COLOR, strokeWidth: 0 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
