import { NextResponse } from 'next/server';

export const revalidate = 900;

interface YahooMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
}

async function fetchQuote(symbol: string): Promise<YahooMeta | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=ytd&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 900 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return meta as YahooMeta;
  } catch {
    return null;
  }
}

function ytdChange(meta: YahooMeta | null): number | null {
  if (!meta?.regularMarketPrice) return null;
  const base = meta.chartPreviousClose ?? meta.previousClose;
  if (!base) return null;
  return ((meta.regularMarketPrice - base) / base) * 100;
}

export async function GET() {
  const [sti, sp500, usdsgd, us10y] = await Promise.all([
    fetchQuote('^STI'),
    fetchQuote('^GSPC'),
    fetchQuote('SGD=X'),
    fetchQuote('^TNX'),
  ]);

  return NextResponse.json({
    asOf: new Date().toISOString(),
    sti: { value: sti?.regularMarketPrice ?? null, ytdPct: ytdChange(sti), live: !!sti },
    sp500: { value: sp500?.regularMarketPrice ?? null, ytdPct: ytdChange(sp500), live: !!sp500 },
    usdsgd: { value: usdsgd?.regularMarketPrice ?? null, ytdPct: ytdChange(usdsgd), live: !!usdsgd },
    us10y: { value: us10y?.regularMarketPrice ?? null, ytdPct: ytdChange(us10y), live: !!us10y },
  });
}
