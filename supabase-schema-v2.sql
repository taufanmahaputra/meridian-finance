-- Run this in Supabase SQL Editor (after the original supabase-schema.sql)
-- Adds per-user custom categories so users can add/delete/edit their own budget categories.

create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  budget numeric not null default 0,
  color text not null default '#6b7280',
  created_at timestamptz default now()
);

create unique index categories_user_name_idx on public.categories(user_id, name);
create index categories_user_id_idx on public.categories(user_id);

alter table public.categories enable row level security;

create policy "Users can view own categories" on public.categories
  for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on public.categories
  for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on public.categories
  for delete using (auth.uid() = user_id);
