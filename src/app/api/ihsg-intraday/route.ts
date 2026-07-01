import { NextResponse } from 'next/server';

export const revalidate = 300;

async function fetchDailyChangePct(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const prev = meta?.chartPreviousClose ?? meta?.previousClose;
    if (price == null || !prev) return null;
    return ((price - prev) / prev) * 100;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const [res, usdIdrChangePct] = await Promise.all([
      fetch(
        'https://query1.finance.yahoo.com/v8/finance/chart/%5EJKSE?range=1d&interval=5m',
        { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } }
      ),
      fetchDailyChangePct('IDR=X'),
    ]);
    if (!res.ok) throw new Error('upstream fetch failed');
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const timestamps: number[] = result?.timestamp ?? [];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];

    const points = timestamps
      .map((t, i) => ({ time: t * 1000, price: closes[i] }))
      .filter((p): p is { time: number; price: number } => p.price != null);

    const price = meta?.regularMarketPrice ?? null;
    const previousClose = meta?.chartPreviousClose ?? meta?.previousClose ?? null;
    const dayHigh = meta?.regularMarketDayHigh ?? null;
    const dayLow = meta?.regularMarketDayLow ?? null;
    const changePct = price != null && previousClose ? ((price - previousClose) / previousClose) * 100 : null;

    return NextResponse.json({ points, price, previousClose, dayHigh, dayLow, changePct, usdIdrChangePct });
  } catch {
    return NextResponse.json({ points: [], price: null, previousClose: null, dayHigh: null, dayLow: null, changePct: null, usdIdrChangePct: null });
  }
}
