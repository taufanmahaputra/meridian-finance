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

// Same keyword rules, glossy emoji instead — used inside the colorful "3D"
// CategoryIcon tile, where a real emoji glyph reads as more alive than a
// flat outline icon. 🏷️ is the fallback for anything unrecognized.
const CATEGORY_EMOJI_RULES: { keywords: string[]; emoji: string }[] = [
  { keywords: ['housing', 'rent', 'sewa', 'kos', 'kontrakan', 'tempat tinggal'], emoji: '🏠' },
  { keywords: ['food', 'grocery', 'groceries', 'makan', 'dapur', 'restaurant', 'restoran'], emoji: '🍔' },
  { keywords: ['transport', 'fuel', 'bensin', 'ojek', 'gojek', 'grab', 'parking', 'parkir', 'tol'], emoji: '🚗' },
  { keywords: ['shopping', 'belanja'], emoji: '🛍️' },
  { keywords: ['entertainment', 'hiburan', 'movie', 'bioskop', 'game'], emoji: '🎬' },
  { keywords: ['utilities', 'listrik', 'electricity', 'water', 'air', 'internet', 'wifi', 'pulsa'], emoji: '⚡' },
  { keywords: ['travel', 'liburan', 'vacation', 'trip', 'hotel', 'flight', 'tiket'], emoji: '✈️' },
  { keywords: ['subscription', 'langganan', 'netflix', 'spotify'], emoji: '🔁' },
  { keywords: ['health', 'kesehatan', 'medical', 'dokter', 'obat', 'rumah sakit'], emoji: '❤️‍🩹' },
  { keywords: ['personal care', 'perawatan', 'salon', 'kecantikan'], emoji: '✨' },
  { keywords: ['installment', 'cicilan', 'loan', 'kredit', 'debt', 'hutang'], emoji: '💳' },
  { keywords: ['income', 'salary', 'gaji', 'pendapatan'], emoji: '💰' },
];

export function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  const match = CATEGORY_EMOJI_RULES.find((r) => r.keywords.some((k) => lower.includes(k)));
  return match?.emoji ?? '🏷️';
}
