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

export interface SignalStatus {
  price: number | null;
  buy: boolean | null; // null = price not loaded yet, can't tell
  breakout: boolean; // true if the buy trigger was the "bob >" breakout condition, not the entry zone
}

/**
 * A signal is "in buy range" once price has pulled back to (or below) the
 * highest entry level, or — if the note contains a "bob > N" breakout
 * condition — once price has broken out above N.
 */
export function evaluateSignal(entries: number[], note: string | null, price: number | null): SignalStatus {
  if (price == null) return { price: null, buy: null, breakout: false };

  const bobMatch = note?.match(/bob\s*>\s*([\d.,]+)/i);
  const bobThreshold = bobMatch ? parseFloat(bobMatch[1].replace(/,/g, '')) : null;

  const inPullbackZone = entries.length > 0 && price <= Math.max(...entries);
  const brokeOut = bobThreshold != null && price > bobThreshold;

  return { price, buy: inPullbackZone || brokeOut, breakout: brokeOut && !inPullbackZone };
}
