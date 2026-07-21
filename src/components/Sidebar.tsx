'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid, DollarSign, CheckCircle, Activity,
  Lightbulb, TrendingUp, Upload, X, CalendarDays, Settings,
  Signal, Compass, ChevronDown, Check, ListChecks, ChevronLeft, ChevronRight,
  Languages, HelpCircle, LogOut, PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/SidebarContext';
import { useFinance } from '@/lib/FinanceContext';
import { ADMIN_EMAIL, OLAHATUR_BETA_PATHS, whatsappLink } from '@/lib/constants';
import { BetaAccessModal } from '@/components/BetaAccessModal';
import { OlahDanaMark } from '@/components/logos/OlahDanaMark';
import { OlahAturMark } from '@/components/logos/OlahAturMark';
import { OlahSahamMark } from '@/components/logos/OlahSahamMark';

const olahAturSections = [
  {
    titleKey: 'nav.section.overview',
    items: [
      { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutGrid },
      { href: '/monthly', labelKey: 'nav.monthly', icon: CalendarDays },
      { href: '/transactions', labelKey: 'nav.transactions', icon: DollarSign },
      { href: '/spending', labelKey: 'nav.spending', icon: PieChart },
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
    icon: OlahAturMark,
    home: '/dashboard',
    chipBg: 'bg-indigo-600',
    chipText: 'text-white',
    // Only OlahAtur's own pages — NOT shared pages like /settings, which
    // belong to neither module and shouldn't hijack the switcher.
    match: (path: string) => OLAHATUR_BETA_PATHS.some((p) => path.startsWith(p)),
  },
  {
    id: 'saham',
    nameKey: 'nav.module.olahsaham',
    descKey: 'nav.module.olahsahamDesc',
    icon: OlahSahamMark,
    home: '/invest',
    chipBg: 'bg-blue-500',
    chipText: 'text-white',
    match: (path: string) => path.startsWith('/invest'),
  },
];

const LAST_MODULE_STORAGE_KEY = 'olahdana:lastModule';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, close, collapsed, toggleCollapsed } = useSidebar();
  const { t, user, language, updateLanguage, signOut } = useFinance();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [betaModalOpen, setBetaModalOpen] = useState(false);
  // Sidebar only ever mounts client-side (AppShell gates it behind the auth
  // loading check), so reading localStorage in the initializer is safe —
  // there's no SSR pass for this component to mismatch against.
  const [lastModuleId, setLastModuleId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'atur';
    return window.localStorage.getItem(LAST_MODULE_STORAGE_KEY) || 'atur';
  });
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Shared pages (Settings, etc.) belong to neither module — when on one,
  // keep showing whichever module the user was actually browsing instead
  // of silently snapping the switcher back to OlahAtur.
  const matchedModule = MODULES.find((m) => m.match(pathname));

  useEffect(() => {
    if (matchedModule) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastModuleId(matchedModule.id);
      window.localStorage.setItem(LAST_MODULE_STORAGE_KEY, matchedModule.id);
    }
  }, [matchedModule]);

  const activeModule = matchedModule ?? MODULES.find((m) => m.id === lastModuleId) ?? MODULES[0];
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

  async function handleSignOut() {
    setAccountMenuOpen(false);
    await signOut();
    router.push('/login');
  }

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

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
          'bg-indigo-950 flex flex-col fixed top-0 left-0 bottom-0 z-50 transition-[transform,width] duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
          collapsed ? 'w-[260px] md:w-[76px]' : 'w-[260px]'
        )}
      >
        {/* Desktop-only collapse toggle, floating on the sidebar's edge */}
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex absolute -right-3 top-8 w-6 h-6 rounded-full bg-indigo-950 border border-white/10 text-white/50 hover:text-white hover:border-white/30 items-center justify-center transition-colors z-10"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <div className={cn('px-5 py-5 border-b border-white/10 flex items-center', collapsed ? 'md:justify-center md:px-0' : 'justify-between')}>
          <Link href="/home" onClick={close} className={cn('flex items-center gap-2.5 group min-w-0', collapsed && 'md:justify-center')}>
            <div className="brand-mark w-7 h-7 rounded-lg flex items-center justify-center text-white p-1.5 flex-shrink-0">
              <OlahDanaMark className="w-full h-full" />
            </div>
            <h1 className={cn('font-geist text-lg font-semibold text-white tracking-tight group-hover:text-indigo-300 transition-colors truncate', collapsed && 'md:hidden')}>
              OlahDana
            </h1>
          </Link>
          <button onClick={close} className={cn('md:hidden text-white/40 hover:text-white', collapsed && 'md:hidden')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pt-3 relative">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 transition-colors',
              collapsed && 'md:justify-center md:px-0'
            )}
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', activeModule.chipBg, activeModule.chipText)}>
              <activeModule.icon className="w-[17px] h-[17px]" />
            </div>
            <div className={cn('flex-1 text-left min-w-0', collapsed && 'md:hidden')}>
              <div className="text-[13px] font-semibold text-white truncate">{t(activeModule.nameKey)}</div>
              <div className="text-[10px] text-white/40 truncate">{t(activeModule.descKey)}</div>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-white/40 flex-shrink-0 transition-transform', switcherOpen && 'rotate-180', collapsed && 'md:hidden')} />
          </button>

          {switcherOpen && (
            <>
              <div className="fixed inset-0 z-[59]" onClick={() => setSwitcherOpen(false)} />
              <div className={cn(
                'absolute top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[60]',
                collapsed ? 'left-3 right-3 md:left-[calc(100%+8px)] md:right-auto md:top-0 md:mt-0 md:w-64' : 'left-3 right-3'
              )}>
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
              <div className={cn('text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 pt-4 pb-1.5', collapsed && 'md:hidden')}>
                {t(section.titleKey)}
              </div>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    title={collapsed ? t(item.labelKey) : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors mb-0.5',
                      collapsed && 'md:justify-center',
                      active
                        ? 'bg-indigo-500/15 text-indigo-300 font-semibold'
                        : 'text-white/50 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className={cn(collapsed && 'md:hidden')}>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/10 relative">
          <button
            onClick={() => setAccountMenuOpen((v) => !v)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors',
              collapsed && 'md:justify-center md:px-0'
            )}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {displayName.slice(0, 2).toUpperCase() || 'U'}
              </div>
            )}
            <div className={cn('flex-1 text-left min-w-0', collapsed && 'md:hidden')}>
              <div className="text-[13px] font-semibold text-white truncate">{displayName || t('nav.account')}</div>
              <div className="text-[10px] text-white/40 truncate">{user?.email}</div>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-white/40 flex-shrink-0 transition-transform', accountMenuOpen && 'rotate-180', collapsed && 'md:hidden')} />
          </button>

          {accountMenuOpen && (
            <>
              <div className="fixed inset-0 z-[59]" onClick={() => setAccountMenuOpen(false)} />
              <div className={cn(
                'absolute bottom-full mb-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[60] py-1',
                collapsed ? 'left-3 right-3 md:left-[calc(100%+8px)] md:right-auto md:bottom-0 md:mb-0 md:w-64' : 'left-3 right-3'
              )}>
                <Link
                  href="/settings"
                  onClick={() => { setAccountMenuOpen(false); close(); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4" /> {t('nav.settings')}
                </Link>

                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="flex items-center gap-2.5 text-[13px] font-medium text-gray-700">
                    <Languages className="w-4 h-4" /> {t('settings.language.title')}
                  </span>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-semibold">
                    <button
                      onClick={() => updateLanguage('en')}
                      className={cn('px-2 py-1 transition-colors', language === 'en' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => updateLanguage('id')}
                      className={cn('px-2 py-1 transition-colors', language === 'id' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
                    >
                      ID
                    </button>
                  </div>
                </div>

                <a
                  href={whatsappLink(t('nav.getHelpMessage'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" /> {t('nav.getHelp')}
                </a>

                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> {t('common.signOut')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <BetaAccessModal open={betaModalOpen} onClose={() => setBetaModalOpen(false)} />
    </>
  );
}
