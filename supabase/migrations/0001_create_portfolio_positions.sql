-- Step 2/8 of specs/dashboard-carteira.md
-- Portfolio positions: one row per (user, ticker), average-price model.
-- RLS restricts every user to their own rows.

create table public.portfolio_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  asset_type text not null check (asset_type in ('stock','fii')),
  quantity numeric not null check (quantity > 0),
  avg_price numeric not null check (avg_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ticker)
);

alter table public.portfolio_positions enable row level security;

create policy "select_own" on public.portfolio_positions
  for select using (user_id = auth.uid());
create policy "insert_own" on public.portfolio_positions
  for insert with check (user_id = auth.uid());
create policy "update_own" on public.portfolio_positions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete_own" on public.portfolio_positions
  for delete using (user_id = auth.uid());
