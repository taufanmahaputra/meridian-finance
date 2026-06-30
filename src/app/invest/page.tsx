'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Signal, TrendingUp, Compass, ArrowRight } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { getSignals, type SignalType } from '@/lib/investSignals';

interface QuotePoint {
  value: number | null;
  ytdPct: number | null;
}

interface MarketResponse {
  ihsg: QuotePoint;
  usdidr: QuotePoint;
}

const signalVariant: Record<SignalType, 'success' | 'info' | 'warning'> = {
  buy: 'success',
  hold: 'info',
  watch: 'warning',
};

export default function InvestDashboardPage() {
  const { t, language } = useFinance();
  const [data, setData] = useState<MarketResponse | null>(null);
  const signals = getSignals(language);

  useEffect(() => {
    fetch('/api/market').then((res) => res.json()).then(setData).catch(() => {});
  }, []);

  const signalLabel: Record<SignalType, string> = {
    buy: t('invest.dashboard.buy'),
    hold: t('invest.dashboard.hold'),
    watch: t('invest.dashboard.watch'),
  };

  const counts = signals.reduce(
    (acc, s) => ({ ...acc, [s.signal]: (acc[s.signal] || 0) + 1 }),
    {} as Record<SignalType, number>
  );

  const kpis = [
    { icon: <span>🇮🇩</span>, iconBg: 'bg-indigo-50', label: 'IHSG (IDX Composite)', value: data?.ihsg.value != null ? data.ihsg.value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—', trendText: data?.ihsg.ytdPct != null ? `${data.ihsg.ytdPct >= 0 ? '+' : ''}${data.ihsg.ytdPct.toFixed(2)}% YTD` : '--', trendClassName: data?.ihsg.ytdPct != null && data.ihsg.ytdPct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50' },
    { icon: <span>💱</span>, iconBg: 'bg-amber-50', label: 'USD/IDR', value: data?.usdidr.value != null ? data.usdidr.value.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '—', trendText: data?.usdidr.ytdPct != null ? `${data.usdidr.ytdPct >= 0 ? '+' : ''}${data.usdidr.ytdPct.toFixed(2)}% YTD` : '--', trendClassName: data?.usdidr.ytdPct != null && data.usdidr.ytdPct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50' },
    { icon: <span>📈</span>, iconBg: 'bg-emerald-50', label: signalLabel.buy, value: String(counts.buy || 0), trendText: '', trendClassName: '' },
    { icon: <span>👀</span>, iconBg: 'bg-blue-50', label: signalLabel.watch, value: String(counts.watch || 0), trendText: '', trendClassName: '' },
  ];

  return (
    <>
      <Topbar title={t('invest.dashboard.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('invest.dashboard.heading')}</h3>
          <p className="text-xs text-gray-400">{t('invest.dashboard.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} trendSuffix="" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>{t('invest.dashboard.signalSummary')}</CardHeader>
            <CardBody compact>
              {signals.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-0">
                  <span className="text-[13px] font-medium">{s.asset}</span>
                  <Badge variant={signalVariant[s.signal]}>{signalLabel[s.signal]}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>

          <div className="flex flex-col gap-4">
            <Link href="/invest/signals" className="group">
              <Card className="hover:border-indigo-300 transition-colors">
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Signal className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{t('invest.dashboard.viewSignals')}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/invest/market" className="group">
              <Card className="hover:border-indigo-300 transition-colors">
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{t('invest.dashboard.viewMarket')}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </CardBody>
              </Card>
            </Link>
            <Link href="/invest/decision" className="group">
              <Card className="hover:border-indigo-300 transition-colors">
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{t('invest.dashboard.tryDecision')}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
