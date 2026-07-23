'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryProgressRing } from '@/components/CategoryProgressRing';
import { fmt, fmtCompact, buildTransactionLedger } from '@/lib/calculations';
import { CHART_GRID_COLOR, CHART_AXIS_TICK, CHART_TOOLTIP_STYLE } from '@/lib/constants';

export default function CategoryDetailPage() {
  const params = useParams<{ name: string }>();
  const name = decodeURIComponent(params.name ?? '');
  const { months, transactions, catBudgets, catColors, currency, t } = useFinance();

  const allTx = useMemo(() => buildTransactionLedger(months, transactions), [months, transactions]);
  const catTx = useMemo(
    () => allTx.filter((tx) => tx.category === name).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allTx, name]
  );

  const color = catColors[name] || '#6b7280';
  const budget = catBudgets[name] || 0;
  const trend = months.map((m) => ({ label: m.label, spent: m.cats[name] || 0 }));
  const latest = months[months.length - 1];
  const spentThisMonth = latest?.cats[name] || 0;
  const pctUsed = budget > 0 ? (spentThisMonth / budget) * 100 : null;
  const isOver = budget > 0 && (pctUsed ?? 0) > 100;

  return (
    <>
      <Topbar title={name} />
      <div className="p-4 sm:p-7 max-w-[1000px]">
        <Link href="/categories" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> {t('categories.title')}
        </Link>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <CategoryIcon name={name} color={color} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">{name}</h1>
            <p className="text-xs text-gray-400">
              {budget ? `${t('categories.totalBudget')}: ${fmt(budget, currency)}/mo` : t('budget.status.noBudget')}
            </p>
          </div>
          {budget > 0 && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <CategoryProgressRing percent={pctUsed} isOver={isOver} size={56} stroke={5} />
              <div className="text-xs">
                <div className="font-mono font-semibold text-gray-900">{fmt(spentThisMonth, currency)}</div>
                <div className="text-gray-400">{t('budget.table.budget')} {fmt(budget, currency)}</div>
              </div>
            </div>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>{t('categoryDetail.trend')}</CardHeader>
          <CardBody>
            {trend.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">{t('categoryDetail.noTransactions')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="catTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                  <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={false} />
                  <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v, currency)} width={56} />
                  <Tooltip formatter={(v) => [fmt(Number(v), currency), name]} contentStyle={CHART_TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="spent" stroke={color} strokeWidth={2} fill="url(#catTrendGradient)" dot={{ r: 3, fill: color }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>{t('categoryDetail.transactions')}</CardHeader>
          <CardBody compact>
            <div className="divide-y divide-gray-100">
              {catTx.slice(0, 100).map((tx, i) => (
                <div key={tx.id ?? i} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 truncate">{tx.description}</div>
                    <div className="text-[11px] text-gray-400">{tx.date}</div>
                  </div>
                  <span className="text-[13px] font-semibold font-mono flex-shrink-0">{fmt(tx.amount, currency, 2)}</span>
                </div>
              ))}
              {catTx.length === 0 && (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">{t('categoryDetail.noTransactions')}</div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
