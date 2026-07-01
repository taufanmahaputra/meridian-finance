'use client';

import { Upload, Menu } from 'lucide-react';
import Link from 'next/link';
import { useFinance } from '@/lib/FinanceContext';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/lib/SidebarContext';

interface TopbarProps {
  title: string;
  onAddMonth?: () => void;
}

export function Topbar({ title, onAddMonth }: TopbarProps) {
  const { t, language } = useFinance();
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const isInvest = pathname.startsWith('/invest');

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={toggle} className="md:hidden text-gray-500 hover:text-gray-900 flex-shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h2>
          <p className="text-xs text-gray-400 hidden sm:block">
            {t('common.lastUpdated')}: {new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {!isInvest && (
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('common.upload')}</span>
          </Link>
        )}
        {onAddMonth && (
          <button
            onClick={onAddMonth}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">{t('common.addMonth')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
