'use client';

import Link from 'next/link';
import { ArrowRight, Tag, Sparkles, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { BudgetUtilChart } from '@/components/charts/BudgetUtilChart';
import { CategoryStackChart } from '@/components/charts/CategoryStackChart';
import { EmptyState } from '@/components/EmptyState';
import { fmt, fmtPct, getTrendData } from '@/lib/calculations';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { cn } from '@/lib/utils';

export default function BudgetPage() {
  const { months, categories, catBudgets, monthlyBudget, currency, t } = useFinance();

  const hasHistory = months.length > 0;
  // Nudge harder toward the Smart Auto-Generate flow when there's real
  // spending history but nothing budgeted yet — that's the exact case it
  // was built for.
  const needsSetup = hasHistory && monthlyBudget === 0;

  return (
    <>
      <Topbar title={t('budget.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">

        {/* Shortcut to the dedicated Categories & Budgets page — full CRUD
            (incl. Smart Auto-Generate) lives there now instead of crowding
            this audit-focused page. */}
        <Link href="/categories" className="block mb-6 group">
          <div className={cn(
            'rounded-2xl border p-5 flex items-center gap-4 transition-all',
            needsSetup
              ? 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 hover:border-indigo-300'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
          )}>
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', needsSetup ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600')}>
              {needsSetup ? <Sparkles className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">{t('budget.categories.title')}</h3>
                {needsSetup && <Badge variant="info">{t('budget.shortcut.setupNeeded')}</Badge>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {needsSetup
                  ? t('budget.shortcut.setupDesc')
                  : t('budget.shortcut.desc', { n: categories.length, total: fmt(monthlyBudget, currency) })}
              </p>
            </div>
            <div className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors',
              needsSetup ? 'bg-indigo-600 text-white group-hover:bg-indigo-700' : 'bg-gray-50 text-gray-600 group-hover:bg-gray-100'
            )}>
              {needsSetup ? t('budget.shortcut.setupCta') : t('budget.shortcut.manage')} <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>

        {!hasHistory ? (
          <EmptyState
            title={t('budget.empty.title')}
            description={t('budget.empty.desc')}
            showUpload
          />
        ) : (
          <BudgetHistoryView months={months} categories={categories} catBudgets={catBudgets} monthlyBudget={monthlyBudget} currency={currency} t={t} />
        )}
      </div>
    </>
  );
}

function BudgetHistoryView({
  months, categories, catBudgets, monthlyBudget, currency, t,
}: {
  months: ReturnType<typeof useFinance>['months'];
  categories: ReturnType<typeof useFinance>['categories'];
  catBudgets: Record<string, number>;
  monthlyBudget: number;
  currency: string;
  t: ReturnType<typeof useFinance>['t'];
}) {
  const m = months[months.length - 1];
  const p = months.length >= 2 ? months[months.length - 2] : null;
  const remaining = monthlyBudget - m.expenses;
  const prevRemaining = p ? monthlyBudget - p.expenses : null;

  const kpis: { icon: React.ReactNode; iconBg: string; label: string; value: string; text?: string; className?: string }[] = [
    { icon: <span>🎯</span>, iconBg: 'bg-indigo-50', label: t('budget.kpi.totalBudget'), value: fmt(monthlyBudget, currency) },
    { icon: <span>💸</span>, iconBg: 'bg-red-50', label: t('budget.kpi.totalSpent'), value: fmt(m.expenses, currency), ...getTrendData(m.expenses, p?.expenses ?? null, true) },
    { icon: <span>🧮</span>, iconBg: remaining >= 0 ? 'bg-emerald-50' : 'bg-red-50', label: t('budget.kpi.remaining'), value: fmt(remaining, currency), ...getTrendData(remaining, prevRemaining) },
    { icon: <span>🚨</span>, iconBg: 'bg-amber-50', label: t('budget.kpi.overBudgetCats'), value: String(m.overBudgetCats) },
  ];

  const anomalies: { msg: string; severity: 'danger' | 'warning' }[] = [];
  Object.entries(m.cats).forEach(([cat, spent]) => {
    const prev = p?.cats?.[cat] || 0;
    if (prev > 0 && spent > prev * 2) anomalies.push({ msg: `${cat} spiked ${((spent / prev - 1) * 100).toFixed(0)}% (${fmt(prev, currency)} → ${fmt(spent, currency)})`, severity: 'danger' });
    const budget = catBudgets[cat] || 0;
    if (budget > 0 && spent > budget * 1.5) anomalies.push({ msg: `${cat} is ${fmtPct((spent / budget) * 100)} of budget (${fmt(spent, currency)} vs ${fmt(budget, currency)})`, severity: 'warning' });
  });

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} icon={k.icon} iconBg={k.iconBg} label={k.label} value={k.value} trendText={k.text} trendClassName={k.className} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>{t('budget.utilization')}</CardHeader>
          <CardBody><BudgetUtilChart months={months} /></CardBody>
        </Card>
        <Card>
          <CardHeader>{t('budget.categoryStackedTrend')}</CardHeader>
          <CardBody><CategoryStackChart months={months} categories={categories} currency={currency} /></CardBody>
        </Card>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3">{t('budget.auditTitle')}</h3>
        <Card>
          <CardBody compact>
            <div className="divide-y divide-gray-100">
              {Object.entries(m.cats).sort((a, b) => b[1] - a[1]).map(([cat, spent]) => {
                const budget = catBudgets[cat] || 0;
                const variance = budget - spent;
                const pctUsed = budget > 0 ? (spent / budget) * 100 : null;
                const prevSpent = p?.cats?.[cat] || 0;
                const mom = prevSpent ? ((spent - prevSpent) / prevSpent) * 100 : null;
                const status = !budget ? 'neutral' : (pctUsed ?? 0) > 100 ? 'danger' : (pctUsed ?? 0) > 85 ? 'warning' : 'success';
                const statusLabel = !budget ? t('budget.status.noBudget') : (pctUsed ?? 0) > 100 ? t('budget.status.over') : (pctUsed ?? 0) > 85 ? t('budget.status.nearLimit') : t('budget.status.onTrack');
                const barClass = !budget ? 'bg-gray-300' : (pctUsed ?? 0) > 100 ? 'bg-gradient-to-r from-red-400 to-red-500' : (pctUsed ?? 0) > 85 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500';
                const Icon = getCategoryIcon(cat);
                const MomIcon = mom == null ? Minus : mom > 0 ? ArrowUp : ArrowDown;

                return (
                  <div key={cat} className="group px-5 py-4 hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{cat}</span>
                        <Badge variant={status as 'success' | 'warning' | 'danger' | 'neutral'}>{statusLabel}</Badge>
                      </div>
                      {mom != null && (
                        <span className={cn(
                          'inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                          mom > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'
                        )}>
                          <MomIcon className="w-3 h-3" /> {Math.abs(mom).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-500', barClass)} style={{ width: `${Math.min(100, pctUsed || 0)}%` }} />
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 w-9 text-right flex-shrink-0">{pctUsed != null ? fmtPct(pctUsed) : '—'}</span>
                    </div>

                    <div className="flex items-center gap-4 text-[12px] flex-wrap">
                      <span className="text-gray-400">{t('budget.table.actual')} <strong className="text-gray-900 font-mono font-semibold">{fmt(spent, currency, 2)}</strong></span>
                      <span className="text-gray-400">{t('budget.table.budget')} <strong className="text-gray-600 font-mono">{budget ? fmt(budget, currency) : '—'}</strong></span>
                      <span className="text-gray-400">
                        {t('budget.table.variance')}{' '}
                        <strong className={cn('font-mono', budget ? (variance >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-gray-400')}>
                          {budget ? fmt(variance, currency) : '—'}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader action={<Badge variant="info">{t('budget.autoScanned')}</Badge>}>{t('budget.anomalyDetection')}</CardHeader>
        <CardBody compact>
          {anomalies.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">{t('budget.noAnomalies')}</div>
          ) : (
            anomalies.map((a, i) => (
              <div key={i} className="flex gap-3.5 px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${a.severity === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>!</div>
                <div className="text-[13px]">
                  <strong className="block mb-0.5">{a.severity === 'danger' ? t('budget.spendingSpike') : t('budget.budgetBreach')}</strong>
                  <span className="text-gray-500">{a.msg}</span>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </>
  );
}
