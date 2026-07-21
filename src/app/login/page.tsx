'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { OlahDanaMark } from '@/components/logos/OlahDanaMark';

export default function LoginPage() {
  const supabase = createClient();

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to home
      </Link>

      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8 group">
          <div className="brand-mark w-12 h-12 rounded-xl flex items-center justify-center text-white p-2.5 mx-auto mb-3 transition-transform duration-300 group-hover:scale-105">
            <OlahDanaMark className="w-full h-full" />
          </div>
          <h1 className="font-geist text-2xl font-semibold text-gray-900 tracking-tight">OlahDana</h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[.2em] mt-1">All-In-One Financial Platform</p>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-center mb-2">Welcome back</h2>
          <p className="text-sm text-gray-400 text-center mb-8">Sign in to access your financial dashboard</p>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-gray-200 rounded-full text-sm font-semibold text-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              By signing in, you agree to keep your financial data secure.<br />
              All data is stored per-user with row-level security.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            OlahDana v1.0 &middot; No banking integration required
          </p>
        </div>
      </div>
    </div>
  );
}
