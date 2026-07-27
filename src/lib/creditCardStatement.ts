// Credit-card PDF statement parsing.
//
// Verified against real BCA (Indonesia), UOB (Indonesia), and Citibank
// (Singapore) statements. Built block-based rather than line-based, because
// real statements wrap a single transaction across multiple visual lines,
// and — critically — put the real amount on a DIFFERENT line depending on
// the issuer:
//
//   BCA (amount trails, after an exchange-rate note):
//     25-MEI 26-MEI TAOBAO SINGAPORE SG
//     (SGD 6,09 X 14.291,30)
//     87.034
//
//   Citibank (amount leads, a foreign-currency note trails):
//     20 MAY Flyscoot.RYPDFZ25535 SINGAPORE ID 590.21
//     FOREIGN AMOUNT RUPIAH 7,863,051.00
//
// A parser that just takes "the last number in the block" is wrong for one
// of these — it would grab BCA's exchange rate, or Citi's foreign-currency
// note, instead of the real amount. So each block is walked line by line,
// in order, and the FIRST line that yields a valid trailing amount wins —
// correct for both leading- and trailing-amount layouts, since whichever
// line has the real amount is checked before any later note line that also
// happens to end in a number.
//
// "Valid" trailing amount means a strict, balanced-parenthesis numeric
// token — this is what rejects BCA's "14.291,30)" (an unmatched trailing
// paren from the rate expression) without also rejecting a genuine
// parenthesized negative amount like "(3,610.00)".
//
// The same per-line, leftmost-of-run extraction also fixes an unrelated
// UOB quirk: installment rows print an extra "remaining balance" column
// after the real amount (INSTALMENT 06/09  6,028,737  18,086,207) — taking
// the first number of the run, not the last, is correct there too.

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
  // Fingerprints are phrases actually observed on real statements, not
  // generic issuer-name guesses — e.g. "REKENING KARTU KREDIT" alone would
  // false-match any Indonesian-language card statement, BCA or not.
  { id: 'bca-cc', label: 'BCA Credit Card (Indonesia)', currency: 'IDR', fingerprints: ['halo bca', 'bca.co.id', 'mybca', 'krisflyer miles'] },
  { id: 'uob-cc-id', label: 'UOB Credit Card (Indonesia)', currency: 'IDR', fingerprints: ['uob visa prvi miles', 'aplikasi tmrw', 'kartu kredit uob', 'uob contact centre'] },
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
  'total debit', 'total credit', 'sub total', 'subtotal', 'sub-total', 'grand total',
  'end of statement', 'important information', 'update your',
  'retail interest rate', 'cash interest rate', 'balance previous statement',
  'transactions for', 'billed in', 'kindly ensure', 'moving? changing',
  'important announcement', 'protect yourself', 'annual membership fee',
  'late payment charge', 'overlimit', 'repayment grace period',
  'important update', 'retrieval fee', 'branch service fee', 'miles summary',
  'xxxx-xxxx-xxxx',
  // Indonesian
  'limit kredit', 'batas kredit', 'pembayaran minimum', 'jatuh tempo',
  'tanggal cetak', 'tanggal pencetakan', 'pencetakan',
  'saldo sebelumnya', 'saldo awal', 'saldo akhir', 'total tagihan',
  'tagihan baru', 'tagihan bulan lalu', 'sisa limit', 'bunga', 'biaya tahunan',
  'denda', 'periode', 'lembar', 'halaman', 'total transaksi', 'ringkasan',
  'kurs', 'informasi penting', 'informasi bonus', 'informasi poin',
  'informasi point', 'nomor kartu', 'kualitas kredit', 'perbaharui',
  'total pembayaran', 'kredit lainnya', 'suku bunga',
];

/** Substrings that mean "this credit is a payment to the card, not income". */
const CARD_PAYMENT_PATTERNS = [
  'pembayaran - mybca', 'pembayaran-mybca', 'payment - thank', 'payment-thank',
  'thank you for your payment', 'auto debit', 'debit otomatis', 'direct debit',
  'moneysend',
];

/** Markers that mean "this amount is money coming back to me" (fallback when no explicit CR/DR marker is present). */
const CREDIT_HINT_WORDS = ['refund', 'reversal', 'cashback', 'rebate', 'credit adjustment', 'reversal cicilan'];

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

  // BCA/UOB: "TANGGAL REKENING : 25 JUNI 2026" / "19 JUL 2026"
  const named = joined.match(/\b(\d{1,2})[\s-]([a-z]{3,9})\.?[\s-](20\d{2})\b/);
  if (named) {
    const m = MONTHS[named[2].slice(0, 3)];
    if (m) return { year: +named[3], month: m };
  }

  // Citibank: "Statement Date June 19, 2026"
  const monthFirst = joined.match(/\b([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (monthFirst) {
    const m = MONTHS[monthFirst[1].slice(0, 3)];
    if (m) return { year: +monthFirst[3], month: m };
  }

  // Any lone 4-digit year as a last resort.
  const loose = joined.match(/\b(20\d{2})\b/);
  return { year: loose ? +loose[1] : new Date().getFullYear() };
}

/**
 * Completes a transaction date into ISO form. Handles DD/MM, DD-MM, DD/MM/YY
 * (YYYY), DD MMM, DD-MMM — attaching the statement year when the token itself
 * omits it (which credit card transaction rows always do).
 */
export function resolveCardDate(raw: string, period: StatementPeriod): string | null {
  const s = raw.trim();

  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return iso(y, +m[2], +m[1]);
  }
  m = s.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (m) return iso(period.year, +m[2], +m[1]);

  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3,})\.?(?:[\s-](\d{2,4}))?$/);
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

// A single date token: DD/MM/YYYY, DD/MM, DD MMM, or DD-MMM. Deliberately
// does NOT allow a trailing year on the MMM form — these statements never
// print one on a transaction row, and allowing it risks swallowing the next
// date's day-of-month when two dates sit back to back ("29 JUN 29 JUN").
const DATE_TOKEN_PATTERNS = [
  /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/,
  /^\d{1,2}[/-]\d{1,2}/,
  /^\d{1,2}[\s-][A-Za-z]{3,}\.?/,
];

function matchLeadingDateToken(s: string): string | null {
  for (const p of DATE_TOKEN_PATTERNS) {
    const m = s.match(p);
    if (m) return m[0];
  }
  return null;
}

/**
 * Strips up to two leading date tokens (transaction date, then posting date
 * when present) from the start of a line. Returns the first token — the
 * transaction date, more useful for spend tracking than the posting date —
 * plus whatever text follows both.
 */
function stripLeadingDates(text: string): { dateToken: string; rest: string } | null {
  const s = text.trimStart();
  const first = matchLeadingDateToken(s);
  if (!first) return null;
  let rest = s.slice(first.length).trimStart();
  const second = matchLeadingDateToken(rest);
  if (second) rest = rest.slice(second.length).trimStart();
  return { dateToken: first, rest };
}

const CR_DR_WORDS = new Set(['CR', 'DR', 'DB', 'CREDIT', 'DEBIT']);

// ISO codes that appear in a "Jumlah Mata Uang" (foreign-currency) column,
// e.g. UOB prints "OWNDAYS ... SGD 997.00 13,520,506" — the code marks the
// number right after it as a FOREIGN amount, not the real IDR billed one.
const CURRENCY_CODES = new Set([
  'IDR', 'SGD', 'USD', 'EUR', 'MYR', 'AUD', 'GBP', 'JPY', 'HKD', 'THB',
  'CNY', 'KRW', 'TWD', 'PHP', 'VND', 'CHF', 'NZD', 'CAD',
]);

/** A token is "numeric" only with balanced parens (or none) — this is what
 *  keeps "(SGD 6,09 X 14.291,30)"'s rate from ever being mistaken for the
 *  real amount: split on whitespace, "14.291,30)" has an UNmatched paren and
 *  correctly fails this check, while "87.034" and "(1.234)" both pass. */
function isNumericToken(t: string): boolean {
  return /^-?(\([\d.,]{2,}\)|[\d.,]{2,})$/.test(t);
}

interface ExtractedAmount {
  amount: string;
  marker: string;
  /** Text before the amount token — i.e. the real description. */
  description: string;
}

/**
 * Finds the transaction amount in a block's full text: strips an optional
 * trailing CR/DR word, then walks backward over whitespace-separated numeric
 * tokens to find the trailing run, and picks the amount from within it.
 *
 * Two real layouts share this trailing run and need OPPOSITE picks:
 *   - UOB installment: "...6,028,737 18,086,207" — the real amount LEADS,
 *     followed by an extra remaining-balance column. Leftmost is correct.
 *   - UOB foreign-currency: "...SGD 997.00 13,520,506" — the real amount
 *     TRAILS a foreign amount that's paired with a currency code. The
 *     number right after that code is correct, not the leftmost.
 * A currency-code token immediately before the run disambiguates the two:
 * present → skip past the foreign amount; absent → leftmost, as before.
 */
// UOB sometimes prints the CR/DR marker glued directly onto the number with
// no space ("13,000,000CR") instead of as its own token — split it off so
// the rest of the function sees it the same as a space-separated marker.
// Without this, the whole token fails isNumericToken (letters mixed with
// digits) and the row is silently skipped rather than misread.
function splitGluedMarker(tokens: string[]): string[] {
  if (tokens.length === 0) return tokens;
  const last = tokens[tokens.length - 1];
  const m = last.match(/^(-?\(?[\d.,]+\)?)(CR|DR|DB|CREDIT|DEBIT)$/i);
  if (!m) return tokens;
  return [...tokens.slice(0, -1), m[1], m[2].toUpperCase()];
}

function extractTrailingAmount(text: string): ExtractedAmount | null {
  const tokens = splitGluedMarker(text.trim().split(/\s+/).filter(Boolean));
  if (tokens.length === 0) return null;

  let end = tokens.length;
  let marker = '';
  const lastUpper = tokens[end - 1]?.toUpperCase().replace(/\.$/, '');
  if (CR_DR_WORDS.has(lastUpper)) {
    marker = lastUpper;
    end--;
  }

  let start = end;
  while (start > 0 && isNumericToken(tokens[start - 1])) start--;
  if (start === end) return null; // no numeric tokens at all

  const precedingToken = start > 0 ? tokens[start - 1].toUpperCase() : '';
  const hasCurrencyPrefix = CURRENCY_CODES.has(precedingToken) && (end - start) >= 2;
  const amountIndex = hasCurrencyPrefix ? start + 1 : start;

  return {
    amount: tokens[amountIndex],
    marker,
    description: tokens.slice(0, amountIndex).join(' ').trim(),
  };
}

function looksLikeCardPayment(lower: string): boolean {
  return CARD_PAYMENT_PATTERNS.some((p) => lower.includes(p));
}

interface Block {
  dateToken: string;
  /** All line text after the date tokens, in reading order. */
  parts: string[];
}

/**
 * Groups raw PDF lines into transaction blocks: a block starts at a line
 * beginning with a date and runs until the next date-led (or noise) line.
 * This is what correctly reassembles a transaction whose merchant name,
 * foreign-currency note, and Rupiah amount print on separate visual lines.
 */
// A bare 4-digit year directly after a single "DD MMM" date is a summary
// row (e.g. "19 MAR 2026 8,725,135 ... 06 APR 2026" — Tanggal Pencetakan
// paired inline with due-date and credit-limit figures), never a real
// transaction: every genuine row pairs two DD-MMM dates (transaction +
// posting), not a date immediately followed by a year.
const DATE_WITH_YEAR_NOISE = /^\d{1,2}\s+[A-Za-z]{3,9}\.?\s+20\d{2}\b/;

function groupIntoBlocks(lines: StatementLine[]): { blocks: Block[]; noiseFiltered: number } {
  const blocks: Block[] = [];
  let current: Block | null = null;
  let noiseFiltered = 0;

  for (const line of lines) {
    const text = line.text.trim();
    if (text.length === 0) continue;

    if (isNoise(text.toLowerCase()) || DATE_WITH_YEAR_NOISE.test(text)) {
      if (current) { blocks.push(current); current = null; }
      noiseFiltered++;
      continue;
    }

    const dated = stripLeadingDates(text);
    if (dated) {
      if (current) blocks.push(current);
      current = { dateToken: dated.dateToken, parts: dated.rest ? [dated.rest] : [] };
    } else if (current) {
      current.parts.push(text);
    }
    // else: orphan line before any block has started — ignore.
  }
  if (current) blocks.push(current);

  return { blocks, noiseFiltered };
}

export interface CardParseResult {
  rows: ParsedRow[];
  skipped: number;
  noiseFiltered: number;
  period: StatementPeriod;
}

/**
 * Turns extracted PDF lines into transaction rows. See the module-level
 * comment for why this is block-based rather than line-based.
 *
 * Conservative by design: a block only becomes a transaction if it has a
 * real description AND a valid trailing amount. Everything it does emit
 * still goes through the editable draft panel before being saved.
 */
export function parseCardStatement(lines: StatementLine[], period: StatementPeriod): CardParseResult {
  const { blocks, noiseFiltered } = groupIntoBlocks(lines);
  const rows: ParsedRow[] = [];
  let skipped = 0;

  for (const block of blocks) {
    if (block.parts.length === 0) { skipped++; continue; }

    // The real amount can lead (Citi: amount on the date line, a
    // foreign-currency note trailing) or trail (BCA: merchant name, then an
    // exchange-rate note, then the amount) — so each part is tried in
    // reading order and the FIRST one with a valid trailing amount wins.
    // Any note lines before or after it are folded into the description.
    let amountPartIndex = -1;
    let extracted: ExtractedAmount | null = null;
    for (let i = 0; i < block.parts.length; i++) {
      const candidate = extractTrailingAmount(block.parts[i]);
      if (candidate) { amountPartIndex = i; extracted = candidate; break; }
    }
    if (!extracted) { skipped++; continue; }

    const amount = Math.abs(parseAmount(extracted.amount));
    if (amount <= 0) { skipped++; continue; }

    const description = [
      ...block.parts.slice(0, amountPartIndex),
      extracted.description,
      ...block.parts.slice(amountPartIndex + 1),
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (description.length < 2) { skipped++; continue; }

    const lower = description.toLowerCase();
    const explicitCredit = extracted.marker === 'CR' || extracted.marker === 'CREDIT';
    const negativeAmount = parseAmount(extracted.amount) < 0;
    const isCredit = explicitCredit || negativeAmount || CREDIT_HINT_WORDS.some((k) => lower.includes(k));

    const isoDate = resolveCardDate(block.dateToken, period);

    rows.push({
      date: isoDate ?? block.dateToken,
      description,
      amount,
      type: isCredit ? 'Income' : 'Expense',
      dateInvalid: !isoDate,
      suggestedExclude: isCredit && looksLikeCardPayment(lower),
    });
  }

  return { rows, skipped, noiseFiltered, period };
}
