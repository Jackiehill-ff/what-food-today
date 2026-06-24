-- Supabase Auth + Postgres/RLS draft for what-food-today.
-- Run manually in Supabase after reviewing field names and indexes.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('full', 'simple')),
  category text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  method text not null default '',
  raw_text text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  client_updated_at timestamptz,
  device_id text,
  version integer not null default 1,
  primary key (user_id, id)
);

create table if not exists public.import_records (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('flomo', 'image', 'manual')),
  source_id text,
  raw_text text,
  imported_recipe_ids text[] not null default '{}',
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.meal_plan_entries (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  slot_id text not null check (slot_id in ('breakfast', 'lunch', 'dinner')),
  recipe_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  primary key (user_id, id),
  foreign key (user_id, recipe_id) references public.recipes(user_id, id) on delete cascade
);

create table if not exists public.shopping_items (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  name text not null,
  amount text not null default '',
  unit text not null default '',
  category text not null,
  source_label text not null default '',
  source_candidate_id text,
  created_at bigint not null,
  checked boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  primary key (user_id, id)
);

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.import_records enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.shopping_items enable row level security;

create policy "profiles owner select" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles owner insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles owner delete" on public.profiles for delete using (auth.uid() = user_id);

create policy "recipes owner select" on public.recipes for select using (auth.uid() = user_id);
create policy "recipes owner insert" on public.recipes for insert with check (auth.uid() = user_id);
create policy "recipes owner update" on public.recipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recipes owner delete" on public.recipes for delete using (auth.uid() = user_id);

create policy "import records owner select" on public.import_records for select using (auth.uid() = user_id);
create policy "import records owner insert" on public.import_records for insert with check (auth.uid() = user_id);
create policy "import records owner update" on public.import_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "import records owner delete" on public.import_records for delete using (auth.uid() = user_id);

create policy "meal plan owner select" on public.meal_plan_entries for select using (auth.uid() = user_id);
create policy "meal plan owner insert" on public.meal_plan_entries for insert with check (auth.uid() = user_id);
create policy "meal plan owner update" on public.meal_plan_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meal plan owner delete" on public.meal_plan_entries for delete using (auth.uid() = user_id);

create policy "shopping owner select" on public.shopping_items for select using (auth.uid() = user_id);
create policy "shopping owner insert" on public.shopping_items for insert with check (auth.uid() = user_id);
create policy "shopping owner update" on public.shopping_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shopping owner delete" on public.shopping_items for delete using (auth.uid() = user_id);

create index if not exists recipes_user_updated_idx on public.recipes(user_id, updated_at);
create index if not exists import_records_user_updated_idx on public.import_records(user_id, updated_at);
create index if not exists meal_plan_user_date_idx on public.meal_plan_entries(user_id, date);
create index if not exists shopping_items_user_date_idx on public.shopping_items(user_id, date);
