'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/Topbar';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface QuotePoint {
  value: number | null;
  ytdPct: number | null;
  live: boolean;
}

interface MarketResponse {
  asOf: string;
  sti: QuotePoint;
  sp500: QuotePoint;
  usdsgd: QuotePoint;
  us10y: QuotePoint;
}

function trendClass(pct: number | null) {
  if (pct == null) return 'text-gray-400 bg-gray-100';
  return pct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50';
}

function trendText(pct: number | null) {
  if (pct == null) return '--';
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% YTD`;
}

const assets = [
  { asset: 'SG Equities', view: 'Neutral-Positive', viewType: 'success' as const, outlook: 'STI 3,800–4,100 range', relevance: 'DCA into STI ETF for long-term', signal: 'Accumulate', signalColor: 'text-emerald-600' },
  { asset: 'US Equities', view: 'Stretched', viewType: 'warning' as const, outlook: 'S&P may consolidate', relevance: 'Tech-heavy exposure via moomoo', signal: 'Hold', signalColor: 'text-amber-600' },
  { asset: 'SG T-Bills', view: 'Attractive', viewType: 'success' as const, outlook: 'Yields ~2.8–3.2%', relevance: 'Park emergency fund here', signal: 'Buy', signalColor: 'text-emerald-600' },
  { asset: 'SGD Deposits', view: 'Decent', viewType: 'info' as const, outlook: 'FD rates ~2.5–3.0%', relevance: 'Short-term cash parking', signal: 'Maintain', signalColor: 'text-blue-600' },
  { asset: 'Gold', view: 'Elevated', viewType: 'warning' as const, outlook: '$2,400–2,600/oz', relevance: '5% portfolio hedge', signal: 'Small position', signalColor: 'text-amber-600' },
  { asset: 'Crypto', view: 'Volatile', viewType: 'danger' as const, outlook: 'High uncertainty', relevance: 'Max 5% if any, high risk', signal: 'Speculative only', signalColor: 'text-red-500' },
];

export default function MarketPage() {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/market')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const marketKpis = [
    { icon: <span>🇸🇬</span>, iconBg: 'bg-indigo-50', label: 'STI Index', value: data?.sti.value != null ? data.sti.value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—', trendText: trendText(data?.sti.ytdPct ?? null), trendClassName: trendClass(data?.sti.ytdPct ?? null) },
    { icon: <span>🇺🇸</span>, iconBg: 'bg-emerald-50', label: 'S&P 500', value: data?.sp500.value != null ? data.sp500.value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—', trendText: trendText(data?.sp500.ytdPct ?? null), trendClassName: trendClass(data?.sp500.ytdPct ?? null) },
    { icon: <span>💱</span>, iconBg: 'bg-amber-50', label: 'USD/SGD', value: data?.usdsgd.value != null ? data.usdsgd.value.toFixed(4) : '—', trendText: trendText(data?.usdsgd.ytdPct ?? null), trendClassName: trendClass(data?.usdsgd.ytdPct ?? null) },
    { icon: <span>📉</span>, iconBg: 'bg-blue-50', label: 'US 10Y Treasury', value: data?.us10y.value != null ? `${data.us10y.value.toFixed(2)}%` : '—', trendText: trendText(data?.us10y.ytdPct ?? null), trendClassName: trendClass(data?.us10y.ytdPct ?? null) },
  ];

  return (
    <>
      <Topbar title="Market Outlook" />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Market Overview</h3>
            <p className="text-xs text-gray-400">Key indices and economic indicators for financial planning context</p>
          </div>
          {data && (
            <Badge variant={error ? 'warning' : 'success'}>
              {error ? 'Data unavailable' : `Live · ${new Date(data.asOf).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}`}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {marketKpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader action={<Badge variant="neutral">{new Date().toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}</Badge>}>Market Commentary</CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-indigo-600 mb-2">Singapore Macro</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  MAS maintained its current monetary policy stance, with the SGD NEER band unchanged. Core inflation has moderated to <strong className="text-gray-900">1.8% YoY</strong>, the lowest since early 2022. GDP growth remains resilient at <strong className="text-gray-900">3.2% YoY</strong> in Q2, supported by services and manufacturing recovery.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-indigo-600 mb-2">Global Context</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  US Fed has signaled a pause after 25bps cuts in early 2026. European markets stabilizing post-election cycle. <strong className="text-gray-900">IDR has weakened slightly</strong> against SGD, benefiting your IDR-denominated installment payments. Oil prices stable around $72/bbl, keeping transport costs contained.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Asset Class Outlook</CardHeader>
          <CardBody compact>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    {['Asset Class', 'Current View', '6-Month Outlook', 'Relevance to You', 'Signal'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.asset} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold">{a.asset}</td>
                      <td className="px-4 py-3"><Badge variant={a.viewType}>{a.view}</Badge></td>
                      <td className="px-4 py-3 text-gray-500">{a.outlook}</td>
                      <td className="px-4 py-3 text-gray-500">{a.relevance}</td>
                      <td className={`px-4 py-3 font-semibold ${a.signalColor}`}>{a.signal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
