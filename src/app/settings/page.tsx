'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, AlertTriangle, Globe, Wallet, Tag, Database } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { CURRENCIES, CURRENCY_SYMBOLS } from '@/lib/constants';
import { LANGUAGES, type Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Tab = 'general' | 'currency' | 'categories' | 'data';

export default function SettingsPage() {
  const {
    categories, addCategory, updateCategory, deleteCategory,
    income, updateIncome, currency, updateCurrency, language, updateLanguage,
    clearAllData, t,
  } = useFinance();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('general');
  const [incomeInput, setIncomeInput] = useState(income.toString());
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  function handleIncomeBlur() {
    const val = parseFloat(incomeInput) || 0;
    if (val !== income) updateIncome(val);
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim(), parseFloat(newCatBudget) || 0);
    setNewCatName('');
    setNewCatBudget('');
  }

  async function handleClearAll() {
    setClearing(true);
    await clearAllData();
    setClearing(false);
    setConfirmOpen(false);
    setConfirmText('');
    router.push('/dashboard');
  }

  const tabs: { id: Tab; label: string; icon: typeof Globe }[] = [
    { id: 'general', label: t('settings.tab.general'), icon: Globe },
    { id: 'currency', label: t('settings.tab.currency'), icon: Wallet },
    { id: 'categories', label: t('settings.tab.categories'), icon: Tag },
    { id: 'data', label: t('settings.tab.data'), icon: Database },
  ];

  return (
    <>
      <Topbar title={t('settings.title')} />
      <div className="p-4 sm:p-7 max-w-[900px]">
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                tab === tb.id ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              <tb.icon className="w-3.5 h-3.5" />
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'general' && (
          <Card>
            <CardHeader>{t('settings.language.title')}</CardHeader>
            <CardBody>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.language.label')}</label>
              <select
                className="w-full sm:w-64 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                value={language}
                onChange={(e) => updateLanguage(e.target.value as Language)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-2">{t('settings.language.desc')}</p>
            </CardBody>
          </Card>
        )}

        {tab === 'currency' && (
          <Card>
            <CardHeader>{t('settings.currency.title')}</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.currency.label')}</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={currency}
                    onChange={(e) => updateCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.income.label')} ({currencySymbol})</label>
                  <input
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                    type="number"
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    onBlur={handleIncomeBlur}
                    placeholder="0"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">{t('settings.currencyIncome.desc')}</p>
            </CardBody>
          </Card>
        )}

        {tab === 'categories' && (
          <Card>
            <CardHeader>{t('settings.categories.title')}</CardHeader>
            <CardBody compact>
              <div className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
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
                      <span className="w-10 text-left">{t('settings.categories.perMonth')}</span>
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
                  <div className="px-5 py-6 text-center text-gray-400 text-sm">{t('settings.categories.empty')}</div>
                )}
              </div>

              <form onSubmit={handleAddCategory} className="flex flex-wrap items-center gap-2 px-5 py-4 bg-gray-50/50">
                <input
                  className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-indigo-400 outline-none"
                  placeholder={t('settings.categories.namePlaceholder')}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <input
                  className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-indigo-400 outline-none"
                  type="number"
                  placeholder={t('settings.categories.budgetPlaceholder')}
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                />
                <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> {t('settings.categories.add')}
                </button>
              </form>
            </CardBody>
          </Card>
        )}

        {tab === 'data' && (
          <Card className="border-red-200">
            <CardHeader>
              <span className="text-red-600">{t('settings.data.title')}</span>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('settings.data.clearTitle')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t('settings.data.clearDesc')}</p>
                </div>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t('settings.data.clearButton')}
                </button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center px-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-[420px] shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold mb-1">{t('settings.data.confirmTitle')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('settings.data.confirmDesc')}</p>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.data.confirmType')}</label>
            <input
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none mb-4"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
            <div className="flex gap-3">
              <button
                disabled={confirmText !== 'DELETE' || clearing}
                onClick={handleClearAll}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {clearing ? t('settings.data.clearing') : t('settings.data.clearEverything')}
              </button>
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
