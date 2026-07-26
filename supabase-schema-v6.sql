-- Run this in Supabase SQL Editor (after supabase-schema.sql, v2, v3, v4, v5)
-- Multi-currency / multi-bank statement support.
--
-- Transactions now keep their ORIGINAL amount and currency alongside the
-- converted `amount` (which is always in the user's display currency from
-- profiles.currency). This keeps a full audit trail — "S$45.00 → Rp632,000
-- @ 14,044" — and means changing the display currency later can re-convert
-- from the original instead of double-converting an already-converted value.
--
-- fx_rate is the rate actually applied at import time. Per the app's
-- deliberate conservative-margin policy, that is the HIGHEST rate observed
-- across the statement's own date range, not the per-day spot rate — so
-- converted expenses are intentionally slightly overstated.
--
-- source_bank records which statement template the row came from, so a
-- re-import or an audit can tell HSBC rows from BCA rows.

alter table public.transactions
  add column if not exists original_amount numeric,
  add column if not exists original_currency text,
  add column if not exists fx_rate numeric,
  add column if not exists source_bank text;

-- Existing rows predate multi-currency: they were entered directly in the
-- user's display currency, so original == amount at a 1:1 rate. Backfilling
-- makes every row uniform for the UI (no null-checks needed downstream).
update public.transactions t
set
  original_amount = t.amount,
  original_currency = coalesce(p.currency, 'IDR'),
  fx_rate = 1
from public.profiles p
where p.id = t.user_id
  and t.original_amount is null;

comment on column public.transactions.original_amount is 'Amount as printed on the source statement, before FX conversion.';
comment on column public.transactions.original_currency is 'Currency of original_amount (ISO code, e.g. SGD).';
comment on column public.transactions.fx_rate is 'original_currency -> display currency rate applied at import (highest observed over the statement period).';
comment on column public.transactions.source_bank is 'Statement template id this row was parsed from (e.g. "bca", "hsbc-sg", "generic").';
