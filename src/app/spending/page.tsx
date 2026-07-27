'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Sparkles, Lightbulb, ArrowRight } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { MoneyFlowChart } from '@/components/charts/MoneyFlowChart';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import { fmt, fmtPct, getTrendData, generateInsights, generateActions } from '@/lib/calculations';
import { cn } from '@/lib/utils';

const priorityBorder = {
  high: 'border-l-red-400',
  medium: 'border-l-amber-400',
  low: 'border-l-emerald-400',
  info: 'border-l-blue-400',
};
const priorityVariant = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
  info: 'info',
} as const;

const SPARK_WINDOW = 6;
// A category move smaller than this (in display currency) is noise, not
// something worth a CFO's attention — keeps the movers list to real signal.
const MOVER_MIN_DELTA = 10;

const INSIGHTS_SHOWN = 3;
const ACTIONS_SHOWN = 2;

export default function SpendingPage() {
  const { months, catBudgets, catColors, currency, language, t } = useFinance();

  if (months.length === 0) {
    return (
      <>
        <Topbar title={t('spending.title')} />
        <div className="p-4 sm:p-7 max-w-[1440px]">
          <EmptyState title={t('spending.empty.title')} description={t('spending.empty.desc')} showUpload />
        </div>
      </>
    );
  }

  const m = months[months.length - 1];
  const p = months.length >= 2 ? months[months.length - 2] : null;
  const sparkWindow = months.slice(-SPARK_WINDOW);

  const spendTrend = getTrendData(m.expenses, p?.expenses ?? null, true);
  const trendUp = p != null && p.expenses > 0 && m.expenses > p.expenses;

  const rankedCats = Object.entries(m.cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const catTotal = rankedCats.reduce((s, [, v]) => s + v, 0);
  const topCatEntry = rankedCats[0];

  // Month-over-month movers — the single most "CFO would flag this" view:
  // not just where money went, but what CHANGED, so attention goes to
  // spikes instead of re-reading the same static totals every month.
  const movers = p
    ? [...new Set([...Object.keys(m.cats), ...Object.keys(p.cats)])]
        .map((cat) => {
          const curr = m.cats[cat] || 0;
          const prev = p.cats[cat] || 0;
          const delta = curr - prev;
          const pct = prev > 0 ? (delta / prev) * 100 : null;
          return { cat, curr, prev, delta, pct };
        })
        .filter((mv) => Math.abs(mv.delta) >= MOVER_MIN_DELTA)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 4)
    : [];

  const cashFlowData = months.map((mo) => ({ name: mo.label, income: mo.income, expense: mo.expenses }));

  // Same generator that powers the full /insights page — this is a
  // curated top-N right where the spending happened, not a duplicate page.
  const priorityRank = { high: 0, medium: 1, low: 2, info: 3 };
  const insights = generateInsights(months, catBudgets, currency, language)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, INSIGHTS_SHOWN);
  const actions = generateActions(months, catBudgets, currency, language).slice(0, ACTIONS_SHOWN);

  const kpis: { icon: React.ReactNode; iconBg: string; tone: 'neutral' | 'emerald' | 'red' | 'indigo'; label: string; value: string; text?: string; className?: string; trendSuffix?: string; spark?: number[]; sparklineGood?: boolean }[] = [
    { icon: <span>💸</span>, iconBg: 'bg-red-100', tone: trendUp ? 'red' : 'neutral', label: t('spending.kpi.totalSpend'), value: fmt(m.expenses, currency), text: spendTrend.text, className: spendTrend.className, spark: sparkWindow.map((x) => x.expenses), sparklineGood: false },
    { icon: <span>🏦</span>, iconBg: m.savingsRate >= 20 ? 'bg-emerald-100' : 'bg-amber-100', tone: m.savingsRate >= 20 ? 'emerald' : 'neutral', label: t('spending.kpi.savingsRate'), value: fmtPct(m.savingsRate), ...getTrendData(m.savingsRate, p?.savingsRate ?? null, false), spark: sparkWindow.map((x) => x.savingsRate), sparklineGood: true },
    { icon: <span>🏷️</span>, iconBg: 'bg-indigo-100', tone: 'indigo', label: t('spending.kpi.topCategory'), value: topCatEntry ? topCatEntry[0] : '—', text: topCatEntry ? fmt(topCatEntry[1], currency) : undefined, className: 'text-gray-500 bg-gray-100', trendSuffix: '' },
    { icon: <span>⚠️</span>, iconBg: m.overBudgetCats > 0 ? 'bg-red-100' : 'bg-emerald-100', tone: m.overBudgetCats > 0 ? 'red' : 'emerald', label: t('spending.kpi.overBudgetCats'), value: String(m.overBudgetCats) },
  ];

  return (
    <>
      <Topbar title={t('spending.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        {/* ── Briefing ────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{m.label}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('spending.narrative.spent', { amount: fmt(m.expenses, currency) })}{' '}
              {p && p.expenses > 0 && (
                <span className={trendUp ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
                  {t(trendUp ? 'spending.narrative.up' : 'spending.narrative.down', { pct: Math.abs(((m.expenses - p.expenses) / p.expenses) * 100).toFixed(0) })}
                </span>
              )}{' '}
              {t('spending.narrative.savings', { pct: m.savingsRate.toFixed(0) })}
            </p>
          </div>
          <Link href="/transactions"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors flex-shrink-0">
            {t('spending.viewRawTransactions')}
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {kpis.map((k) => (
            <KpiCard key={k.label} icon={k.icon} iconBg={k.iconBg} tone={k.tone} label={k.label} value={k.value}
              trendText={k.text} trendClassName={k.className} trendSuffix={k.trendSuffix}
              sparkline={k.spark} sparklineGood={k.sparklineGood ?? true} />
          ))}
        </div>

        {/* ── What changed ────────────────────────────────────────── */}
        {movers.length > 0 && (
          <Card className="mb-5">
            <CardHeader>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                {t('spending.movers.title')}
              </span>
            </CardHeader>
            <CardBody compact>
              <div className="divide-y divide-gray-100">
                {movers.map((mv) => {
                  const isUp = mv.delta > 0;
                  const color = catColors[mv.cat] || '#6b7280';
                  return (
                    <Link key={mv.cat} href={`/categories/${encodeURIComponent(mv.cat)}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                      <CategoryIcon name={mv.cat} color={color} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 truncate">{mv.cat}</div>
                        <div className="text-[11px] text-gray-400">
                          {fmt(mv.prev, currency)} → {fmt(mv.curr, currency)}
                        </div>
                      </div>
                      <span className={cn(
                        'inline-flex items-center gap-1 text-[12px] font-bold px-2 py-1 rounded-full flex-shrink-0',
                        isUp ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      )}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {mv.pct != null ? `${isUp ? '+' : ''}${mv.pct.toFixed(0)}%` : t('spending.movers.new')}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* ── Trend ───────────────────────────────────────────────── */}
        <Card className="mb-5">
          <CardHeader>{t('spending.cashFlowTrend')}</CardHeader>
          <CardBody><CashFlowChart data={cashFlowData} currency={currency} /></CardBody>
        </Card>

        {/* ── Where the money went ────────────────────────────────── */}
        <Card className="mb-5">
          <CardHeader>{t('spending.moneyFlow')}</CardHeader>
          <CardBody>
            <MoneyFlowChart income={m.income} expenses={m.expenses} savings={m.savings} cats={m.cats} catColors={catColors} currency={currency} />
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 mb-5">
          <Card>
            <CardHeader>{t('spending.topCategories')}</CardHeader>
            <CardBody compact>
              {rankedCats.length === 0 ? (
                <div className="py-14 text-center text-gray-400 text-sm">{t('transactions.noSpending')}</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[340px] overflow-y-auto">
                  {rankedCats.map(([name, amount]) => {
                    const pct = catTotal > 0 ? (amount / catTotal) * 100 : 0;
                    const color = catColors[name] || '#6b7280';
                    return (
                      <Link key={name} href={`/categories/${encodeURIComponent(name)}`}
                        className="flex items-center gap-3 pl-3 pr-4 py-3 hover:bg-gray-50/60 transition-colors"
                        style={{ borderLeft: `3px solid ${color}` }}>
                        <CategoryIcon name={name} color={color} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-gray-900 truncate">{name}</div>
                          <div className="text-[11px] text-gray-400">{t('transactions.ofSpend')}</div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${color}1f`, color }}>
                          {fmtPct(pct)}
                        </span>
                        <span className="text-[14px] font-bold font-mono text-gray-900 flex-shrink-0 w-[92px] text-right">{fmt(amount, currency)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* ── CFO Insights ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <span className="inline-flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                {t('spending.cfoInsights')}
              </span>
            </CardHeader>
            <CardBody compact>
              {insights.length === 0 && actions.length === 0 ? (
                <div className="py-14 text-center text-gray-400 text-sm">{t('spending.noInsights')}</div>
              ) : (
                <>
                  {insights.length > 0 && (
                    <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto">
                      {insights.map((insight, i) => (
                        <div key={i} className={cn('px-4 py-3 border-l-[3px]', priorityBorder[insight.priority])}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={priorityVariant[insight.priority]}>{insight.priority}</Badge>
                            <span className="text-[13px] font-semibold text-gray-900">{insight.title}</span>
                          </div>
                          <p className="text-[12px] text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: insight.body }} />
                        </div>
                      ))}
                    </div>
                  )}
                  {actions.length > 0 && (
                    <div className="border-t border-gray-100">
                      {actions.map((action, i) => (
                        <div key={i} className="flex gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                          <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                          <div className="text-[12px]">
                            <strong className="block mb-0.5 text-gray-900">{action.title}</strong>
                            <span className="text-gray-500">{action.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <Link href="/insights" className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold text-indigo-600 hover:bg-indigo-50/50 transition-colors border-t border-gray-100">
                {t('spending.viewAllInsights')} <ArrowRight className="w-3 h-3" />
              </Link>
            </CardBody>
          </Card>
        </div>

        {/* ── Worth watching ──────────────────────────────────────── */}
        {m.overBudgetCats > 0 && (
          <Card>
            <CardHeader action={<Badge variant="danger">{m.overBudgetCats}</Badge>}>{t('spending.overBudgetTitle')}</CardHeader>
            <CardBody compact>
              {Object.entries(m.cats)
                .filter(([cat, spent]) => (catBudgets[cat] || 0) > 0 && spent > (catBudgets[cat] || 0))
                .sort((a, b) => (b[1] - (catBudgets[b[0]] || 0)) - (a[1] - (catBudgets[a[0]] || 0)))
                .map(([cat, spent]) => (
                  <Link key={cat} href={`/categories/${encodeURIComponent(cat)}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <span className="flex items-center gap-2.5 text-[13px] font-medium min-w-0">
                      <CategoryIcon name={cat} color={catColors[cat] || '#6b7280'} size="sm" />
                      <span className="truncate">{cat}</span>
                    </span>
                    <span className="text-[13px] flex-shrink-0">
                      <span className="font-semibold text-red-500">{fmt(spent, currency)}</span>
                      <span className="text-gray-400"> / {fmt(catBudgets[cat] || 0, currency)}</span>
                    </span>
                  </Link>
                ))}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
