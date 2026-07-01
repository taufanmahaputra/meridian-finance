import type { NewsItem } from './marketNews';
import type { Language } from './i18n';

interface CommentaryInputs {
  ihsgPrice: number | null;
  ihsgChangePct: number | null;
  ihsgYtdPct: number | null;
  usdIdrChangePct: number | null;
  news: NewsItem[];
}

const CATEGORY_LABEL: Record<string, string> = {
  fiscal: 'Fiscal', monetary: 'Monetary', geopolitics: 'Geopolitics',
  politics: 'Domestic Politics', markets: 'Markets',
};

function buildPrompt(inputs: CommentaryInputs, language: Language): string {
  const headlineLines = inputs.news
    .slice(0, 15)
    .map((n) => `- [${CATEGORY_LABEL[n.category] ?? n.category}] ${n.title} (${n.source})`)
    .join('\n');

  const languageInstruction = language === 'id'
    ? 'Write the entire response in Bahasa Indonesia.'
    : 'Write the entire response in English.';

  return `You are a blunt, no-nonsense institutional equity strategist writing a short daily market note for Indonesian retail investors, in the style of a top-tier bank's morning brief (JPMorgan/Goldman tone) — direct, no hedging, no sugarcoating, no generic disclaimers.

Today's real data:
- IHSG (Jakarta Composite): ${inputs.ihsgPrice ?? 'n/a'}, ${inputs.ihsgChangePct != null ? `${inputs.ihsgChangePct >= 0 ? '+' : ''}${inputs.ihsgChangePct.toFixed(2)}% today` : 'change n/a'}, ${inputs.ihsgYtdPct != null ? `${inputs.ihsgYtdPct >= 0 ? '+' : ''}${inputs.ihsgYtdPct.toFixed(2)}% YTD` : ''}
- USD/IDR: ${inputs.usdIdrChangePct != null ? `${inputs.usdIdrChangePct >= 0 ? '+' : ''}${inputs.usdIdrChangePct.toFixed(2)}% today (positive = Rupiah weaker)` : 'n/a'}

Today's real headlines:
${headlineLines || '(no headlines available)'}

Write a 3-5 sentence brutally honest market summary based ONLY on the data and headlines above. Call out real risks and real positives plainly. Do not invent facts, numbers, or events not present above. Do not use hedge words like "may" or "could" excessively — take a clear stance. ${languageInstruction} Output only the summary text, no preamble, no markdown formatting, no headers.`;
}

export async function generateMarketCommentary(inputs: CommentaryInputs, language: Language): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(inputs, language) }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 500,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === 'string' ? text.trim() : null;
  } catch {
    return null;
  }
}
