'use client';

import { cn } from '@/lib/utils';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl card-shadow overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className, action }: { children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <div className={cn('px-5 py-4 border-b border-gray-100 flex items-center justify-between', className)}>
      <h3 className="text-sm font-semibold text-gray-900">{children}</h3>
      {action}
    </div>
  );
}

export function CardBody({ children, className, compact }: { children: React.ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn(compact ? '' : 'p-5', className)}>
      {children}
    </div>
  );
}
