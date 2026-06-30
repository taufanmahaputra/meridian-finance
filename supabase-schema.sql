-- Run this in Supabase SQL Editor to set up the database

-- Months table
create table public.months (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  partial boolean default false,
  income numeric not null default 0,
  expenses numeric not null default 0,
  cats jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Transactions table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  description text not null,
  amount numeric not null default 0,
  category text not null default 'Other',
  type text not null default 'Expense',
  month text,
  notes text,
  created_at timestamptz default now()
);

-- User profiles (optional, for display name etc.)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  currency text default 'SGD',
  monthly_income numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index months_user_id_idx on public.months(user_id);
create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_date_idx on public.transactions(date);

-- Row Level Security
alter table public.months enable row level security;
alter table public.transactions enable row level security;
alter table public.profiles enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own months" on public.months
  for select using (auth.uid() = user_id);
create policy "Users can insert own months" on public.months
  for insert with check (auth.uid() = user_id);
create policy "Users can update own months" on public.months
  for update using (auth.uid() = user_id);
create policy "Users can delete own months" on public.months
  for delete using (auth.uid() = user_id);

create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions
  for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
