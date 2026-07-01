import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { FinanceProvider } from '@/lib/FinanceContext';
import { AppShell } from '@/components/AppShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE_URL = 'https://olahdana.id';
const SITE_NAME = 'OlahDana';
const DESCRIPTION = 'OlahDana is an all-in-one financial platform for Indonesia — OlahAtur for budgeting, tracking, and forecasting, and OlahSaham for market outlook, investment signals, and decision-making tools.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'OlahDana — All-In-One Financial Platform for Indonesia',
    template: '%s | OlahDana',
  },
  description: DESCRIPTION,
  keywords: [
    'OlahDana', 'OlahAtur', 'OlahSaham',
    'personal finance Indonesia', 'aplikasi keuangan pribadi',
    'budgeting app', 'aplikasi anggaran', 'pengelolaan keuangan',
    'investment signals Indonesia', 'sinyal saham', 'IHSG',
    'financial planner', 'perencana keuangan',
  ],
  authors: [{ name: 'OlahDana' }],
  creator: 'OlahDana',
  publisher: 'OlahDana',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'OlahDana — All-In-One Financial Platform for Indonesia',
    description: DESCRIPTION,
    locale: 'en_US',
    alternateLocale: ['id_ID'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OlahDana — All-In-One Financial Platform for Indonesia',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'OlahDana',
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'IDR',
  },
  publisher: {
    '@type': 'Organization',
    name: 'OlahDana',
    url: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${GeistSans.variable} antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <FinanceProvider>
          <AppShell>{children}</AppShell>
        </FinanceProvider>
      </body>
    </html>
  );
}
