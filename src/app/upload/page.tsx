'use client';

import { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import {
  Upload, AlertTriangle, X, Sparkles, Landmark, Trash2, CircleAlert, Save,
} from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { fmt } from '@/lib/calculations';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import {
  BANK_TEMPLATES, detectTemplate, guessColumns, parseRows, dateRange, inferMonthLabel,
  type BankTemplate, type ParsedRow,
} from '@/lib/bankTemplates';
import { extractStatementLines, describeExtractionError } from '@/lib/pdfStatement';
import {
  CARD_TEMPLATES, detectCardTemplate, detectPeriod, parseCardStatement,
} from '@/lib/creditCardStatement';
import { STATEMENT_CURRENCIES, convertAmount, type FxQuote } from '@/lib/fx';
import { categorizeByRules, categorizeIncome, collectUnmatched, type CategoryMethod } from '@/lib/autoCategorize';
import type { Transaction } from '@/types/finance';
import { cn } from '@/lib/utils';

/** A single reviewable draft row — editable before anything is saved. */
interface DraftRow extends ParsedRow {
  key: string;
  category: string;
  method: CategoryMethod;
  matchedOn?: string;
  /** Excluded rows stay visible but aren't imported. */
  include: boolean;
}

interface StatementFile {
  id: string;
  fileName: string;
  bankId: string;
  bankLabel: string;
  detected: boolean;
  currency: string;
  fx: FxQuote | null;
  manualRate: string;
  rows: DraftRow[];
  skipped: number;
  dateIssues: number;
}

export default function UploadPage() {
  const { months, categories, importMonth, deleteMonth, currency, t } = useFinance();

  const [files, setFiles] = useState<StatementFile[]>([]);
  const [fileErrors, setFileErrors] = useState<{ fileName: string; reason: 'scanned' | 'unreadable' | 'empty' }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedLabels, setImportedLabels] = useState<string[]>([]);
  const [categorizing, setCategorizing] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [targetMonth, setTargetMonth] = useState('');
  const [newMonthLabel, setNewMonthLabel] = useState('');
  const [partial, setPartial] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [resetMonthLabel, setResetMonthLabel] = useState('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);
  const catColorByName = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.color])),
    [categories]
  );
  const sortedMonths = useMemo(() => [...months].reverse(), [months]);
  const isNewMonth = targetMonth === '__new__';
  const effectiveLabel = isNewMonth ? newMonthLabel.trim() : targetMonth;
  const existingMonth = months.find((m) => m.label === effectiveLabel);

  const allRows = useMemo(() => files.flatMap((f) => f.rows.map((r) => ({ file: f, row: r }))), [files]);
  const includedCount = allRows.filter(({ row }) => row.include).length;
  const hasDraft = files.length > 0;

  /** Effective rate for a file: live max rate, or the user's manual override. */
  function rateFor(f: StatementFile): number | null {
    if (f.currency === currency) return 1;
    const manual = parseFloat(f.manualRate);
    if (isFinite(manual) && manual > 0) return manual;
    if (f.fx && !f.fx.unavailable && f.fx.rate > 0) return f.fx.rate;
    return null;
  }

  const convertedTotal = useMemo(() => {
    let expense = 0;
    let income = 0;
    for (const f of files) {
      const rate = rateFor(f) ?? 0;
      for (const r of f.rows) {
        if (!r.include) continue;
        const v = convertAmount(r.amount, rate);
        if (r.type === 'Income') income += v; else expense += v;
      }
    }
    return { expense, income };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, currency]);

  const processFile = useCallback((file: File) => {
    /** Shared tail for both CSV and PDF: categorize, register, fetch FX. */
    const finish = async (
      parsed: { rows: ParsedRow[]; skipped: number; dateIssues: number },
      meta: { bankId: string; bankLabel: string; detected: boolean; currency: string }
    ) => {
      if (parsed.rows.length === 0) {
        setFileErrors((prev) => [...prev, { fileName: file.name, reason: 'empty' }]);
        return;
      }

      // Rule-based pass runs immediately; the AI pass is a separate,
      // explicit action so an import never silently costs quota.
      const drafted: DraftRow[] = parsed.rows.map((r, i) => {
        const guess = r.type === 'Income'
          ? categorizeIncome(categoryNames)
          : categorizeByRules(r.description, categoryNames);
        const fromFile = r.category && categoryNames.includes(r.category) ? r.category : null;
        return {
          ...r,
          key: `${file.name}-${i}`,
          category: fromFile ?? guess?.category ?? 'Other',
          method: fromFile ? 'rule' : (guess?.method ?? 'fallback'),
          matchedOn: fromFile ? 'from file' : guess?.matchedOn,
          include: !r.suggestedExclude,
        };
      });

      const entry: StatementFile = {
        id: `${file.name}-${Date.now()}`,
        fileName: file.name,
        bankId: meta.bankId,
        bankLabel: meta.bankLabel,
        detected: meta.detected,
        currency: meta.currency,
        fx: null,
        manualRate: '',
        rows: drafted,
        skipped: parsed.skipped,
        dateIssues: parsed.dateIssues,
      };

      setFiles((prev) => [...prev, entry]);
      setImportedLabels([]);

      // Default the target month from the statement's own dates.
      const label = inferMonthLabel(parsed.rows);
      if (label) {
        setTargetMonth((cur) => {
          if (cur) return cur;
          return months.some((m) => m.label === label) ? label : '__new__';
        });
        setNewMonthLabel((cur) => cur || label);
      }

      // Fetch the conservative (max) rate for this statement's date range.
      if (meta.currency !== currency) {
        const range = dateRange(parsed.rows);
        const qs = new URLSearchParams({ from: meta.currency, to: currency });
        if (range) { qs.set('start', range.start); qs.set('end', range.end); }
        try {
          const fx: FxQuote = await fetch(`/api/fx-rate?${qs}`).then((r) => r.json());
          setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, fx } : f)));
        } catch {
          setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, fx: { from: meta.currency, to: currency, rate: 0, low: 0, points: 0, identity: false, unavailable: true } } : f)));
        }
      }
    };

    // PDF path: credit-card / bank statements that only exist as PDF.
    if (file.name.toLowerCase().endsWith('.pdf')) {
      (async () => {
        try {
          const lines = await extractStatementLines(file);
          const card = detectCardTemplate(lines);
          const period = detectPeriod(lines);
          const res = parseCardStatement(lines, period);
          await finish(
            { rows: res.rows, skipped: res.skipped, dateIssues: res.rows.filter((r) => r.dateInvalid).length },
            {
              bankId: card?.id ?? 'generic-pdf',
              bankLabel: card?.label ?? t('upload.unknownBank'),
              detected: !!card,
              currency: card?.currency ?? currency,
            }
          );
        } catch (err) {
          setFileErrors((prev) => [...prev, { fileName: file.name, reason: describeExtractionError(err) }]);
        }
      })();
      return;
    }

    // CSV path.
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as string[][];
        if (rows.length < 2) {
          setFileErrors((prev) => [...prev, { fileName: file.name, reason: 'empty' }]);
          return;
        }

        const header = rows[0];
        const template = detectTemplate(header);
        const mapping = template
          ? { columns: template.columns, amountMode: template.amountMode }
          : guessColumns(header);
        const formats = template?.dateFormats ?? ['dd/mm/yyyy', 'yyyy-mm-dd', 'dd mmm yyyy'];

        const parsed = parseRows(rows.slice(1), mapping.columns, mapping.amountMode, formats);
        await finish(parsed, {
          bankId: template?.id ?? 'generic',
          bankLabel: template?.label ?? t('upload.unknownBank'),
          detected: !!template,
          currency: template?.currency ?? currency,
        });
      },
    });
  }, [categoryNames, currency, months, t]);

  function handleFiles(list: FileList) {
    setFileErrors([]);
    Array.from(list).forEach(processFile);
  }

  /**
   * Applies a manual bank/card override. Only the label and default currency
   * change — the rows were already parsed by the format that actually matched
   * the file, so re-parsing here would need the raw file back. Currency is the
   * part that matters for conversion, and it stays editable separately.
   */
  function setFileBank(fileId: string, bankId: string) {
    const tpl: BankTemplate | undefined = BANK_TEMPLATES.find((b) => b.id === bankId);
    const card = CARD_TEMPLATES.find((c) => c.id === bankId);
    const label = tpl?.label ?? card?.label ?? t('upload.unknownBank');
    const cur = tpl?.currency ?? card?.currency;
    setFiles((prev) => prev.map((f) => (
      f.id === fileId ? { ...f, bankId, bankLabel: label } : f
    )));
    // A different issuer usually implies a different currency; re-run the
    // rate lookup rather than leaving the file blocked on a manual entry.
    if (cur) setFileCurrency(fileId, cur);
  }

  /** Sets a file's source currency and refetches its conservative rate. */
  async function setFileCurrency(fileId: string, cur: string) {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, currency: cur, fx: null, manualRate: '' } : f)));
    if (cur === currency) return;
    const target = files.find((f) => f.id === fileId);
    const range = target ? dateRange(target.rows) : null;
    const qs = new URLSearchParams({ from: cur, to: currency });
    if (range) { qs.set('start', range.start); qs.set('end', range.end); }
    try {
      const fx: FxQuote = await fetch(`/api/fx-rate?${qs}`).then((r) => r.json());
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, fx } : f)));
    } catch {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, fx: { from: cur, to: currency, rate: 0, low: 0, points: 0, identity: false, unavailable: true } } : f)));
    }
  }

  function updateRow(fileId: string, key: string, patch: Partial<DraftRow>) {
    setFiles((prev) => prev.map((f) => (
      f.id === fileId ? { ...f, rows: f.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) } : f
    )));
  }

  function removeFile(fileId: string) {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  /** Sends only the rows the rules couldn't place to Gemini. */
  async function runAiPass() {
    setCategorizing(true);
    setAiUnavailable(false);
    try {
      const unmatched = collectUnmatched(
        allRows.filter(({ row }) => row.include && row.method === 'fallback').map(({ row }) => row),
        categoryNames
      );
      if (unmatched.length === 0) { setCategorizing(false); return; }

      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptions: unmatched, categories: categoryNames }),
      }).then((r) => r.json());

      if (res.aiUnavailable) setAiUnavailable(true);
      const map: Record<string, string> = res.map ?? {};

      setFiles((prev) => prev.map((f) => ({
        ...f,
        rows: f.rows.map((r) => {
          const hit = map[r.description.trim()];
          return hit && r.method === 'fallback' ? { ...r, category: hit, method: 'ai' as CategoryMethod } : r;
        }),
      })));
    } finally {
      setCategorizing(false);
    }
  }

  async function confirmImport() {
    if (!effectiveLabel || includedCount === 0) return;
    setImporting(true);

    const txs: Transaction[] = [];
    for (const f of files) {
      const rate = rateFor(f);
      if (rate == null) continue; // no usable rate — skip rather than guess
      for (const r of f.rows) {
        if (!r.include) continue;
        txs.push({
          date: r.date,
          description: r.description,
          amount: convertAmount(r.amount, rate),
          category: r.category,
          type: r.type,
          originalAmount: r.amount,
          originalCurrency: f.currency,
          fxRate: rate,
          sourceBank: f.bankId,
        });
      }
    }

    await importMonth(effectiveLabel, partial, txs, existingMonth ? importMode : 'append');
    setImporting(false);
    setImportedLabels([effectiveLabel]);
    setFiles([]);
  }

  async function resetMonth() {
    if (!resetMonthLabel) return;
    setResetting(true);
    await deleteMonth(resetMonthLabel);
    setResetting(false);
    setResetConfirmOpen(false);
    setResetMonthLabel('');
  }

  const blockedFiles = files.filter((f) => rateFor(f) == null);
  const canImport = !!effectiveLabel && includedCount > 0 && blockedFiles.length === 0 && !importing;

  return (
    <>
      <Topbar title={t('upload.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('upload.heading')}</h3>
          <p className="text-xs text-gray-400">{t('upload.multiSubtitle')}</p>
        </div>

        {/* Unsaved-draft warning — the draft is in-memory only, so make the
            consequence of navigating away impossible to miss. */}
        {hasDraft && (
          <div className="flex items-start gap-2.5 px-4 py-3 mb-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900">
            <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="text-[13px]">
              <strong className="block">{t('upload.draftWarningTitle')}</strong>
              <span className="text-amber-800">{t('upload.draftWarningBody')}</span>
            </div>
          </div>
        )}

        {importedLabels.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px]">
            <Save className="w-4 h-4 flex-shrink-0" />
            <span>{t('upload.savedTo', { month: importedLabels.join(', ') })}</span>
          </div>
        )}

        <Card className="mb-6">
          <CardBody>
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-colors',
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
              )}
              onClick={() => document.getElementById('fileInput')?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
            >
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-semibold mb-1">{t('upload.dropHere')}</div>
              <div className="text-xs text-gray-400 mb-3">{t('upload.multiDropDesc')}</div>
              <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                {t('upload.chooseFile')}
              </button>
            </div>
            <input type="file" id="fileInput" accept=".csv,.pdf" multiple className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }} />
            <p className="text-[11px] text-gray-400 mt-3">
              {t('upload.supportedBanks')}: {[...CARD_TEMPLATES, ...BANK_TEMPLATES].map((b) => b.label).join(' · ')} — {t('upload.otherBanksNote')}
            </p>

            {fileErrors.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {fileErrors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span><strong>{e.fileName}</strong> — {t(`upload.error.${e.reason}`)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Per-file bank + currency + FX controls */}
        {files.map((f) => {
          const rate = rateFor(f);
          const needsManual = f.currency !== currency && (!f.fx || f.fx.unavailable) ;
          return (
            <Card key={f.id} className="mb-4">
              <CardHeader action={
                <button onClick={() => removeFile(f.id)} className="text-gray-300 hover:text-red-500 transition-colors" title={t('upload.removeFile')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              }>
                <span className="inline-flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-500" />
                  <span className="truncate">{f.fileName}</span>
                  <Badge variant={f.detected ? 'success' : 'warning'}>
                    {f.detected ? t('upload.detected') : t('upload.guessed')}
                  </Badge>
                </span>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('upload.bankFormat')}</label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 outline-none"
                      value={f.bankId} onChange={(e) => setFileBank(f.id, e.target.value)}>
                      <option value="generic">{t('upload.unknownBank')}</option>
                      <optgroup label={t('upload.creditCards')}>
                        {CARD_TEMPLATES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                      </optgroup>
                      <optgroup label={t('upload.bankAccounts')}>
                        {BANK_TEMPLATES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('upload.statementCurrency')}</label>
                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 outline-none"
                      value={f.currency} onChange={(e) => setFileCurrency(f.id, e.target.value)}>
                      {STATEMENT_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      {t('upload.rateApplied')} → {currency}
                    </label>
                    {f.currency === currency ? (
                      <div className="px-3 py-2 text-sm text-gray-400">{t('upload.sameCurrency')}</div>
                    ) : needsManual ? (
                      <input
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-amber-50 focus:border-amber-400 outline-none"
                        type="number" placeholder={t('upload.enterRate')}
                        value={f.manualRate}
                        onChange={(e) => setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, manualRate: e.target.value } : x)))}
                      />
                    ) : (
                      <div className="px-3 py-2 text-sm font-mono font-semibold text-gray-900">
                        {rate?.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </div>
                    )}
                  </div>
                </div>

                {f.currency !== currency && f.fx && !f.fx.unavailable && (
                  <p className="text-[11px] text-gray-500">
                    {t('upload.conservativeNote', {
                      high: f.fx.rate.toLocaleString('en-US', { maximumFractionDigits: 2 }),
                      low: f.fx.low.toLocaleString('en-US', { maximumFractionDigits: 2 }),
                      days: f.fx.points,
                    })}
                  </p>
                )}
                {needsManual && (
                  <p className="text-[11px] text-amber-700">{t('upload.rateUnavailable')}</p>
                )}
                {(f.skipped > 0 || f.dateIssues > 0) && (
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {f.skipped > 0 && <>{t('upload.skippedRows', { n: f.skipped })} </>}
                    {f.dateIssues > 0 && <>{t('upload.dateIssues', { n: f.dateIssues })}</>}
                  </p>
                )}
              </CardBody>
            </Card>
          );
        })}

        {/* Month assignment */}
        {hasDraft && (
          <Card className="mb-4">
            <CardHeader>{t('upload.assignToMonth')}</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('upload.targetMonth')}</label>
                  <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 outline-none"
                    value={targetMonth} onChange={(e) => { setTargetMonth(e.target.value); setImportMode('append'); }}>
                    <option value="">{t('upload.selectMonth')}</option>
                    {sortedMonths.map((m) => <option key={m.label} value={m.label}>{m.label}</option>)}
                    <option value="__new__">{t('upload.newMonth')}</option>
                  </select>
                </div>
                {isNewMonth && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('upload.newMonthLabel')}</label>
                    <input className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 outline-none"
                      placeholder="e.g. Jul 2026" value={newMonthLabel} onChange={(e) => setNewMonthLabel(e.target.value)} />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} className="rounded border-gray-300" />
                {t('upload.partialMonth')}
              </label>

              {existingMonth && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setImportMode('append')}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors text-left',
                        importMode === 'append' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      )}>
                      {t('upload.modeAppend')}
                    </button>
                    <button type="button" onClick={() => setImportMode('replace')}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors text-left',
                        importMode === 'replace' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      )}>
                      {t('upload.modeReplace')}
                    </button>
                  </div>
                  <div className={cn(
                    'flex items-start gap-2 px-3.5 py-3 rounded-lg text-xs',
                    importMode === 'replace' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                  )}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {importMode === 'append'
                        ? t('upload.appendNote', { month: existingMonth.label, amount: fmt(existingMonth.expenses || 0, currency) })
                        : t('upload.replaceNote', { month: existingMonth.label, amount: fmt(existingMonth.expenses || 0, currency) })}
                    </span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Reset a month — independent of the current draft, for undoing a bad import */}
        {months.length > 0 && (
          <Card className="mb-4">
            <CardHeader>{t('upload.resetSection')}</CardHeader>
            <CardBody>
              <p className="text-xs text-gray-400 mb-3">{t('upload.resetSectionNote')}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <select className="w-full sm:w-56 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 outline-none"
                  value={resetMonthLabel} onChange={(e) => { setResetMonthLabel(e.target.value); setResetConfirmOpen(false); }}>
                  <option value="">{t('upload.selectMonth')}</option>
                  {sortedMonths.map((m) => <option key={m.label} value={m.label}>{m.label}</option>)}
                </select>
                {resetMonthLabel && !resetConfirmOpen && (
                  <button onClick={() => setResetConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors self-start">
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('upload.resetMonth', { month: resetMonthLabel })}
                  </button>
                )}
              </div>

              {resetMonthLabel && resetConfirmOpen && (
                <div className="mt-3 flex items-start gap-2 px-3.5 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="mb-2">
                      {t('upload.resetMonthConfirm', {
                        month: resetMonthLabel,
                        amount: fmt(months.find((m) => m.label === resetMonthLabel)?.expenses || 0, currency),
                      })}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={resetMonth} disabled={resetting}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-40">
                        {resetting ? t('upload.resetting') : t('upload.resetMonthConfirmBtn')}
                      </button>
                      <button onClick={() => setResetConfirmOpen(false)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Draft review panel */}
        {hasDraft && (
          <Card>
            <CardHeader action={
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={runAiPass} disabled={categorizing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-40">
                  <Sparkles className="w-3.5 h-3.5" />
                  {categorizing ? t('upload.aiRunning') : t('upload.aiFillRest')}
                </button>
                <button onClick={confirmImport} disabled={!canImport}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <Save className="w-3.5 h-3.5" />
                  {importing
                    ? t('upload.importing')
                    : existingMonth
                      ? (importMode === 'replace' ? t('upload.replaceAndImport') : t('upload.appendAndImport'))
                      : t('upload.confirmAndImport')}
                </button>
              </div>
            }>
              {t('upload.draftReview')} — {includedCount}/{allRows.length} {t('upload.transactions')}
            </CardHeader>
            <CardBody compact>
              <div className="flex items-center gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[12px] flex-wrap">
                <span className="text-gray-400">{t('upload.totalExpense')} <strong className="text-gray-900 font-mono">{fmt(convertedTotal.expense, currency)}</strong></span>
                <span className="text-gray-400">{t('upload.totalIncome')} <strong className="text-emerald-600 font-mono">{fmt(convertedTotal.income, currency)}</strong></span>
                {blockedFiles.length > 0 && (
                  <span className="text-amber-700 font-medium">{t('upload.blockedByRate', { n: blockedFiles.length })}</span>
                )}
                {aiUnavailable && <span className="text-amber-700">{t('upload.aiUnavailable')}</span>}
              </div>

              <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
                {allRows.map(({ file, row }) => {
                  const rate = rateFor(file);
                  const converted = rate != null ? convertAmount(row.amount, rate) : null;
                  return (
                    <div key={row.key} className={cn('flex items-center gap-3 px-5 py-3', !row.include && 'opacity-40')}>
                      <input type="checkbox" checked={row.include}
                        onChange={(e) => updateRow(file.id, row.key, { include: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 flex-shrink-0" />

                      <CategoryIcon name={row.category} color={catColorByName[row.category] || '#6b7280'} size="sm" />

                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-gray-900 truncate">{row.description}</div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                          <span className={cn(row.dateInvalid && 'text-amber-600 font-semibold')}>
                            {row.date || t('upload.noDate')}
                          </span>
                          <span>·</span>
                          <span className="font-mono">{CURRENCY_SYMBOLS[file.currency] ?? file.currency}{row.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                          {file.currency !== currency && converted != null && (
                            <><span>→</span><span className="font-mono font-semibold text-gray-600">{fmt(converted, currency)}</span></>
                          )}
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide',
                              row.method === 'rule' ? 'bg-emerald-50 text-emerald-600'
                                : row.method === 'ai' ? 'bg-indigo-50 text-indigo-600'
                                : 'bg-amber-50 text-amber-700'
                            )}
                            title={row.matchedOn ? `matched: ${row.matchedOn}` : undefined}
                          >
                            {row.method === 'rule' ? t('upload.methodRule') : row.method === 'ai' ? t('upload.methodAi') : t('upload.methodManual')}
                          </span>
                          {row.suggestedExclude && (
                            <span
                              className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500"
                              title={t('upload.suggestedExclude')}
                            >
                              {t('upload.suggestedExclude')}
                            </span>
                          )}
                        </div>
                      </div>

                      <select
                        className="w-36 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-indigo-400 outline-none flex-shrink-0"
                        value={row.category}
                        onChange={(e) => updateRow(file.id, row.key, { category: e.target.value, method: 'fallback' })}
                      >
                        {!categoryNames.includes(row.category) && <option value={row.category}>{row.category}</option>}
                        {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>

                      <select
                        className="w-24 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-indigo-400 outline-none flex-shrink-0"
                        value={row.type}
                        onChange={(e) => updateRow(file.id, row.key, { type: e.target.value as 'Income' | 'Expense' })}
                      >
                        <option value="Expense">{t('upload.typeExpense')}</option>
                        <option value="Income">{t('upload.typeIncome')}</option>
                      </select>

                      <button onClick={() => updateRow(file.id, row.key, { include: false })}
                        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title={t('upload.excludeRow')}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
