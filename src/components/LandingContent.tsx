'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  ArrowRight, Sparkles, Wallet, TrendingUp, AlertTriangle, CircleDot, LogIn, RefreshCw, Zap,
} from 'lucide-react';
import { OlahDanaLogo } from '@/components/logos/OlahDanaLogo';
import { OlahAturMark } from '@/components/logos/OlahAturMark';
import { OlahSahamMark } from '@/components/logos/OlahSahamMark';
import { t, type Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Fades + slides an element in once it scrolls into view. Disconnects after
// firing once — this is a one-time entrance effect, not a scroll-linked one.
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn('transition-all duration-700 ease-out', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

interface IntradayResponse {
  points: { time: number; price: number }[];
  price: number | null;
  changePct: number | null;
}

// Illustrative category split for the OlahAtur demo panel — a UI preview,
// not a claim about any real user's data.
const MOCK_CATEGORIES = [
  { color: '#1f4690', pct: 34 },
  { color: '#2e8b8b', pct: 24 },
  { color: '#e0a83b', pct: 18 },
  { color: '#d2cabb', pct: 24 },
];

const MARQUEE_ITEMS = ['Yahoo Finance', 'CNBC Indonesia', 'Antara News', 'IDX / BEI'];

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

interface DemoPanelProps {
  language: Language;
  intraday: IntradayResponse | null;
  ihsgPrice: number;
  ihsgChangeUp: boolean;
  conicGradient: string;
}

// Auto-cycling "browser chrome" demo — the closest thing to a product video
// a page like this can honestly show without recording a fake screen capture.
// Crossfades between the two modules every ~4.5s, with a story-style progress
// bar so the motion reads as an intentional demo, not a glitch.
function DemoPanel({ language, intraday, ihsgPrice, ihsgChangeUp, conicGradient }: DemoPanelProps) {
  const [view, setView] = useState<'atur' | 'saham'>('atur');

  useEffect(() => {
    const id = setInterval(() => setView((v) => (v === 'atur' ? 'saham' : 'atur')), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        <span className="ml-3 text-[11px] text-gray-400 font-mono">olahdana.id</span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={() => setView('atur')}
            aria-label="OlahAtur"
            className={cn('w-1.5 h-1.5 rounded-full transition-colors', view === 'atur' ? 'bg-indigo-600' : 'bg-gray-300')}
          />
          <button
            onClick={() => setView('saham')}
            aria-label="OlahSaham"
            className={cn('w-1.5 h-1.5 rounded-full transition-colors', view === 'saham' ? 'bg-indigo-600' : 'bg-gray-300')}
          />
        </div>
      </div>
      <div className="h-0.5 bg-gray-100 overflow-hidden">
        <div key={view} className="h-full bg-indigo-500 animate-progress-fill" />
      </div>

      <div className="relative h-[300px]">
        <div className={cn('absolute inset-0 p-6 sm:p-8 transition-opacity duration-500', view === 'atur' ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center p-1.5">
              <OlahAturMark className="w-full h-full" />
            </div>
            <span className="text-sm font-bold text-gray-900">OlahAtur</span>
          </div>

          <div className="flex items-center gap-5 mb-5">
            <div className="w-20 h-20 rounded-full flex-shrink-0" style={{ background: conicGradient }} />
            <div className="flex-1 space-y-1.5">
              {MOCK_CATEGORIES.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <div className="h-1.5 rounded-full bg-gray-100 flex-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="text-[11px] text-amber-800 leading-snug">{t(language, 'landing.preview.atur.anomaly')}</span>
          </div>
        </div>

        <div className={cn('absolute inset-0 p-6 sm:p-8 transition-opacity duration-500', view === 'saham' ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center p-1.5">
              <OlahSahamMark className="w-full h-full" />
            </div>
            <span className="text-sm font-bold text-gray-900">OlahSaham</span>
            <span className="inline-flex items-center gap-1 ml-auto text-[9px] font-bold uppercase tracking-wide text-emerald-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              {t(language, 'landing.live.badge')}
            </span>
          </div>

          <div className="mb-1.5 text-[10px] text-gray-400 uppercase tracking-wide">{t(language, 'landing.live.ihsgLabel')}</div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold font-mono text-gray-900 tracking-tight">
              {intraday?.price != null ? ihsgPrice.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'}
            </span>
            {intraday?.changePct != null && (
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', ihsgChangeUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
                {ihsgChangeUp ? '+' : ''}{intraday.changePct.toFixed(2)}%
              </span>
            )}
          </div>

          <div className="h-16 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={intraday?.points ?? []}>
                <defs>
                  <linearGradient id="heroIhsgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ihsgChangeUp ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={ihsgChangeUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={ihsgChangeUp ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                  fill="url(#heroIhsgGradient)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="text-[12px] font-bold text-gray-900">AADI</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">{t(language, 'landing.preview.saham.buy')}</span>
          </div>
        </div>
      </div>
    </div>
  );
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
  const conicGradient = (() => {
    const stops = MOCK_CATEGORIES.reduce<{ text: string[]; acc: number }>(
      (state, c) => {
        const from = state.acc;
        const to = from + c.pct;
        return { text: [...state.text, `${c.color} ${from}% ${to}%`], acc: to };
      },
      { text: [], acc: 0 }
    ).text;
    return `conic-gradient(${stops.join(', ')})`;
  })();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="px-6 sm:px-10 py-4 flex items-center justify-between max-w-6xl mx-auto">
          <OlahDanaLogo iconClassName="w-9 h-9" textClassName="text-xl" />
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
        </div>
      </header>

      {/* Hero — left-aligned split layout: copy left, live auto-cycling
          demo right. No centered wall of text, no rainbow gradient — a
          single restrained indigo accent instead. */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 pt-14 sm:pt-20 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              {t(language, 'landing.hero.badge')}
            </span>
            <h1 className="font-geist text-4xl sm:text-6xl font-bold tracking-tight mb-5 leading-[1.05] text-gray-900">
              {t(language, 'landing.hero.title')}
            </h1>
            <p className="text-gray-500 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
              {t(language, 'landing.hero.subtitle')}
            </p>
            <div className="flex items-center gap-5 flex-wrap">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all"
              >
                {t(language, 'landing.hero.cta')} <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-mono font-semibold text-gray-600">
                  {intraday?.price != null ? ihsgPrice.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'}
                </span>
                {t(language, 'landing.live.ihsgLabel')}
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <DemoPanel language={language} intraday={intraday} ihsgPrice={ihsgPrice} ihsgChangeUp={ihsgChangeUp} conicGradient={conicGradient} />
          </Reveal>
        </div>
      </section>

      {/* Data-source marquee — infinite scroll, real sources only */}
      <div className="border-y border-gray-100 bg-gray-50 py-4 overflow-hidden">
        <div className="flex gap-16 animate-marquee whitespace-nowrap w-max">
          {[...MARQUEE_ITEMS, t(language, 'landing.marquee.realtime'), t(language, 'landing.marquee.nofake'),
            ...MARQUEE_ITEMS, t(language, 'landing.marquee.realtime'), t(language, 'landing.marquee.nofake')].map((item, i) => (
            <span key={i} className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex-shrink-0">{item}</span>
          ))}
        </div>
      </div>
      <p className="text-center text-[11px] text-gray-400 py-3">{t(language, 'landing.trust.desc')}</p>

      {/* Problem — left-aligned, muted icon accents instead of 3 loud colors */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24 border-t border-gray-100">
        <Reveal className="max-w-xl mb-12">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3 inline-block">
            {t(language, 'landing.problem.eyebrow')}
          </span>
          <h2 className="font-geist text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
            {t(language, 'landing.problem.title')}
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Reveal delay={0}>
            <div className="group rounded-2xl bg-white border border-gray-200 p-6 h-full hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 text-indigo-500 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.problem.1.title')}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{t(language, 'landing.problem.1.desc')}</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="group rounded-2xl bg-white border border-gray-200 p-6 h-full hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 text-blue-500 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.problem.2.title')}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{t(language, 'landing.problem.2.desc')}</p>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <div className="group rounded-2xl bg-white border border-gray-200 p-6 h-full hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <CircleDot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.problem.3.title')}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{t(language, 'landing.problem.3.desc')}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works — dense numbered steps, Ramp/Linear-style faded numerals */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <Reveal className="max-w-xl mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3 inline-block">
              {t(language, 'landing.how.eyebrow')}
            </span>
            <h2 className="font-geist text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
              {t(language, 'landing.how.title')}
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <Reveal delay={0}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-4xl font-bold text-gray-200 font-mono leading-none">01</span>
                <LogIn className="w-4 h-4 text-indigo-500 mt-1.5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.how.step1.title')}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{t(language, 'landing.how.step1.desc')}</p>
            </Reveal>
            <Reveal delay={120}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-4xl font-bold text-gray-200 font-mono leading-none">02</span>
                <RefreshCw className="w-4 h-4 text-indigo-500 mt-1.5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.how.step2.title')}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{t(language, 'landing.how.step2.desc')}</p>
            </Reveal>
            <Reveal delay={240}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-4xl font-bold text-gray-200 font-mono leading-none">03</span>
                <Zap className="w-4 h-4 text-indigo-500 mt-1.5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">{t(language, 'landing.how.step3.title')}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{t(language, 'landing.how.step3.desc')}</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Modules — left-aligned header, neutral borders with a small controlled color pop on each icon chip only */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <Reveal className="max-w-xl mb-12">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3 inline-block">
            {t(language, 'landing.modules.eyebrow')}
          </span>
          <h2 className="font-geist text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-3">
            {t(language, 'landing.modules.title')}
          </h2>
          <p className="text-gray-500">{t(language, 'landing.modules.subtitle')}</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Reveal delay={0}>
            <div className="group border border-gray-200 rounded-2xl p-7 bg-white relative h-full hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-100 hover:border-gray-300 transition-all duration-300">
              <span className="absolute top-5 right-5 text-[9px] font-bold tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                {t(language, 'landing.atur.badge')}
              </span>
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 p-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
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
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                  {t(language, 'landing.atur.feature2')}
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                  {t(language, 'landing.atur.feature3')}
                </li>
              </ul>
              <p className="text-[11px] text-gray-400 mt-4 pt-4 border-t border-gray-100">
                {t(language, 'landing.atur.note')}
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="group border border-gray-200 rounded-2xl p-7 bg-white relative h-full hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-100 hover:border-gray-300 transition-all duration-300">
              <span className="absolute top-5 right-5 text-[9px] font-bold tracking-widest px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                {t(language, 'landing.saham.badge')}
              </span>
              <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-4 p-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <OlahSahamMark className="w-full h-full" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">OlahSaham</h3>
              <p className="text-sm text-gray-500 mb-4">{t(language, 'landing.saham.tagline')}</p>
              <ul className="space-y-2 text-[13px] text-gray-600">
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  {t(language, 'landing.saham.feature1')}
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  {t(language, 'landing.saham.feature2')}
                </li>
                <li className="flex items-start gap-2">
                  <CircleDot className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  {t(language, 'landing.saham.feature3')}
                </li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <div className="border border-dashed border-gray-300 rounded-2xl p-7 flex flex-col items-center justify-center text-center h-full hover:border-gray-400 transition-colors duration-300">
              <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-500 mb-1.5">{t(language, 'landing.more.title')}</h3>
              <p className="text-[13px] text-gray-400">{t(language, 'landing.more.desc')}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing CTA — boxed card, single restrained accent, not a full-bleed gradient section */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-16 sm:pb-24">
        <Reveal>
          <div className="rounded-3xl border border-gray-200 bg-gray-50 px-8 sm:px-12 py-12 sm:py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div>
              <h2 className="font-geist text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
                {t(language, 'landing.cta.title')}
              </h2>
              <p className="text-gray-500 max-w-md">{t(language, 'landing.cta.subtitle')}</p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all flex-shrink-0"
            >
              {t(language, 'landing.cta.button')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="px-6 sm:px-10 py-8 text-center text-xs text-gray-400">
        OlahDana &middot; {t(language, 'landing.footer')}
      </footer>
    </div>
  );
}
