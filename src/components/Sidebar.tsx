'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, DollarSign, CheckCircle, Activity,
  Lightbulb, TrendingUp, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navSections = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
      { href: '/transactions', label: 'Transactions', icon: DollarSign },
      { href: '/budget', label: 'Budget & Audit', icon: CheckCircle },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { href: '/forecast', label: 'Forecast', icon: Activity },
      { href: '/insights', label: 'Insights', icon: Lightbulb },
      { href: '/market', label: 'Market Outlook', icon: TrendingUp },
    ],
  },
  {
    title: 'Data',
    items: [
      { href: '/upload', label: 'Upload Statement', icon: Upload },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col fixed top-0 left-0 bottom-0 z-50">
      <div className="px-5 py-6 border-b border-gray-100">
        <h1 className="text-lg font-bold text-indigo-600 tracking-tight">Meridian</h1>
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Financial Planner</span>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1.5">
              {section.title}
            </div>
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors mb-0.5',
                    active
                      ? 'bg-indigo-50 text-indigo-600 font-semibold'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-gray-100 text-[11px] text-gray-400">
        Meridian v1.0 &middot; All data local<br />
        No banking integration required
      </div>
    </aside>
  );
}
