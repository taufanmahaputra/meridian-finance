// Multi-currency conversion for imported bank statements.
//
// POLICY (deliberate, user-chosen): we do NOT use the per-day spot rate for
// each transaction. Instead we take the HIGHEST rate observed across the
// statement's own date range and apply that single rate to every row in the
// file. Converting at the worst rate overstates expenses slightly, which
// builds in a safety margin — the real-world outcome tends to leave money
// left over rather than blowing the budget.
//
// Caveat worth knowing: the same max rate applied to INCOME rows overstates
// income too, which is optimistic rather than conservative. Statements are
// overwhelmingly expenses, so we accept that asymmetry rather than applying
// two different rates in one file (which would be confusing to audit).

export interface FxQuote {
  from: string;
  to: string;
  /** Highest rate seen across the requested range — the one actually applied. */
  rate: number;
  /** Lowest rate in range, shown in the UI so the spread is visible. */
  low: number;
  /** Number of daily observations the range produced. */
  points: number;
  /** True when from === to and no conversion was needed. */
  identity: boolean;
  /** Set when live data was unavailable and the caller must supply a rate. */
  unavailable?: boolean;
}

/** Yahoo Finance FX symbol, e.g. SGD->IDR becomes "SGDIDR=X". */
export function fxSymbol(from: string, to: string): string {
  return `${from.toUpperCase()}${to.toUpperCase()}=X`;
}

/**
 * Picks the conservative rate from a series of daily closes.
 * Returns null when the series has no usable numbers.
 */
export function pickConservativeRate(closes: (number | null)[]): { rate: number; low: number; points: number } | null {
  const valid = closes.filter((c): c is number => typeof c === 'number' && isFinite(c) && c > 0);
  if (valid.length === 0) return null;
  return {
    rate: Math.max(...valid),
    low: Math.min(...valid),
    points: valid.length,
  };
}

/**
 * Converts a statement amount into the display currency using an already
 * resolved rate. Rounded to 2dp to avoid float dust accumulating across
 * hundreds of rows.
 */
export function convertAmount(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}

/** ISO codes we can offer as statement source currencies. */
export const STATEMENT_CURRENCIES = ['IDR', 'SGD', 'USD', 'EUR', 'MYR', 'AUD', 'GBP', 'JPY', 'HKD', 'THB'];
