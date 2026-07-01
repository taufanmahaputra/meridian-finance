import { XMLParser } from 'fast-xml-parser';

export type NewsCategory = 'fiscal' | 'monetary' | 'geopolitics' | 'politics' | 'markets';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string; // ISO
  category: NewsCategory;
}

interface FeedSource {
  url: string;
  source: string;
  // If set, every item from this feed is force-tagged with this category
  // instead of going through keyword detection (used for feeds that are
  // already category-specific, e.g. a politics-only or world-news-only feed).
  forceCategory?: NewsCategory;
}

const FEEDS: FeedSource[] = [
  { url: 'https://www.cnbcindonesia.com/market/rss', source: 'CNBC Indonesia', forceCategory: 'markets' },
  { url: 'https://www.cnbcindonesia.com/news/rss', source: 'CNBC Indonesia' },
  { url: 'https://www.antaranews.com/rss/ekonomi.xml', source: 'Antara News' },
  { url: 'https://www.antaranews.com/rss/politik.xml', source: 'Antara News', forceCategory: 'politics' },
  { url: 'https://www.antaranews.com/rss/dunia.xml', source: 'Antara News', forceCategory: 'geopolitics' },
];

const MONETARY_KEYWORDS = [
  'bi rate', 'bi-rate', 'suku bunga', 'bank indonesia', 'the fed', 'federal reserve',
  'inflasi', 'rupiah', 'nilai tukar', 'kurs', 'quantitative easing', 'yield', 'obligasi',
  'giro wajib', 'likuiditas',
];

const FISCAL_KEYWORDS = [
  'apbn', 'anggaran', 'defisit', 'pajak', 'ppn', 'insentif fiskal', 'subsidi',
  'utang negara', 'sri mulyani', 'kementerian keuangan', 'kemenkeu', 'belanja negara',
  'penerimaan negara', 'tax amnesty', 'bea cukai',
];

const GEOPOLITICS_KEYWORDS = [
  'geopolitik', 'perang', 'tarif', 'trump', 'trade war', 'sanksi', 'as-china',
  'timur tengah', 'rusia', 'ukraina', 'israel', 'iran', 'opec', 'houthi',
  'ketegangan', 'konflik',
];

const POLITICS_KEYWORDS = [
  'dpr', 'presiden', 'menteri', 'pemilu', 'pilkada', 'partai', 'istana',
  'kabinet', 'reshuffle', 'mahkamah', 'kpk', 'ruu', 'undang-undang',
];

function detectCategory(title: string, description: string): NewsCategory {
  const text = `${title} ${description}`.toLowerCase();
  if (MONETARY_KEYWORDS.some((k) => text.includes(k))) return 'monetary';
  if (FISCAL_KEYWORDS.some((k) => text.includes(k))) return 'fiscal';
  if (GEOPOLITICS_KEYWORDS.some((k) => text.includes(k))) return 'geopolitics';
  if (POLITICS_KEYWORDS.some((k) => text.includes(k))) return 'politics';
  return 'markets';
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata' });

function unwrap(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '__cdata' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).__cdata);
  }
  return String(value);
}

async function fetchFeed(feed: FeedSource): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const data = parser.parse(xml);
    const items = data?.rss?.channel?.item;
    const list = Array.isArray(items) ? items : items ? [items] : [];

    return list.slice(0, 15).map((item: Record<string, unknown>) => {
      const title = stripHtml(unwrap(item.title));
      const description = stripHtml(unwrap(item.description));
      const link = unwrap(item.link);
      const pubDate = unwrap(item.pubDate);
      const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();

      return {
        title,
        link,
        source: feed.source,
        publishedAt,
        category: feed.forceCategory ?? detectCategory(title, description),
      };
    }).filter((item: NewsItem) => item.title && item.link);
  } catch {
    return [];
  }
}

export async function getMarketNews(): Promise<NewsItem[]> {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const all = results.flat();

  const seen = new Set<string>();
  const deduped = all.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return deduped;
}
