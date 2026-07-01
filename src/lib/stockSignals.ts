export interface ParsedSignalLine {
  ticker: string;
  entries: number[];
  note: string | null;
}

export interface StockSignal extends ParsedSignalLine {
  id: string;
  batchDate: string;
  sortOrder: number;
}

export interface SignalBatch {
  batchDate: string;
  signals: StockSignal[];
}

/**
 * Parses lines like:
 *   "Aadi 7450, 7650"
 *   "Enrg 1250, 1100 atau bob > 1500"
 * into a ticker, numeric entry levels, and an optional trailing condition note.
 * Blank lines and lines that don't start with a ticker + number are skipped.
 */
export function parseSignalText(text: string): ParsedSignalLine[] {
  const lines = text.split('\n');
  const results: ParsedSignalLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const firstSpace = line.indexOf(' ');
    if (firstSpace === -1) continue;

    const ticker = line.slice(0, firstSpace).trim().toUpperCase();
    let rest = line.slice(firstSpace + 1).trim();
    if (!ticker || !rest) continue;

    let note: string | null = null;
    const atauMatch = rest.match(/\s+atau\s+/i);
    if (atauMatch && atauMatch.index != null) {
      note = rest.slice(atauMatch.index).trim();
      rest = rest.slice(0, atauMatch.index).trim();
    }

    const entries = rest
      .split(',')
      .map((p) => parseFloat(p.trim().replace(/[^\d.]/g, '')))
      .filter((n) => !isNaN(n) && n > 0);

    if (entries.length === 0) continue;

    results.push({ ticker, entries, note });
  }

  return results;
}

export type SignalState = 'buy' | 'breakout' | 'avoid' | 'waiting' | null;

export interface SignalStatus {
  price: number | null;
  state: SignalState; // null = price not loaded yet, can't tell
}

// How close price needs to be to a support level to count as "in the zone".
const SUPPORT_MARGIN = 0.005; // ±0.5%

/**
 * Entries are support levels (support 1, support 2, ...). Price within ±0.5%
 * of any support level means it's time to buy. Price below every support
 * level means the thesis is broken — avoid. Otherwise price hasn't pulled
 * back into the zone yet — waiting. A "bob > N" breakout condition in the
 * note is a separate, independent buy trigger once price clears N.
 */
export function evaluateSignal(entries: number[], note: string | null, price: number | null): SignalStatus {
  if (price == null || entries.length === 0) return { price, state: null };

  const bobMatch = note?.match(/bob\s*>\s*([\d.,]+)/i);
  const bobThreshold = bobMatch ? parseFloat(bobMatch[1].replace(/,/g, '')) : null;

  if (bobThreshold != null && price > bobThreshold) {
    return { price, state: 'breakout' };
  }

  const inZone = entries.some((level) => Math.abs(price - level) / level <= SUPPORT_MARGIN);
  if (inZone) return { price, state: 'buy' };

  const minSupport = Math.min(...entries);
  if (price < minSupport * (1 - SUPPORT_MARGIN)) return { price, state: 'avoid' };

  return { price, state: 'waiting' };
}
