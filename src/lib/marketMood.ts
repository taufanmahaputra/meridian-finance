export type MarketMood = 'good' | 'bad' | 'sideways' | 'uncertain';

export interface MoodInput {
  ihsgChangePct: number | null;
  usdIdrChangePct: number | null; // positive = Rupiah weakening
}

/**
 * Rule-based, data-driven market mood — not AI-generated commentary.
 * IHSG move is the primary signal; a Rupiah move in the opposite direction
 * of what the IHSG move would suggest (e.g. IHSG up but Rupiah weakening
 * hard) downgrades a "good" read to "uncertain", since capital isn't
 * confirming the equity move.
 */
export function computeMarketMood({ ihsgChangePct, usdIdrChangePct }: MoodInput): MarketMood {
  if (ihsgChangePct == null) return 'uncertain';

  const rupiahWeakeningHard = usdIdrChangePct != null && usdIdrChangePct > 0.4;
  const rupiahStrengtheningHard = usdIdrChangePct != null && usdIdrChangePct < -0.4;

  if (ihsgChangePct >= 1) {
    return rupiahWeakeningHard ? 'uncertain' : 'good';
  }
  if (ihsgChangePct <= -1) {
    return rupiahStrengtheningHard ? 'uncertain' : 'bad';
  }
  if (Math.abs(ihsgChangePct) <= 0.3) {
    return 'sideways';
  }
  // Moderate move (0.3–1%) in either direction without a strong confirming
  // or contradicting currency signal reads as directionally leaning but
  // not yet decisive.
  return ihsgChangePct > 0 ? 'good' : 'bad';
}
