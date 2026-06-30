'use client';

import { cn } from '@/lib/utils';

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  trendText?: string;
  trendClassName?: string;
  trendSuffix?: string;
}

export function KpiCard({ icon, iconBg, label, value, trendText, trendClassName, trendSuffix = ' vs prev' }: KpiCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-base mb-3', iconBg)}>
        {icon}
      </div>
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {trendText && (
        <span className={cn('inline-flex items-center text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-full', trendClassName)}>
          {trendText}{trendSuffix}
        </span>
      )}
    </div>
  );
}
