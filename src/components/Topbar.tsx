'use client';

import { Upload, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { useFinance } from '@/lib/FinanceContext';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/lib/SidebarContext';

interface TopbarProps {
  title: string;
  onAddMonth?: () => void;
}

export function Topbar({ title, onAddMonth }: TopbarProps) {
  const { user, signOut, t, language } = useFinance();
  const router = useRouter();
  const { toggle } = useSidebar();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '';
  const initials = displayName ? displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

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
        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('common.upload')}</span>
        </Link>
        {onAddMonth && (
          <button
            onClick={onAddMonth}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">{t('common.addMonth')}</span>
          </button>
        )}

        <div className="relative group ml-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full cursor-pointer border-2 border-transparent hover:border-indigo-200 transition-colors" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
              {initials}
            </div>
          )}
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
            </div>
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
    </div>
  );
}
