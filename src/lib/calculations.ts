import type { MonthData, Insight, ActionItem, Category } from '@/types/finance';
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

export function generateInsights(
  months: MonthData[],
  catBudgets: Record<string, number> = {},
  currency: string = DEFAULT_CURRENCY,
  language: Language = DEFAULT_LANGUAGE
): Insight[] {
  if (months.length === 0) return [];
  const m = months[months.length - 1];
  const insights: Insight[] = [];
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const isId = language === 'id';

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

  const travelSpend = m.cats['Travel'] || 0;
  const travelBudget = catBudgets['Travel'] || 0;
  if (travelSpend > 0 && travelBudget === 0) {
    const avgTravel = months.reduce((s, x) => s + (x.cats['Travel'] || 0), 0) / months.length;
    insights.push({
      priority: 'high',
      title: isId ? 'Travel Belum Punya Anggaran' : 'Travel Has No Budget Allocated',
      body: isId
        ? `Pengeluaran Travel rata-rata <strong>${fmt(avgTravel, currency)}/bulan</strong>. Kategori tanpa anggaran ini menjadi penyebab utama pelanggaran anggaran. Mengalokasikan ${symbol}500–700 dapat memperbaiki beberapa flag lewat anggaran.`
        : `Travel spending averages <strong>${fmt(avgTravel, currency)}/month</strong>. This unbudgeted category drives most budget overruns. Allocating ${symbol}500–700 would fix several over-budget flags.`,
    });
  }

  const installments = m.cats['Installments'] || 0;
  if (installments > 500) {
    insights.push({
      priority: 'medium',
      title: isId ? 'Cicilan Adalah Biaya Tetap yang Dapat Diprediksi' : 'Installments Are Predictable Fixed Costs',
      body: isId
        ? `Cicilan bulanan sebesar <strong>${fmt(installments, currency)}</strong> adalah kewajiban tetap, bukan pengeluaran diskresioner. Lacak secara terpisah.`
        : `Monthly installments at <strong>${fmt(installments, currency)}</strong> are recurring obligations, not discretionary spending. Track them separately.`,
    });
  }

  Object.entries(m.cats).forEach(([cat, spent]) => {
    const budget = catBudgets[cat] || 0;
    if (budget > 0 && spent > budget * 3) {
      insights.push({
        priority: 'medium',
        title: isId ? `${cat} Jauh Melebihi Anggaran` : `${cat} Significantly Over Budget`,
        body: isId
          ? `<strong>${fmt(spent, currency)}</strong> terpakai vs anggaran <strong>${fmt(budget, currency)}</strong> (${((spent / budget) * 100).toFixed(0)}%). Pertimbangkan menyesuaikan anggaran agar sesuai kenyataan.`
          : `<strong>${fmt(spent, currency)}</strong> spent vs <strong>${fmt(budget, currency)}</strong> budget (${((spent / budget) * 100).toFixed(0)}%). Consider adjusting your budget to reflect reality.`,
      });
    }
  });

  const food = m.cats['Food & Groceries'] || 0;
  const foodBudget = catBudgets['Food & Groceries'] || 0;
  if (food < foodBudget * 0.7) {
    insights.push({
      priority: 'low',
      title: isId ? 'Makanan & Belanja Terkelola Baik' : 'Food & Groceries Well Managed',
      body: isId
        ? `Pengeluaran <strong>${fmt(food, currency)}</strong> — jauh di bawah anggaran <strong>${fmt(foodBudget, currency)}</strong>. Pertimbangkan mengurangi frekuensi pesan-antar untuk tabungan tambahan.`
        : `Spending at <strong>${fmt(food, currency)}</strong> — well under the <strong>${fmt(foodBudget, currency)}</strong> budget. Consider reducing delivery frequency for additional savings.`,
    });
  }

  const housing = m.cats['Housing'] || 0;
  const housingPct = (housing / m.income) * 100;
  insights.push({
    priority: 'info',
    title: isId ? `Housing di ${housingPct.toFixed(0)}% dari Pendapatan` : `Housing at ${housingPct.toFixed(0)}% of Income`,
    body: isId
      ? `Biaya tempat tinggal <strong>${fmt(housing, currency)}</strong> ${housingPct < 30 ? 'masih dalam' : 'melebihi'} batas wajar 30%. ${housingPct < 30 ? 'Anda berada di rentang yang sehat.' : 'Pertimbangkan cara mengurangi biaya tempat tinggal.'}`
      : `Rent at <strong>${fmt(housing, currency)}</strong> is ${housingPct < 30 ? 'within' : 'above'} the 30% benchmark. ${housingPct < 30 ? 'You\'re in a healthy range.' : 'Consider ways to reduce housing costs.'}`,
  });

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

  const avgTravel = months.reduce((s, x) => s + (x.cats['Travel'] || 0), 0) / months.length;
  if (avgTravel > 100 && (catBudgets['Travel'] || 0) === 0) {
    actions.push({
      title: isId ? `Tetapkan anggaran Travel sebesar ${symbol}${Math.round(avgTravel / 100) * 100}/bln` : `Set Travel budget at ${symbol}${Math.round(avgTravel / 100) * 100}/mo`,
      detail: isId ? `Rata-rata pengeluaran Travel Anda ${fmt(avgTravel, currency)}/bln. Mengalokasikan anggaran menghilangkan sebagian besar flag lewat anggaran.` : `You've averaged ${fmt(avgTravel, currency)}/mo on travel. Allocating a budget eliminates most over-budget flags.`,
    });
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
