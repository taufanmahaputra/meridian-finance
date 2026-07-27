import type { MonthData, Insight, ActionItem, Category, Transaction } from '@/types/finance';
import { CURRENCY_SYMBOLS, DEFAULT_CURRENCY } from './constants';
import { DEFAULT_LANGUAGE, type Language } from './i18n';

export function computeDerived(
  m: Partial<MonthData> & { income: number; expenses: number; cats: Record<string, number>; partial: boolean; label: string },
  catBudgets: Record<string, number> = {}
): MonthData {
  const monthlyBudget = Object.values(catBudgets).reduce((a, b) => a + b, 0);
  const savings = m.income - m.expenses;
  const savingsRate = m.income > 0 ? (savings / m.income) * 100 : 0;
  const budgetUtil = monthlyBudget > 0 ? (m.expenses / monthlyBudget) * 100 : 0;
  const avgDaily = m.expenses / (m.partial ? 24 : 30);
  const overBudgetCats = Object.entries(m.cats).filter(
    ([c, v]) => (catBudgets[c] ?? 0) > 0 && v > (catBudgets[c] ?? 0)
  ).length;

  return {
    ...m,
    savings,
    savingsRate,
    budgetUtil,
    avgDaily,
    overBudgetCats,
  };
}

export function getHealthScore(months: MonthData[]): number {
  if (months.length === 0) return 0;
  const m = months[months.length - 1];
  let score = 0;

  if (m.savingsRate >= 50) score += 30;
  else if (m.savingsRate >= 40) score += 25;
  else if (m.savingsRate >= 30) score += 20;
  else if (m.savingsRate >= 20) score += 15;
  else score += 5;

  if (m.budgetUtil <= 100) score += 25;
  else if (m.budgetUtil <= 110) score += 18;
  else if (m.budgetUtil <= 120) score += 12;
  else score += 5;

  if (m.overBudgetCats <= 1) score += 20;
  else if (m.overBudgetCats <= 3) score += 12;
  else score += 5;

  const trend = months.length >= 2
    ? m.savingsRate - months[months.length - 2].savingsRate
    : 0;
  if (trend >= 0) score += 15;
  else if (trend >= -5) score += 10;
  else score += 3;

  score += Math.min(10, Math.max(2, 10 - m.overBudgetCats));
  return Math.min(100, Math.round(score));
}

export function getTrendData(curr: number, prev: number | null, inverse = false) {
  if (prev == null || prev === 0) return { className: 'text-gray-400', text: '--' };
  const diff = ((curr - prev) / Math.abs(prev)) * 100;
  const up = diff > 0;
  const good = inverse ? !up : up;
  return {
    className: good ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50',
    text: `${up ? '+' : ''}${diff.toFixed(1)}%`,
  };
}

export function fmt(n: number, currency: string = DEFAULT_CURRENCY, decimals = 0): string {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return n < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// Compact form for chart axes/ticks — e.g. Rp1.2M, $850, S$3k — always in
// the app's actual currency instead of a hardcoded symbol.
export function fmtCompact(n: number, currency: string = DEFAULT_CURRENCY): string {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${symbol}${abs.toFixed(0)}`;
}

export function generateInsights(
  months: MonthData[],
  catBudgets: Record<string, number> = {},
  currency: string = DEFAULT_CURRENCY,
  language: Language = DEFAULT_LANGUAGE
): Insight[] {
  if (months.length === 0) return [];
  const m = months[months.length - 1];
  const insights: Insight[] = [];
  const isId = language === 'id';
  const monthlyBudget = Object.values(catBudgets).reduce((a, b) => a + b, 0);

  if (months.length >= 3) {
    const rates = months.slice(-3).map((x) => x.savingsRate);
    if (rates[2] < rates[0]) {
      insights.push({
        priority: 'high',
        title: isId ? 'Tingkat Tabungan Menurun' : 'Savings Rate Declining',
        body: isId
          ? `Tingkat tabungan turun dari <strong>${rates[0].toFixed(1)}% → ${rates[1].toFixed(1)}% → ${rates[2].toFixed(1)}%</strong> selama 3 bulan. Tren <strong>-${(rates[0] - rates[2]).toFixed(1)}pp</strong> ini perlu diperhatikan.`
          : `Rate dropped from <strong>${rates[0].toFixed(1)}% → ${rates[1].toFixed(1)}% → ${rates[2].toFixed(1)}%</strong> over 3 months. The <strong>-${(rates[0] - rates[2]).toFixed(1)}pp trend</strong> needs attention.`,
      });
    }
  }

  // Pace-of-month projection — only meaningful mid-month, on a partial
  // month's data. The single most "CFO would say this out loud" insight:
  // not what happened, but what's about to happen if nothing changes.
  if (m.partial && m.expenses > 0 && monthlyBudget > 0) {
    const projected = m.avgDaily * 30;
    if (projected > monthlyBudget) {
      const overBy = ((projected - monthlyBudget) / monthlyBudget) * 100;
      insights.push({
        priority: 'high',
        title: isId ? 'Proyeksi Melebihi Anggaran Bulan Ini' : 'On Pace to Exceed This Month\'s Budget',
        body: isId
          ? `Dengan laju saat ini (<strong>${fmt(m.avgDaily, currency)}/hari</strong>), proyeksi total akhir bulan <strong>${fmt(projected, currency)}</strong> — <strong>${overBy.toFixed(0)}% di atas</strong> anggaran ${fmt(monthlyBudget, currency)}.`
          : `At the current pace (<strong>${fmt(m.avgDaily, currency)}/day</strong>), you're projected to end the month at <strong>${fmt(projected, currency)}</strong> — <strong>${overBy.toFixed(0)}% over</strong> your ${fmt(monthlyBudget, currency)} budget.`,
      });
    }
  }

  // Spend concentration — one category eating an outsized share makes the
  // whole budget fragile to a single line item.
  const rankedCats = Object.entries(m.cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const topCat = rankedCats[0];
  if (topCat && m.expenses > 0) {
    const share = (topCat[1] / m.expenses) * 100;
    if (share > 40) {
      insights.push({
        priority: 'medium',
        title: isId ? `${topCat[0]} Mendominasi Pengeluaran` : `${topCat[0]} Dominates Your Spending`,
        body: isId
          ? `<strong>${topCat[0]}</strong> adalah <strong>${share.toFixed(0)}%</strong> dari total pengeluaran bulan ini (${fmt(topCat[1], currency)} dari ${fmt(m.expenses, currency)}). Konsentrasi setinggi ini membuat anggaran rentan pada satu kategori saja.`
          : `<strong>${topCat[0]}</strong> is <strong>${share.toFixed(0)}%</strong> of this month's spending (${fmt(topCat[1], currency)} of ${fmt(m.expenses, currency)}). That much concentration in one category makes your budget fragile to it alone.`,
      });
    }
  }

  // The single largest unbudgeted category — not every unbudgeted category
  // at once (that's noise), just the one actually worth a budget line.
  const unbudgeted = rankedCats.find(([cat]) => !catBudgets[cat]);
  if (unbudgeted && m.expenses > 0 && unbudgeted[1] > m.expenses * 0.1) {
    const [cat] = unbudgeted;
    const avg = months.reduce((s, x) => s + (x.cats[cat] || 0), 0) / months.length;
    insights.push({
      priority: 'high',
      title: isId ? `${cat} Belum Punya Anggaran` : `${cat} Has No Budget Allocated`,
      body: isId
        ? `Pengeluaran ${cat} rata-rata <strong>${fmt(avg, currency)}/bulan</strong>. Kategori tanpa anggaran seperti ini seringkali jadi penyebab utama pelanggaran anggaran keseluruhan.`
        : `${cat} spending averages <strong>${fmt(avg, currency)}/month</strong>. Unbudgeted categories like this are usually what actually drives an overall budget overrun.`,
    });
  }

  const installments = m.cats['Installments'] || 0;
  if (installments > 0) {
    insights.push({
      priority: 'info',
      title: isId ? 'Cicilan Adalah Biaya Tetap yang Dapat Diprediksi' : 'Installments Are Predictable Fixed Costs',
      body: isId
        ? `Cicilan bulanan sebesar <strong>${fmt(installments, currency)}</strong> adalah kewajiban tetap, bukan pengeluaran diskresioner. Lacak secara terpisah dari anggaran gaya hidup.`
        : `Monthly installments at <strong>${fmt(installments, currency)}</strong> are recurring obligations, not discretionary spending. Track them separately from your lifestyle budget.`,
    });
  }

  // Chronic over-budget — a category over budget two months running is a
  // pattern, not a one-off, and deserves a higher-priority flag than a
  // single bad month.
  if (months.length >= 2) {
    const [prevMo, currMo] = months.slice(-2);
    Object.entries(catBudgets).forEach(([cat, budget]) => {
      if (!budget) return;
      const currSpent = currMo.cats[cat] || 0;
      const prevSpent = prevMo.cats[cat] || 0;
      if (currSpent > budget && prevSpent > budget) {
        insights.push({
          priority: 'high',
          title: isId ? `${cat} Konsisten Lewat Anggaran` : `${cat} Is Chronically Over Budget`,
          body: isId
            ? `Lewat anggaran <strong>2 bulan berturut-turut</strong> (${fmt(prevSpent, currency)}, lalu ${fmt(currSpent, currency)} vs anggaran ${fmt(budget, currency)}). Ini kemungkinan bukan penyimpangan sesaat.`
            : `Over budget for <strong>2 months in a row</strong> (${fmt(prevSpent, currency)}, then ${fmt(currSpent, currency)} vs a ${fmt(budget, currency)} budget). This is a pattern, not a one-off.`,
        });
      } else if (budget > 0 && currSpent > 0 && currSpent < budget * 3) {
        // A single very-large overrun still gets its own flag, one level
        // down from the chronic case.
        if (currSpent > budget * 1.5 && !(currSpent > budget && prevSpent > budget)) {
          insights.push({
            priority: 'medium',
            title: isId ? `${cat} Jauh Melebihi Anggaran` : `${cat} Significantly Over Budget`,
            body: isId
              ? `<strong>${fmt(currSpent, currency)}</strong> terpakai vs anggaran <strong>${fmt(budget, currency)}</strong> (${((currSpent / budget) * 100).toFixed(0)}%).`
              : `<strong>${fmt(currSpent, currency)}</strong> spent vs <strong>${fmt(budget, currency)}</strong> budget (${((currSpent / budget) * 100).toFixed(0)}%).`,
          });
        }
      }
    });
  } else {
    Object.entries(m.cats).forEach(([cat, spent]) => {
      const budget = catBudgets[cat] || 0;
      if (budget > 0 && spent > budget * 1.5) {
        insights.push({
          priority: 'medium',
          title: isId ? `${cat} Jauh Melebihi Anggaran` : `${cat} Significantly Over Budget`,
          body: isId
            ? `<strong>${fmt(spent, currency)}</strong> terpakai vs anggaran <strong>${fmt(budget, currency)}</strong> (${((spent / budget) * 100).toFixed(0)}%).`
            : `<strong>${fmt(spent, currency)}</strong> spent vs <strong>${fmt(budget, currency)}</strong> budget (${((spent / budget) * 100).toFixed(0)}%).`,
        });
      }
    });
  }

  // Positive reinforcement — the budgeted category with the best margin
  // below its limit, so the feed isn't purely a list of things gone wrong.
  const wellManaged = Object.entries(catBudgets)
    .filter(([cat, budget]) => budget > 0 && (m.cats[cat] || 0) > 0 && (m.cats[cat] || 0) < budget * 0.7)
    .sort((a, b) => (m.cats[a[0]] || 0) / a[1] - (m.cats[b[0]] || 0) / b[1])[0];
  if (wellManaged) {
    const [cat, budget] = wellManaged;
    const spent = m.cats[cat] || 0;
    insights.push({
      priority: 'low',
      title: isId ? `${cat} Terkelola Baik` : `${cat} Well Managed`,
      body: isId
        ? `Pengeluaran <strong>${fmt(spent, currency)}</strong> — jauh di bawah anggaran <strong>${fmt(budget, currency)}</strong>. Sisa anggaran ini bisa dialihkan ke tabungan atau kategori lain.`
        : `Spending at <strong>${fmt(spent, currency)}</strong> — well under the <strong>${fmt(budget, currency)}</strong> budget. That headroom could go toward savings or another category instead.`,
    });
  }

  const housing = m.cats['Housing'] || 0;
  if (housing > 0 && m.income > 0) {
    const housingPct = (housing / m.income) * 100;
    insights.push({
      priority: 'info',
      title: isId ? `Housing di ${housingPct.toFixed(0)}% dari Pendapatan` : `Housing at ${housingPct.toFixed(0)}% of Income`,
      body: isId
        ? `Biaya tempat tinggal <strong>${fmt(housing, currency)}</strong> ${housingPct < 30 ? 'masih dalam' : 'melebihi'} batas wajar 30%. ${housingPct < 30 ? 'Anda berada di rentang yang sehat.' : 'Pertimbangkan cara mengurangi biaya tempat tinggal.'}`
        : `Rent at <strong>${fmt(housing, currency)}</strong> is ${housingPct < 30 ? 'within' : 'above'} the 30% benchmark. ${housingPct < 30 ? 'You\'re in a healthy range.' : 'Consider ways to reduce housing costs.'}`,
    });
  }

  return insights;
}

export function generateActions(
  months: MonthData[],
  catBudgets: Record<string, number> = {},
  currency: string = DEFAULT_CURRENCY,
  language: Language = DEFAULT_LANGUAGE
): ActionItem[] {
  if (months.length === 0) return [];
  const actions: ActionItem[] = [];
  const m = months[months.length - 1];
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const isId = language === 'id';

  const rankedCats = Object.entries(m.cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const unbudgeted = rankedCats.find(([cat]) => !catBudgets[cat]);
  if (unbudgeted) {
    const [cat] = unbudgeted;
    const avgSpend = months.reduce((s, x) => s + (x.cats[cat] || 0), 0) / months.length;
    if (avgSpend > 50) {
      const suggested = Math.round(avgSpend / 100) * 100;
      actions.push({
        title: isId ? `Tetapkan anggaran ${cat} sebesar ${fmt(suggested, currency)}/bln` : `Set a ${fmt(suggested, currency)}/mo budget for ${cat}`,
        detail: isId ? `Rata-rata pengeluaran ${cat} Anda ${fmt(avgSpend, currency)}/bln, tanpa anggaran. Mengalokasikan anggaran menghilangkan sebagian besar flag lewat anggaran yang tidak jelas asalnya.` : `Your ${cat} spending averages ${fmt(avgSpend, currency)}/mo with no budget set. Allocating one turns a fuzzy leak into a tracked line item.`,
      });
    }
  }

  const installments = m.cats['Installments'] || 0;
  if (installments > 0) {
    actions.push({
      title: isId ? `Buat baris anggaran Cicilan (${fmt(installments, currency)}/bln)` : `Create Installments budget line (${fmt(installments, currency)}/mo)`,
      detail: isId ? 'Cicilan bersifat dapat diprediksi. Melacaknya secara terpisah mencegah kerancuan dengan pengeluaran diskresioner.' : 'Installments are predictable. Tracking them separately prevents confusion with discretionary spending.',
    });
  }

  Object.entries(m.cats).forEach(([cat, spent]) => {
    const budget = catBudgets[cat] || 0;
    if (budget > 0 && spent > budget * 1.5) {
      actions.push({
        title: isId ? `Sesuaikan anggaran ${cat} menjadi ${fmt(Math.ceil(spent / 50) * 50, currency)}` : `Adjust ${cat} budget to ${fmt(Math.ceil(spent / 50) * 50, currency)}`,
        detail: isId ? `Anggaran saat ini ${fmt(budget, currency)} secara konsisten terlampaui (${fmt(spent, currency)} bulan ini). Perbarui agar sesuai pengeluaran aktual.` : `Current budget of ${fmt(budget, currency)} is consistently exceeded (${fmt(spent, currency)} this month). Update to reflect actual spending.`,
      });
    }
  });

  if (m.savingsRate > 30) {
    actions.push({
      title: isId ? 'Otomatiskan transfer tabungan saat gajian' : 'Automate savings transfer on salary day',
      detail: isId ? `Transfer ${symbol}${Math.round(m.savings / 500) * 500} ke rekening tabungan terpisah setiap tanggal 1.` : `Transfer ${symbol}${Math.round(m.savings / 500) * 500} to a separate savings account on the 1st of each month.`,
    });
  }

  actions.push({
    title: isId ? 'Bangun dana darurat 6 bulan' : 'Build 6-month emergency fund',
    detail: isId ? `Target: ${fmt(m.expenses * 6, currency)}. Alokasikan setiap bulan hingga tercapai, lalu alihkan ke investasi.` : `Target: ${fmt(m.expenses * 6, currency)}. Allocate monthly until reached, then redirect to investments.`,
  });

  return actions;
}

export interface BudgetSuggestion {
  name: string;
  currentBudget: number | null; // null when the category doesn't exist yet
  suggestedBudget: number;
  isNew: boolean;
}

// Rounds up to a "clean" 2-significant-figure number (e.g. 1,234,567 -> 1,300,000;
// 45,000 -> 45,000) so suggested budgets read like numbers a person would
// actually type, not a raw average.
function roundToNiceNumber(n: number): number {
  if (n <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.ceil(n / magnitude) * magnitude;
}

// Suggests a monthly budget per category from real spending history: the
// average spend across months where that category actually had activity,
// plus a 10% buffer, rounded to a clean number. Categories that show up in
// transaction history but have no Category row yet are flagged isNew so the
// caller can create them. Categories with zero historical spend are skipped
// entirely — there's no real data to base a suggestion on.
export function suggestCategoryBudgets(months: MonthData[], categories: Category[]): BudgetSuggestion[] {
  const existingByName = new Map(categories.map((c) => [c.name, c]));
  const allNames = new Set<string>();
  months.forEach((m) => Object.keys(m.cats).forEach((name) => allNames.add(name)));

  const suggestions: BudgetSuggestion[] = [];
  allNames.forEach((name) => {
    const activeSpends = months.map((m) => m.cats[name] ?? 0).filter((v) => v > 0);
    if (activeSpends.length === 0) return;
    const avg = activeSpends.reduce((a, b) => a + b, 0) / activeSpends.length;
    const existing = existingByName.get(name);
    suggestions.push({
      name,
      currentBudget: existing ? existing.budget : null,
      suggestedBudget: roundToNiceNumber(avg * 1.1),
      isNew: !existing,
    });
  });

  return suggestions.sort((a, b) => b.suggestedBudget - a.suggestedBudget);
}

// Builds the full transaction ledger: itemized transactions where a
// statement was imported, plus synthesized entries for months that need
// them. Category totals only synthesize when a month has NO itemized data
// at all (real rows supersede the aggregate). Salary is different: it
// synthesizes for ANY month with no real Income-type transaction, because
// statements (a credit card, a savings account CSV) almost never contain
// the salary deposit itself — without this, a month that's only ever had
// expense statements imported would show zero income everywhere.
export function buildTransactionLedger(months: MonthData[], transactions: Transaction[]): Transaction[] {
  const monthsWithItemized = new Set(transactions.map((tx) => tx.month).filter(Boolean));
  const monthsWithIncomeTx = new Set(transactions.filter((tx) => tx.type === 'Income' && tx.month).map((tx) => tx.month));
  const fromMonths: Transaction[] = [];
  months.forEach((m) => {
    if (!monthsWithItemized.has(m.label)) {
      Object.entries(m.cats).forEach(([cat, total]) => {
        if (total > 0) fromMonths.push({ date: m.label, description: `${cat} — ${m.label} total`, amount: total, category: cat, type: 'Expense', synthetic: true });
      });
    }
    if (!monthsWithIncomeTx.has(m.label) && m.income > 0) {
      fromMonths.push({ date: m.label, description: `Salary — ${m.label}`, amount: m.income, category: 'Income', type: 'Income', synthetic: true });
    }
  });
  return [...fromMonths, ...transactions];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(d);
}

/** "2026-06-15" -> "Jun 2026" — the month-label format every MonthData
 *  row is keyed by. Used to figure out which month a manually added or
 *  re-dated transaction belongs to. */
export function monthLabelFromDate(date: string): string {
  if (!isIsoDate(date)) return date;
  const [y, m] = date.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

/** Best-effort month label for a transaction — the assigned import month
 *  when known, else derived from an ISO date, else the raw date string
 *  (which is itself already a month label for the no-itemized-data
 *  fallback rows buildTransactionLedger synthesizes). Shared by any page
 *  that groups or filters transactions by month. */
export function effectiveTxMonth(tx: Transaction): string {
  if (tx.month) return tx.month;
  if (isIsoDate(tx.date)) return monthLabelFromDate(tx.date);
  return tx.date;
}

const MONTH_INDEX = Object.fromEntries(MONTH_NAMES.map((m, i) => [m.toLowerCase(), i]));

/** "Mar 2026" -> "2026-03" — sorts chronologically as a plain string,
 *  unlike the label itself (alphabetically "Apr" < "Feb" < "Jan" < "Mar").
 *  Falls back to the raw label for anything that doesn't parse, so an
 *  unexpected format degrades to a stable (if not calendar-correct) sort
 *  rather than throwing. */
export function monthSortKey(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 2) {
    const idx = MONTH_INDEX[parts[0].toLowerCase()];
    if (idx !== undefined && /^\d{4}$/.test(parts[1])) {
      return `${parts[1]}-${String(idx + 1).padStart(2, '0')}`;
    }
  }
  return label;
}

/** Months in real Jan-Dec chronological order — the DB only guarantees
 *  created_at (upload) order, which is wrong whenever statements are
 *  uploaded out of sequence. Every page that lists or charts months
 *  should sort through this rather than trusting array order. */
export function sortMonths(months: MonthData[]): MonthData[] {
  return [...months].sort((a, b) => monthSortKey(a.label).localeCompare(monthSortKey(b.label)));
}

export function generateForecast(months: MonthData[], periodsAhead = 6) {
  const expenses = months.map((m) => m.expenses);
  const n = expenses.length;
  if (n === 0) return { projected: [], labels: [] };

  const avgGrowth = n >= 2 ? (expenses[n - 1] - expenses[0]) / (n - 1) : 0;
  const avgExpense = expenses.reduce((a, b) => a + b, 0) / n;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lastLabel = months[months.length - 1].label;
  const parts = lastLabel.split(' ');
  let monthIdx = monthNames.indexOf(parts[0].substring(0, 3));
  let year = parseInt(parts[1]) || 2026;

  const labels: string[] = [];
  const projected: number[] = [];

  for (let i = 1; i <= periodsAhead; i++) {
    monthIdx++;
    if (monthIdx > 11) { monthIdx = 0; year++; }
    labels.push(`${monthNames[monthIdx]} ${year}`);
    projected.push(Math.max(0, avgExpense + avgGrowth * i));
  }

  return { projected, labels, avgGrowth, avgExpense };
}
