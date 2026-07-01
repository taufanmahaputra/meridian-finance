import { NextRequest, NextResponse } from 'next/server';
import { getMarketNews } from '@/lib/marketNews';
import { generateMarketCommentary } from '@/lib/marketCommentary';
import type { Language } from '@/lib/i18n';

export const revalidate = 1800;

async function fetchIhsgSnapshot() {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EJKSE?range=1d&interval=5m',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 1800 } }
    );
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? null;
    const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? null;
    const changePct = price != null && prevClose ? ((price - prevClose) / prevClose) * 100 : null;

    const ytdRes = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EJKSE?range=ytd&interval=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 1800 } }
    );
    const ytdData = await ytdRes.json();
    const ytdMeta = ytdData?.chart?.result?.[0]?.meta;
    const ytdBase = ytdMeta?.chartPreviousClose ?? ytdMeta?.previousClose ?? null;
    const ytdPct = price != null && ytdBase ? ((price - ytdBase) / ytdBase) * 100 : null;

    return { price, changePct, ytdPct };
  } catch {
    return { price: null, changePct: null, ytdPct: null };
  }
}

async function fetchIdrChangePct(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/IDR=X?range=1d&interval=5m',
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 1800 } }
    );
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

export async function GET(request: NextRequest) {
  const lang = (request.nextUrl.searchParams.get('lang') === 'id' ? 'id' : 'en') as Language;

  const [ihsg, usdIdrChangePct, news] = await Promise.all([
    fetchIhsgSnapshot(),
    fetchIdrChangePct(),
    getMarketNews(),
  ]);

  const commentary = await generateMarketCommentary(
    {
      ihsgPrice: ihsg.price,
      ihsgChangePct: ihsg.changePct,
      ihsgYtdPct: ihsg.ytdPct,
      usdIdrChangePct,
      news,
    },
    lang
  );

  return NextResponse.json({ commentary, generatedAt: new Date().toISOString() });
}
