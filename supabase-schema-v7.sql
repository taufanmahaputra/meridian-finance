-- Already applied directly via the Supabase migration system (migration
-- name: upload_history) — this file exists for the repo's schema-version
-- history/documentation, matching v2-v6. Re-running it is safe (guarded
-- by IF NOT EXISTS / a fresh table create that no-ops if it already exists
-- would need `if not exists`; add it below if this is ever run manually
-- on a project where the migration hasn't landed yet).
--
-- Upload history: a lightweight log of statement imports (filename + which
-- month it was assigned to, row count, mode) so a user can recall what
-- they already uploaded without having to keep the files around. No file
-- contents are ever stored — just the metadata of the import event.

create table if not exists public.upload_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  bank_label text,
  month text not null,
  mode text not null default 'append',
  row_count integer not null default 0,
  currency text,
  created_at timestamptz not null default now()
);

comment on table public.upload_history is 'Log of statement imports (filename + month, no file contents) so a user can recall what they already uploaded.';
comment on column public.upload_history.mode is 'append or replace — which import mode was used.';
comment on column public.upload_history.row_count is 'Number of transaction rows actually included from this file.';

alter table public.upload_history enable row level security;

create policy "Users can view own upload history"
  on public.upload_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own upload history"
  on public.upload_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own upload history"
  on public.upload_history for delete
  using (auth.uid() = user_id);

create index if not exists upload_history_user_created_idx on public.upload_history (user_id, created_at desc);
