'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useFinance } from '@/lib/FinanceContext';
import { SidebarProvider } from '@/lib/SidebarContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useFinance();
  const isLogin = pathname === '/login' || pathname.startsWith('/auth/');

  if (isLogin) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-[260px] min-w-0">{children}</main>
      </div>
    </SidebarProvider>
  );
}
