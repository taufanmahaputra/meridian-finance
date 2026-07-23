import {
  Home, UtensilsCrossed, Car, ShoppingBag, Film, Zap, Plane, Repeat,
  HeartPulse, Sparkles, CreditCard, Wallet, Tag, type LucideIcon,
} from 'lucide-react';

// Keyword-matched icon per category, EN + common Indonesian terms — category
// names are free text the user picks, so this is a best-effort mapping with
// Tag as the fallback for anything unrecognized (including fully custom
// category names). Order matters: first match wins.
const CATEGORY_ICON_RULES: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['housing', 'rent', 'sewa', 'kos', 'kontrakan', 'tempat tinggal'], icon: Home },
  { keywords: ['food', 'grocery', 'groceries', 'makan', 'dapur', 'restaurant', 'restoran'], icon: UtensilsCrossed },
  { keywords: ['transport', 'fuel', 'bensin', 'ojek', 'gojek', 'grab', 'parking', 'parkir', 'tol'], icon: Car },
  { keywords: ['shopping', 'belanja'], icon: ShoppingBag },
  { keywords: ['entertainment', 'hiburan', 'movie', 'bioskop', 'game'], icon: Film },
  { keywords: ['utilities', 'listrik', 'electricity', 'water', 'air', 'internet', 'wifi', 'pulsa'], icon: Zap },
  { keywords: ['travel', 'liburan', 'vacation', 'trip', 'hotel', 'flight', 'tiket'], icon: Plane },
  { keywords: ['subscription', 'langganan', 'netflix', 'spotify'], icon: Repeat },
  { keywords: ['health', 'kesehatan', 'medical', 'dokter', 'obat', 'rumah sakit'], icon: HeartPulse },
  { keywords: ['personal care', 'perawatan', 'salon', 'kecantikan'], icon: Sparkles },
  { keywords: ['installment', 'cicilan', 'loan', 'kredit', 'debt', 'hutang'], icon: CreditCard },
  { keywords: ['income', 'salary', 'gaji', 'pendapatan'], icon: Wallet },
];

export function getCategoryIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  const match = CATEGORY_ICON_RULES.find((r) => r.keywords.some((k) => lower.includes(k)));
  return match?.icon ?? Tag;
}
