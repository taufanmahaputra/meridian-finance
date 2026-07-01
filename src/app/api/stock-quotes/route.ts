import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 300;

async function fetchQuote(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.JK?range=1d&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const tickersParam = request.nextUrl.searchParams.get('tickers') || '';
  const tickers = [...new Set(tickersParam.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean))];

  const results = await Promise.all(tickers.map(async (ticker) => [ticker, await fetchQuote(ticker)] as const));
  const quotes: Record<string, number | null> = Object.fromEntries(results);

  return NextResponse.json({ quotes });
}
