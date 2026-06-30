'use client';

import { Upload } from 'lucide-react';
import Link from 'next/link';

interface TopbarProps {
  title: string;
  onAddMonth?: () => void;
}

export function Topbar({ title, onAddMonth }: TopbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">
          Last updated: {new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </Link>
        {onAddMonth && (
          <button
            onClick={onAddMonth}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            + Add Month
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
          T
        </div>
      </div>
    </div>
  );
}
