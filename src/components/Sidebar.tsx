'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, DollarSign, CheckCircle, Activity,
  Lightbulb, TrendingUp, Upload, X, CalendarDays, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/SidebarContext';
import { useFinance } from '@/lib/FinanceContext';

const navSections = [
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
      { href: '/market', labelKey: 'nav.market', icon: TrendingUp },
    ],
  },
  {
    titleKey: 'nav.section.data',
    items: [
      { href: '/upload', labelKey: 'nav.upload', icon: Upload },
      { href: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open, close } = useSidebar();
  const { t } = useFinance();

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
        <div className="px-5 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-indigo-600 tracking-tight">Meridian</h1>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Financial Planner</span>
          </div>
          <button onClick={close} className="md:hidden text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
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
        </nav>
        <div className="px-5 py-4 border-t border-gray-100 text-[11px] text-gray-400">
          {t('nav.footer')}<br />
          {t('nav.footerSub')}
        </div>
      </aside>
    </>
  );
}
