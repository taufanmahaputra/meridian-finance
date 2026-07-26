'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Download, X, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, Info,
} from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { EmptyState } from '@/components/EmptyState';
import { fmt, fmtPct, buildTransactionLedger } from '@/lib/calculations';
import type { Transaction } from '@/types/finance';
import { cn } from '@/lib/utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE_SIZES = [25, 50, 100];
const SPARK_WINDOW = 6;

function isIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(d);
}

/** Best-effort month label for a transaction — the assigned import month
 *  when known, else derived from an ISO date, else the raw date string
 *  (which is itself already a month label for the no-itemized-data
 *  fallback rows buildTransactionLedger synthesizes). */
function effectiveMonth(tx: Transaction): string {
  if (tx.month) return tx.month;
  if (isIsoDate(tx.date)) {
    const [y, m] = tx.date.split('-');
    return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
  }
  return tx.date;
}

/** Sorts real ISO dates chronologically; non-ISO fallback rows (month
 *  aggregates with no day-level date) sort before any dated row. */
function dateSortKey(tx: Transaction): string {
  return isIsoDate(tx.date) ? tx.date : '0000-00-00';
}

type SortField = 'date' | 'description' | 'category' | 'type' | 'amount';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'category' | 'month' | 'type';

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

export default function TransactionsPage() {
  const { months, transactions, catColors, currency, t } = useFinance();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'Income' | 'Expense'>('');
  const [catFilter, setCatFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]);

  const allTx = useMemo(() => buildTransactionLedger(months, transactions), [months, transactions]);
  const categoryNames = useMemo(() => [...new Set(allTx.map((tx) => tx.category))].sort(), [allTx]);
  const monthLabels = useMemo(() => {
    const order = months.map((m) => m.label);
    return [...new Set(allTx.map(effectiveMonth))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [allTx, months]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTx.filter((tx) => {
      if (q && !tx.description.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) return false;
      if (typeFilter && tx.type !== typeFilter) return false;
      if (catFilter && tx.category !== catFilter) return false;
      if (monthFilter && effectiveMonth(tx) !== monthFilter) return false;
      if (dateFrom || dateTo) {
        if (!isIsoDate(tx.date)) return false;
        if (dateFrom && tx.date < dateFrom) return false;
        if (dateTo && tx.date > dateTo) return false;
      }
      return true;
    });
  }, [allTx, search, typeFilter, catFilter, monthFilter, dateFrom, dateTo]);

  // The summary section (KPIs, breakdown, cash-flow) treats `filtered` as
  // truthful money totals — same ground truth as every other page in the
  // app — including months that only ever got a manual aggregate total.
  // The ledger below is different: it's the "raw data" view, so it must
  // only ever show genuinely itemized rows, never the synthetic per-category
  // placeholders `buildTransactionLedger` fills in for a month with no
  // itemized import. Showing those as if they were real transactions is
  // exactly what read as "wrong" — a fake row per category, not real data.
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
      else cmp = a.amount - b.amount;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [ledgerRows, sortField, sortDir]);

  const groups = useMemo<Group[] | null>(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, Group>();
    sorted.forEach((tx) => {
      const key = groupBy === 'category' ? tx.category : groupBy === 'month' ? effectiveMonth(tx) : tx.type;
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

  const totalIn = useMemo(() => filtered.filter((tx) => tx.type === 'Income').reduce((s, tx) => s + tx.amount, 0), [filtered]);
  const totalOut = useMemo(() => filtered.filter((tx) => tx.type === 'Expense').reduce((s, tx) => s + tx.amount, 0), [filtered]);
  const net = totalIn - totalOut;

  const filteredCats = useMemo(() => {
    const cats: Record<string, number> = {};
    filtered.forEach((tx) => { if (tx.type === 'Expense') cats[tx.category] = (cats[tx.category] || 0) + tx.amount; });
    return cats;
  }, [filtered]);
  const catTotal = Object.values(filteredCats).reduce((a, b) => a + b, 0);
  const rankedCats = useMemo(() => Object.entries(filteredCats).sort((a, b) => b[1] - a[1]), [filteredCats]);

  const cashFlowData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filtered.forEach((tx) => {
      const key = effectiveMonth(tx);
      const entry = map.get(key) ?? { income: 0, expense: 0 };
      if (tx.type === 'Income') entry.income += tx.amount; else entry.expense += tx.amount;
      map.set(key, entry);
    });
    const order = months.map((m) => m.label);
    return [...map.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([name, v]) => ({ name, ...v }));
  }, [filtered, months]);

  const sparkWindow = months.slice(-SPARK_WINDOW);
  const inSpark = sparkWindow.map((m) => m.income);
  const outSpark = sparkWindow.map((m) => m.expenses);
  const netSpark = sparkWindow.map((m) => m.income - m.expenses);

  const hasActiveFilters = !!(search || typeFilter || catFilter || monthFilter || dateFrom || dateTo);

  // Months that only ever got a manual aggregate total (via "+ Add Month",
  // or an import that never landed itemized rows) — surfaced up front so
  // the ledger's row count doesn't look mysteriously short.
  const monthsWithoutItemized = useMemo(
    () => months.filter((m) => !transactions.some((tx) => tx.month === m.label)).map((m) => m.label),
    [months, transactions]
  );

  function resetFilters() {
    setSearch(''); setTypeFilter(''); setCatFilter(''); setMonthFilter(''); setDateFrom(''); setDateTo(''); setPage(0);
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

  function exportCsv() {
    const header = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency'];
    const lines = [header.join(',')];
    sorted.forEach((tx) => {
      const row = [tx.date, tx.description, tx.category, tx.type, tx.amount.toFixed(2), currency];
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
        <td className="px-4 py-2.5 text-[12px] text-gray-500 whitespace-nowrap">{isIsoDate(tx.date) ? tx.date : effectiveMonth(tx)}</td>
        <td className="px-4 py-2.5 text-[13px] font-medium text-gray-900 max-w-[360px] truncate">{tx.description}</td>
        <td className="px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-600 whitespace-nowrap">
            <CategoryIcon name={tx.category} color={catColors[tx.category] || '#6b7280'} size="sm" />
            {tx.category}
          </span>
        </td>
        <td className="px-4 py-2.5">
          <Badge variant={tx.type === 'Income' ? 'success' : 'neutral'}>
            {tx.type === 'Income' ? t('upload.typeIncome') : t('upload.typeExpense')}
          </Badge>
        </td>
        <td className={cn('px-4 py-2.5 text-right text-[13px] font-semibold font-mono whitespace-nowrap', tx.type === 'Income' ? 'text-emerald-600' : 'text-gray-900')}>
          {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount, currency, 2)}
        </td>
      </tr>
    );
  }

  function GroupHeaderRow({ group }: { group: Group }) {
    const isCollapsed = collapsed.has(group.key);
    const color = groupBy === 'category' ? (catColors[group.key] || '#6b7280') : undefined;
    const label = groupBy === 'type' ? (group.key === 'Income' ? t('upload.typeIncome') : t('upload.typeExpense')) : group.key;
    return (
      <tr className="bg-gray-50 border-y border-gray-200 cursor-pointer select-none" onClick={() => toggleGroup(group.key)}>
        <td colSpan={5} className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-bold text-gray-700">
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
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
        {/* ── Summary ─────────────────────────────────────────────── */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('transactions.summary')}</h3>
          <p className="text-xs text-gray-400">{t('transactions.summarySubtitle')}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={<span>📥</span>} iconBg="bg-emerald-100" tone="emerald"
            label={t('transactions.kpi.totalIn')} value={fmt(totalIn, currency)}
            sparkline={inSpark} sparklineGood />
          <KpiCard icon={<span>📤</span>} iconBg="bg-red-100" tone="red"
            label={t('transactions.kpi.totalOut')} value={fmt(totalOut, currency)}
            sparkline={outSpark} sparklineGood={false} />
          <KpiCard icon={<span>⚖️</span>} iconBg={net >= 0 ? 'bg-emerald-100' : 'bg-red-100'} tone={net >= 0 ? 'emerald' : 'red'}
            label={t('transactions.kpi.net')} value={fmt(net, currency)}
            sparkline={netSpark} sparklineGood={net >= 0} />
          <KpiCard icon={<span>🧾</span>} iconBg="bg-indigo-100" tone="indigo"
            label={t('transactions.kpi.count')} value={String(ledgerRows.length)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-4 mb-4">
          <Card>
            <CardHeader>{t('transactions.categoryBreakdown')}</CardHeader>
            <CardBody>
              {rankedCats.length === 0 ? (
                <div className="py-14 text-center text-gray-400 text-sm">{t('transactions.noSpending')}</div>
              ) : (
                <CategoryPieChart cats={filteredCats} catColors={catColors} currency={currency} />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>{t('transactions.topCategories')}</CardHeader>
            <CardBody compact>
              {rankedCats.length === 0 ? (
                <div className="py-14 text-center text-gray-400 text-sm">{t('transactions.noSpending')}</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
                  {rankedCats.map(([name, amount]) => {
                    const pct = catTotal > 0 ? (amount / catTotal) * 100 : 0;
                    const color = catColors[name] || '#6b7280';
                    return (
                      <div key={name} className="flex items-center gap-3 pl-3 pr-4 py-3" style={{ borderLeft: `3px solid ${color}` }}>
                        <CategoryIcon name={name} color={color} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-gray-900 truncate">{name}</div>
                          <div className="text-[11px] text-gray-400">{t('transactions.ofSpend')}</div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${color}1f`, color }}>
                          {fmtPct(pct)}
                        </span>
                        <span className="text-[14px] font-bold font-mono text-gray-900 flex-shrink-0 w-[92px] text-right">{fmt(amount, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>{t('transactions.cashFlowTrend')}</CardHeader>
          <CardBody><CashFlowChart data={cashFlowData} currency={currency} /></CardBody>
        </Card>

        {/* ── Detail ──────────────────────────────────────────────── */}
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
          </select>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              <X className="w-3.5 h-3.5" /> {t('transactions.resetFilters')}
            </button>
          )}
          <button onClick={exportCsv}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
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
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('type')}>
                      <span className="inline-flex items-center gap-1">{t('transactions.type')} {sortIcon('type')}</span>
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                      <span className="inline-flex items-center gap-1 justify-end w-full">{t('transactions.amount')} {sortIcon('amount')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groups ? (
                    groups.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-10">{renderEmptyLedgerCell()}</td></tr>
                    ) : groups.flatMap((g) => [
                      <GroupHeaderRow key={`h-${g.key}`} group={g} />,
                      ...(collapsed.has(g.key) ? [] : g.rows.map((tx, i) => <TxRow key={tx.id ?? `${g.key}-${i}`} tx={tx} k={tx.id ?? `${g.key}-${i}`} />)),
                    ])
                  ) : (
                    pageSlice.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-10">{renderEmptyLedgerCell()}</td></tr>
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
    </>
  );
}
