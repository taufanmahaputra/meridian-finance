'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Bell } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useFinance } from '@/lib/FinanceContext';
import { createClient } from '@/lib/supabase';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { computeMarketMood, type MarketMood } from '@/lib/marketMood';
import { evaluateSignal, type SignalBatch, type StockSignal } from '@/lib/stockSignals';
import type { NewsItem } from '@/lib/marketNews';

interface IntradayResponse {
  points: { time: number; price: number }[];
  price: number | null;
  previousClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  changePct: number | null;
  usdIdrChangePct: number | null;
}

const MOOD_STYLES: Record<MarketMood, { bg: string; text: string; ring: string }> = {
  good: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  bad: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
  sideways: { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-200' },
  uncertain: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
};

// Snapshot of what the user saw last time, so the dashboard can surface
// what's actually new instead of repeating the same static market view.
interface VisitSnapshot {
  timestamp: number;
  buyTickers: string[];
  ihsgPrice: number | null;
}
const VISIT_STORAGE_KEY = 'olahdana:investLastVisit';

function timeAgo(ts: number, lang: string) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return lang === 'id' ? 'baru saja' : 'just now';
  if (mins < 60) return lang === 'id' ? `${mins} menit lalu` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === 'id' ? `${hours} jam lalu` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'id' ? `${days} hari lalu` : `${days}d ago`;
}

export default function InvestDashboardPage() {
  const { t, language } = useFinance();
  const supabase = createClient();
  const [intraday, setIntraday] = useState<IntradayResponse | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [latestBatch, setLatestBatch] = useState<SignalBatch | null>(null);
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, number | null>>({});
  const [commentary, setCommentary] = useState<string | null>(null);
  const [previousVisit] = useState<VisitSnapshot | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(VISIT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as VisitSnapshot) : null;
    } catch {
      return null;
    }
  });
  const [visitSaved, setVisitSaved] = useState(false);

  useEffect(() => {
    fetch('/api/ihsg-intraday').then((r) => r.json()).then(setIntraday).catch(() => {});
    fetch('/api/market-news').then((r) => r.json()).then((d) => setNews(d.news ?? [])).catch(() => {});
    fetch(`/api/market-commentary?lang=${language}`).then((r) => r.json()).then((d) => setCommentary(d.commentary ?? null)).catch(() => {});
  }, [language]);

  const loadLatestBatch = useCallback(async () => {
    const { data } = await supabase
      .from('stock_signals')
      .select('*')
      .order('batch_date', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(30);
    if (!data || data.length === 0) {
      setBatchesLoaded(true);
      return;
    }
    const latestDate = data[0].batch_date;
    const signals: StockSignal[] = data
      .filter((row) => row.batch_date === latestDate)
      .map((row) => ({
        id: row.id, batchDate: row.batch_date, ticker: row.ticker,
        entries: (row.entries as number[]) ?? [], note: row.note, sortOrder: row.sort_order,
      }))
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
    setLatestBatch({ batchDate: latestDate, signals });
    setBatchesLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLatestBatch();
  }, [loadLatestBatch]);

  useEffect(() => {
    if (!latestBatch || latestBatch.signals.length === 0) return;
    const tickers = latestBatch.signals.map((s) => s.ticker).join(',');
    fetch(`/api/stock-quotes?tickers=${tickers}`)
      .then((r) => r.json())
      .then((d) => setQuotes(d.quotes ?? {}))
      .catch(() => {});
  }, [latestBatch]);

  const mood = computeMarketMood({
    ihsgChangePct: intraday?.changePct ?? null,
    usdIdrChangePct: intraday?.usdIdrChangePct ?? null,
  });
  const moodStyle = MOOD_STYLES[mood];

  const watchlistCounts = (latestBatch?.signals ?? []).reduce(
    (acc, s) => {
      const status = evaluateSignal(s.entries, s.note, quotes[s.ticker] ?? null);
      if (status.state === 'buy') acc.buy += 1;
      if (status.state === 'avoid') acc.avoid += 1;
      return acc;
    },
    { buy: 0, avoid: 0 }
  );

  const currentBuyTickers = (latestBatch?.signals ?? [])
    .filter((s) => evaluateSignal(s.entries, s.note, quotes[s.ticker] ?? null).state === 'buy')
    .map((s) => s.ticker);

  // Snapshot what the user is seeing right now, once everything relevant
  // has actually loaded — this becomes "previousVisit" the next time they
  // open the dashboard, so we can point out exactly what changed.
  useEffect(() => {
    if (visitSaved || !batchesLoaded || intraday === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitSaved(true);
    const snapshot: VisitSnapshot = {
      timestamp: Date.now(),
      buyTickers: currentBuyTickers,
      ihsgPrice: intraday.price,
    };
    window.localStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(snapshot));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitSaved, batchesLoaded, intraday]);

  const newBuyTickers = previousVisit ? currentBuyTickers.filter((tk) => !previousVisit.buyTickers.includes(tk)) : [];
  const newHeadlinesCount = previousVisit
    ? news.filter((n) => new Date(n.publishedAt).getTime() > previousVisit.timestamp).length
    : 0;
  const ihsgDeltaPct = previousVisit?.ihsgPrice != null && intraday?.price != null
    ? ((intraday.price - previousVisit.ihsgPrice) / previousVisit.ihsgPrice) * 100
    : null;
  const hasVisitChanges = newBuyTickers.length > 0 || newHeadlinesCount > 0 || (ihsgDeltaPct != null && Math.abs(ihsgDeltaPct) >= 0.05);

  function formatChartTime(ms: number) {
    return new Date(ms).toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <>
      <Topbar title={t('invest.dashboard.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">

        {previousVisit && (
          <div className="flex items-start sm:items-center gap-3 px-4 sm:px-5 py-3 rounded-xl bg-indigo-950 text-white mb-4 flex-wrap sm:flex-nowrap">
            <Bell className="w-4 h-4 text-indigo-300 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0 text-[13px] font-medium leading-relaxed">
              {hasVisitChanges ? (
                <>
                  <span className="text-white/50">{t('invest.dashboard.sinceLastVisit')}</span>{' '}
                  {newBuyTickers.length > 0 && (
                    <span className="text-emerald-300 font-semibold">
                      {newBuyTickers.length} {t('invest.dashboard.newBuySignals')} ({newBuyTickers.join(', ')})
                    </span>
                  )}
                  {newBuyTickers.length > 0 && (newHeadlinesCount > 0 || ihsgDeltaPct != null) && <span className="text-white/30"> · </span>}
                  {newHeadlinesCount > 0 && (
                    <span>{newHeadlinesCount} {t('invest.dashboard.newHeadlines')}</span>
                  )}
                  {newHeadlinesCount > 0 && ihsgDeltaPct != null && Math.abs(ihsgDeltaPct) >= 0.05 && <span className="text-white/30"> · </span>}
                  {ihsgDeltaPct != null && Math.abs(ihsgDeltaPct) >= 0.05 && (
                    <span className={ihsgDeltaPct >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                      IHSG {ihsgDeltaPct >= 0 ? '+' : ''}{ihsgDeltaPct.toFixed(2)}%
                    </span>
                  )}
                </>
              ) : (
                <span className="text-white/50">{t('invest.dashboard.noChangesSince')}</span>
              )}
            </div>
            <span className="text-[10px] text-white/40 flex-shrink-0">{timeAgo(previousVisit.timestamp, language)}</span>
          </div>
        )}

        <div className={cn('rounded-2xl p-6 sm:p-8 mb-6 ring-1', moodStyle.bg, moodStyle.ring)}>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">{t('invest.mood.title')}</div>
          <div className={cn('text-4xl sm:text-5xl font-black tracking-tight mb-2', moodStyle.text)}>
            {t(`invest.mood.${mood}`)}
          </div>
          <p className="text-sm text-gray-600 max-w-xl">{t(`invest.mood.${mood}.desc`)}</p>
          {commentary && (
            <div className="mt-4 pt-4 border-t border-black/5 max-w-2xl">
              <p className="text-[13px] text-gray-700 leading-relaxed font-medium">{commentary}</p>
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-2">
                <Sparkles className="w-3 h-3" /> {t('invest.commentary.aiLabel')}
              </span>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">{t('invest.mood.basis')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-6">
          <Card>
            <CardHeader action={
              intraday?.changePct != null ? (
                <Badge variant={intraday.changePct >= 0 ? 'success' : 'danger'}>
                  {intraday.changePct >= 0 ? '+' : ''}{intraday.changePct.toFixed(2)}%
                </Badge>
              ) : undefined
            }>{t('invest.dashboard.ihsgToday')}</CardHeader>
            <CardBody>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-gray-900 font-mono">
                  {intraday?.price != null ? intraday.price.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={intraday?.points ?? []}>
                  <defs>
                    <linearGradient id="ihsgGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1f4690" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1f4690" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tickFormatter={formatChartTime} tick={{ fontSize: 10, fill: '#94a3b8' }} minTickGap={40} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={50} />
                  <Tooltip
                    labelFormatter={(v) => formatChartTime(Number(v))}
                    formatter={(value) => [Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 }), 'IHSG']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#1f4690" strokeWidth={2} fill="url(#ihsgGradient)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-400 mt-2">{t('invest.dashboard.liveDuringHours')}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="space-y-0">
                <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                  <span className="text-xs text-gray-500">{t('invest.dashboard.dayHigh')}</span>
                  <span className="text-sm font-semibold">{intraday?.dayHigh != null ? intraday.dayHigh.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                  <span className="text-xs text-gray-500">{t('invest.dashboard.dayLow')}</span>
                  <span className="text-sm font-semibold">{intraday?.dayLow != null ? intraday.dayLow.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                  <span className="text-xs text-gray-500">{t('invest.dashboard.prevClose')}</span>
                  <span className="text-sm font-semibold">{intraday?.previousClose != null ? intraday.previousClose.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-gray-500">USD/IDR</span>
                  <span className={cn('text-sm font-semibold', intraday?.usdIdrChangePct != null && intraday.usdIdrChangePct > 0 ? 'text-red-500' : 'text-emerald-600')}>
                    {intraday?.usdIdrChangePct != null ? `${intraday.usdIdrChangePct >= 0 ? '+' : ''}${intraday.usdIdrChangePct.toFixed(2)}%` : '—'}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader action={
              <div className="flex items-center gap-1.5">
                <Badge variant="success">{watchlistCounts.buy} {t('invest.dashboard.watchlistBuy')}</Badge>
                <Badge variant="danger">{watchlistCounts.avoid} {t('invest.dashboard.watchlistAvoid')}</Badge>
              </div>
            }>{t('invest.dashboard.latestWatchlist')}</CardHeader>
            <CardBody compact>
              {(latestBatch?.signals ?? []).slice(0, 6).map((s, idx) => {
                const status = evaluateSignal(s.entries, s.note, quotes[s.ticker] ?? null);
                return (
                  <div key={s.id} className={cn('flex items-center justify-between px-5 py-2.5', idx !== 0 && 'border-t border-gray-100')}>
                    <span className="text-[13px] font-semibold">{s.ticker}</span>
                    {status.state && (
                      <Badge variant={status.state === 'buy' ? 'success' : 'danger'}>
                        {status.state === 'buy' ? t('invest.watchlist.status.buy') : t('invest.watchlist.status.avoid')}
                      </Badge>
                    )}
                  </div>
                );
              })}
              {(!latestBatch || latestBatch.signals.length === 0) && (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">{t('invest.watchlist.empty.title')}</div>
              )}
              <div className="px-5 py-3 border-t border-gray-100">
                <Link href="/invest/signals/watchlist" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  {t('invest.dashboard.viewFullWatchlist')} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>{t('invest.dashboard.todaysBriefing')}</CardHeader>
            <CardBody compact>
              {news.slice(0, 5).map((n, idx) => (
                <a
                  key={idx}
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('flex flex-col gap-0.5 px-5 py-2.5 hover:bg-gray-50/50 transition-colors', idx !== 0 && 'border-t border-gray-100')}
                >
                  <span className="text-[13px] font-medium text-gray-900 leading-snug">{n.title}</span>
                  <span className="text-[10px] text-gray-400">{n.source}</span>
                </a>
              ))}
              {news.length === 0 && <div className="px-5 py-8 text-center text-gray-400 text-sm">{t('invest.dashboard.noNews')}</div>}
              <div className="px-5 py-3 border-t border-gray-100">
                <Link href="/invest/market" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  {t('invest.dashboard.viewFullOutlook')} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
