-- Run this in Supabase SQL Editor (after supabase-schema.sql, v2, and v3)
-- Adds a per-user language preference. Defaults to English.

alter table public.profiles add column if not exists language text not null default 'en';
