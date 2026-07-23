'use client';

// Circular % indicator, replacing the old linear budget bar — same "color
// only when it's actually over budget" rule: neutral gray ring fill for
// on-track/no-budget, red only past 100%. The percentage itself sits
// centered inside the ring since that's the number people actually read.
export function CategoryProgressRing({
  percent, size = 44, stroke = 4, isOver = false,
}: {
  percent: number | null;
  size?: number;
  stroke?: number;
  isOver?: boolean;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = percent == null ? 0 : Math.min(100, Math.max(0, percent));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" className="stroke-gray-100" />
        {percent != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={isOver ? 'stroke-red-400' : 'stroke-indigo-400'}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold font-mono text-gray-600">
          {percent != null ? Math.round(percent) : '—'}
        </span>
      </div>
    </div>
  );
}
