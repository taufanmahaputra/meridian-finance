-- Run this in Supabase SQL Editor (after supabase-schema.sql and supabase-schema-v2.sql)
-- Pivots the default currency to IDR for the Indonesian market.

alter table public.profiles alter column currency set default 'IDR';

-- Backfill existing profiles that are still on the old default (SGD) and
-- haven't explicitly set a currency through the app yet.
update public.profiles set currency = 'IDR' where currency = 'SGD';
