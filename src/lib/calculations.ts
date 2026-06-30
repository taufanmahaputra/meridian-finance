import type { MonthData, Insight, ActionItem } from '@/types/finance';
import { MONTHLY_BUDGET, CAT_BUDGETS, INCOME } from './constants';

export function computeDerived(m: Partial<MonthData> & { income: number; expenses: number; cats: Record<string, number>; partial: boolean; label: string }): MonthData {
  const savings = m.income - m.expenses;
  const savingsRate = m.income > 0 ? (savings / m.income) * 100 : 0;
  const budgetUtil = MONTHLY_BUDGET > 0 ? (m.expenses / MONTHLY_BUDGET) * 100 : 0;
  const avgDaily = m.expenses / (m.partial ? 24 : 30);
  const overBudgetCats = Object.entries(m.cats).filter(
    ([c, v]) => (CAT_BUDGETS[c] ?? 0) > 0 && v > (CAT_BUDGETS[c] ?? 0)
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

export function fmt(n: number, decimals = 0): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function generateInsights(months: MonthData[]): Insight[] {
  if (months.length === 0) return [];
  const m = months[months.length - 1];
  const insights: Insight[] = [];

  if (months.length >= 3) {
    const rates = months.slice(-3).map((x) => x.savingsRate);
    if (rates[2] < rates[0]) {
      insights.push({
        priority: 'high',
        title: 'Savings Rate Declining',
        body: `Rate dropped from <strong>${rates[0].toFixed(1)}% → ${rates[1].toFixed(1)}% → ${rates[2].toFixed(1)}%</strong> over 3 months. The <strong>-${(rates[0] - rates[2]).toFixed(1)}pp trend</strong> needs attention.`,
      });
    }
  }

  const travelSpend = m.cats['Travel'] || 0;
  const travelBudget = CAT_BUDGETS['Travel'] || 0;
  if (travelSpend > 0 && travelBudget === 0) {
    const avgTravel = months.reduce((s, x) => s + (x.cats['Travel'] || 0), 0) / months.length;
    insights.push({
      priority: 'high',
      title: 'Travel Has No Budget Allocated',
      body: `Travel spending averages <strong>${fmt(avgTravel)}/month</strong>. This unbudgeted category drives most budget overruns. Allocating $500–700 would fix several over-budget flags.`,
    });
  }

  const installments = m.cats['Installments'] || 0;
  if (installments > 500) {
    insights.push({
      priority: 'medium',
      title: 'Installments Are Predictable Fixed Costs',
      body: `Monthly installments at <strong>${fmt(installments)}</strong> are recurring obligations, not discretionary spending. Track them separately.`,
    });
  }

  Object.entries(m.cats).forEach(([cat, spent]) => {
    const budget = CAT_BUDGETS[cat] || 0;
    if (budget > 0 && spent > budget * 3) {
      insights.push({
        priority: 'medium',
        title: `${cat} Significantly Over Budget`,
        body: `<strong>${fmt(spent)}</strong> spent vs <strong>${fmt(budget)}</strong> budget (${((spent / budget) * 100).toFixed(0)}%). Consider adjusting your budget to reflect reality.`,
      });
    }
  });

  const food = m.cats['Food & Groceries'] || 0;
  const foodBudget = CAT_BUDGETS['Food & Groceries'] || 0;
  if (food < foodBudget * 0.7) {
    insights.push({
      priority: 'low',
      title: 'Food & Groceries Well Managed',
      body: `Spending at <strong>${fmt(food)}</strong> — well under the <strong>${fmt(foodBudget)}</strong> budget. Consider reducing delivery frequency for additional savings.`,
    });
  }

  const housing = m.cats['Housing'] || 0;
  const housingPct = (housing / m.income) * 100;
  insights.push({
    priority: 'info',
    title: `Housing at ${housingPct.toFixed(0)}% of Income`,
    body: `Rent at <strong>${fmt(housing)}</strong> is ${housingPct < 30 ? 'within' : 'above'} the 30% benchmark. ${housingPct < 30 ? 'You\'re in a healthy range.' : 'Consider ways to reduce housing costs.'}`,
  });

  return insights;
}

export function generateActions(months: MonthData[]): ActionItem[] {
  if (months.length === 0) return [];
  const actions: ActionItem[] = [];
  const m = months[months.length - 1];

  const avgTravel = months.reduce((s, x) => s + (x.cats['Travel'] || 0), 0) / months.length;
  if (avgTravel > 100 && (CAT_BUDGETS['Travel'] || 0) === 0) {
    actions.push({ title: `Set Travel budget at $${Math.round(avgTravel / 100) * 100}/mo`, detail: `You've averaged ${fmt(avgTravel)}/mo on travel. Allocating a budget eliminates most over-budget flags.` });
  }

  const installments = m.cats['Installments'] || 0;
  if (installments > 0) {
    actions.push({ title: `Create Installments budget line (${fmt(installments)}/mo)`, detail: 'Installments are predictable. Tracking them separately prevents confusion with discretionary spending.' });
  }

  Object.entries(m.cats).forEach(([cat, spent]) => {
    const budget = CAT_BUDGETS[cat] || 0;
    if (budget > 0 && spent > budget * 1.5) {
      actions.push({ title: `Adjust ${cat} budget to ${fmt(Math.ceil(spent / 50) * 50)}`, detail: `Current budget of ${fmt(budget)} is consistently exceeded (${fmt(spent)} this month). Update to reflect actual spending.` });
    }
  });

  if (m.savingsRate > 30) {
    actions.push({ title: 'Automate savings transfer on salary day', detail: `Transfer $${Math.round(m.savings / 500) * 500} to a separate savings account on the 1st of each month.` });
  }

  actions.push({ title: 'Build 6-month emergency fund', detail: `Target: ${fmt(m.expenses * 6)}. Allocate monthly until reached, then redirect to investments.` });

  return actions;
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
