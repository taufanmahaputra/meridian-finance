import type { Language } from './i18n';

export type SignalType = 'buy' | 'hold' | 'watch';
export type Confidence = 'high' | 'medium' | 'low';

interface RawSignal {
  id: string;
  signal: SignalType;
  confidence: Confidence;
  asset: Record<Language, string>;
  timeframe: Record<Language, string>;
  rationale: Record<Language, string>;
}

const RAW_SIGNALS: RawSignal[] = [
  {
    id: 'idEquities',
    signal: 'buy',
    confidence: 'high',
    asset: { en: 'Indonesian Equities (IHSG)', id: 'Saham Indonesia (IHSG)' },
    timeframe: { en: '6–12 months', id: '6–12 bulan' },
    rationale: {
      en: 'Valuations look attractive after the recent pullback, supported by resilient domestic consumption and gradually returning foreign inflows.',
      id: 'Valuasi terlihat menarik setelah koreksi terbaru, didukung konsumsi domestik yang tangguh dan dana asing yang berangsur kembali masuk.',
    },
  },
  {
    id: 'globalEquities',
    signal: 'hold',
    confidence: 'medium',
    asset: { en: 'Global Equities (US/World)', id: 'Saham Global (US/World)' },
    timeframe: { en: '3–6 months', id: '3–6 bulan' },
    rationale: {
      en: 'Valuations remain stretched after a strong run; maintain existing exposure but avoid adding aggressively at current levels.',
      id: 'Valuasi masih cukup tinggi setelah kenaikan signifikan; pertahankan eksposur yang ada namun hindari menambah agresif di level saat ini.',
    },
  },
  {
    id: 'sbn',
    signal: 'buy',
    confidence: 'high',
    asset: { en: 'Government Bonds (SBN)', id: 'SBN / Obligasi Negara' },
    timeframe: { en: 'Now — buy & hold', id: 'Sekarang — beli & tahan' },
    rationale: {
      en: 'Real yields remain attractive relative to inflation, with low default risk given sovereign backing.',
      id: 'Yield riil masih menarik dibanding inflasi, dengan risiko gagal bayar rendah karena dijamin negara.',
    },
  },
  {
    id: 'deposito',
    signal: 'hold',
    confidence: 'high',
    asset: { en: 'Time Deposits', id: 'Deposito Berjangka' },
    timeframe: { en: 'Ongoing', id: 'Berkelanjutan' },
    rationale: {
      en: 'Stable and predictable for short-term cash, but real returns are modest once inflation is factored in.',
      id: 'Stabil dan dapat diprediksi untuk dana jangka pendek, namun imbal hasil riil tergolong moderat setelah memperhitungkan inflasi.',
    },
  },
  {
    id: 'gold',
    signal: 'watch',
    confidence: 'medium',
    asset: { en: 'Gold', id: 'Emas' },
    timeframe: { en: '1–3 months', id: '1–3 bulan' },
    rationale: {
      en: 'Prices are near highs — wait for a pullback before adding to an inflation-hedge position.',
      id: 'Harga mendekati level tertinggi — tunggu koreksi sebelum menambah posisi hedge inflasi.',
    },
  },
  {
    id: 'crypto',
    signal: 'watch',
    confidence: 'low',
    asset: { en: 'Crypto', id: 'Kripto' },
    timeframe: { en: 'Speculative only', id: 'Spekulatif saja' },
    rationale: {
      en: 'High volatility and limited regulatory clarity — only suitable for risk capital you can afford to lose.',
      id: 'Volatilitas tinggi dan kejelasan regulasi terbatas — hanya cocok untuk dana risiko yang siap hilang.',
    },
  },
];

export function getSignals(language: Language) {
  return RAW_SIGNALS.map((s) => ({
    id: s.id,
    signal: s.signal,
    confidence: s.confidence,
    asset: s.asset[language],
    timeframe: s.timeframe[language],
    rationale: s.rationale[language],
  }));
}
