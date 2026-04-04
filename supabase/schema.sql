-- ============================================================
-- TRAINING APP — SUPABASE SCHEMA
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  display_name text,
  created_at timestamptz default now()
);

-- ============================================================
-- EXERCISES
-- ============================================================
create table if not exists exercises (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  equipment_category text not null,  -- 'arsenal' | 'nautilus_pl' | 'nautilus_stack' | 'cable' | 'free_weight' | 'specialty'
  muscle_group text not null,         -- 'chest' | 'shoulders' | 'triceps' | 'back' | 'biceps' | 'rear_delt' | 'quads' | 'hamstrings'
  movement_type text not null,        -- 'compound' | 'isolation'
  weight_increment numeric default 5, -- smallest increment for this machine/exercise
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- SPLIT DAYS
-- ============================================================
create table if not exists split_days (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  day_key text not null,   -- 'push_a' | 'push_b' | 'pull_a' | 'pull_b'
  day_label text not null, -- 'Push A — Chest & Triceps' etc.
  sort_order int not null,
  created_at timestamptz default now(),
  unique(user_id, day_key)
);

-- ============================================================
-- SPLIT DAY EXERCISES  (ordered exercise list per day)
-- ============================================================
create table if not exists split_day_exercises (
  id uuid primary key default uuid_generate_v4(),
  split_day_id uuid references split_days(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete cascade,
  set_type text not null,           -- 'straight' | 'myo'
  target_sets int,                  -- null for myo-reps
  target_reps_min int,
  target_reps_max int,
  sort_order int not null,
  created_at timestamptz default now()
);

-- ============================================================
-- SESSIONS
-- ============================================================
create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  split_day_id uuid references split_days(id),
  week_number int not null,
  mesocycle int not null default 1,
  session_date date not null default current_date,
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- SET LOGS  (individual sets logged per session)
-- ============================================================
create table if not exists set_logs (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade,
  exercise_id uuid references exercises(id),
  set_number int not null,  -- 0 = activation set for myo-reps
  set_type text not null,   -- 'straight' | 'myo_activation' | 'myo_mini'
  weight numeric not null,
  reps int not null,
  rir int,                  -- reps in reserve (3 = start of meso, 0 = near failure)
  rpe numeric,              -- optional
  notes text,
  logged_at timestamptz default now()
);

-- ============================================================
-- PROGRESSION TARGETS  (Claude writes here after each session)
-- ============================================================
create table if not exists progression_targets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  exercise_id uuid references exercises(id),
  split_day_id uuid references split_days(id),
  week_number int not null,
  mesocycle int not null default 1,
  target_weight numeric not null,
  target_sets int,
  target_reps_min int,
  target_reps_max int,
  target_rir int,
  set_type text not null,  -- 'straight' | 'myo'
  source text default 'claude_api',
  created_at timestamptz default now(),
  unique(user_id, exercise_id, split_day_id, week_number, mesocycle)
);

-- ============================================================
-- FLAGS  (injuries, plateaus, stale exercises)
-- ============================================================
create table if not exists flags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  exercise_id uuid references exercises(id),
  flag_type text not null,  -- 'plateau' | 'stale' | 'injury' | 'deload'
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
alter table users enable row level security;
alter table split_days enable row level security;
alter table split_day_exercises enable row level security;
alter table sessions enable row level security;
alter table set_logs enable row level security;
alter table progression_targets enable row level security;
alter table flags enable row level security;

-- Users can only see their own data
create policy "users_own_data" on users for all using (auth.uid() = id);
create policy "split_days_own" on split_days for all using (auth.uid() = user_id);
create policy "sessions_own" on sessions for all using (auth.uid() = user_id);
create policy "progression_own" on progression_targets for all using (auth.uid() = user_id);
create policy "flags_own" on flags for all using (auth.uid() = user_id);

-- Split day exercises — accessible if user owns the split day
create policy "sde_own" on split_day_exercises for all using (
  exists (
    select 1 from split_days sd
    where sd.id = split_day_exercises.split_day_id
    and sd.user_id = auth.uid()
  )
);

-- Set logs — accessible if user owns the session
create policy "set_logs_own" on set_logs for all using (
  exists (
    select 1 from sessions s
    where s.id = set_logs.session_id
    and s.user_id = auth.uid()
  )
);

-- Exercises table is public read
alter table exercises enable row level security;
create policy "exercises_public_read" on exercises for select using (true);
