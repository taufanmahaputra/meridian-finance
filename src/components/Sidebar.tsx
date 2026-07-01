'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid, DollarSign, CheckCircle, Activity,
  Lightbulb, TrendingUp, Upload, X, CalendarDays, Settings,
  Signal, Compass, ChevronDown, Check, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/SidebarContext';
import { useFinance } from '@/lib/FinanceContext';
import { ADMIN_EMAIL } from '@/lib/constants';
import { BetaAccessModal } from '@/components/BetaAccessModal';

const olahAturSections = [
  {
    titleKey: 'nav.section.overview',
    items: [
      { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutGrid },
      { href: '/monthly', labelKey: 'nav.monthly', icon: CalendarDays },
      { href: '/transactions', labelKey: 'nav.transactions', icon: DollarSign },
      { href: '/budget', labelKey: 'nav.budget', icon: CheckCircle },
    ],
  },
  {
    titleKey: 'nav.section.analytics',
    items: [
      { href: '/forecast', labelKey: 'nav.forecast', icon: Activity },
      { href: '/insights', labelKey: 'nav.insights', icon: Lightbulb },
    ],
  },
  {
    titleKey: 'nav.section.data',
    items: [
      { href: '/upload', labelKey: 'nav.upload', icon: Upload },
    ],
  },
];

const olahSahamSections = [
  {
    titleKey: 'nav.section.invest',
    items: [
      { href: '/invest', labelKey: 'invest.dashboard.title', icon: LayoutGrid },
      { href: '/invest/signals', labelKey: 'invest.signals.title', icon: Signal },
      { href: '/invest/signals/watchlist', labelKey: 'invest.watchlist.title', icon: ListChecks },
      { href: '/invest/market', labelKey: 'nav.market', icon: TrendingUp },
      { href: '/invest/decision', labelKey: 'invest.decision.title', icon: Compass },
    ],
  },
];

// Extensible module registry — add a new entry here to introduce another
// module to the switcher without restructuring the sidebar.
const MODULES = [
  {
    id: 'atur',
    nameKey: 'nav.module.olahatur',
    descKey: 'nav.module.olahaturDesc',
    icon: LayoutGrid,
    home: '/dashboard',
    chipBg: 'bg-indigo-50',
    chipText: 'text-indigo-600',
    match: (path: string) => !path.startsWith('/invest'),
  },
  {
    id: 'saham',
    nameKey: 'nav.module.olahsaham',
    descKey: 'nav.module.olahsahamDesc',
    icon: TrendingUp,
    home: '/invest',
    chipBg: 'bg-amber-50',
    chipText: 'text-amber-600',
    match: (path: string) => path.startsWith('/invest'),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, close } = useSidebar();
  const { t, user } = useFinance();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [betaModalOpen, setBetaModalOpen] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

  const activeModule = MODULES.find((m) => m.match(pathname)) ?? MODULES[0];
  const navSections = activeModule.id === 'saham' ? olahSahamSections : olahAturSections;

  function selectModule(moduleId: string, home: string) {
    setSwitcherOpen(false);
    if (moduleId === 'atur' && !isAdmin) {
      setBetaModalOpen(true);
      return;
    }
    router.push(home);
    close();
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={close}
        />
      )}
      <aside
        className={cn(
          'w-[260px] bg-white border-r border-gray-200 flex flex-col fixed top-0 left-0 bottom-0 z-50 transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
      >
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <Link href="/home" onClick={close} className="flex items-center gap-2.5 group">
            <div className="brand-mark w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">O</div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors">OlahDana</h1>
          </Link>
          <button onClick={close} className="md:hidden text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pt-3 relative">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-gray-50/60 transition-colors"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', activeModule.chipBg, activeModule.chipText)}>
              <activeModule.icon className="w-[17px] h-[17px]" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-[13px] font-semibold text-gray-900 truncate">{t(activeModule.nameKey)}</div>
              <div className="text-[10px] text-gray-400 truncate">{t(activeModule.descKey)}</div>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform', switcherOpen && 'rotate-180')} />
          </button>

          {switcherOpen && (
            <>
              <div className="fixed inset-0 z-[59]" onClick={() => setSwitcherOpen(false)} />
              <div className="absolute left-3 right-3 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[60]">
                {MODULES.map((m) => {
                  const isActive = m.id === activeModule.id;
                  const showBeta = m.id === 'atur' && !isAdmin;
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectModule(m.id, m.home)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left',
                        isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', m.chipBg, m.chipText)}>
                        <m.icon className="w-[17px] h-[17px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                          {t(m.nameKey)}
                          {showBeta && (
                            <span className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              {t('beta.badge')}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">{t(m.descKey)}</div>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.titleKey}>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1.5">
                {t(section.titleKey)}
              </div>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors mb-0.5',
                      active
                        ? 'bg-indigo-50 text-indigo-600 font-semibold'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="pt-4">
            <Link
              href="/settings"
              onClick={close}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors mb-0.5',
                pathname === '/settings'
                  ? 'bg-indigo-50 text-indigo-600 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Settings className="w-[18px] h-[18px]" />
              {t('nav.settings')}
            </Link>
          </div>
        </nav>
        <div className="px-5 py-4 border-t border-gray-100 text-[11px] text-gray-400">
          {t('nav.footer')}<br />
          {t('nav.footerSub')}
        </div>
      </aside>

      <BetaAccessModal open={betaModalOpen} onClose={() => setBetaModalOpen(false)} />
    </>
  );
}
