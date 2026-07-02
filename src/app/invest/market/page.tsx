'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, Percent, Landmark, Globe2, Building2, TrendingUp, ChevronDown } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { NEWS_CATEGORY_ORDER, NEWS_CATEGORY_BADGE, type NewsItem, type NewsCategory } from '@/lib/marketNews';

// Same icon per category everywhere a category shows up, so the eye learns
// the mapping once (shape+color) instead of re-reading labels every time.
const CATEGORY_ICON: Record<NewsCategory, typeof Percent> = {
  monetary: Percent,
  fiscal: Landmark,
  geopolitics: Globe2,
  politics: Building2,
  markets: TrendingUp,
};
const CATEGORY_ICON_COLOR: Record<NewsCategory, string> = {
  monetary: 'text-blue-500',
  fiscal: 'text-amber-500',
  geopolitics: 'text-red-500',
  politics: 'text-gray-500',
  markets: 'text-emerald-500',
};
const COLLAPSED_COUNT = 3;

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isId = language === 'id';

  function toggleExpand(category: string) {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));
  }

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

        <div className="mb-6">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{t('market.atAGlance')}</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn('px-3 py-2 rounded-lg flex items-center gap-1.5', trendClass(data?.ihsg.ytdPct ?? null))}>
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">IHSG</span>
              <span className="text-xs font-bold">{trendText(data?.ihsg.ytdPct ?? null)}</span>
            </div>
            <div className={cn('px-3 py-2 rounded-lg flex items-center gap-1.5', trendClass(data?.usdidr.ytdPct ?? null))}>
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">USD/IDR</span>
              <span className="text-xs font-bold">{trendText(data?.usdidr.ytdPct ?? null)}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-gray-100 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{t('invest.news.totalHeadlines')}</span>
              <span className="text-xs font-bold text-gray-900">{news.length}</span>
            </div>
            {NEWS_CATEGORY_ORDER.map((cat) => {
              const Icon = CATEGORY_ICON[cat];
              return (
                <div key={cat} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-1.5">
                  <Icon className={cn('w-3.5 h-3.5', CATEGORY_ICON_COLOR[cat])} />
                  <span className="text-xs font-bold text-gray-900">{counts[cat]}</span>
                  <span className="text-[10px] text-gray-400">{t(`invest.news.category.${cat}`)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {grouped.length === 0 && (
          <Card className="mb-6">
            <CardBody>
              <p className="text-sm text-gray-400 text-center py-6">{t('invest.dashboard.noNews')}</p>
            </CardBody>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 items-start">
          {grouped.map((group) => {
            const Icon = CATEGORY_ICON[group.category];
            const isExpanded = expanded[group.category];
            const visibleItems = isExpanded ? group.items : group.items.slice(0, COLLAPSED_COUNT);
            const hiddenCount = group.items.length - COLLAPSED_COUNT;

            return (
              <Card key={group.category}>
                <CardHeader action={<Badge variant={NEWS_CATEGORY_BADGE[group.category]}>{group.items.length}</Badge>}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', CATEGORY_ICON_COLOR[group.category])} />
                    {t(`invest.news.category.${group.category}`)}
                  </span>
                </CardHeader>
                <CardBody compact>
                  {visibleItems.map((item, idx) =>
                    idx === 0 ? (
                      <a
                        key={idx}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-5 py-4 bg-gray-50/60 hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-[14px] font-semibold text-gray-900 leading-snug mb-1.5">{item.title}</div>
                        <div className="text-[11px] text-gray-400">{item.source} · {formatTime(item.publishedAt)}</div>
                      </a>
                    ) : (
                      <a
                        key={idx}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start justify-between gap-3 px-5 py-2.5 border-t border-gray-100 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-[12.5px] text-gray-700 leading-snug truncate">{item.title}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{item.source} · {formatTime(item.publishedAt)}</div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-gray-300 flex-shrink-0 mt-1" />
                      </a>
                    )
                  )}
                  {hiddenCount > 0 && (
                    <button
                      onClick={() => toggleExpand(group.category)}
                      className="w-full flex items-center justify-center gap-1 px-5 py-2.5 border-t border-gray-100 text-[11px] font-semibold text-indigo-600 hover:bg-gray-50 transition-colors"
                    >
                      {isExpanded ? t('common.showLess') : `${t('common.showMore')} (${hiddenCount})`}
                      <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>

        <p className="text-[11px] text-gray-400 text-center">{t('invest.news.sources')}</p>
      </div>
    </>
  );
}
