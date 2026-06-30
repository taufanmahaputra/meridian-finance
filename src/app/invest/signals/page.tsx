'use client';

import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getSignals, type SignalType, type Confidence } from '@/lib/investSignals';
import { AlertTriangle } from 'lucide-react';

const signalVariant: Record<SignalType, 'success' | 'info' | 'warning'> = {
  buy: 'success',
  hold: 'info',
  watch: 'warning',
};

const confidenceVariant: Record<Confidence, 'success' | 'warning' | 'neutral'> = {
  high: 'success',
  medium: 'warning',
  low: 'neutral',
};

export default function SignalsPage() {
  const { t, language } = useFinance();
  const signals = getSignals(language);

  const signalLabel: Record<SignalType, string> = {
    buy: t('invest.dashboard.buy'),
    hold: t('invest.dashboard.hold'),
    watch: t('invest.dashboard.watch'),
  };
  const confidenceLabel: Record<Confidence, string> = {
    high: t('invest.signals.confidence.high'),
    medium: t('invest.signals.confidence.medium'),
    low: t('invest.signals.confidence.low'),
  };

  return (
    <>
      <Topbar title={t('invest.signals.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('invest.signals.heading')}</h3>
          <p className="text-xs text-gray-400">{t('invest.signals.subtitle')}</p>
        </div>

        <Card className="mb-6">
          <CardBody compact>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    {[
                      t('invest.signals.table.asset'), t('invest.signals.table.signal'),
                      t('invest.signals.table.confidence'), t('invest.signals.table.timeframe'),
                      t('invest.signals.table.rationale'),
                    ].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold">{s.asset}</td>
                      <td className="px-4 py-3"><Badge variant={signalVariant[s.signal]}>{signalLabel[s.signal]}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={confidenceVariant[s.confidence]}>{confidenceLabel[s.confidence]}</Badge></td>
                      <td className="px-4 py-3 text-gray-500">{s.timeframe}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-md">{s.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">{t('invest.signals.disclaimer')}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
