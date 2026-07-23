'use client';

import { getCategoryEmoji } from '@/lib/categoryIcons';
import { cn } from '@/lib/utils';

const SIZE_MAP = {
  sm: { box: 'w-7 h-7 rounded-lg', text: 'text-sm' },
  md: { box: 'w-10 h-10 rounded-xl', text: 'text-lg' },
  lg: { box: 'w-14 h-14 rounded-2xl', text: 'text-2xl' },
} as const;

function clampChannel(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

// Lightens (positive percent) or darkens (negative) a hex color — used to
// turn a category's flat stored color into a two-tone gradient for the
// glossy tile.
function shade(hex: string, percent: number) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = clampChannel((num >> 16) + 255 * percent);
  const g = clampChannel(((num >> 8) & 0xff) + 255 * percent);
  const b = clampChannel((num & 0xff) + 255 * percent);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Colorful "3D" category tile — a two-tone gradient (derived from the
// category's own stored color) plus a soft outer shadow and an inset
// highlight for a glossy, bubble-like pop, with the category's emoji
// centered on top. Used everywhere a category shows up so the same
// shape+color reads consistently across the app.
export function CategoryIcon({
  name, color, size = 'md', onClick, className,
}: {
  name: string;
  color: string;
  size?: keyof typeof SIZE_MAP;
  onClick?: () => void;
  className?: string;
}) {
  const emoji = getCategoryEmoji(name);
  const s = SIZE_MAP[size];
  const gradient = `linear-gradient(150deg, ${shade(color, 0.22)} 0%, ${color} 55%, ${shade(color, -0.15)} 100%)`;

  const content = (
    <span className={s.text} style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }}>
      {emoji}
    </span>
  );

  const sharedProps = {
    className: cn(
      s.box,
      'flex items-center justify-center flex-shrink-0 shadow-[0_2px_5px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.45)]',
      onClick && 'cursor-pointer hover:scale-105 active:scale-95 transition-transform',
      className
    ),
    style: { background: gradient },
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={name} {...sharedProps}>
        {content}
      </button>
    );
  }

  return <div {...sharedProps}>{content}</div>;
}
