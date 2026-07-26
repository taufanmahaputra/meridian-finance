// Credit-card PDF statement parsing.
//
// Credit card statements differ from bank account statements in ways that
// matter for parsing:
//   - No running balance column.
//   - Transaction dates are often DD/MM with NO year — the year has to come
//     from the statement period printed in the header.
//   - Most rows are charges; payments/refunds appear as credits, usually
//     flagged with a CR / "CREDIT" marker or a minus sign rather than living
//     in a separate column.
//   - Lots of non-transaction noise (credit limit, minimum payment, due
//     date, rewards points, totals) that must never become a transaction.
//
// Detection is heuristic and deliberately conservative: a line only becomes a
// transaction if it starts with a date AND ends with a parseable amount AND
// isn't on the noise list. Everything imported still lands in the editable
// draft panel, so a false positive is a visible row you can uncheck rather
// than silent bad data.

import { parseAmount } from './bankTemplates';
import type { ParsedRow } from './bankTemplates';
import type { StatementLine } from './pdfStatement';

export interface CardTemplate {
  id: string;
  label: string;
  currency: string;
  /** Lowercased fragments; any one present in the doc identifies the issuer. */
  fingerprints: string[];
}

export const CARD_TEMPLATES: CardTemplate[] = [
  { id: 'bca-cc', label: 'BCA Credit Card (Indonesia)', currency: 'IDR', fingerprints: ['bca card', 'pt bank central asia', 'bca.co.id', 'halo bca'] },
  { id: 'uob-cc-id', label: 'UOB Credit Card (Indonesia)', currency: 'IDR', fingerprints: ['uob indonesia', 'pt bank uob', 'uob.co.id'] },
  { id: 'citi-cc-sg', label: 'Citibank Credit Card (Singapore)', currency: 'SGD', fingerprints: ['citibank singapore', 'citibank n.a', 'citi.com.sg', 'citibank online'] },
  { id: 'uob-cc-sg', label: 'UOB Credit Card (Singapore)', currency: 'SGD', fingerprints: ['united overseas bank', 'uob.com.sg'] },
];

/** Lines containing any of these are summary/marketing noise, never a txn. */
const NOISE_PATTERNS = [
  // English
  'credit limit', 'available credit', 'minimum payment', 'payment due', 'due date',
  'statement date', 'statement period', 'previous balance', 'opening balance',
  'closing balance', 'total amount due', 'new balance', 'current balance',
  'reward', 'points earned', 'points balance', 'interest rate', 'annual fee',
  'late payment', 'finance charge', 'cash advance limit', 'page ', 'summary',
  'total debit', 'total credit', 'sub total', 'subtotal', 'grand total',
  // Indonesian
  'limit kredit', 'pembayaran minimum', 'jatuh tempo', 'tanggal cetak',
  'saldo sebelumnya', 'saldo awal', 'saldo akhir', 'total tagihan',
  'tagihan baru', 'sisa limit', 'bunga', 'biaya tahunan', 'denda',
  'periode', 'lembar', 'halaman', 'total transaksi', 'ringkasan',
  'kurs', 'informasi penting',
];

/** Markers that mean "this amount is money coming back to me". */
const CREDIT_MARKERS = [' cr', 'cr ', '(cr)', 'credit', 'kredit', 'pembayaran', 'payment', 'refund', 'reversal', 'cashback', 'rebate'];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  mei: 5, agu: 8, ags: 8, okt: 10, des: 12,
};

export interface StatementPeriod {
  /** Year to attach to DD/MM dates that omit it. */
  year: number;
  /** Month (1-12) the statement covers, when detectable. */
  month?: number;
}

/**
 * Finds the statement's year (and month when available) so DD/MM transaction
 * dates can be completed. Falls back to the current year, which is right for
 * a statement you're importing soon after receiving it.
 */
export function detectPeriod(lines: StatementLine[]): StatementPeriod {
  const joined = lines.slice(0, 40).map((l) => l.text).join(' | ').toLowerCase();

  // "01/06/2026 - 30/06/2026" or "01-06-2026"
  const range = joined.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*[-–to]+\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (range) return { year: +range[6], month: +range[5] };

  // "June 2026" / "Jun 2026" / "Juni 2026"
  const named = joined.match(/\b([a-z]{3,9})\s+(20\d{2})\b/);
  if (named) {
    const m = MONTHS[named[1].slice(0, 3)];
    if (m) return { year: +named[2], month: m };
  }

  // Any lone 4-digit year as a last resort.
  const loose = joined.match(/\b(20\d{2})\b/);
  return { year: loose ? +loose[1] : new Date().getFullYear() };
}

/**
 * Completes a transaction date into ISO form.
 * Handles DD/MM, DD/MM/YY(YY), and DD MMM — attaching the statement year when
 * the row itself omits it.
 */
export function resolveCardDate(raw: string, period: StatementPeriod): string | null {
  const s = raw.trim();

  // DD/MM/YYYY or DD/MM/YY
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return iso(y, +m[2], +m[1]);
  }
  // DD/MM (no year) — take it from the statement period.
  m = s.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (m) return iso(period.year, +m[2], +m[1]);

  // DD MMM YYYY / DD MMM
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?\s*(\d{2,4})?$/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (!mo) return null;
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : period.year;
    return iso(y, mo, +m[1]);
  }
  return null;
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Identifies the card issuer from anywhere in the document text. */
export function detectCardTemplate(lines: StatementLine[]): CardTemplate | null {
  const all = lines.map((l) => l.text).join(' ').toLowerCase();
  return CARD_TEMPLATES.find((t) => t.fingerprints.some((f) => all.includes(f))) ?? null;
}

function isNoise(lower: string): boolean {
  return NOISE_PATTERNS.some((p) => lower.includes(p));
}

// A leading date in any of the shapes credit cards use.
const LEADING_DATE = /^(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,}\.?(?:\s+\d{2,4})?)\s+/;
// A trailing money amount, optionally followed by a CR/DB marker.
const TRAILING_AMOUNT = /(-?\(?[\d.,]{3,}\)?)\s*(CR|DR|DB|CREDIT|DEBIT)?\.?$/i;

export interface CardParseResult {
  rows: ParsedRow[];
  /** Lines that looked like transactions but had no usable amount. */
  skipped: number;
  /** Lines rejected as summary/noise — reported so the count is explainable. */
  noiseFiltered: number;
  period: StatementPeriod;
}

/**
 * Turns extracted PDF lines into transaction rows.
 *
 * Conservative by design: requires a leading date AND a trailing amount AND
 * a description of real length, and rejects known noise. Anything it does
 * emit still goes through the editable draft panel before being saved.
 */
export function parseCardStatement(lines: StatementLine[], period: StatementPeriod): CardParseResult {
  const rows: ParsedRow[] = [];
  let skipped = 0;
  let noiseFiltered = 0;

  for (const line of lines) {
    const text = line.text.trim();
    if (text.length < 8) continue;

    const lower = text.toLowerCase();
    if (isNoise(lower)) { noiseFiltered++; continue; }

    const dateMatch = text.match(LEADING_DATE);
    if (!dateMatch) continue;

    const amountMatch = text.match(TRAILING_AMOUNT);
    if (!amountMatch) { skipped++; continue; }

    const rawAmount = amountMatch[1];
    const marker = (amountMatch[2] || '').toUpperCase();
    const amount = Math.abs(parseAmount(rawAmount));
    if (amount <= 0) { skipped++; continue; }

    // Description is what's between the date and the amount.
    const description = text
      .slice(dateMatch[0].length, text.length - amountMatch[0].length)
      .replace(/\s+/g, ' ')
      .trim();
    if (description.length < 2) { skipped++; continue; }

    // Credit if explicitly marked, or if the description reads like a
    // payment/refund, or the amount was negative/parenthesised.
    const explicitCredit = marker === 'CR' || marker === 'CREDIT';
    const looksLikeCredit = CREDIT_MARKERS.some((k) => lower.includes(k));
    const negative = parseAmount(rawAmount) < 0;
    const isCredit = explicitCredit || negative || (looksLikeCredit && !marker);

    const isoDate = resolveCardDate(dateMatch[1].trim(), period);

    rows.push({
      date: isoDate ?? dateMatch[1].trim(),
      description,
      amount,
      type: isCredit ? 'Income' : 'Expense',
      dateInvalid: !isoDate,
    });
  }

  return { rows, skipped, noiseFiltered, period };
}
