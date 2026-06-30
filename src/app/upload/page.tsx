'use client';

import { useState, useCallback, useMemo } from 'react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Upload, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import type { Transaction } from '@/types/finance';
import { fmt } from '@/lib/calculations';

export default function UploadPage() {
  const { months, importMonth, currency, t } = useFinance();
  const [parsed, setParsed] = useState<Transaction[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [imported, setImported] = useState(false);
  const [importing, setImporting] = useState(false);
  const [targetMonth, setTargetMonth] = useState('');
  const [newMonthLabel, setNewMonthLabel] = useState('');
  const [partial, setPartial] = useState(false);

  const sortedMonths = useMemo(() => [...months].reverse(), [months]);
  const isNewMonth = targetMonth === '__new__';
  const effectiveLabel = isNewMonth ? newMonthLabel.trim() : targetMonth;
  const existingMonth = months.find((m) => m.label === effectiveLabel);

  const processFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        const txs: Transaction[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 4) continue;
          const date = r[0]?.trim() || r[1]?.trim() || '';
          const desc = r[1]?.trim() || r[2]?.trim() || '';
          const amountStr = (r[2] || r[3] || '0').replace(/[$,]/g, '').trim();
          const amount = Math.abs(parseFloat(amountStr) || 0);
          const category = r[3]?.trim() || r[5]?.trim() || 'Other';
          const type = (r[4]?.trim() || r[6]?.trim() || 'Expense') as 'Income' | 'Expense';
          if (amount > 0 && desc) txs.push({ date, description: desc, amount, category, type });
        }
        setParsed(txs);
        setImported(false);
      },
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) processFile(e.target.files[0]);
  }

  async function confirmImport() {
    if (!effectiveLabel) return;
    setImporting(true);
    await importMonth(effectiveLabel, partial, parsed);
    setImporting(false);
    setImported(true);
  }

  return (
    <>
      <Topbar title={t('upload.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('upload.heading')}</h3>
          <p className="text-xs text-gray-400">{t('upload.subtitle')}</p>
        </div>

        <Card className="mb-6">
          <CardBody>
            <div
              className={`border-2 border-dashed rounded-xl p-6 sm:p-12 text-center cursor-pointer transition-colors ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'}`}
              onClick={() => document.getElementById('fileInput')?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-semibold mb-1">{t('upload.dropHere')}</div>
              <div className="text-xs text-gray-400 mb-3">{t('upload.dropDesc')}</div>
              <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                {t('upload.chooseFile')}
              </button>
            </div>
            <input type="file" id="fileInput" accept=".csv" className="hidden" onChange={handleFileChange} />
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardHeader>{t('upload.expectedFormat')}</CardHeader>
          <CardBody>
            <p className="text-xs text-gray-500 mb-3">{t('upload.expectedDesc')}</p>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <div className="text-gray-400"># Header row:</div>
              <div>Date, Name / Description, Amount ({currency}), Category, Type</div>
              <div className="text-gray-400 mt-2"># Example rows:</div>
              <div>04/04/2026, INDOMARET, 80000, Shopping, Expense</div>
              <div>05/04/2026, TOKOPEDIA - GROCERIES, 256300, Food &amp; Groceries, Expense</div>
              <div>01/04/2025, Gaji, 15000000, Income, Income</div>
            </div>
          </CardBody>
        </Card>

        {parsed.length > 0 && (
          <Card className="mb-6">
            <CardHeader>{t('upload.assignToMonth')}</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('upload.targetMonth')}</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 outline-none"
                    value={targetMonth}
                    onChange={(e) => { setTargetMonth(e.target.value); setImported(false); }}
                  >
                    <option value="">{t('upload.selectMonth')}</option>
                    {sortedMonths.map((m) => <option key={m.label} value={m.label}>{m.label}</option>)}
                    <option value="__new__">{t('upload.newMonth')}</option>
                  </select>
                </div>
                {isNewMonth && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('upload.newMonthLabel')}</label>
                    <input
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 outline-none"
                      placeholder="e.g. Jul 2026"
                      value={newMonthLabel}
                      onChange={(e) => { setNewMonthLabel(e.target.value); setImported(false); }}
                    />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} className="rounded border-gray-300" />
                {t('upload.partialMonth')}
              </label>

              {existingMonth && (
                <div className="flex items-start gap-2 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>{existingMonth.label}</strong> {t('upload.replaceWarning')} ({existingMonth.cats ? Object.values(existingMonth.cats).filter((v) => v > 0).length : 0} {t('upload.replaceWarning2')}, {fmt(existingMonth.expenses || 0, currency)} {t('upload.replaceWarning3')} <strong>{t('upload.replaceWarning4')}</strong> {t('upload.replaceWarning5')}
                  </span>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {parsed.length > 0 && (
          <Card>
            <CardHeader action={
              imported ? (
                <Badge variant="success">{t('upload.imported')}</Badge>
              ) : (
                <button
                  onClick={confirmImport}
                  disabled={!effectiveLabel || importing}
                  className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {importing ? t('upload.importing') : existingMonth ? t('upload.replaceAndImport') : t('upload.confirmAndImport')}
                </button>
              )
            }>{t('upload.preview')} — {parsed.length} {t('upload.transactions')}</CardHeader>
            <CardBody compact>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50">
                      {[t('transactions.date'), t('transactions.description'), t('transactions.amount'), t('transactions.category'), t('transactions.type')].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 20).map((tx, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-4 py-2.5 text-gray-500">{tx.date}</td>
                        <td className="px-4 py-2.5">{tx.description}</td>
                        <td className="px-4 py-2.5 font-semibold">{fmt(tx.amount, currency, 2)}</td>
                        <td className="px-4 py-2.5"><Badge variant="info">{tx.category}</Badge></td>
                        <td className="px-4 py-2.5 text-gray-500">{tx.type}</td>
                      </tr>
                    ))}
                    {parsed.length > 20 && (
                      <tr><td colSpan={5} className="px-4 py-3 text-center text-gray-400 text-xs">{t('upload.moreRows', { n: parsed.length - 20 })}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
