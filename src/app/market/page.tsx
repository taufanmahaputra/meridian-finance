'use client';

import { Topbar } from '@/components/Topbar';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const marketKpis = [
  { icon: <span>🇸🇬</span>, iconBg: 'bg-indigo-50', label: 'STI Index', value: '3,842', trendText: '+2.1% YTD', trendClassName: 'text-emerald-600 bg-emerald-50' },
  { icon: <span>🇺🇸</span>, iconBg: 'bg-emerald-50', label: 'S&P 500', value: '5,960', trendText: '+14.8% YTD', trendClassName: 'text-emerald-600 bg-emerald-50' },
  { icon: <span>💱</span>, iconBg: 'bg-amber-50', label: 'USD/SGD', value: '1.3125', trendText: '-0.5% YTD', trendClassName: 'text-gray-400 bg-gray-100' },
  { icon: <span>📉</span>, iconBg: 'bg-blue-50', label: 'SG 10Y Bond', value: '2.85%', trendText: '-35bps YTD', trendClassName: 'text-emerald-600 bg-emerald-50' },
];

const assets = [
  { asset: 'SG Equities', view: 'Neutral-Positive', viewType: 'success' as const, outlook: 'STI 3,800–4,100 range', relevance: 'DCA into STI ETF for long-term', signal: 'Accumulate', signalColor: 'text-emerald-600' },
  { asset: 'US Equities', view: 'Stretched', viewType: 'warning' as const, outlook: 'S&P may consolidate', relevance: 'Tech-heavy exposure via moomoo', signal: 'Hold', signalColor: 'text-amber-600' },
  { asset: 'SG T-Bills', view: 'Attractive', viewType: 'success' as const, outlook: 'Yields ~2.8–3.2%', relevance: 'Park emergency fund here', signal: 'Buy', signalColor: 'text-emerald-600' },
  { asset: 'SGD Deposits', view: 'Decent', viewType: 'info' as const, outlook: 'FD rates ~2.5–3.0%', relevance: 'Short-term cash parking', signal: 'Maintain', signalColor: 'text-blue-600' },
  { asset: 'Gold', view: 'Elevated', viewType: 'warning' as const, outlook: '$2,400–2,600/oz', relevance: '5% portfolio hedge', signal: 'Small position', signalColor: 'text-amber-600' },
  { asset: 'Crypto', view: 'Volatile', viewType: 'danger' as const, outlook: 'High uncertainty', relevance: 'Max 5% if any, high risk', signal: 'Speculative only', signalColor: 'text-red-500' },
];

export default function MarketPage() {
  return (
    <>
      <Topbar title="Market Outlook" />
      <div className="p-7 max-w-[1440px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Market Overview</h3>
          <p className="text-xs text-gray-400">Key indices and economic indicators for financial planning context</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {marketKpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader action={<Badge variant="neutral">Jun 2026</Badge>}>Market Commentary</CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-6">
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
