'use client';

import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  trendText?: string;
  trendClassName?: string;
  trendSuffix?: string;
  sparkline?: number[];
  sparklineGood?: boolean;
}

export function KpiCard({ icon, iconBg, label, value, trendText, trendClassName, trendSuffix = ' vs prev', sparkline, sparklineGood = true }: KpiCardProps) {
  const sparkColor = sparklineGood ? '#059669' : '#ef4444';
  const sparkData = sparkline?.map((v, i) => ({ i, v }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 card-shadow hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-base', iconBg)}>
          {icon}
        </div>
        {sparkData && sparkData.length >= 2 && (
          <div className="w-16 h-8" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.75} fill={`url(#spark-${label.replace(/\s/g, '')})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
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
