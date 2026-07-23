'use client';

import { fmt, fmtPct } from '@/lib/calculations';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/CategoryIcon';

interface TopCategoriesBarProps {
  cats: Record<string, number>;
  catColors: Record<string, string>;
  catBudgets?: Record<string, number>;
  currency: string;
  limit?: number;
}

// Ranked "top spending" list — the fintech-dashboard staple: a proportional
// bar per category, largest first, with budget status called out inline.
export function TopCategoriesBar({ cats, catColors, catBudgets = {}, currency, limit = 6 }: TopCategoriesBarProps) {
  const rows = Object.entries(cats)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  const max = rows.length ? rows[0][1] : 0;

  if (rows.length === 0) {
    return <div className="py-8 text-center text-gray-400 text-sm">No spending yet</div>;
  }

  return (
    <div className="space-y-3.5">
      {rows.map(([name, spent]) => {
        const budget = catBudgets[name] || 0;
        const pctUsed = budget > 0 ? (spent / budget) * 100 : null;
        const color = catColors[name] || '#6b7280';
        return (
          <div key={name}>
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-2 text-[13px] font-medium text-gray-700 truncate min-w-0">
                <CategoryIcon name={name} color={color} size="sm" />
                <span className="truncate">{name}</span>
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[13px] font-semibold text-gray-900">{fmt(spent, currency)}</span>
                {pctUsed != null && (
                  <Badge variant={pctUsed > 100 ? 'danger' : pctUsed > 85 ? 'warning' : 'success'} className="text-[9px]">
                    {fmtPct(pctUsed)}
                  </Badge>
                )}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${max > 0 ? (spent / max) * 100 : 0}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
