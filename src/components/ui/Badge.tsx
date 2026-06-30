'use client';

import { cn } from '@/lib/utils';

const variants = {
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-500',
  info: 'bg-blue-50 text-blue-600',
  neutral: 'bg-gray-100 text-gray-500',
} as const;

export function Badge({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full', variants[variant], className)}>
      {children}
    </span>
  );
}
