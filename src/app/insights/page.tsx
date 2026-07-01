'use client';

import { useFinance } from '@/lib/FinanceContext';
import { Topbar } from '@/components/Topbar';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/EmptyState';
import { generateInsights, generateActions } from '@/lib/calculations';

const priorityVariant = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
  info: 'info',
} as const;

const priorityBorder = {
  high: 'border-l-red-400',
  medium: 'border-l-amber-400',
  low: 'border-l-emerald-400',
  info: 'border-l-blue-400',
};

export default function InsightsPage() {
  const { months, catBudgets, currency, language, t } = useFinance();
  const insights = generateInsights(months, catBudgets, currency, language);
  const actions = generateActions(months, catBudgets, currency, language);

  if (months.length === 0) {
    return (
      <>
        <Topbar title={t('insights.title')} />
        <div className="p-4 sm:p-7 max-w-[1440px]">
          <EmptyState
            title={t('insights.empty.title')}
            description={t('insights.empty.desc')}
            showUpload
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title={t('insights.title')} />
      <div className="p-4 sm:p-7 max-w-[1440px]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t('insights.heading')}</h3>
          <p className="text-xs text-gray-400">{t('insights.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {insights.map((insight, i) => (
            <div key={i} className={`bg-white border border-gray-200 rounded-xl p-5 card-shadow hover:shadow-md transition-shadow border-l-[3px] ${priorityBorder[insight.priority]}`}>
              <div className="flex items-center gap-2.5 mb-2">
                <Badge variant={priorityVariant[insight.priority]}>{insight.priority}</Badge>
                <span className="text-sm font-semibold">{insight.title}</span>
              </div>
              <p className="text-[13px] text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: insight.body }} />
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>{t('insights.priorityActions')}</CardHeader>
          <CardBody compact>
            {actions.map((action, i) => (
              <div key={i} className="flex gap-3.5 px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                <div className="text-[13px]">
                  <strong className="block mb-0.5">{action.title}</strong>
                  <span className="text-gray-500">{action.detail}</span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
