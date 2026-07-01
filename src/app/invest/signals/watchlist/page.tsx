'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, Send, AlertTriangle, Zap } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { createClient } from '@/lib/supabase';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/EmptyState';
import { ADMIN_EMAIL, MAX_SIGNAL_BATCHES } from '@/lib/constants';
import { parseSignalText, type SignalBatch, type StockSignal } from '@/lib/stockSignals';
import { cn } from '@/lib/utils';

// Entry levels are color-coded by position so the same color always means
// the same thing across every ticker: 1st entry, 2nd (pullback), 3rd.
const LEVEL_STYLES = [
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', label: 'text-indigo-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'text-emerald-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'text-amber-500' },
];

export default function WatchlistPage() {
  const { t, language, user } = useFinance();
  const supabase = createClient();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [batches, setBatches] = useState<SignalBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [pasteText, setPasteText] = useState('');
  const [posting, setPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const preview = useMemo(() => parseSignalText(pasteText), [pasteText]);

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

  function formatDate(dateStr: string) {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  function formatEntries(entries: number[]) {
    return entries.map((e) => e.toLocaleString('id-ID')).join(' / ');
  }

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

        <div className="space-y-6">
          {batches.map((batch) => (
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
                  <Badge variant="neutral">{batch.signals.length}</Badge>
                )
              }>
                <span className="text-base">{formatDate(batch.batchDate)}</span>
              </CardHeader>
              <CardBody compact>
                <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-200">
                  <span className="w-28 flex-shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invest.watchlist.table.ticker')}</span>
                  <span className="flex-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invest.watchlist.table.entries')}</span>
                  <span className="w-56 flex-shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invest.watchlist.table.note')}</span>
                </div>
                {batch.signals.map((s, idx) => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/40',
                      idx !== batch.signals.length - 1 && 'border-b border-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-3 sm:w-28 flex-shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                        {s.ticker.slice(0, 2)}
                      </div>
                      <span className="text-base font-bold text-gray-900 tracking-wide">{s.ticker}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      {s.entries.map((entry, i) => {
                        const style = LEVEL_STYLES[i % LEVEL_STYLES.length];
                        return (
                          <div key={i} className={cn('flex flex-col items-center px-3 py-1.5 rounded-lg border min-w-[76px]', style.bg, style.border)}>
                            <span className={cn('text-[9px] font-semibold uppercase tracking-wide', style.label)}>
                              {s.entries.length > 1 ? `E${i + 1}` : t('invest.watchlist.table.entries').split(' ')[0]}
                            </span>
                            <span className={cn('text-sm font-bold font-mono', style.text)}>{entry.toLocaleString('id-ID')}</span>
                          </div>
                        );
                      })}
                    </div>

                    {s.note && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium sm:w-56 sm:flex-shrink-0" title={s.note}>
                        <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{s.note}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
