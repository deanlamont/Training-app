-- ============================================================
-- TRAINING APP — SUPABASE SCHEMA (source of truth)
-- ============================================================
--
-- Re-runnable. Tables use `if not exists`; policies are dropped
-- and recreated so policy bodies stay in sync with this file.
--
-- Identity is auth.users (Supabase auth). There is no custom
-- users table — every user_id column references auth.users(id).
--
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- EXERCISES (master catalog, public read)
-- ============================================================
create table if not exists exercises (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  equipment_category text not null,
  muscle_group text not null,
  movement_type text not null,
  weight_increment numeric default 5,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- SPLIT DAYS (per user, one row per training day)
-- ============================================================
create table if not exists split_days (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  day_key text not null,
  day_label text not null,
  subtitle text,
  sort_order int not null,
  current_week int not null default 3,
  created_at timestamptz default now(),
  unique(user_id, day_key)
);

-- ============================================================
-- SPLIT DAY EXERCISES (ordered exercise list per day)
-- ============================================================
create table if not exists split_day_exercises (
  id uuid primary key default uuid_generate_v4(),
  split_day_id uuid references split_days(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete cascade,
  set_type text not null,
  target_sets int,
  target_reps_min int,
  target_reps_max int,
  sort_order int not null,
  note text,
  short_id text,
  intensifier text,
  created_at timestamptz default now()
);

-- Backfill column for pre-existing tables created before `intensifier` was added.
alter table split_day_exercises
  add column if not exists intensifier text;

-- Required by seedUserData's upsert onConflict='split_day_id,short_id'.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'split_day_exercises_short_id_unique'
  ) then
    alter table split_day_exercises
      add constraint split_day_exercises_short_id_unique
      unique (split_day_id, short_id);
  end if;
end $$;

-- ============================================================
-- SESSIONS (one row per workout)
-- ============================================================
create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  split_day_id uuid references split_days(id),
  week_number int not null,
  mesocycle int not null default 1,
  session_date date not null default current_date,
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- SET LOGS (individual sets logged per session)
-- ============================================================
create table if not exists set_logs (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade,
  exercise_id uuid references exercises(id),
  set_number int not null,
  set_type text not null,
  weight numeric not null,
  reps int not null,
  rir int,
  rpe numeric,
  notes text,
  logged_at timestamptz default now()
);

-- ============================================================
-- PROGRESSION TARGETS (per-week weight/sets target per exercise)
-- ============================================================
create table if not exists progression_targets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  exercise_id uuid references exercises(id),
  split_day_id uuid references split_days(id),
  week_number int not null,
  mesocycle int not null default 1,
  target_weight numeric not null,
  target_sets int,
  target_reps_min int,
  target_reps_max int,
  target_rir int,
  set_type text not null,
  source text default 'seed',
  created_at timestamptz default now(),
  unique(user_id, exercise_id, split_day_id, week_number, mesocycle)
);

-- ============================================================
-- FLAGS (injuries, plateaus, stale exercises)
-- ============================================================
create table if not exists flags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  exercise_id uuid references exercises(id),
  flag_type text not null,
  flag_message text,
  week_number int,
  mesocycle int,
  resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_sessions_user_week on sessions(user_id, week_number, mesocycle);
create index if not exists idx_set_logs_session on set_logs(session_id);
create index if not exists idx_progression_user_exercise on progression_targets(user_id, exercise_id, week_number);
create index if not exists idx_flags_user_active on flags(user_id, resolved) where resolved = false;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Every owning-table policy includes WITH CHECK so INSERT/UPDATE
-- rows are validated, not just SELECT/DELETE filtered. Without
-- WITH CHECK, an authenticated INSERT can be silently rejected
-- (0 rows affected, no error) — this was the seedUserData bug.

alter table exercises             enable row level security;
alter table split_days            enable row level security;
alter table split_day_exercises   enable row level security;
alter table sessions              enable row level security;
alter table set_logs              enable row level security;
alter table progression_targets   enable row level security;
alter table flags                 enable row level security;

-- exercises: public read, no writes from clients
drop policy if exists "exercises_public_read" on exercises;
create policy "exercises_public_read" on exercises
  for select using (true);

-- split_days: owner-only, all verbs
drop policy if exists "split_days_own" on split_days;
create policy "split_days_own" on split_days
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- sessions: owner-only, all verbs
drop policy if exists "sessions_own" on sessions;
create policy "sessions_own" on sessions
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- progression_targets: owner-only, all verbs
drop policy if exists "progression_own" on progression_targets;
create policy "progression_own" on progression_targets
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- flags: owner-only, all verbs
drop policy if exists "flags_own" on flags;
create policy "flags_own" on flags
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- split_day_exercises: ownership flows through split_days.user_id
drop policy if exists "sde_own" on split_day_exercises;
create policy "sde_own" on split_day_exercises
  for all
  using (
    exists (
      select 1 from split_days sd
      where sd.id = split_day_exercises.split_day_id
        and sd.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from split_days sd
      where sd.id = split_day_exercises.split_day_id
        and sd.user_id = auth.uid()
    )
  );

-- set_logs: ownership flows through sessions.user_id
drop policy if exists "set_logs_own" on set_logs;
create policy "set_logs_own" on set_logs
  for all
  using (
    exists (
      select 1 from sessions s
      where s.id = set_logs.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions s
      where s.id = set_logs.session_id
        and s.user_id = auth.uid()
    )
  );
