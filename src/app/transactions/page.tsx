'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Download, X, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, Info, CreditCard, Landmark,
  Plus, Pencil, Trash2,
} from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import { fmt, buildTransactionLedger, isIsoDate, effectiveTxMonth } from '@/lib/calculations';
import { resolveSourceBank } from '@/lib/sourceBanks';
import type { Transaction } from '@/types/finance';
import { cn } from '@/lib/utils';

const PAGE_SIZES = [25, 50, 100];

/** Sorts real ISO dates chronologically; non-ISO fallback rows (month
 *  aggregates with no day-level date) sort before any dated row. */
function dateSortKey(tx: Transaction): string {
  return isIsoDate(tx.date) ? tx.date : '0000-00-00';
}

type SortField = 'date' | 'description' | 'category' | 'type' | 'amount' | 'source';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'category' | 'month' | 'type' | 'source';

/** Small icon + label for a transaction's bank/account, so it's clear at a
 *  glance whether a row came from a credit card or a savings account. */
function SourceBadge({ sourceBank }: { sourceBank?: string }) {
  const resolved = resolveSourceBank(sourceBank);
  if (!resolved) return <span className="text-gray-300">—</span>;
  const Icon = resolved.accountType === 'credit_card' ? CreditCard : Landmark;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-600 whitespace-nowrap">
      <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      {resolved.label}
    </span>
  );
}

interface Group {
  key: string;
  rows: Transaction[];
  income: number;
  expense: number;
}

/** A handful of page numbers centered on the current page, for pagination
 *  that stays usable past 7 pages instead of only ever showing the first 7. */
function pageWindow(current: number, total: number, size = 5): number[] {
  if (total <= size) return Array.from({ length: total }, (_, i) => i);
  let start = Math.max(0, current - Math.floor(size / 2));
  const end = Math.min(total, start + size);
  start = Math.max(0, end - size);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

// This page is deliberately just the raw ledger — search, filter, group,
// sort, export. Totals, breakdowns, and trend charts live on Spending now;
// this is the "look at the actual rows" tool, not an analysis surface.
export default function TransactionsPage() {
  const {
    months, transactions, categories, catColors, currency, t,
    addTransaction, updateTransaction, deleteTransaction,
  } = useFinance();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'Income' | 'Expense'>('');
  const [catFilter, setCatFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: '', description: '', amount: '', category: '', type: 'Expense' as 'Income' | 'Expense' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allTx = useMemo(() => buildTransactionLedger(months, transactions), [months, transactions]);
  const categoryNames = useMemo(() => [...new Set(allTx.map((tx) => tx.category))].sort(), [allTx]);
  const monthLabels = useMemo(() => {
    const order = months.map((m) => m.label);
    return [...new Set(allTx.map(effectiveTxMonth))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [allTx, months]);
  const sourceOptions = useMemo(() => {
    const ids = new Set(allTx.map((tx) => tx.sourceBank).filter((id): id is string => !!id));
    return [...ids]
      .map((id) => ({ id, label: resolveSourceBank(id)?.label ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allTx]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTx.filter((tx) => {
      if (q && !tx.description.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) return false;
      if (typeFilter && tx.type !== typeFilter) return false;
      if (catFilter && tx.category !== catFilter) return false;
      if (monthFilter && effectiveTxMonth(tx) !== monthFilter) return false;
      if (sourceFilter && tx.sourceBank !== sourceFilter) return false;
      if (dateFrom || dateTo) {
        if (!isIsoDate(tx.date)) return false;
        if (dateFrom && tx.date < dateFrom) return false;
        if (dateTo && tx.date > dateTo) return false;
      }
      return true;
    });
  }, [allTx, search, typeFilter, catFilter, monthFilter, sourceFilter, dateFrom, dateTo]);

  // This ledger is the "raw data" view, so it must only ever show genuinely
  // itemized rows — never the synthetic per-category placeholders
  // buildTransactionLedger fills in for a month with no itemized import.
  // Showing those as if they were real transactions is what read as
  // "wrong" — a fake row per category, not real data.
  const ledgerRows = useMemo(() => filtered.filter((tx) => !tx.synthetic), [filtered]);
  const hasAggregateOnlyMatches = filtered.length > 0 && ledgerRows.length === 0;

  const sorted = useMemo(() => {
    const arr = [...ledgerRows];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = dateSortKey(a).localeCompare(dateSortKey(b));
      else if (sortField === 'description') cmp = a.description.localeCompare(b.description);
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortField === 'source') cmp = (resolveSourceBank(a.sourceBank)?.label ?? '').localeCompare(resolveSourceBank(b.sourceBank)?.label ?? '');
      else cmp = a.amount - b.amount;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [ledgerRows, sortField, sortDir]);

  const groups = useMemo<Group[] | null>(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, Group>();
    sorted.forEach((tx) => {
      const key = groupBy === 'category' ? tx.category
        : groupBy === 'month' ? effectiveTxMonth(tx)
        : groupBy === 'source' ? (tx.sourceBank ?? '')
        : tx.type;
      const g = map.get(key) ?? { key, rows: [], income: 0, expense: 0 };
      g.rows.push(tx);
      if (tx.type === 'Income') g.income += tx.amount; else g.expense += tx.amount;
      map.set(key, g);
    });
    const arr = [...map.values()];
    if (groupBy === 'month') {
      const order = months.map((m) => m.label);
      arr.sort((a, b) => order.indexOf(b.key) - order.indexOf(a.key));
    } else {
      arr.sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
    }
    return arr;
  }, [sorted, groupBy, months]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageSlice = groups ? [] : sorted.slice(pageSafe * perPage, (pageSafe + 1) * perPage);

  const hasActiveFilters = !!(search || typeFilter || catFilter || monthFilter || sourceFilter || dateFrom || dateTo);

  // Months that only ever got a manual aggregate total (via "+ Add Month",
  // or an import that never landed itemized rows) — surfaced up front so
  // the ledger's row count doesn't look mysteriously short.
  const monthsWithoutItemized = useMemo(
    () => months.filter((m) => !transactions.some((tx) => tx.month === m.label)).map((m) => m.label),
    [months, transactions]
  );

  function resetFilters() {
    setSearch(''); setTypeFilter(''); setCatFilter(''); setMonthFilter(''); setSourceFilter(''); setDateFrom(''); setDateTo(''); setPage(0);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir(field === 'date' ? 'desc' : 'asc'); }
    setPage(0);
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function openAddModal() {
    setModalMode('add');
    setEditId(null);
    setForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '', category: categories[0]?.name ?? '', type: 'Expense' });
  }

  function openEditModal(tx: Transaction) {
    if (!tx.id) return;
    setModalMode('edit');
    setEditId(tx.id);
    setForm({ date: tx.date, description: tx.description, amount: String(tx.amount), category: tx.category, type: tx.type });
  }

  async function handleSaveModal() {
    const amount = parseFloat(form.amount);
    if (!form.date || !form.description.trim() || !form.category || !isFinite(amount) || amount <= 0) return;
    setSaving(true);
    const input = { date: form.date, description: form.description.trim(), amount, category: form.category, type: form.type };
    if (modalMode === 'edit' && editId) await updateTransaction(editId, input);
    else await addTransaction(input);
    setSaving(false);
    setModalMode(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteTransaction(id);
    setDeletingId(null);
    setDeleteConfirmId(null);
  }

  function exportCsv() {
    const header = ['Date', 'Description', 'Category', 'Source', 'Account Type', 'Type', 'Amount', 'Currency'];
    const lines = [header.join(',')];
    sorted.forEach((tx) => {
      const resolved = resolveSourceBank(tx.sourceBank);
      const row = [
        tx.date, tx.description, tx.category,
        resolved?.label ?? '', resolved?.accountType ?? '',
        tx.type, tx.amount.toFixed(2), currency,
      ];
      lines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />;
  }

  function TxRow({ tx, k }: { tx: Transaction; k: string | number }) {
    return (
      <tr key={k} className="hover:bg-gray-50/60 transition-colors">
        <td className="px-4 py-2.5 text-[12px] text-gray-500 whitespace-nowrap">{isIsoDate(tx.date) ? tx.date : effectiveTxMonth(tx)}</td>
        <td className="px-4 py-2.5 text-[13px] font-medium text-gray-900 max-w-[360px] truncate">{tx.description}</td>
        <td className="px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-600 whitespace-nowrap">
            <CategoryIcon name={tx.category} color={catColors[tx.category] || '#6b7280'} size="sm" />
            {tx.category}
          </span>
        </td>
        <td className="px-4 py-2.5"><SourceBadge sourceBank={tx.sourceBank} /></td>
        <td className="px-4 py-2.5">
          <Badge variant={tx.type === 'Income' ? 'success' : 'neutral'}>
            {tx.type === 'Income' ? t('upload.typeIncome') : t('upload.typeExpense')}
          </Badge>
        </td>
        <td className={cn('px-4 py-2.5 text-right text-[13px] font-semibold font-mono whitespace-nowrap', tx.type === 'Income' ? 'text-emerald-600' : 'text-gray-900')}>
          {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount, currency, 2)}
        </td>
        <td className="px-4 py-2.5 text-right whitespace-nowrap">
          {tx.id && (deleteConfirmId === tx.id ? (
            <div className="inline-flex items-center gap-2">
              <button onClick={() => handleDelete(tx.id!)} disabled={deletingId === tx.id}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-40">
                {deletingId === tx.id ? t('transactions.deleting') : t('transactions.confirmDelete')}
              </button>
              <button onClick={() => setDeleteConfirmId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2.5">
              <button onClick={() => openEditModal(tx)} title={t('transactions.edit')} className="text-gray-400 hover:text-indigo-600 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setDeleteConfirmId(tx.id!)} title={t('transactions.delete')} className="text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </td>
      </tr>
    );
  }

  function GroupHeaderRow({ group }: { group: Group }) {
    const isCollapsed = collapsed.has(group.key);
    const color = groupBy === 'category' ? (catColors[group.key] || '#6b7280') : undefined;
    const resolvedSource = groupBy === 'source' ? resolveSourceBank(group.key) : null;
    const label = groupBy === 'type' ? (group.key === 'Income' ? t('upload.typeIncome') : t('upload.typeExpense'))
      : groupBy === 'source' ? (resolvedSource?.label ?? t('transactions.unknownSource'))
      : group.key;
    return (
      <tr className="bg-gray-50 border-y border-gray-200 cursor-pointer select-none" onClick={() => toggleGroup(group.key)}>
        <td colSpan={7} className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-bold text-gray-700">
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
              {groupBy === 'source' && (resolvedSource?.accountType === 'credit_card'
                ? <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                : <Landmark className="w-3.5 h-3.5 text-gray-400" />)}
              {label}
              <span className="text-gray-400 font-normal">({group.rows.length})</span>
            </span>
            <span className="text-[12px] font-mono font-semibold flex items-center gap-3">
              {group.income > 0 && <span className="text-emerald-600">+{fmt(group.income, currency)}</span>}
              {group.expense > 0 && <span className="text-gray-700">-{fmt(group.expense, currency)}</span>}
            </span>
          </div>
        </td>
      </tr>
    );
  }

  function renderEmptyLedgerCell() {
    if (hasAggregateOnlyMatches) {
      return (
        <div className="flex flex-col items-center gap-2 text-center text-sm text-gray-400">
          <Info className="w-4 h-4 text-gray-300" />
          <span className="max-w-sm">{t('transactions.aggregateOnlyNote')}</span>
          <Link href="/upload" className="text-indigo-600 text-xs font-semibold hover:underline">
            {t('transactions.aggregateOnlyCta')}
          </Link>
        </div>
      );
    }
    return <div className="text-center text-sm text-gray-400">{t('transactions.noneFound')}</div>;
  }

  if (months.length === 0) {
    return (
      <>
        <Topbar title={t('transactions.title')} />
        <div className="p-4 sm:p-7 max-w-[1440px]">
          <EmptyState title={t('transactions.empty.title')} description={t('transactions.empty.desc')} showUpload />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title={t('transactions.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('transactions.ledger')}</h3>
          <p className="text-xs text-gray-400">{t('transactions.subtitle')}</p>
        </div>

        {monthsWithoutItemized.length > 0 && (
          <div className="flex items-start gap-2.5 px-4 py-3 mb-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              {t('transactions.aggregateOnlyBanner', { months: monthsWithoutItemized.join(', ') })}{' '}
              <Link href="/upload" className="font-semibold hover:underline">{t('transactions.aggregateOnlyCta')}</Link>
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl p-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:border-indigo-400 outline-none"
              placeholder={t('transactions.search')} value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
            value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as '' | 'Income' | 'Expense'); setPage(0); }}>
            <option value="">{t('transactions.allTypes')}</option>
            <option value="Income">{t('upload.typeIncome')}</option>
            <option value="Expense">{t('upload.typeExpense')}</option>
          </select>
          <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
            value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(0); }}>
            <option value="">{t('transactions.allCategories')}</option>
            {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
            value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(0); }}>
            <option value="">{t('transactions.allMonths')}</option>
            {monthLabels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
            value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}>
            <option value="">{t('transactions.allSources')}</option>
            {sourceOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <input type="date" className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
              value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} title={t('transactions.dateFrom')} />
            <span className="text-xs text-gray-400">{t('transactions.dateRangeTo')}</span>
            <input type="date" className="px-2 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
              value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} title={t('transactions.dateTo')} />
          </div>
          <select className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50"
            value={groupBy} onChange={(e) => { setGroupBy(e.target.value as GroupBy); setPage(0); }}>
            <option value="none">{t('transactions.groupByNone')}</option>
            <option value="category">{t('transactions.groupByCategory')}</option>
            <option value="month">{t('transactions.groupByMonth')}</option>
            <option value="type">{t('transactions.groupByType')}</option>
            <option value="source">{t('transactions.groupBySource')}</option>
          </select>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              <X className="w-3.5 h-3.5" /> {t('transactions.resetFilters')}
            </button>
          )}
          <button onClick={openAddModal}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> {t('transactions.addTransaction')}
          </button>
          <button onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> {t('transactions.export')}
          </button>
        </div>

        <Card>
          <CardBody compact>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('date')}>
                      <span className="inline-flex items-center gap-1">{t('transactions.date')} {sortIcon('date')}</span>
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('description')}>
                      <span className="inline-flex items-center gap-1">{t('transactions.description')} {sortIcon('description')}</span>
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('category')}>
                      <span className="inline-flex items-center gap-1">{t('transactions.category')} {sortIcon('category')}</span>
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('source')}>
                      <span className="inline-flex items-center gap-1">{t('transactions.source')} {sortIcon('source')}</span>
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('type')}>
                      <span className="inline-flex items-center gap-1">{t('transactions.type')} {sortIcon('type')}</span>
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                      <span className="inline-flex items-center gap-1 justify-end w-full">{t('transactions.amount')} {sortIcon('amount')}</span>
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-[80px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groups ? (
                    groups.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-10">{renderEmptyLedgerCell()}</td></tr>
                    ) : groups.flatMap((g) => [
                      <GroupHeaderRow key={`h-${g.key}`} group={g} />,
                      ...(collapsed.has(g.key) ? [] : g.rows.map((tx, i) => <TxRow key={tx.id ?? `${g.key}-${i}`} tx={tx} k={tx.id ?? `${g.key}-${i}`} />)),
                    ])
                  ) : (
                    pageSlice.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-10">{renderEmptyLedgerCell()}</td></tr>
                    ) : pageSlice.map((tx, i) => <TxRow key={tx.id ?? i} tx={tx} k={tx.id ?? i} />)
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">{sorted.length} {t('transactions.count')}</span>
              {!groups && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button disabled={pageSafe === 0} onClick={() => setPage(pageSafe - 1)}
                    className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 disabled:opacity-40 hover:bg-gray-200 transition-colors">‹</button>
                  {pageWindow(pageSafe, totalPages)[0] > 0 && (
                    <>
                      <button onClick={() => setPage(0)} className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">1</button>
                      <span className="text-gray-300 text-xs">…</span>
                    </>
                  )}
                  {pageWindow(pageSafe, totalPages).map((i) => (
                    <button key={i} onClick={() => setPage(i)}
                      className={cn('px-2.5 py-1 text-xs rounded-md font-medium', i === pageSafe ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {i + 1}
                    </button>
                  ))}
                  {pageWindow(pageSafe, totalPages).slice(-1)[0] < totalPages - 1 && (
                    <>
                      <span className="text-gray-300 text-xs">…</span>
                      <button onClick={() => setPage(totalPages - 1)} className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">{totalPages}</button>
                    </>
                  )}
                  <button disabled={pageSafe >= totalPages - 1} onClick={() => setPage(pageSafe + 1)}
                    className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 disabled:opacity-40 hover:bg-gray-200 transition-colors">›</button>
                </div>
              )}
              {!groups && (
                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(0); }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50">
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / {t('transactions.page')}</option>)}
                </select>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {modalMode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center px-4" onClick={() => setModalMode(null)}>
          <div className="bg-white rounded-2xl w-full max-w-[440px] shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1">{modalMode === 'edit' ? t('transactions.editTitle') : t('transactions.addTitle')}</h3>
            <p className="text-xs text-gray-400 mb-4">{modalMode === 'edit' ? t('transactions.editSubtitle') : t('transactions.addSubtitle')}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('transactions.date')}</label>
                <input type="date"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                  value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('transactions.description')}</label>
                <input type="text"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                  value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t('transactions.descriptionPlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('transactions.amount')}</label>
                  <input type="number" step="0.01" min="0"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('transactions.type')}</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'Income' | 'Expense' }))}>
                    <option value="Expense">{t('upload.typeExpense')}</option>
                    <option value="Income">{t('upload.typeIncome')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('transactions.category')}</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                  value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSaveModal}
                disabled={saving || !form.date || !form.description.trim() || !form.category || !form.amount}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => setModalMode(null)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
