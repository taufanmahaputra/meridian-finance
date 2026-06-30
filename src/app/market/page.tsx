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

const assets = [
  { asset: 'Saham Indonesia (IHSG)', view: 'Netral-Positif', viewType: 'success' as const, outlook: 'IHSG diperkirakan 6.800–7.300', relevance: 'DCA reksadana indeks / ETF IHSG jangka panjang', signal: 'Akumulasi', signalColor: 'text-emerald-600' },
  { asset: 'Saham Global (US/World)', view: 'Cukup Mahal', viewType: 'warning' as const, outlook: 'S&P berpotensi konsolidasi', relevance: 'Eksposur lewat reksadana/ETF global', signal: 'Tahan', signalColor: 'text-amber-600' },
  { asset: 'SBN / Obligasi Negara', view: 'Menarik', viewType: 'success' as const, outlook: 'Yield ~6.5–7.2%', relevance: 'Cocok untuk dana darurat & pensiun', signal: 'Beli', signalColor: 'text-emerald-600' },
  { asset: 'Deposito Berjangka', view: 'Lumayan', viewType: 'info' as const, outlook: 'Bunga ~4.5–5.5% p.a.', relevance: 'Parkir dana jangka pendek', signal: 'Pertahankan', signalColor: 'text-blue-600' },
  { asset: 'Emas (Gold)', view: 'Harga Tinggi', viewType: 'warning' as const, outlook: 'Rp1,5–1,7 jt/gram', relevance: 'Hedge inflasi, maks 10% portofolio', signal: 'Posisi kecil', signalColor: 'text-amber-600' },
  { asset: 'Kripto', view: 'Volatil', viewType: 'danger' as const, outlook: 'Ketidakpastian tinggi', relevance: 'Maks 5% jika ada, risiko tinggi', signal: 'Spekulatif saja', signalColor: 'text-red-500' },
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
    { icon: <span>🇮🇩</span>, iconBg: 'bg-indigo-50', label: 'IHSG (IDX Composite)', value: data?.ihsg.value != null ? data.ihsg.value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—', trendText: trendText(data?.ihsg.ytdPct ?? null), trendClassName: trendClass(data?.ihsg.ytdPct ?? null) },
    { icon: <span>💱</span>, iconBg: 'bg-amber-50', label: 'USD/IDR', value: data?.usdidr.value != null ? data.usdidr.value.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '—', trendText: trendText(data?.usdidr.ytdPct ?? null), trendClassName: trendClass(data?.usdidr.ytdPct ?? null) },
    { icon: <span>🇺🇸</span>, iconBg: 'bg-emerald-50', label: 'S&P 500', value: data?.sp500.value != null ? data.sp500.value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—', trendText: trendText(data?.sp500.ytdPct ?? null), trendClassName: trendClass(data?.sp500.ytdPct ?? null) },
    { icon: <span>📉</span>, iconBg: 'bg-blue-50', label: 'US 10Y Treasury', value: data?.us10y.value != null ? `${data.us10y.value.toFixed(2)}%` : '—', trendText: trendText(data?.us10y.ytdPct ?? null), trendClassName: trendClass(data?.us10y.ytdPct ?? null) },
  ];

  return (
    <>
      <Topbar title="Market Outlook" />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Market Overview — Indonesia</h3>
            <p className="text-xs text-gray-400">Key indices and economic indicators for Indonesian financial planning context</p>
          </div>
          {data && (
            <Badge variant={error ? 'warning' : 'success'}>
              {error ? 'Data unavailable' : `Live · ${new Date(data.asOf).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {marketKpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader action={<Badge variant="neutral">{new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</Badge>}>Market Commentary</CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-indigo-600 mb-2">Makro Indonesia</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  Bank Indonesia mempertahankan BI-Rate untuk menjaga stabilitas Rupiah di tengah ketidakpastian global. Inflasi inti berada di kisaran <strong className="text-gray-900">2.5–3% YoY</strong>, masih dalam target BI. Pertumbuhan ekonomi tetap solid didukung konsumsi domestik dan belanja pemerintah, sementara IHSG bergerak mengikuti sentimen capital flow asing.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-indigo-600 mb-2">Konteks Global</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  Arah suku bunga The Fed tetap jadi penggerak utama arus modal ke pasar berkembang termasuk Indonesia — US 10Y Treasury di atas menjadi indikator tekanan terhadap Rupiah dan IHSG. Harga komoditas (CPO, batu bara, nikel) turut memengaruhi neraca dagang dan kekuatan Rupiah jangka menengah.
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
                    {['Kelas Aset', 'Pandangan Saat Ini', 'Outlook 6 Bulan', 'Relevansi Untuk Anda', 'Sinyal'].map((h) => (
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
