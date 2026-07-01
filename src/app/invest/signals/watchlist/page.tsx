'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, Send, AlertTriangle, Zap, TrendingUp } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { createClient } from '@/lib/supabase';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/EmptyState';
import { ADMIN_EMAIL, MAX_SIGNAL_BATCHES } from '@/lib/constants';
import { parseSignalText, evaluateSignal, type SignalBatch, type StockSignal } from '@/lib/stockSignals';
import { cn } from '@/lib/utils';

// Entry levels are color-coded by position so the same color always means
// the same thing across every ticker: 1st entry, 2nd (pullback), 3rd.
// Color lives on the text only — the levels share one bordered container
// instead of each getting its own bg+border box.
const LEVEL_STYLES = [
  { text: 'text-indigo-600', label: 'text-indigo-400' },
  { text: 'text-emerald-600', label: 'text-emerald-400' },
  { text: 'text-amber-600', label: 'text-amber-400' },
];

// Both the header and each row share this template so columns line up exactly.
const GRID_COLS = 'sm:grid-cols-[168px_1fr_130px_224px]';

function TickerLogo({ ticker }: { ticker: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
        {ticker.slice(0, 2)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://images.financialmodelingprep.com/symbol/${ticker}.JK.png`}
      alt={ticker}
      className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-200 p-1 flex-shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 'all'] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const STATE_BADGE_VARIANT = {
  buy: 'success',
  avoid: 'danger',
} as const;

function PriceStatusCell({
  entries, note, price, labels,
}: {
  entries: number[];
  note: string | null;
  price: number | null | undefined;
  labels: { buy: string; avoid: string };
}) {
  if (price === undefined) {
    return <span className="text-xs text-gray-300">…</span>;
  }

  const status = evaluateSignal(entries, note, price);

  return (
    <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-1">
      <span className="text-sm font-bold text-gray-900 font-mono">
        {price != null ? `Rp${price.toLocaleString('id-ID')}` : '—'}
      </span>
      {status.state && (
        <Badge variant={STATE_BADGE_VARIANT[status.state]}>{labels[status.state]}</Badge>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  const { t, language, user } = useFinance();
  const supabase = createClient();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [batches, setBatches] = useState<SignalBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [pasteText, setPasteText] = useState('');
  const [posting, setPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, number | null>>({});
  // 10 rows/page keeps a batch to roughly one screen before scrolling; users
  // can bump it up (or pick "all") if they'd rather see everything at once.
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [pageByBatch, setPageByBatch] = useState<Record<string, number>>({});
  const [buyOnly, setBuyOnly] = useState(false);

  const preview = useMemo(() => parseSignalText(pasteText), [pasteText]);
  const allTickers = useMemo(
    () => Array.from(new Set(batches.flatMap((b) => b.signals.map((s) => s.ticker)))),
    [batches]
  );

  const loadBatches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stock_signals')
      .select('*')
      .order('batch_date', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const grouped = new Map<string, StockSignal[]>();
    (data ?? []).forEach((row) => {
      const signal: StockSignal = {
        id: row.id,
        batchDate: row.batch_date,
        ticker: row.ticker,
        entries: (row.entries as number[]) ?? [],
        note: row.note,
        sortOrder: row.sort_order,
      };
      if (!grouped.has(row.batch_date)) grouped.set(row.batch_date, []);
      grouped.get(row.batch_date)!.push(signal);
    });

    setBatches(Array.from(grouped.entries()).map(([batchDate, signals]) => ({
      batchDate,
      signals: [...signals].sort((a, b) => a.ticker.localeCompare(b.ticker)),
    })));
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (allTickers.length === 0) return;
    fetch(`/api/stock-quotes?tickers=${allTickers.join(',')}`)
      .then((res) => res.json())
      .then((json) => setQuotes((prev) => ({ ...prev, ...json.quotes })))
      .catch(() => {});
  }, [allTickers]);

  async function handlePost() {
    if (!user || preview.length === 0) return;
    setPosting(true);
    setErrorMsg(null);

    const batchDate = new Date().toISOString().slice(0, 10);
    const rows = preview.map((line, i) => ({
      batch_date: batchDate,
      ticker: line.ticker,
      entries: line.entries,
      note: line.note,
      sort_order: i,
      created_by: user.id,
    }));

    const { error: insertError } = await supabase.from('stock_signals').insert(rows);
    if (insertError) {
      setErrorMsg(insertError.message);
      setPosting(false);
      return;
    }

    const { data: dateRows, error: dateErr } = await supabase
      .from('stock_signals')
      .select('batch_date')
      .order('batch_date', { ascending: false });
    if (!dateErr) {
      const distinctDates = Array.from(new Set((dateRows ?? []).map((r) => r.batch_date)));
      const staleDates = distinctDates.slice(MAX_SIGNAL_BATCHES);
      if (staleDates.length > 0) {
        await supabase.from('stock_signals').delete().in('batch_date', staleDates);
      }
    }

    setPasteText('');
    setPosting(false);
    await loadBatches();
  }

  async function handleDeleteBatch(batchDate: string) {
    if (!window.confirm(t('invest.watchlist.confirmDelete'))) return;
    const { error } = await supabase.from('stock_signals').delete().eq('batch_date', batchDate);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    await loadBatches();
  }

  function handlePageSizeChange(next: PageSize) {
    setPageSize(next);
    setPageByBatch({});
  }

  function toggleBuyOnly() {
    setBuyOnly((v) => !v);
    setPageByBatch({});
  }

  function isBuy(s: StockSignal) {
    return evaluateSignal(s.entries, s.note, quotes[s.ticker] ?? null).state === 'buy';
  }

  const totalBuyCount = batches.reduce((acc, b) => acc + b.signals.filter(isBuy).length, 0);

  function formatDate(dateStr: string) {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  function formatEntries(entries: number[]) {
    return entries.map((e) => e.toLocaleString('id-ID')).join(' / ');
  }

  const statusLabels = {
    buy: t('invest.watchlist.status.buy'),
    avoid: t('invest.watchlist.status.avoid'),
  };

  return (
    <>
      <Topbar title={t('invest.watchlist.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('invest.watchlist.heading')}</h3>
          <p className="text-xs text-gray-400">{t('invest.watchlist.subtitle')}</p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 px-3.5 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-6">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isAdmin && (
          <Card className="mb-6">
            <CardHeader>{t('invest.watchlist.newBatch')}</CardHeader>
            <CardBody>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={t('invest.watchlist.pastePlaceholder')}
                rows={8}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none font-mono resize-y"
              />
              <p className="text-xs text-gray-400 mt-2">{t('invest.watchlist.pasteHint')}</p>

              {pasteText.trim() && (
                <div className="mt-4">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {t('invest.watchlist.preview')} {preview.length > 0 && `(${preview.length})`}
                  </div>
                  {preview.length === 0 ? (
                    <p className="text-xs text-red-500">{t('invest.watchlist.noValidLines')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {preview.map((p, i) => (
                        <div key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                          <span className="font-semibold">{p.ticker}</span>{' '}
                          <span className="text-gray-500">{formatEntries(p.entries)}</span>
                          {p.note && <span className="text-amber-600"> · {p.note}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
                <p className="text-[11px] text-gray-400">{t('invest.watchlist.pruneNotice', { n: MAX_SIGNAL_BATCHES })}</p>
                <button
                  onClick={handlePost}
                  disabled={preview.length === 0 || posting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  {posting ? t('invest.watchlist.posting') : t('invest.watchlist.post')}
                </button>
              </div>
            </CardBody>
          </Card>
        )}

        {!loading && batches.length === 0 && (
          <EmptyState title={t('invest.watchlist.empty.title')} description={t('invest.watchlist.empty.desc')} />
        )}

        {batches.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <button
              onClick={toggleBuyOnly}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                buyOnly
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600'
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {t('invest.watchlist.filter.buyOnly')}
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', buyOnly ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600')}>
                {totalBuyCount}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{t('invest.watchlist.rowsPerPage')}</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange((e.target.value === 'all' ? 'all' : Number(e.target.value)) as PageSize)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:border-indigo-400 outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt === 'all' ? t('invest.watchlist.showAll') : opt}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {buyOnly && totalBuyCount === 0 && (
          <EmptyState title={t('invest.watchlist.filter.noBuyTitle')} description={t('invest.watchlist.filter.noBuyDesc')} />
        )}

        <div className="space-y-6">
          {batches.map((batch) => {
            const visibleSignals = buyOnly ? batch.signals.filter(isBuy) : batch.signals;
            if (visibleSignals.length === 0) return null;

            const effectiveSize = pageSize === 'all' ? visibleSignals.length : pageSize;
            const totalPages = Math.max(1, Math.ceil(visibleSignals.length / effectiveSize));
            const currentPage = Math.min(pageByBatch[batch.batchDate] ?? 0, totalPages - 1);
            const pageSignals = pageSize === 'all'
              ? visibleSignals
              : visibleSignals.slice(currentPage * effectiveSize, (currentPage + 1) * effectiveSize);

            return (
              <Card key={batch.batchDate}>
                <CardHeader action={
                  isAdmin ? (
                    <button
                      onClick={() => handleDeleteBatch(batch.batchDate)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title={t('invest.watchlist.deleteBatch')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <Badge variant="neutral">{visibleSignals.length}</Badge>
                  )
                }>
                  <span className="text-base">{formatDate(batch.batchDate)}</span>
                </CardHeader>
                <CardBody compact>
                  <div className={cn('hidden sm:grid sm:gap-4 items-center px-5 py-2.5 bg-gray-50 border-b border-gray-200', GRID_COLS)}>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invest.watchlist.table.ticker')}</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invest.watchlist.table.entries')}</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invest.watchlist.table.price')}</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invest.watchlist.table.note')}</span>
                  </div>
                  {pageSignals.map((s, idx) => (
                    <div
                      key={s.id}
                      className={cn(
                        'flex flex-col gap-3 px-5 py-4 transition-colors sm:grid sm:gap-4 sm:items-center',
                        GRID_COLS,
                        idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/40',
                        idx !== pageSignals.length - 1 && 'border-b border-gray-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <TickerLogo ticker={s.ticker} />
                        <span className="text-base font-bold text-gray-900 tracking-wide">{s.ticker}</span>
                      </div>

                      {s.entries.length > 1 ? (
                        <div className="flex items-stretch divide-x divide-gray-100 border border-gray-200 rounded-lg overflow-hidden w-fit">
                          {s.entries.map((entry, i) => {
                            const style = LEVEL_STYLES[i % LEVEL_STYLES.length];
                            return (
                              <div key={i} className="flex flex-col items-center justify-center px-2.5 py-1 min-w-[64px]">
                                <span className={cn('text-[8px] font-semibold uppercase tracking-wide', style.label)}>E{i + 1}</span>
                                <span className={cn('text-xs font-bold font-mono', style.text)}>{entry.toLocaleString('id-ID')}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-sm font-bold font-mono text-gray-900">
                          {s.entries[0]?.toLocaleString('id-ID') ?? '—'}
                        </span>
                      )}

                      <PriceStatusCell entries={s.entries} note={s.note} price={quotes[s.ticker]} labels={statusLabels} />

                      {s.note ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium w-fit sm:w-full" title={s.note}>
                          <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{s.note}</span>
                        </div>
                      ) : (
                        <span className="hidden sm:block text-gray-300 text-xs">—</span>
                      )}
                    </div>
                  ))}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">{visibleSignals.length} {t('invest.watchlist.signalsCount')}</span>
                      <div className="flex gap-1.5">
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setPageByBatch((prev) => ({ ...prev, [batch.batchDate]: i }))}
                            className={cn(
                              'px-2.5 py-1 text-xs rounded-md font-medium',
                              i === currentPage ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            )}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
