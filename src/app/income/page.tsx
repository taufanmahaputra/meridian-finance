'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Settings as SettingsIcon } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/EmptyState';
import { fmt } from '@/lib/calculations';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

// One field per month, editable inline — feeds MonthData.income, which
// Spending, Budget, Dashboard, and every savings/net calculation already
// read from. Unedited months fall back to the Settings default automatically
// (importMonth already does this at import time); this page is for
// correcting or overriding that per month afterwards.
export default function IncomePage() {
  const { months, income: globalIncome, currency, updateMonthIncome, t } = useFinance();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const sortedMonths = [...months].reverse();

  function valueFor(label: string, current: number): string {
    return drafts[label] ?? String(current);
  }

  function commit(label: string, current: number) {
    const raw = drafts[label];
    if (raw === undefined) return;
    const val = parseFloat(raw) || 0;
    setDrafts((prev) => { const next = { ...prev }; delete next[label]; return next; });
    if (val !== current) updateMonthIncome(label, val);
  }

  function resetToDefault(label: string) {
    setDrafts((prev) => { const next = { ...prev }; delete next[label]; return next; });
    updateMonthIncome(label, globalIncome);
  }

  if (months.length === 0) {
    return (
      <>
        <Topbar title={t('income.title')} />
        <div className="p-4 sm:p-7 max-w-[900px]">
          <EmptyState title={t('income.empty.title')} description={t('income.empty.desc')} showUpload />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title={t('income.title')} />
      <div className="p-4 sm:p-7 max-w-[900px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('income.heading')}</h3>
          <p className="text-xs text-gray-400">{t('income.subtitle')}</p>
        </div>

        <Card className="mb-5">
          <CardBody>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('income.defaultLabel')}</div>
                <div className="text-xl font-bold tracking-tight">{fmt(globalIncome, currency)}</div>
                <p className="text-xs text-gray-400 mt-1">{t('income.defaultDesc')}</p>
              </div>
              <Link href="/settings"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                <SettingsIcon className="w-3.5 h-3.5" /> {t('income.editDefault')}
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>{t('income.perMonthTitle')}</CardHeader>
          <CardBody compact>
            <div className="divide-y divide-gray-100">
              {sortedMonths.map((m) => {
                const isCustom = m.income !== globalIncome;
                return (
                  <div key={m.label} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900">{m.label}</div>
                      <div className="mt-1">
                        <Badge variant={isCustom ? 'info' : 'neutral'}>{isCustom ? t('income.custom') : t('income.default')}</Badge>
                      </div>
                    </div>
                    {isCustom && (
                      <button onClick={() => resetToDefault(m.label)} title={t('income.resetToDefault')}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="relative flex-shrink-0 w-40">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{currencySymbol}</span>
                      <input
                        type="number"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-right font-mono"
                        value={valueFor(m.label, m.income)}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [m.label]: e.target.value }))}
                        onBlur={() => commit(m.label, m.income)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
