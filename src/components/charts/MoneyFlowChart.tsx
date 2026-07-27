'use client';

import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { fmt } from '@/lib/calculations';
import { CHART_TOOLTIP_STYLE } from '@/lib/constants';

const INCOME_COLOR = '#2a78d6';
const EXPENSE_COLOR = '#eb6834';
const SAVINGS_COLOR = '#1baf7a';
const OTHER_COLOR = '#a89c87';
const TOP_N = 6;

interface FlowNode {
  name: string;
  color: string;
}
interface FlowLink {
  source: number;
  target: number;
  value: number;
}

export interface MoneyFlowChartProps {
  income: number;
  expenses: number;
  savings: number;
  cats: Record<string, number>;
  catColors: Record<string, string>;
  currency: string;
}

/** Income -> Expenses -> top categories (+ Income -> Savings when positive)
 *  — a Sankey flow replacing the plain category pie, so the shape of the
 *  money itself is the visual, not just a ranked list. Smaller categories
 *  fold into "Other" past the top 6 to keep the diagram legible. */
export function MoneyFlowChart({ income, expenses, savings, cats, catColors, currency }: MoneyFlowChartProps) {
  const ranked = Object.entries(cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, TOP_N);
  const restTotal = ranked.slice(TOP_N).reduce((s, [, v]) => s + v, 0);

  const nodes: FlowNode[] = [
    { name: 'Income', color: INCOME_COLOR },
    { name: 'Expenses', color: EXPENSE_COLOR },
  ];
  const links: FlowLink[] = [];
  const INCOME_IDX = 0;
  const EXPENSES_IDX = 1;

  if (expenses > 0) links.push({ source: INCOME_IDX, target: EXPENSES_IDX, value: expenses });

  if (savings > 0) {
    nodes.push({ name: 'Savings', color: SAVINGS_COLOR });
    links.push({ source: INCOME_IDX, target: nodes.length - 1, value: savings });
  }

  top.forEach(([cat, amount]) => {
    nodes.push({ name: cat, color: catColors[cat] || '#6b7280' });
    links.push({ source: EXPENSES_IDX, target: nodes.length - 1, value: amount });
  });

  if (restTotal > 0) {
    nodes.push({ name: 'Other', color: OTHER_COLOR });
    links.push({ source: EXPENSES_IDX, target: nodes.length - 1, value: restTotal });
  }

  if (links.length === 0 || income <= 0) {
    return <div className="py-16 text-center text-gray-400 text-sm">No flow to show yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <Sankey
        data={{ nodes, links }}
        nodePadding={20}
        nodeWidth={12}
        linkCurvature={0.55}
        margin={{ top: 10, right: 120, bottom: 10, left: 10 }}
        node={<FlowNodeShape />}
        link={<FlowLinkShape />}
      >
        <Tooltip
          formatter={(value) => fmt(Number(value), currency)}
          contentStyle={CHART_TOOLTIP_STYLE}
        />
      </Sankey>
    </ResponsiveContainer>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FlowNodeShape(props: any) {
  const { x, y, width, height, index, payload } = props;
  // A node with no incoming links is a root (Income) — label goes to its
  // right; everything else (Expenses, Savings, categories) labels to the
  // left so text never runs off the right edge of the chart.
  const isRoot = !payload.targetLinks || payload.targetLinks.length === 0;
  return (
    <Layer key={`flow-node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={payload.color || '#6b7280'} fillOpacity={0.92} radius={2} />
      <text
        textAnchor={isRoot ? 'start' : 'end'}
        x={isRoot ? x + width + 8 : x - 8}
        y={y + height / 2}
        dy="0.32em"
        fontSize={12}
        fontWeight={isRoot ? 600 : 500}
        fill="#332c25"
      >
        {payload.name}
      </text>
    </Layer>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FlowLinkShape(props: any) {
  const { sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, index, payload } = props;
  const color = payload.target?.color || payload.source?.color || OTHER_COLOR;
  return (
    <path
      key={`flow-link-${index}`}
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.32}
      strokeWidth={Math.max(linkWidth, 1)}
      className="transition-[stroke-opacity] duration-150 hover:opacity-70"
      style={{ cursor: 'pointer' }}
      onMouseEnter={(e) => { (e.target as SVGPathElement).style.strokeOpacity = '0.6'; }}
      onMouseLeave={(e) => { (e.target as SVGPathElement).style.strokeOpacity = '0.32'; }}
    />
  );
}
