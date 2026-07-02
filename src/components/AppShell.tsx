'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useFinance } from '@/lib/FinanceContext';
import { SidebarProvider, useSidebar } from '@/lib/SidebarContext';

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className={`flex-1 min-w-0 transition-[margin] duration-200 ease-out ${collapsed ? 'md:ml-[76px]' : 'md:ml-[260px]'}`}>
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, t } = useFinance();
  const isLogin = pathname === '/login' || pathname.startsWith('/auth/');
  const isLanding = pathname === '/';
  const isHome = pathname === '/home';

  if (isLogin || isLanding) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isHome) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppShellContent>{children}</AppShellContent>
    </SidebarProvider>
  );
}
