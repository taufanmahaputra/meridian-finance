// Resolves a transaction's `sourceBank` (a stable template id like 'bca' or
// 'bca-cc', set at import time) into a human label and account type, for
// display. BANK_TEMPLATES are all CSV bank-account statements; CARD_TEMPLATES
// are all credit-card PDF statements — the two registries are exhaustive and
// mutually exclusive, so no per-template flag is needed, just which list an
// id came from.

import { BANK_TEMPLATES } from './bankTemplates';
import { CARD_TEMPLATES } from './creditCardStatement';

export type AccountType = 'savings' | 'credit_card';

export interface ResolvedSourceBank {
  label: string;
  accountType: AccountType;
}

const LOOKUP: Record<string, ResolvedSourceBank> = Object.fromEntries([
  ...BANK_TEMPLATES.map((b) => [b.id, { label: b.label, accountType: 'savings' as const }]),
  ...CARD_TEMPLATES.map((c) => [c.id, { label: c.label, accountType: 'credit_card' as const }]),
]);

export function resolveSourceBank(sourceBank?: string | null): ResolvedSourceBank | null {
  if (!sourceBank) return null;
  return LOOKUP[sourceBank] ?? null;
}
