import { OlahDanaMark } from './OlahDanaMark';
import { cn } from '@/lib/utils';

interface Props {
  iconClassName?: string;
  textClassName?: string;
  showWordmark?: boolean;
}

// Full brand lockup: gradient ring mark + "OlahDana" wordmark in Geist.
// Use showWordmark={false} for icon-only contexts (favicon-scale, tight nav).
export function OlahDanaLogo({ iconClassName, textClassName, showWordmark = true }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn('brand-mark rounded-lg flex items-center justify-center text-white p-1.5 flex-shrink-0', iconClassName)}>
        <OlahDanaMark className="w-full h-full" />
      </div>
      {showWordmark && (
        <span className={cn('font-geist font-semibold tracking-tight text-gray-900', textClassName)}>
          OlahDana
        </span>
      )}
    </div>
  );
}
