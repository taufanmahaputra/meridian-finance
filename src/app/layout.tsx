import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { FinanceProvider } from '@/lib/FinanceContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Meridian Finance — Personal Financial Planner',
  description: 'Institutional-grade personal finance dashboard with tracking, auditing, forecasting, and market insights.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <FinanceProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-[260px]">
              {children}
            </main>
          </div>
        </FinanceProvider>
      </body>
    </html>
  );
}
