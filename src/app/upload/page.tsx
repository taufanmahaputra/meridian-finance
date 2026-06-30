'use client';

import { useState, useCallback } from 'react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';
import type { Transaction } from '@/types/finance';

export default function UploadPage() {
  const { addTransactions } = useFinance();
  const [parsed, setParsed] = useState<Transaction[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [imported, setImported] = useState(false);

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

  function confirmImport() {
    addTransactions(parsed);
    setImported(true);
  }

  return (
    <>
      <Topbar title="Upload Statement" />
      <div className="p-7 max-w-[1440px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Upload E-Statement</h3>
          <p className="text-xs text-gray-400">Import your bank or credit card statement to auto-categorize transactions</p>
        </div>

        <Card className="mb-6">
          <CardBody>
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'}`}
              onClick={() => document.getElementById('fileInput')?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-semibold mb-1">Drop your e-statement here</div>
              <div className="text-xs text-gray-400 mb-3">Supports CSV files exported from your bank. Max 10MB.</div>
              <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Choose File
              </button>
            </div>
            <input type="file" id="fileInput" accept=".csv" className="hidden" onChange={handleFileChange} />
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardHeader>Expected CSV Format</CardHeader>
          <CardBody>
            <p className="text-xs text-gray-500 mb-3">Your CSV should have columns similar to your Google Sheets budget tracker:</p>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <div className="text-gray-400"># Header row:</div>
              <div>Date, Name / Description, Amount (SGD), Category, Type</div>
              <div className="text-gray-400 mt-2"># Example rows:</div>
              <div>04/04/2026, SEPHORA - MBS, 80.00, Shopping, Expense</div>
              <div>05/04/2026, SHENG SIONG SUPERMARKE, 56.30, Food &amp; Groceries, Expense</div>
              <div>01/04/2025, Salary, 13333.00, Savings, Income</div>
            </div>
          </CardBody>
        </Card>

        {parsed.length > 0 && (
          <Card>
            <CardHeader action={
              imported ? (
                <Badge variant="success">Imported</Badge>
              ) : (
                <button onClick={confirmImport} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors">
                  Confirm &amp; Import
                </button>
              )
            }>Upload Preview — {parsed.length} transactions</CardHeader>
            <CardBody compact>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Date', 'Description', 'Amount', 'Category', 'Type'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 20).map((t, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-4 py-2.5 text-gray-500">{t.date}</td>
                        <td className="px-4 py-2.5">{t.description}</td>
                        <td className="px-4 py-2.5 font-semibold">${t.amount.toFixed(2)}</td>
                        <td className="px-4 py-2.5"><Badge variant="info">{t.category}</Badge></td>
                        <td className="px-4 py-2.5 text-gray-500">{t.type}</td>
                      </tr>
                    ))}
                    {parsed.length > 20 && (
                      <tr><td colSpan={5} className="px-4 py-3 text-center text-gray-400 text-xs">... and {parsed.length - 20} more rows</td></tr>
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
