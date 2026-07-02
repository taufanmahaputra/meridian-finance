'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NEWS_CATEGORY_ORDER, NEWS_CATEGORY_BADGE, type NewsItem, type NewsCategory } from '@/lib/marketNews';

interface CommentaryResponse {
  commentary: string | null;
  generatedAt: string;
}

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

interface NewsResponse {
  news: NewsItem[];
  fetchedAt: string;
}

function trendClass(pct: number | null) {
  if (pct == null) return 'text-gray-400 bg-gray-100';
  return pct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50';
}

function trendText(pct: number | null) {
  if (pct == null) return '--';
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% YTD`;
}

export default function MarketPage() {
  const { t, language } = useFinance();
  const [data, setData] = useState<MarketResponse | null>(null);
  const [newsData, setNewsData] = useState<NewsResponse | null>(null);
  const [commentary, setCommentary] = useState<CommentaryResponse | null>(null);
  const [error, setError] = useState(false);
  const isId = language === 'id';

  useEffect(() => {
    fetch('/api/market')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setError(true));
    fetch('/api/market-news')
      .then((res) => res.json())
      .then(setNewsData)
      .catch(() => {});
    fetch(`/api/market-commentary?lang=${language}`)
      .then((res) => res.json())
      .then(setCommentary)
      .catch(() => {});
  }, [language]);

  const marketKpis = [
    { icon: <span>🇮🇩</span>, iconBg: 'bg-indigo-50', label: 'IHSG (IDX Composite)', value: data?.ihsg.value != null ? data.ihsg.value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—', trendText: trendText(data?.ihsg.ytdPct ?? null), trendClassName: trendClass(data?.ihsg.ytdPct ?? null) },
    { icon: <span>💱</span>, iconBg: 'bg-amber-50', label: 'USD/IDR', value: data?.usdidr.value != null ? data.usdidr.value.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '—', trendText: trendText(data?.usdidr.ytdPct ?? null), trendClassName: trendClass(data?.usdidr.ytdPct ?? null) },
    { icon: <span>🇺🇸</span>, iconBg: 'bg-emerald-50', label: 'S&P 500', value: data?.sp500.value != null ? data.sp500.value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—', trendText: trendText(data?.sp500.ytdPct ?? null), trendClassName: trendClass(data?.sp500.ytdPct ?? null) },
    { icon: <span>📉</span>, iconBg: 'bg-blue-50', label: 'US 10Y Treasury', value: data?.us10y.value != null ? `${data.us10y.value.toFixed(2)}%` : '—', trendText: trendText(data?.us10y.ytdPct ?? null), trendClassName: trendClass(data?.us10y.ytdPct ?? null) },
  ];

  const news = newsData?.news ?? [];
  const grouped = NEWS_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: news.filter((n) => n.category === cat).slice(0, 6),
  })).filter((g) => g.items.length > 0);

  const counts = NEWS_CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = news.filter((n) => n.category === cat).length;
    return acc;
  }, {} as Record<NewsCategory, number>);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(isId ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

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

        <Card className="mb-6 border-indigo-100">
          <CardHeader action={
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <Sparkles className="w-3 h-3" /> {t('invest.commentary.aiLabel')}
            </span>
          }>
            {t('invest.commentary.title')}
          </CardHeader>
          <CardBody>
            {commentary === null ? (
              <p className="text-sm text-gray-400">{t('invest.commentary.loading')}</p>
            ) : commentary.commentary ? (
              <p className="text-[14px] text-gray-800 leading-relaxed font-medium">{commentary.commentary}</p>
            ) : (
              <p className="text-sm text-gray-400">{t('invest.commentary.unavailable')}</p>
            )}
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardHeader>{t('invest.news.bottomLine')}</CardHeader>
          <CardBody>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              IHSG {data?.ihsg.ytdPct != null ? `${data.ihsg.ytdPct >= 0 ? '+' : ''}${data.ihsg.ytdPct.toFixed(2)}% YTD` : '—'}, USD/IDR {data?.usdidr.ytdPct != null ? `${data.usdidr.ytdPct >= 0 ? '+' : ''}${data.usdidr.ytdPct.toFixed(2)}% YTD` : '—'}.{' '}
              {news.length} {isId ? 'berita terpantau hari ini' : 'headlines tracked today'}:{' '}
              {NEWS_CATEGORY_ORDER.map((cat, i) => (
                <span key={cat}>
                  {i > 0 && ', '}
                  <strong className="text-gray-900">{counts[cat]}</strong> {t(`invest.news.category.${cat}`).toLowerCase()}
                </span>
              ))}.
            </p>
          </CardBody>
        </Card>

        {grouped.length === 0 && (
          <Card className="mb-6">
            <CardBody>
              <p className="text-sm text-gray-400 text-center py-6">{t('invest.dashboard.noNews')}</p>
            </CardBody>
          </Card>
        )}

        {grouped.map((group) => (
          <Card key={group.category} className="mb-6">
            <CardHeader action={<Badge variant={NEWS_CATEGORY_BADGE[group.category]}>{group.items.length}</Badge>}>
              {t(`invest.news.category.${group.category}`)}
            </CardHeader>
            <CardBody compact>
              {group.items.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-start justify-between gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors ${idx !== 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 leading-snug">{item.title}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{item.source} · {formatTime(item.publishedAt)}</div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                </a>
              ))}
            </CardBody>
          </Card>
        ))}

        <p className="text-[11px] text-gray-400 text-center">{t('invest.news.sources')}</p>
      </div>
    </>
  );
}
