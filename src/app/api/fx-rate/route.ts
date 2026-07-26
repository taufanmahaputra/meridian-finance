import { NextResponse } from 'next/server';
import { fxSymbol, pickConservativeRate, type FxQuote } from '@/lib/fx';

// Rates move slowly relative to how often statements get imported; an hour
// of caching keeps repeat imports of the same file instant.
export const revalidate = 3600;

/**
 * GET /api/fx-rate?from=SGD&to=IDR&start=2026-01-01&end=2026-03-31
 *
 * Returns the HIGHEST daily close for the pair across [start, end] — the
 * conservative rate the importer applies to the whole statement. See
 * src/lib/fx.ts for why max rather than per-day spot.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = (searchParams.get('from') || '').toUpperCase();
  const to = (searchParams.get('to') || '').toUpperCase();
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  }

  // Same currency: no conversion, no API call.
  if (from === to) {
    const identity: FxQuote = { from, to, rate: 1, low: 1, points: 0, identity: true };
    return NextResponse.json(identity);
  }

  // Yahoo wants unix seconds. Pad the window by a day on each side so a
  // single-day statement (or one landing on a weekend/holiday with no FX
  // close) still catches at least one observation.
  const DAY = 86400;
  const startTs = start ? Math.floor(new Date(`${start}T00:00:00Z`).getTime() / 1000) - DAY : null;
  const endTs = end ? Math.floor(new Date(`${end}T00:00:00Z`).getTime() / 1000) + DAY : null;

  const symbol = encodeURIComponent(fxSymbol(from, to));
  const url = startTs && endTs && endTs > startTs
    ? `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTs}&period2=${endTs}&interval=1d`
    // No usable range given — fall back to the last 3 months so we still
    // return a defensible max rather than a single spot price.
    : `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
    const picked = pickConservativeRate(closes);

    if (!picked) throw new Error('no rate data in range');

    const quote: FxQuote = { from, to, ...picked, identity: false };
    return NextResponse.json(quote);
  } catch {
    // Surface the failure honestly instead of inventing a rate — the upload
    // UI asks the user to type one in when this happens.
    const unavailable: FxQuote = { from, to, rate: 0, low: 0, points: 0, identity: false, unavailable: true };
    return NextResponse.json(unavailable);
  }
}
