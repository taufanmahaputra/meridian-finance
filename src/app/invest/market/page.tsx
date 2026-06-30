'use client';

import { useEffect, useState } from 'react';
import { useFinance } from '@/lib/FinanceContext';
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
  ihsg: QuotePoint;
  usdidr: QuotePoint;
  sp500: QuotePoint;
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

const assetsId = [
  { asset: 'Saham Indonesia (IHSG)', view: 'Netral-Positif', viewType: 'success' as const, outlook: 'IHSG diperkirakan 6.800–7.300', relevance: 'DCA reksadana indeks / ETF IHSG jangka panjang', signal: 'Akumulasi', signalColor: 'text-emerald-600' },
  { asset: 'Saham Global (US/World)', view: 'Cukup Mahal', viewType: 'warning' as const, outlook: 'S&P berpotensi konsolidasi', relevance: 'Eksposur lewat reksadana/ETF global', signal: 'Tahan', signalColor: 'text-amber-600' },
  { asset: 'SBN / Obligasi Negara', view: 'Menarik', viewType: 'success' as const, outlook: 'Yield ~6.5–7.2%', relevance: 'Cocok untuk dana darurat & pensiun', signal: 'Beli', signalColor: 'text-emerald-600' },
  { asset: 'Deposito Berjangka', view: 'Lumayan', viewType: 'info' as const, outlook: 'Bunga ~4.5–5.5% p.a.', relevance: 'Parkir dana jangka pendek', signal: 'Pertahankan', signalColor: 'text-blue-600' },
  { asset: 'Emas (Gold)', view: 'Harga Tinggi', viewType: 'warning' as const, outlook: 'Rp1,5–1,7 jt/gram', relevance: 'Hedge inflasi, maks 10% portofolio', signal: 'Posisi kecil', signalColor: 'text-amber-600' },
  { asset: 'Kripto', view: 'Volatil', viewType: 'danger' as const, outlook: 'Ketidakpastian tinggi', relevance: 'Maks 5% jika ada, risiko tinggi', signal: 'Spekulatif saja', signalColor: 'text-red-500' },
];

const assetsEn = [
  { asset: 'Indonesian Equities (IHSG)', view: 'Neutral-Positive', viewType: 'success' as const, outlook: 'IHSG estimated 6,800–7,300', relevance: 'DCA into IHSG index funds / ETFs long-term', signal: 'Accumulate', signalColor: 'text-emerald-600' },
  { asset: 'Global Equities (US/World)', view: 'Stretched', viewType: 'warning' as const, outlook: 'S&P may consolidate', relevance: 'Exposure via global mutual funds/ETFs', signal: 'Hold', signalColor: 'text-amber-600' },
  { asset: 'Government Bonds (SBN)', view: 'Attractive', viewType: 'success' as const, outlook: 'Yields ~6.5–7.2%', relevance: 'Suited for emergency fund & retirement', signal: 'Buy', signalColor: 'text-emerald-600' },
  { asset: 'Time Deposits', view: 'Decent', viewType: 'info' as const, outlook: 'Rates ~4.5–5.5% p.a.', relevance: 'Short-term cash parking', signal: 'Maintain', signalColor: 'text-blue-600' },
  { asset: 'Gold', view: 'Elevated', viewType: 'warning' as const, outlook: 'Rp1.5–1.7M/gram', relevance: 'Inflation hedge, max 10% of portfolio', signal: 'Small position', signalColor: 'text-amber-600' },
  { asset: 'Crypto', view: 'Volatile', viewType: 'danger' as const, outlook: 'High uncertainty', relevance: 'Max 5% if any, high risk', signal: 'Speculative only', signalColor: 'text-red-500' },
];

export default function MarketPage() {
  const { t, language } = useFinance();
  const [data, setData] = useState<MarketResponse | null>(null);
  const [error, setError] = useState(false);
  const isId = language === 'id';
  const assets = isId ? assetsId : assetsEn;

  useEffect(() => {
    fetch('/api/market')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const marketKpis = [
    { icon: <span>🇮🇩</span>, iconBg: 'bg-indigo-50', label: 'IHSG (IDX Composite)', value: data?.ihsg.value != null ? data.ihsg.value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—', trendText: trendText(data?.ihsg.ytdPct ?? null), trendClassName: trendClass(data?.ihsg.ytdPct ?? null) },
    { icon: <span>💱</span>, iconBg: 'bg-amber-50', label: 'USD/IDR', value: data?.usdidr.value != null ? data.usdidr.value.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '—', trendText: trendText(data?.usdidr.ytdPct ?? null), trendClassName: trendClass(data?.usdidr.ytdPct ?? null) },
    { icon: <span>🇺🇸</span>, iconBg: 'bg-emerald-50', label: 'S&P 500', value: data?.sp500.value != null ? data.sp500.value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—', trendText: trendText(data?.sp500.ytdPct ?? null), trendClassName: trendClass(data?.sp500.ytdPct ?? null) },
    { icon: <span>📉</span>, iconBg: 'bg-blue-50', label: 'US 10Y Treasury', value: data?.us10y.value != null ? `${data.us10y.value.toFixed(2)}%` : '—', trendText: trendText(data?.us10y.ytdPct ?? null), trendClassName: trendClass(data?.us10y.ytdPct ?? null) },
  ];

  return (
    <>
      <Topbar title={t('market.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">{t('market.heading')}</h3>
            <p className="text-xs text-gray-400">{t('market.subtitle')}</p>
          </div>
          {data && (
            <Badge variant={error ? 'warning' : 'success'}>
              {error ? t('market.dataUnavailable') : `${t('market.live')} · ${new Date(data.asOf).toLocaleTimeString(isId ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}${isId ? ' WIB' : ''}`}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {marketKpis.map((k) => (
            <KpiCard key={k.label} {...k} trendSuffix="" />
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader action={<Badge variant="neutral">{new Date().toLocaleDateString(isId ? 'id-ID' : 'en-US', { month: 'short', year: 'numeric' })}</Badge>}>{t('market.commentary')}</CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-indigo-600 mb-2">{t('market.macroTitle')}</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">{t('market.macroBody')}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-indigo-600 mb-2">{t('market.globalTitle')}</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">{t('market.globalBody')}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>{t('market.assetOutlook')}</CardHeader>
          <CardBody compact>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    {[
                      t('market.table.assetClass'), t('market.table.currentView'), t('market.table.outlook'),
                      t('market.table.relevance'), t('market.table.signal'),
                    ].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
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
