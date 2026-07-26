// Auto-categorization for imported statement rows.
//
// Two-stage by design: deterministic keyword rules run first (instant, free,
// and auditable), and only the leftovers go to the AI. Every result records
// HOW it was decided so the draft panel can show you what to double-check —
// a rule hit is trustworthy, an AI guess deserves a glance, and a fallback
// means nothing matched at all.

export type CategoryMethod = 'rule' | 'ai' | 'fallback';

export interface CategoryGuess {
  category: string;
  method: CategoryMethod;
  /** The keyword that matched, for rule hits — shown as a tooltip. */
  matchedOn?: string;
}

// Merchant/keyword -> canonical category name. Keys are lowercase substrings
// matched against the transaction description. Canonical names line up with
// DEFAULT_CATEGORIES in constants.ts; resolveToUserCategory() maps them onto
// whatever the user actually has.
const MERCHANT_RULES: { keywords: string[]; category: string }[] = [
  {
    category: 'Food & Groceries',
    keywords: [
      'indomaret', 'alfamart', 'alfamidi', 'superindo', 'hypermart', 'ranch market',
      'fairprice', 'ntuc', 'cold storage', 'giant', 'sheng siong', 'tesco', 'lotus',
      'grabfood', 'gofood', 'shopeefood', 'foodpanda', 'deliveroo', 'ubereats',
      'starbucks', 'kopi', 'coffee', 'mcdonald', 'kfc', 'burger', 'pizza', 'sushi',
      'restaurant', 'restoran', 'warung', 'kantin', 'bakery', 'roti', 'cafe',
      'supermarket', 'grocer', 'minimarket', 'food court', 'hawker',
    ],
  },
  {
    category: 'Transport',
    keywords: [
      'grab', 'gojek', 'gocar', 'goride', 'uber', 'bluebird', 'taxi', 'taksi',
      'mrt', 'lrt', 'transjakarta', 'kai', 'krl', 'ez-link', 'ezlink', 'simplygo',
      'shell', 'pertamina', 'petronas', 'esso', 'caltex', 'spbu', 'bensin', 'fuel',
      'parking', 'parkir', 'e-toll', 'etoll', 'tol ', 'gantry', 'comfortdelgro',
    ],
  },
  {
    category: 'Housing',
    keywords: [
      'rent', 'sewa', 'kos ', 'kontrakan', 'apartment', 'apartemen', 'landlord',
      'ipl ', 'maintenance fee', 'service charge', 'mortgage', 'kpr',
    ],
  },
  {
    category: 'Utilities',
    keywords: [
      'pln', 'listrik', 'electric', 'sp services', 'water', 'pdam', 'gas',
      'indihome', 'biznet', 'first media', 'myrepublic', 'singtel', 'starhub', 'm1 ',
      'telkomsel', 'xl axiata', 'indosat', 'tri ', 'smartfren', 'pulsa', 'internet',
      'wifi', 'phone bill', 'tagihan',
    ],
  },
  {
    category: 'Subscriptions',
    keywords: [
      'netflix', 'spotify', 'youtube premium', 'disney', 'hbo', 'viu', 'vidio',
      'apple.com/bill', 'itunes', 'google play', 'icloud', 'dropbox', 'notion',
      'adobe', 'microsoft', 'openai', 'anthropic', 'claude', 'chatgpt', 'github',
      'canva', 'figma', 'subscription', 'langganan',
    ],
  },
  {
    category: 'Shopping',
    keywords: [
      'tokopedia', 'shopee', 'lazada', 'bukalapak', 'blibli', 'zalora', 'amazon',
      'uniqlo', 'h&m', 'zara', 'ikea', 'ace hardware', 'informa', 'decathlon',
      'lazmall', 'tiktok shop', 'erafone', 'ibox', 'apple store', 'watsons',
      'guardian', 'mall', 'department store',
    ],
  },
  {
    category: 'Entertainment',
    keywords: [
      'cgv', 'xxi', 'cinema', 'bioskop', 'golden village', 'shaw theat', 'cathay',
      'steam', 'playstation', 'nintendo', 'xbox', 'epic games', 'garena',
      'ticket', 'tiket', 'concert', 'konser', 'karaoke', 'gym', 'fitness',
    ],
  },
  {
    category: 'Healthcare',
    keywords: [
      'apotek', 'apotik', 'pharmacy', 'kimia farma', 'century', 'guardian pharm',
      'hospital', 'rumah sakit', 'klinik', 'clinic', 'dokter', 'doctor', 'dental',
      'halodoc', 'alodokter', 'bpjs', 'polyclinic', 'medical',
    ],
  },
  {
    category: 'Personal Care',
    keywords: [
      'salon', 'barber', 'pangkas', 'spa', 'nail', 'skincare', 'sociolla',
      'sephora', 'the body shop', 'laundry', 'londri',
    ],
  },
  {
    category: 'Travel',
    keywords: [
      'traveloka', 'tiket.com', 'agoda', 'booking.com', 'airbnb', 'expedia',
      'garuda', 'lion air', 'citilink', 'airasia', 'scoot', 'singapore airlines',
      'batik air', 'hotel', 'resort', 'hostel', 'airport', 'bandara', 'visa fee',
    ],
  },
  {
    category: 'Installments',
    keywords: [
      'cicilan', 'installment', 'angsuran', 'kredivo', 'akulaku', 'home credit',
      'loan', 'pinjaman', 'paylater', 'atome', 'shopback', 'credit card payment',
    ],
  },
  {
    category: 'Income',
    keywords: [
      'salary', 'gaji', 'payroll', 'trsf gaji', 'bonus', 'thr', 'dividen',
      'dividend', 'interest', 'bunga', 'refund', 'reimburse', 'cashback',
      'transfer masuk', 'incoming', 'credit transfer',
    ],
  },
];

/**
 * Maps a canonical rule category onto one of the user's real categories.
 * Falls back to a case-insensitive exact match, then to null so the caller
 * can decide (AI pass, or 'Other').
 */
export function resolveToUserCategory(canonical: string, userCategories: string[]): string | null {
  const exact = userCategories.find((c) => c.toLowerCase() === canonical.toLowerCase());
  if (exact) return exact;
  // Loose match so "Food" or "Groceries" still catches "Food & Groceries".
  const loose = userCategories.find(
    (c) => c.toLowerCase().includes(canonical.toLowerCase()) || canonical.toLowerCase().includes(c.toLowerCase())
  );
  return loose ?? null;
}

/**
 * Rule-only pass. Returns null when no keyword matched, so the caller knows
 * this row still needs the AI (or a manual fix).
 */
export function categorizeByRules(description: string, userCategories: string[]): CategoryGuess | null {
  const desc = description.toLowerCase();
  for (const rule of MERCHANT_RULES) {
    const hit = rule.keywords.find((k) => desc.includes(k));
    if (!hit) continue;
    const resolved = resolveToUserCategory(rule.category, userCategories);
    if (resolved) return { category: resolved, method: 'rule', matchedOn: hit.trim() };
  }
  return null;
}

/**
 * Income transactions are already identified by the bank's own credit/debit
 * flag, so they never need an AI call. Note income rows are excluded from a
 * month's per-category `cats` totals (importMonth sums them into income
 * instead), so this label is really just what shows in the ledger — we use
 * the literal 'Income' to match how buildTransactionLedger tags synthesized
 * income rows, keeping the ledger consistent.
 */
export function categorizeIncome(userCategories: string[]): CategoryGuess {
  const resolved = resolveToUserCategory('Income', userCategories);
  return { category: resolved ?? 'Income', method: 'rule', matchedOn: 'credit row' };
}

/** Unique, trimmed descriptions — what we actually send to the AI. */
export function collectUnmatched(
  rows: { description: string; type: 'Income' | 'Expense' }[],
  userCategories: string[]
): string[] {
  const out = new Set<string>();
  for (const r of rows) {
    if (r.type === 'Income') continue;
    if (categorizeByRules(r.description, userCategories)) continue;
    out.add(r.description.trim());
  }
  return [...out];
}
