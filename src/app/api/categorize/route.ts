import { NextResponse } from 'next/server';

// Cap per request so one huge statement can't blow up the prompt or the
// free-tier quota. The client batches beyond this.
const MAX_DESCRIPTIONS = 120;

interface CategorizeBody {
  descriptions?: string[];
  categories?: string[];
}

/**
 * POST /api/categorize
 * body: { descriptions: string[], categories: string[] }
 * -> { map: Record<description, category> }
 *
 * Second stage of import categorization: only descriptions the keyword rules
 * couldn't place get here. Returns a description->category map restricted to
 * the user's real category names; anything the model returns that isn't one
 * of them is dropped rather than silently creating a bogus category.
 */
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  let body: CategorizeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const descriptions = (body.descriptions ?? []).filter((d) => typeof d === 'string' && d.trim());
  const categories = (body.categories ?? []).filter((c) => typeof c === 'string' && c.trim());

  if (descriptions.length === 0 || categories.length === 0) {
    return NextResponse.json({ map: {} });
  }
  // No key configured — report it so the UI can say "AI unavailable, rows
  // left as Other" instead of pretending everything was categorized.
  if (!apiKey) {
    return NextResponse.json({ map: {}, aiUnavailable: true });
  }

  const batch = descriptions.slice(0, MAX_DESCRIPTIONS);
  const prompt = `You are categorizing bank statement transactions for a personal finance app.

Available categories (you MUST use these exact names, nothing else):
${categories.map((c) => `- ${c}`).join('\n')}

Transaction descriptions to categorize:
${batch.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Rules:
- Return ONE line per transaction, in the same order, formatted exactly as: <number>|<category>
- The category MUST be copied verbatim from the available list above.
- These are Indonesian and Southeast Asian merchants; use your knowledge of local brands.
- If you genuinely cannot tell, use the closest general-purpose category from the list.
- Output only the lines, no preamble, no markdown, no explanations.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            // Deterministic-ish: categorization shouldn't vary run to run.
            temperature: 0.1,
            maxOutputTokens: 2000,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ map: {}, aiUnavailable: true });
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Only accept categories that actually exist, matched case-insensitively.
    const validByLower = new Map(categories.map((c) => [c.toLowerCase(), c]));
    const map: Record<string, string> = {};

    for (const line of text.split('\n')) {
      const m = line.match(/^\s*(\d+)\s*\|\s*(.+?)\s*$/);
      if (!m) continue;
      const idx = parseInt(m[1], 10) - 1;
      const canonical = validByLower.get(m[2].toLowerCase());
      if (idx >= 0 && idx < batch.length && canonical) {
        map[batch[idx]] = canonical;
      }
    }

    return NextResponse.json({ map });
  } catch {
    return NextResponse.json({ map: {}, aiUnavailable: true });
  }
}
