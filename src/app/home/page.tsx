'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutGrid, TrendingUp, ArrowRight, LogOut } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { getSignals } from '@/lib/investSignals';
import { fmt, getTrendData } from '@/lib/calculations';
import { ADMIN_EMAIL } from '@/lib/constants';
import { BetaAccessModal } from '@/components/BetaAccessModal';

const GREETINGS_EN = [
  'How\'s your day going?',
  'Ready to make today count?',
  'Let\'s check on your money today.',
  'Hope you\'re having a good one.',
  'What are we working on today?',
  'Let\'s see where things stand.',
  'Welcome back — let\'s dive in.',
];

const GREETINGS_ID = [
  'Gimana harimu?',
  'Siap bikin hari ini produktif?',
  'Yuk cek kondisi keuanganmu hari ini.',
  'Semoga harimu menyenangkan.',
  'Mau ngerjain apa hari ini?',
  'Yuk lihat perkembangan terbaru.',
  'Selamat datang kembali — yuk mulai.',
];

interface MarketResponse {
  ihsg: { value: number | null; ytdPct: number | null };
}

export default function HomePage() {
  const { user, months, currency, language, t, signOut } = useFinance();
  const router = useRouter();
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [betaModalOpen, setBetaModalOpen] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    fetch('/api/market').then((res) => res.json()).then(setMarket).catch(() => {});
  }, []);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const greetings = language === 'id' ? GREETINGS_ID : GREETINGS_EN;
  const greeting = greetings[new Date().getDay() % greetings.length];
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || '';

  const lastMonth = months.length > 0 ? months[months.length - 1] : null;
  const prevMonth = months.length > 1 ? months[months.length - 2] : null;
  const savingsTrend = lastMonth ? getTrendData(lastMonth.savings, prevMonth?.savings ?? null) : null;

  const signals = getSignals(language);
  const buyCount = signals.filter((s) => s.signal === 'buy').length;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex justify-end px-6 py-5">
        <div className="relative group">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" className="w-9 h-9 rounded-full cursor-pointer" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
              {displayName.slice(0, 2).toUpperCase() || 'U'}
            </div>
          )}
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('common.signOut')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="text-center mb-10">
          <div className="brand-mark w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold mx-auto mb-5">O</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Hi{displayName ? `, ${displayName}` : ''}.
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">{greeting}</p>
          <p className="text-xs text-gray-400 mt-3 uppercase tracking-widest font-medium">{t('home.prompt')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          {(() => {
            const cardBody = (
              <div className="relative bg-white border border-gray-200 rounded-2xl card-shadow hover:shadow-lg hover:border-indigo-200 transition-all p-6 h-full flex flex-col">
                {!isAdmin && (
                  <span className="absolute top-4 right-4 text-[9px] font-bold tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    {t('beta.badge')}
                  </span>
                )}
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div className="text-base font-bold text-gray-900 mb-1">{t('nav.module.olahatur')}</div>
                <div className="text-xs text-gray-400 mb-5">{t('nav.module.olahaturDesc')}</div>

                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{t('home.atur.stat')}</div>
                  {lastMonth ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-gray-900">{fmt(lastMonth.savings, currency)}</span>
                      {savingsTrend && savingsTrend.text !== '--' && (
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${savingsTrend.className}`}>{savingsTrend.text}</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">{t('home.noData')}</div>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 mt-4 group-hover:gap-1.5 transition-all">
                  {t('home.atur.cta')} <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );

            return isAdmin ? (
              <Link href="/dashboard" className="group">{cardBody}</Link>
            ) : (
              <button onClick={() => setBetaModalOpen(true)} className="group text-left w-full">{cardBody}</button>
            );
          })()}

          <Link href="/invest" className="group">
            <div className="bg-white border border-gray-200 rounded-2xl card-shadow hover:shadow-lg hover:border-amber-200 transition-all p-6 h-full flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="text-base font-bold text-gray-900 mb-1">{t('nav.module.olahsaham')}</div>
              <div className="text-xs text-gray-400 mb-5">{t('nav.module.olahsahamDesc')}</div>

              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{t('home.saham.stat')}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900">
                    {market?.ihsg.value != null ? market.ihsg.value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'}
                  </span>
                  {market?.ihsg.ytdPct != null && (
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${market.ihsg.ytdPct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
                      {market.ihsg.ytdPct >= 0 ? '+' : ''}{market.ihsg.ytdPct.toFixed(2)}% YTD
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">{buyCount} {t('home.signalsBuy')}</div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 mt-4 group-hover:gap-1.5 transition-all">
                {t('home.saham.cta')} <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      <BetaAccessModal open={betaModalOpen} onClose={() => setBetaModalOpen(false)} />
    </div>
  );
}
