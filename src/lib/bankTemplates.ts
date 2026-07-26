// Multi-bank statement parsing.
//
// Different banks (and different countries) export wildly different CSV
// shapes. Rather than hardcode one column order, we detect the layout from
// the header row and map columns by name, then fall back to a positional
// guess when the header is unrecognized. The user can always override the
// detected mapping in the upload UI before anything is saved.

export type AmountMode =
  // One signed amount column: negative = expense, positive = income.
  | 'signed'
  // Separate debit and credit columns (very common for Asian banks).
  | 'debit-credit'
  // One unsigned amount column plus a separate type/DR-CR indicator column.
  | 'unsigned-with-type';

export interface ColumnMap {
  date: number;
  description: number;
  /** Used by 'signed' and 'unsigned-with-type'. */
  amount?: number;
  /** Used by 'debit-credit'. */
  debit?: number;
  credit?: number;
  /** Used by 'unsigned-with-type' — column holding DR/CR or Debit/Credit. */
  typeCol?: number;
  /** Optional pre-existing category column, if the export has one. */
  category?: number;
}

export interface BankTemplate {
  id: string;
  label: string;
  /** Default statement currency; user can override per upload. */
  currency: string;
  amountMode: AmountMode;
  /** Lowercased header fragments that must all be present to match. */
  signature: string[];
  columns: ColumnMap;
  /** Date formats to try, in order. */
  dateFormats: DateFormat[];
}

export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd' | 'dd-mmm-yyyy' | 'dd mmm yyyy';

// Ordered most-specific-first: detection returns the first template whose
// signature fragments all appear in the header row.
export const BANK_TEMPLATES: BankTemplate[] = [
  {
    id: 'bca',
    label: 'BCA (Indonesia)',
    currency: 'IDR',
    amountMode: 'unsigned-with-type',
    signature: ['tanggal', 'keterangan'],
    columns: { date: 0, description: 1, amount: 3, typeCol: 4 },
    dateFormats: ['dd/mm/yyyy', 'dd-mmm-yyyy'],
  },
  {
    id: 'mandiri',
    label: 'Mandiri (Indonesia)',
    currency: 'IDR',
    amountMode: 'debit-credit',
    signature: ['tanggal', 'debet'],
    columns: { date: 0, description: 1, debit: 2, credit: 3 },
    dateFormats: ['dd/mm/yyyy', 'yyyy-mm-dd'],
  },
  {
    id: 'dbs-sg',
    label: 'DBS / POSB (Singapore)',
    currency: 'SGD',
    amountMode: 'debit-credit',
    signature: ['transaction date', 'debit amount'],
    columns: { date: 0, description: 2, debit: 3, credit: 4 },
    dateFormats: ['dd mmm yyyy', 'dd/mm/yyyy'],
  },
  {
    id: 'ocbc-sg',
    label: 'OCBC (Singapore)',
    currency: 'SGD',
    amountMode: 'debit-credit',
    signature: ['transaction date', 'withdrawal'],
    columns: { date: 0, description: 1, debit: 2, credit: 3 },
    dateFormats: ['dd/mm/yyyy', 'dd mmm yyyy'],
  },
  {
    id: 'uob-sg',
    label: 'UOB (Singapore)',
    currency: 'SGD',
    amountMode: 'debit-credit',
    signature: ['transaction date', 'transaction description'],
    columns: { date: 0, description: 1, debit: 2, credit: 3 },
    dateFormats: ['dd mmm yyyy', 'dd/mm/yyyy'],
  },
  {
    id: 'hsbc',
    label: 'HSBC',
    currency: 'USD',
    amountMode: 'signed',
    signature: ['date', 'transaction detail'],
    columns: { date: 0, description: 1, amount: 2 },
    dateFormats: ['dd/mm/yyyy', 'dd mmm yyyy'],
  },
  {
    id: 'revolut',
    label: 'Revolut / Wise',
    currency: 'USD',
    amountMode: 'signed',
    signature: ['completed date', 'amount'],
    columns: { date: 0, description: 1, amount: 2 },
    dateFormats: ['yyyy-mm-dd', 'dd/mm/yyyy'],
  },
  {
    id: 'olahdana',
    label: 'OlahDana format',
    currency: 'IDR',
    amountMode: 'unsigned-with-type',
    signature: ['date', 'category'],
    columns: { date: 0, description: 1, amount: 2, category: 3, typeCol: 4 },
    dateFormats: ['dd/mm/yyyy', 'yyyy-mm-dd'],
  },
];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  // Indonesian month abbreviations that differ from English.
  mei: 5, agu: 8, ags: 8, okt: 10, des: 12,
};

/**
 * Parses a date string into an ISO yyyy-mm-dd, trying each supplied format.
 * Returns null when nothing matches, so the caller can flag the row instead
 * of silently importing a wrong or epoch-zero date.
 */
export function parseStatementDate(raw: string, formats: DateFormat[]): string | null {
  const s = raw.trim();
  if (!s) return null;

  for (const fmt of formats) {
    let y: number | undefined, m: number | undefined, d: number | undefined;

    if (fmt === 'yyyy-mm-dd') {
      const mt = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
    } else if (fmt === 'dd/mm/yyyy' || fmt === 'mm/dd/yyyy') {
      const mt = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
      if (mt) {
        const a = +mt[1], b = +mt[2];
        [d, m] = fmt === 'dd/mm/yyyy' ? [a, b] : [b, a];
        y = mt[3].length === 2 ? 2000 + +mt[3] : +mt[3];
      }
    } else if (fmt === 'dd-mmm-yyyy' || fmt === 'dd mmm yyyy') {
      const mt = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s-]+(\d{2,4})/);
      if (mt) {
        d = +mt[1];
        m = MONTHS[mt[2].slice(0, 3).toLowerCase()];
        y = mt[3].length === 2 ? 2000 + +mt[3] : +mt[3];
      }
    }

    if (y && m && d && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return null;
}

/**
 * Strips currency symbols and accounting parentheses, then resolves the
 * thousands-vs-decimal separator ambiguity across conventions:
 *
 *   1,234.56    -> 1234.56   (both present, dot last  => dot is decimal)
 *   1.234,56    -> 1234.56   (both present, comma last => comma is decimal)
 *   15.000.000  -> 15000000  (separator repeats => always thousands)
 *   80.000      -> 80000     (single sep + exactly 3 digits => thousands)
 *   45.80       -> 45.8      (single sep + 1-2 digits => decimal)
 *
 * The `80.000` case is the one that matters most here: Indonesian statements
 * write eighty thousand that way, and reading it as 80.0 would understate the
 * amount by 1000x. Currency values essentially never carry 3 decimal places,
 * so "3 digits after a lone separator" is safely treated as thousands.
 */
export function parseAmount(raw: string): number {
  let s = (raw || '').trim();
  if (!s) return 0;

  // (1,234.56) is accounting notation for negative.
  const paren = /^\((.*)\)$/.exec(s);
  const negFromParen = !!paren;
  if (paren) s = paren[1];

  const negFromSign = s.includes('-');
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return 0;

  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;

  if (dots > 0 && commas > 0) {
    // Both separators present: whichever comes last is the decimal point.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (dots > 1 || commas > 1) {
    // A repeating separator can only be a thousands grouping.
    s = s.replace(/[.,]/g, '');
  } else if (dots === 1 || commas === 1) {
    const sep = dots === 1 ? '.' : ',';
    const after = s.length - s.indexOf(sep) - 1;
    if (after === 3) {
      s = s.replace(/[.,]/g, '');          // thousands grouping
    } else {
      s = s.replace(sep === '.' ? /,/g : /\./g, '');
      if (sep === ',') s = s.replace(',', '.');
    }
  }

  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  return negFromParen || negFromSign ? -Math.abs(n) : n;
}

/** Finds the template whose signature fragments all appear in the header. */
export function detectTemplate(headerRow: string[]): BankTemplate | null {
  const header = headerRow.map((h) => (h || '').toLowerCase().trim()).join('|');
  return BANK_TEMPLATES.find((tpl) => tpl.signature.every((frag) => header.includes(frag))) ?? null;
}

/**
 * Best-effort column mapping for a statement whose header we don't recognize.
 * Looks for common English/Indonesian header words; anything still unfound
 * falls back to position. Always returns something so the user gets rows to
 * review rather than a hard failure — they can correct the mapping in the UI.
 */
export function guessColumns(headerRow: string[]): { columns: ColumnMap; amountMode: AmountMode } {
  const cells = headerRow.map((h) => (h || '').toLowerCase().trim());
  const findCol = (...words: string[]) => cells.findIndex((c) => words.some((w) => c.includes(w)));

  const date = findCol('date', 'tanggal', 'tgl');
  const description = findCol('description', 'keterangan', 'detail', 'narrative', 'remark', 'transaksi');
  const debit = findCol('debit', 'debet', 'withdrawal', 'keluar');
  const credit = findCol('credit', 'kredit', 'deposit', 'masuk');
  const amount = findCol('amount', 'jumlah', 'nominal', 'nilai');
  const category = findCol('category', 'kategori');
  const typeCol = findCol('type', 'tipe', 'dr/cr', 'dc');

  const columns: ColumnMap = {
    date: date >= 0 ? date : 0,
    description: description >= 0 ? description : 1,
  };
  if (category >= 0) columns.category = category;

  if (debit >= 0 && credit >= 0) {
    columns.debit = debit;
    columns.credit = credit;
    return { columns, amountMode: 'debit-credit' };
  }
  columns.amount = amount >= 0 ? amount : 2;
  if (typeCol >= 0) {
    columns.typeCol = typeCol;
    return { columns, amountMode: 'unsigned-with-type' };
  }
  return { columns, amountMode: 'signed' };
}

export interface ParsedRow {
  date: string;
  description: string;
  /** Always positive; direction is carried by `type`. */
  amount: number;
  type: 'Income' | 'Expense';
  /** Category from the file if it had one, else undefined. */
  category?: string;
  /** Set when the date couldn't be parsed, so the UI can flag the row. */
  dateInvalid?: boolean;
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: number;
  /** Rows whose date couldn't be parsed — imported but flagged. */
  dateIssues: number;
}

const CREDIT_HINTS = ['cr', 'credit', 'kredit', 'income', 'masuk', 'deposit'];

/**
 * Turns raw CSV cells into normalized rows using a column map.
 * Rows with no usable amount or no description are skipped (returned as a
 * count so the UI can be honest about what was dropped).
 */
export function parseRows(
  dataRows: string[][],
  columns: ColumnMap,
  amountMode: AmountMode,
  dateFormats: DateFormat[]
): ParseResult {
  const rows: ParsedRow[] = [];
  let skipped = 0;
  let dateIssues = 0;

  for (const r of dataRows) {
    if (!r || r.length === 0) continue;

    const description = (r[columns.description] || '').trim();
    let amount = 0;
    let type: 'Income' | 'Expense' = 'Expense';

    if (amountMode === 'debit-credit') {
      const debit = Math.abs(parseAmount(r[columns.debit ?? -1] || ''));
      const credit = Math.abs(parseAmount(r[columns.credit ?? -1] || ''));
      if (credit > 0) { amount = credit; type = 'Income'; }
      else { amount = debit; type = 'Expense'; }
    } else if (amountMode === 'unsigned-with-type') {
      amount = Math.abs(parseAmount(r[columns.amount ?? -1] || ''));
      const flag = (r[columns.typeCol ?? -1] || '').toLowerCase().trim();
      type = CREDIT_HINTS.some((h) => flag === h || flag.startsWith(h)) ? 'Income' : 'Expense';
    } else {
      const signed = parseAmount(r[columns.amount ?? -1] || '');
      amount = Math.abs(signed);
      type = signed > 0 ? 'Income' : 'Expense';
    }

    if (!description || amount <= 0) { skipped++; continue; }

    const iso = parseStatementDate(r[columns.date] || '', dateFormats);
    if (!iso) dateIssues++;

    rows.push({
      date: iso ?? (r[columns.date] || '').trim(),
      description,
      amount,
      type,
      category: columns.category != null ? (r[columns.category] || '').trim() || undefined : undefined,
      dateInvalid: !iso,
    });
  }

  return { rows, skipped, dateIssues };
}

/** Earliest and latest parsed ISO date, used to size the FX rate window. */
export function dateRange(rows: ParsedRow[]): { start: string; end: string } | null {
  const iso = rows.filter((r) => !r.dateInvalid).map((r) => r.date).sort();
  if (iso.length === 0) return null;
  return { start: iso[0], end: iso[iso.length - 1] };
}

/** Derives a "Mon YYYY" month label from a set of rows (most common month). */
export function inferMonthLabel(rows: ParsedRow[]): string {
  const counts = new Map<string, number>();
  rows.filter((r) => !r.dateInvalid).forEach((r) => {
    const key = r.date.slice(0, 7); // yyyy-mm
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  if (counts.size === 0) return '';
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const [y, m] = top.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[+m - 1]} ${y}`;
}
