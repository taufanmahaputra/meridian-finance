-- Run this in Supabase SQL Editor (after supabase-schema.sql, v2, v3, v4)
-- Adds the community stock signal watchlist (ticker + entry prices), posted
-- in dated batches. Only the admin account can add/edit/delete; everyone
-- signed in can view.

create table public.stock_signals (
  id uuid default gen_random_uuid() primary key,
  batch_date date not null,
  ticker text not null,
  entries numeric[] not null default '{}',
  note text,
  sort_order int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index stock_signals_batch_date_idx on public.stock_signals(batch_date desc);

alter table public.stock_signals enable row level security;

-- Anyone signed in can view the watchlist.
create policy "Authenticated users can view stock signals" on public.stock_signals
  for select using (auth.role() = 'authenticated');

-- Only the admin account can add, edit, or remove signals.
-- Replace the email below if the admin account ever changes.
create policy "Admin can insert stock signals" on public.stock_signals
  for insert with check ((auth.jwt() ->> 'email') = 'hacker.indo62@gmail.com');
create policy "Admin can update stock signals" on public.stock_signals
  for update using ((auth.jwt() ->> 'email') = 'hacker.indo62@gmail.com');
create policy "Admin can delete stock signals" on public.stock_signals
  for delete using ((auth.jwt() ->> 'email') = 'hacker.indo62@gmail.com');
