import { NextResponse } from 'next/server';
import { getMarketNews } from '@/lib/marketNews';

export const revalidate = 1800;

export async function GET() {
  const news = await getMarketNews();
  return NextResponse.json({ news, fetchedAt: new Date().toISOString() });
}
