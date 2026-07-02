'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  ArrowRight, LineChart, Sparkles, Globe, Wallet, ShieldCheck,
  Newspaper, Zap, TrendingDown, CircleDot,
} from 'lucide-react';
import { OlahDanaLogo } from '@/components/logos/OlahDanaLogo';
import { OlahAturMark } from '@/components/logos/OlahAturMark';
import { OlahSahamMark } from '@/components/logos/OlahSahamMark';
import { t, type Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface IntradayResponse {
  points: { time: number; price: number }[];
  price: number | null;
  changePct: number | null;
  usdIdrChangePct: number | null;
}

// Counts up from 0 to the target once real data arrives — the animation
// itself is decorative, but the number it lands on is always real, fetched
// live from the same public API the logged-in dashboard uses.
function useCountUp(target: number | null, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null) return;
    const goal = target;
    let raf: number;
    const startTime = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(goal * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// Standalone language toggle — this page renders before any auth session
// exists, so it can't read the logged-in user's saved language preference
// from FinanceContext. Defaults to English and forgets the choice on
// navigation, which is fine for a one-off marketing page.
export function LandingContent() {
  const [language, setLanguage] = useState<Language>('en');
  const [intraday, setIntraday] = useState<IntradayResponse | null>(null);

  useEffect(() => {
    fetch('/api/ihsg-intraday').then((r) => r.json()).then(setIntraday).catch(() => {});
  }, []);

  const ihsgPrice = useCountUp(intraday?.price ?? null);
  const ihsgChangeUp = (intraday?.changePct ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <OlahDanaLogo iconClassName="w-8 h-8" textClassName="text-lg" />
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-semibold">
            <button
              onClick={() => setLanguage('en')}
              className={cn('px-2.5 py-1.5 transition-colors', language === 'en' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('id')}
              className={cn('px-2.5 py-1.5 transition-colors', language === 'id' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
            >
              ID
            </button>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            {t(language, 'landing.nav.signIn')}
          </Link>
        </div>
      </header>

      {/* Hero — problem-first headline, real live data as the proof */}
      <section className="bg-indigo-950 text-white">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-14 sm:pt-20 pb-8 text-center">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-indigo-300 mb-4">
            {t(language, 'landing.hero.badge')}
          </span>
          <h1 className="font-geist text-4xl sm:text-6xl font-bold tracking-tight mb-5 max-w-3xl mx-auto leading-[1.05]">
            {t(language, 'landing.hero.title')}
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-9 leading-relaxed">
            {t(language, 'landing.hero.subtitle')}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-white text-indigo-950 hover:bg-indigo-50 transition-colors"
          >
            {t(language, 'landing.hero.cta')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Live proof block — real IHSG price + intraday chart, fetched
            from the same public API the dashboard uses. Not a mockup. */}
        <div className="max-w-5xl mx-auto px-6 sm:px-10 pb-16 sm:pb-24">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                {t(language, 'landing.live.badge')}
              </span>
              <span className="text-[11px] text-white/30">{t(language, 'landing.live.disclaimer')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div className="text-[11px] text-white/40 uppercase tracking-wide mb-1.5">{t(language, 'landing.live.ihsgLabel')}</div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tight">
                    {intraday?.price != null ? ihsgPrice.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'}
                  </span>
                  {intraday?.changePct != null && (
                    <span className={cn('text-sm font-bold px-2.5 py-1 rounded-full', ihsgChangeUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300')}>
                      {ihsgChangeUp ? '+' : ''}{intraday.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full sm:w-52 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intraday?.points ?? []}>
                    <defs>
                      <linearGradient id="heroIhsgGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ihsgChangeUp ? '#34d399' : '#f87171'} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={ihsgChangeUp ? '#34d399' : '#f87171'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={ihsgChangeUp ? '#34d399' : '#f87171'}
                      strokeWidth={2}
                      fill="url(#heroIhsgGradient)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem — make the pain concrete before pitching the fix */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-red-500 mb-3">
            {t(language, 'landing.problem.eyebrow')}
          </span>
          <h2 className="font-geist text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight max-w-2xl mx-auto leading-tight">
            {t(language, 'landing.problem.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <Newspaper className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.problem.1.title')}</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed">{t(language, 'landing.problem.1.desc')}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.problem.2.title')}</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed">{t(language, 'landing.problem.2.desc')}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.problem.3.title')}</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed">{t(language, 'landing.problem.3.desc')}</p>
          </div>
        </div>
      </section>

      {/* The fix — modules, reframed against the problems above */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="text-center mb-12">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-3">
              {t(language, 'landing.modules.eyebrow')}
            </span>
            <h2 className="font-geist text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
              {t(language, 'landing.modules.title')}
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">{t(language, 'landing.modules.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="border-2 border-blue-200 rounded-2xl p-7 bg-white relative">
              <span className="absolute top-5 right-5 text-[9px] font-bold tracking-widest px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                {t(language, 'landing.saham.badge')}
              </span>
              <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-4 p-2.5">
                <OlahSahamMark className="w-full h-full" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">OlahSaham</h3>
              <p className="text-sm text-gray-500 mb-4">{t(language, 'landing.saham.tagline')}</p>
              <ul className="space-y-2 text-[13px] text-gray-600">
                <li className="flex items-start gap-2">
                  <LineChart className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  {t(language, 'landing.saham.feature1')}
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  {t(language, 'landing.saham.feature2')}
                </li>
                <li className="flex items-start gap-2">
                  <Globe className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  {t(language, 'landing.saham.feature3')}
                </li>
              </ul>
            </div>

            <div className="border-2 border-gray-200 rounded-2xl p-7 bg-white relative">
              <span className="absolute top-5 right-5 text-[9px] font-bold tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                {t(language, 'landing.atur.badge')}
              </span>
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 p-2.5">
                <OlahAturMark className="w-full h-full" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">OlahAtur</h3>
              <p className="text-sm text-gray-500 mb-4">{t(language, 'landing.atur.tagline')}</p>
              <ul className="space-y-2 text-[13px] text-gray-600">
                <li className="flex items-start gap-2">
                  <Wallet className="w-3.5 h-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                  {t(language, 'landing.atur.feature1')}
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                  {t(language, 'landing.atur.feature2')}
                </li>
              </ul>
              <p className="text-[11px] text-gray-400 mt-4 pt-4 border-t border-gray-200">
                {t(language, 'landing.atur.note')}
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-7 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-200 text-gray-400 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-500 mb-1.5">{t(language, 'landing.more.title')}</h3>
              <p className="text-[13px] text-gray-400">{t(language, 'landing.more.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip — real sources as a differentiator, not decoration */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-14 text-center">
        <CircleDot className="w-5 h-5 text-indigo-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.trust.title')}</h3>
        <p className="text-[13px] text-gray-500 max-w-md mx-auto">{t(language, 'landing.trust.desc')}</p>
      </section>

      <section className="bg-indigo-950">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 text-center">
          <h2 className="font-geist text-2xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            {t(language, 'landing.cta.title')}
          </h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">{t(language, 'landing.cta.subtitle')}</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-white text-indigo-950 hover:bg-indigo-50 transition-colors"
          >
            {t(language, 'landing.cta.button')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="px-6 sm:px-10 py-8 text-center text-xs text-gray-400">
        OlahDana &middot; {t(language, 'landing.footer')}
      </footer>
    </div>
  );
}
