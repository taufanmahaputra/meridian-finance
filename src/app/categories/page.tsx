'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles, X, Check } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { fmt, suggestCategoryBudgets, type BudgetSuggestion } from '@/lib/calculations';
import { CHART_COLORS, CURRENCY_SYMBOLS, nextChartColor } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SmartRow extends BudgetSuggestion {
  amount: string;
  include: boolean;
}

export default function CategoriesPage() {
  const {
    months, categories, monthlyBudget, currency, t,
    addCategory, updateCategory, deleteCategory,
  } = useFinance();

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartRows, setSmartRows] = useState<SmartRow[]>([]);
  const [applying, setApplying] = useState(false);

  const hasHistory = months.length > 0;

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim(), parseFloat(newCatBudget) || 0);
    setNewCatName('');
    setNewCatBudget('');
  }

  function openSmartGenerate() {
    const suggestions = suggestCategoryBudgets(months, categories);
    setSmartRows(suggestions.map((s) => ({ ...s, amount: String(s.suggestedBudget), include: true })));
    setSmartOpen(true);
  }

  // Sequential on purpose — addCategory reads existing categories from a
  // stale closure to pick the "next" chart color, so firing several calls
  // in parallel from the same render would hand out duplicate colors.
  // Picking colors locally here (and tracking them as we go) sidesteps that.
  async function applySmartGenerate() {
    setApplying(true);
    const usedColors = categories.map((c) => c.color);
    for (const row of smartRows) {
      if (!row.include) continue;
      const amount = parseFloat(row.amount) || 0;
      if (row.isNew) {
        const color = nextChartColor(usedColors);
        usedColors.push(color);
        await addCategory(row.name, amount, color);
      } else {
        const existing = categories.find((c) => c.name === row.name);
        if (existing?.id && amount !== existing.budget) {
          await updateCategory(existing.id, { budget: amount });
        }
      }
    }
    setApplying(false);
    setSmartOpen(false);
  }

  return (
    <>
      <Topbar title={t('categories.title')} />
      <div className="p-4 sm:p-7 max-w-[900px]">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h3 className="text-sm font-semibold">{t('budget.categories.title')}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t('categories.subtitle')}</p>
          </div>
          <button
            onClick={openSmartGenerate}
            disabled={!hasHistory}
            title={!hasHistory ? t('budget.smart.needsHistory') : undefined}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> {t('budget.categories.smartGenerate')}
          </button>
        </div>

        <Card>
          <CardBody compact>
            <div className="divide-y divide-gray-100">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setColorPickerFor(colorPickerFor === c.id ? null : (c.id ?? null))}
                      className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-transparent hover:ring-gray-200 transition-all"
                      style={{ backgroundColor: c.color }}
                      aria-label={t('budget.categories.changeColor')}
                    />
                    {colorPickerFor === c.id && (
                      <>
                        <div className="fixed inset-0 z-[59]" onClick={() => setColorPickerFor(null)} />
                        <div className="absolute z-[60] top-6 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1.5 w-40">
                          {CHART_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => { if (c.id) updateCategory(c.id, { color }); setColorPickerFor(null); }}
                              className={cn('w-5 h-5 rounded-full hover:scale-110 transition-transform', color === c.color && 'ring-2 ring-offset-1 ring-gray-400')}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-transparent rounded-md hover:border-gray-200 focus:border-indigo-400 focus:bg-gray-50 outline-none"
                    defaultValue={c.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.name && c.id) updateCategory(c.id, { name: v });
                    }}
                  />
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <span>{currencySymbol}</span>
                    <input
                      className="w-24 px-2 py-1.5 text-sm border border-transparent rounded-md hover:border-gray-200 focus:border-indigo-400 focus:bg-gray-50 outline-none text-right"
                      type="number"
                      defaultValue={c.budget || ''}
                      placeholder="0"
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== c.budget && c.id) updateCategory(c.id, { budget: v });
                      }}
                    />
                    <span className="w-10 text-left">{t('budget.categories.perMonth')}</span>
                  </div>
                  <button
                    onClick={() => c.id && deleteCategory(c.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">{t('budget.categories.empty')}</div>
              )}
            </div>

            <form onSubmit={handleAddCategory} className="flex flex-wrap items-center gap-2 px-5 py-4 bg-gray-50/50">
              <input
                className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-indigo-400 outline-none"
                placeholder={t('budget.categories.namePlaceholder')}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <input
                className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-indigo-400 outline-none"
                type="number"
                placeholder={t('budget.categories.budgetPlaceholder')}
                value={newCatBudget}
                onChange={(e) => setNewCatBudget(e.target.value)}
              />
              <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> {t('budget.categories.add')}
              </button>
            </form>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between px-1 mt-4 text-xs text-gray-400">
          <span>{t('categories.count', { n: categories.length })}</span>
          <span>{t('categories.totalBudget')}: <strong className="text-gray-600">{fmt(monthlyBudget, currency)}</strong></span>
        </div>
      </div>

      {smartOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center px-4" onClick={() => !applying && setSmartOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-[560px] shadow-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-base font-semibold">{t('budget.smart.title')}</h3>
                </div>
                <p className="text-xs text-gray-400">{t('budget.smart.subtitle')}</p>
              </div>
              <button onClick={() => setSmartOpen(false)} className="text-gray-300 hover:text-gray-600 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {smartRows.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400 text-sm">{t('budget.smart.noData')}</div>
              ) : smartRows.map((row, i) => (
                <div key={row.name} className="flex items-center gap-3 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => setSmartRows((prev) => prev.map((r, ri) => (ri === i ? { ...r, include: e.target.checked } : r)))}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 truncate">{row.name}</span>
                      {row.isNew && <Badge variant="info">{t('budget.smart.new')}</Badge>}
                    </div>
                    {row.currentBudget != null && (
                      <span className="text-[11px] text-gray-400">{t('budget.smart.current')}: {fmt(row.currentBudget, currency)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm flex-shrink-0">
                    <span className="text-gray-400">{currencySymbol}</span>
                    <input
                      type="number"
                      value={row.amount}
                      onChange={(e) => setSmartRows((prev) => prev.map((r, ri) => (ri === i ? { ...r, amount: e.target.value } : r)))}
                      className="w-28 px-2 py-1.5 text-sm border border-gray-200 rounded-md text-right focus:border-indigo-400 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
              <span className="text-[11px] text-gray-400 max-w-[220px]">{t('budget.smart.disclaimer')}</span>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setSmartOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  {t('common.cancel')}
                </button>
                <button
                  onClick={applySmartGenerate}
                  disabled={applying || smartRows.every((r) => !r.include)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5" /> {applying ? t('budget.smart.applying') : t('budget.smart.apply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
