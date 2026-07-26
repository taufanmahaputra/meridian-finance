// PDF statement text extraction, client-side.
//
// Runs entirely in the browser via pdf.js: the statement file itself never
// leaves the machine, only the parsed transactions do (same privacy shape as
// the existing client-side CSV path).
//
// Extraction is POSITION-AWARE on purpose. A flat text dump loses which
// column a number sat in, and for statements that's the difference between a
// charge and a refund — so we keep each text fragment's x/y and rebuild
// visual lines from the coordinates.

export interface TextFragment {
  text: string;
  x: number;
  y: number;
}

export interface StatementLine {
  /** Fragments on this visual line, left to right. */
  fragments: TextFragment[];
  /** Whole line joined with spaces — convenient for regex matching. */
  text: string;
  y: number;
  page: number;
}

// Fragments whose baselines differ by less than this are the same visual
// line. PDF y-coords are in points; ~2.5pt tolerates minor font jitter
// without merging genuinely separate rows.
const LINE_TOLERANCE = 2.5;

/**
 * Extracts visual lines (with per-fragment coordinates) from a PDF file.
 * Throws when the PDF has no extractable text layer — i.e. it's a scan —
 * so the caller can tell the user plainly instead of silently importing
 * nothing.
 */
export async function extractStatementLines(file: File): Promise<StatementLine[]> {
  const pdfjs = await import('pdfjs-dist');
  // Resolve the worker through the bundler (works under both Turbopack and
  // webpack). Without a worker pdf.js runs on the main thread and can stall
  // the UI on longer statements.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  const lines: StatementLine[] = [];
  let totalFragments = 0;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const frags: TextFragment[] = [];
    for (const item of content.items) {
      // Ignore the marked-content entries pdf.js interleaves with text.
      if (!('str' in item)) continue;
      const str = item.str;
      if (!str || !str.trim()) continue;
      // transform = [a,b,c,d,e,f]; e/f are the x/y translation.
      const tf = item.transform as number[];
      frags.push({ text: str, x: tf[4], y: tf[5] });
    }
    totalFragments += frags.length;

    // Group into visual lines by y, then order each line left-to-right.
    // PDF y grows upward, so descending y = top-to-bottom reading order.
    const buckets: TextFragment[][] = [];
    for (const f of [...frags].sort((a, b) => b.y - a.y)) {
      const bucket = buckets.find((b) => Math.abs(b[0].y - f.y) < LINE_TOLERANCE);
      if (bucket) bucket.push(f);
      else buckets.push([f]);
    }

    for (const bucket of buckets) {
      const ordered = bucket.sort((a, b) => a.x - b.x);
      lines.push({
        fragments: ordered,
        text: ordered.map((f) => f.text).join(' ').replace(/\s+/g, ' ').trim(),
        y: ordered[0].y,
        page: pageNum,
      });
    }
  }

  if (totalFragments === 0) {
    throw new Error('NO_TEXT_LAYER');
  }
  return lines;
}

/** Human-readable reason for an extraction failure. */
export function describeExtractionError(err: unknown): 'scanned' | 'unreadable' {
  return err instanceof Error && err.message === 'NO_TEXT_LAYER' ? 'scanned' : 'unreadable';
}
