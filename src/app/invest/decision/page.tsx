'use client';

import { useState } from 'react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

type Answer1 = 'growth' | 'income' | 'shortterm';
type Answer2 = 'sell' | 'hold' | 'buy';
type Answer3 = 'short' | 'medium' | 'long';

const SCORES = {
  q1: { growth: 2, income: 1, shortterm: 0 } as Record<Answer1, number>,
  q2: { sell: 0, hold: 1, buy: 2 } as Record<Answer2, number>,
  q3: { short: 0, medium: 1, long: 2 } as Record<Answer3, number>,
};

const ALLOCATIONS = {
  conservative: [
    { key: 'equities', pct: 20, color: '#6366f1' },
    { key: 'bonds', pct: 40, color: '#10b981' },
    { key: 'deposito', pct: 30, color: '#3b82f6' },
    { key: 'gold', pct: 10, color: '#f59e0b' },
  ],
  balanced: [
    { key: 'equities', pct: 45, color: '#6366f1' },
    { key: 'bonds', pct: 30, color: '#10b981' },
    { key: 'deposito', pct: 15, color: '#3b82f6' },
    { key: 'gold', pct: 10, color: '#f59e0b' },
  ],
  aggressive: [
    { key: 'equities', pct: 70, color: '#6366f1' },
    { key: 'bonds', pct: 15, color: '#10b981' },
    { key: 'deposito', pct: 5, color: '#3b82f6' },
    { key: 'gold', pct: 10, color: '#f59e0b' },
  ],
} as const;

export default function DecisionMakerPage() {
  const { t, language } = useFinance();
  const [q1, setQ1] = useState<Answer1 | null>(null);
  const [q2, setQ2] = useState<Answer2 | null>(null);
  const [q3, setQ3] = useState<Answer3 | null>(null);
  const [result, setResult] = useState<keyof typeof ALLOCATIONS | null>(null);

  const allAnswered = q1 && q2 && q3;

  function handleSubmit() {
    if (!q1 || !q2 || !q3) return;
    const score = SCORES.q1[q1] + SCORES.q2[q2] + SCORES.q3[q3];
    const profile = score <= 1 ? 'conservative' : score <= 4 ? 'balanced' : 'aggressive';
    setResult(profile);
  }

  function handleRetake() {
    setQ1(null); setQ2(null); setQ3(null); setResult(null);
  }

  const assetLabels: Record<string, string> = language === 'id'
    ? { equities: 'Saham', bonds: 'SBN / Obligasi', deposito: 'Deposito', gold: 'Emas' }
    : { equities: 'Equities', bonds: 'Bonds / SBN', deposito: 'Time Deposits', gold: 'Gold' };

  const profileVariant: Record<string, 'success' | 'info' | 'danger'> = {
    conservative: 'info',
    balanced: 'success',
    aggressive: 'danger',
  };

  const QUESTIONS: { key: string; question: string; options: { value: string; label: string }[]; value: string | null; onChange: (v: string) => void }[] = [
    {
      key: 'q1', question: t('invest.decision.q1'), value: q1,
      onChange: (v) => setQ1(v as Answer1),
      options: [
        { value: 'growth', label: t('invest.decision.q1.growth') },
        { value: 'income', label: t('invest.decision.q1.income') },
        { value: 'shortterm', label: t('invest.decision.q1.shortterm') },
      ],
    },
    {
      key: 'q2', question: t('invest.decision.q2'), value: q2,
      onChange: (v) => setQ2(v as Answer2),
      options: [
        { value: 'sell', label: t('invest.decision.q2.sell') },
        { value: 'hold', label: t('invest.decision.q2.hold') },
        { value: 'buy', label: t('invest.decision.q2.buy') },
      ],
    },
    {
      key: 'q3', question: t('invest.decision.q3'), value: q3,
      onChange: (v) => setQ3(v as Answer3),
      options: [
        { value: 'short', label: t('invest.decision.q3.short') },
        { value: 'medium', label: t('invest.decision.q3.medium') },
        { value: 'long', label: t('invest.decision.q3.long') },
      ],
    },
  ];

  return (
    <>
      <Topbar title={t('invest.decision.title')} />
      <div className="p-4 sm:p-7 max-w-[800px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('invest.decision.heading')}</h3>
          <p className="text-xs text-gray-400">{t('invest.decision.subtitle')}</p>
        </div>

        {!result ? (
          <Card>
            <CardBody>
              <div className="space-y-6">
                {QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <p className="text-sm font-medium text-gray-900 mb-2.5">{q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => q.onChange(opt.value)}
                          className={cn(
                            'px-3 py-2.5 rounded-lg text-xs font-medium text-left border transition-colors',
                            q.value === opt.value
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="w-full mt-6 px-4 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('invest.decision.getResult')}
              </button>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader action={
              <button onClick={handleRetake} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                {t('invest.decision.retake')}
              </button>
            }>{t('invest.decision.resultTitle')}</CardHeader>
            <CardBody>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xs text-gray-400">{t('invest.decision.resultProfile')}:</span>
                <Badge variant={profileVariant[result]}>{t(`invest.decision.profile.${result}`)}</Badge>
              </div>

              <div className="space-y-3 mb-5">
                {ALLOCATIONS[result].map((a) => (
                  <div key={a.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{assetLabels[a.key]}</span>
                      <span className="text-gray-400">{a.pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.pct}%`, backgroundColor: a.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-4">{t('invest.decision.disclaimer')}</p>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
