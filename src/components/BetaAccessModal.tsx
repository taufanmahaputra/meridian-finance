'use client';

import { MessageCircle, X, Construction } from 'lucide-react';
import { useFinance } from '@/lib/FinanceContext';
import { whatsappLink } from '@/lib/constants';

export function BetaAccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useFinance();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[420px] shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Construction className="w-6 h-6" />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <h3 className="text-base font-semibold mb-1.5">{t('beta.title')}</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{t('beta.desc')}</p>
        <div className="flex flex-col gap-2.5">
          <a
            href={whatsappLink(t('beta.whatsappMessage'))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {t('beta.whatsappButton')}
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t('beta.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
