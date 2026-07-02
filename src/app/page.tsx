import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, LineChart, Sparkles, Globe, Wallet, ShieldCheck } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { OlahDanaLogo } from '@/components/logos/OlahDanaLogo';
import { OlahAturMark } from '@/components/logos/OlahAturMark';
import { OlahSahamMark } from '@/components/logos/OlahSahamMark';

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/home');

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <OlahDanaLogo iconClassName="w-8 h-8" textClassName="text-lg" />
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Sign In
        </Link>
      </header>

      <section className="bg-indigo-950 text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28 text-center">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-indigo-300 mb-4">
            Built for Indonesia
          </span>
          <h1 className="font-geist text-4xl sm:text-6xl font-bold tracking-tight mb-5 max-w-3xl mx-auto">
            One account for everything money.
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            OlahDana brings budgeting, investing, and more into a single platform — real data,
            daily-use tools, built specifically for Indonesian finance.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-white text-indigo-950 hover:bg-indigo-50 transition-colors"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="font-geist text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
            A growing family of modules
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Each module is a focused tool under one OlahDana account — more are on the way.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="border-2 border-blue-200 rounded-2xl p-7 bg-blue-50/30 relative">
            <span className="absolute top-5 right-5 text-[9px] font-bold tracking-widest px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              LIVE
            </span>
            <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-4 p-2.5">
              <OlahSahamMark className="w-full h-full" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">OlahSaham</h3>
            <p className="text-sm text-gray-500 mb-4">Investing &amp; market signals for the IDX.</p>
            <ul className="space-y-2 text-[13px] text-gray-600">
              <li className="flex items-start gap-2">
                <LineChart className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                Real-time IHSG mood &amp; daily briefing
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                Buy/avoid watchlist signals
              </li>
              <li className="flex items-start gap-2">
                <Globe className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                Real news across fiscal, monetary &amp; geopolitics
              </li>
            </ul>
          </div>

          <div className="border-2 border-gray-200 rounded-2xl p-7 bg-gray-50/50 relative">
            <span className="absolute top-5 right-5 text-[9px] font-bold tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-700">
              BETA
            </span>
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 p-2.5">
              <OlahAturMark className="w-full h-full" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">OlahAtur</h3>
            <p className="text-sm text-gray-500 mb-4">Personal budgeting, tracking &amp; forecasting.</p>
            <ul className="space-y-2 text-[13px] text-gray-600">
              <li className="flex items-start gap-2">
                <Wallet className="w-3.5 h-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                Import statements &amp; auto-categorize
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                Budgets, forecasts &amp; spending insights
              </li>
            </ul>
            <p className="text-[11px] text-gray-400 mt-4 pt-4 border-t border-gray-200">
              Currently invite-only while in closed beta.
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-7 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-300 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-400 mb-1.5">More modules</h3>
            <p className="text-[13px] text-gray-400">New tools are on the way — one account, growing coverage.</p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16 text-center">
          <h2 className="font-geist text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
            Start with one account.
          </h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Sign in with Google — no separate password, no banking integration required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Sign In with Google <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="px-6 sm:px-10 py-8 text-center text-xs text-gray-400">
        OlahDana &middot; Built for Indonesia
      </footer>
    </div>
  );
}
