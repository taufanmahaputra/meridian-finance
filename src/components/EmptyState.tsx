'use client';

import Link from 'next/link';
import { Upload, PlusCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  description: string;
  onAddMonth?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ title, description, onAddMonth, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white border border-dashed border-gray-200 rounded-xl">
      <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
        {icon ?? <Upload className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 max-w-xs mb-6">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Statement
        </Link>
        {onAddMonth && (
          <button
            onClick={onAddMonth}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Month Manually
          </button>
        )}
      </div>
    </div>
  );
}
