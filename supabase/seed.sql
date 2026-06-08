-- ============================================================
-- TRAINING APP — SEED DATA
-- Run this AFTER schema.sql
-- Replace USER_UUID below with your actual Supabase auth user ID
-- ============================================================

-- ============================================================
-- EXERCISES
-- ============================================================
insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment) values
  -- Chest
  ('Nautilus PL Incline Bench',       'nautilus_pl',    'chest',      'compound',  5),
  ('Nautilus PL Flat Bench',          'nautilus_pl',    'chest',      'compound',  5),
  ('DB Flat Bench',                   'free_weight',    'chest',      'compound',  5),
  ('DB 45 Degree Incline',            'free_weight',    'chest',      'compound',  5),
  ('Arsenal Fly Machine',             'arsenal',        'chest',      'isolation', 2.5),
  -- Shoulders
  ('Arsenal Lateral Raises',          'arsenal',        'shoulders',  'isolation', 5),
  ('Nautilus PL Seated Press',        'nautilus_pl',    'shoulders',  'compound',  5),
  -- Triceps
  ('Tricep Pushdowns',                'cable',          'triceps',    'isolation', 4.5),
  ('Tricep Overhead Extension',       'cable',          'triceps',    'isolation', 4.5),
  ('Close Grip DB Bench',             'free_weight',    'triceps',    'compound',  5),
  -- Back / Lats
  ('Pull-up',                         'free_weight',    'back',       'compound',  5),
  ('Nautilus Lat Pulldown overhand',  'nautilus_stack', 'back',       'compound',  5),
  ('Nautilus Lat Pulldown underhand', 'nautilus_stack', 'back',       'compound',  5),
  ('Nautilus Chest Supported Row Mid','nautilus_stack', 'back',       'compound',  5),
  ('Nautilus Chest Supported Row High','nautilus_stack','back',       'compound',  5),
  ('Nautilus Seated Row V-bar',       'nautilus_stack', 'back',       'compound',  5),
  ('Nautilus Seated Row wide',        'nautilus_stack', 'back',       'compound',  5),
  ('Romanian Deadlift',               'free_weight',    'back',       'compound',  5),
  -- Biceps
  ('Cable Curls',                     'cable',          'biceps',     'isolation', 4.5),
  ('Incline DB Curls',                'free_weight',    'biceps',     'isolation', 5),
  -- Rear Delt / Upper Back
  ('Cable Face Pulls',                'cable',          'rear_delt',  'isolation', 4.5),
  ('Cable Lat Prayers',               'cable',          'back',       'isolation', 4.5),
  ('Chest Supported Rear Delt Raises','free_weight',    'rear_delt',  'isolation', 5),
  -- Quads
  ('Hack Squat',                      'specialty',      'quads',      'compound',  5),
  ('Nautilus Leg Extensions',         'nautilus_stack', 'quads',      'isolation', 5),
  ('Nautilus Xpload Leg Press Incline','nautilus_pl',    'quads',      'compound',  5),
  ('Bodybuilder Squat Machine',       'specialty',      'quads',      'compound',  5),
  -- Hamstrings
  ('Nautilus Hamstring Curls',        'nautilus_stack', 'hamstrings', 'isolation', 5),
  -- Glutes / Abductors
  ('Hip Abductor Machine',            'nautilus_stack', 'glutes',     'isolation', 5),
  ('Hip Thrust',                      'free_weight',    'glutes',     'compound',  5),
  -- Conditioning
  ('Kettlebell Swing',                'specialty',      'glutes',     'compound',  5),
  -- Athlete prehab / accessory
  ('Band Pull-apart',                 'specialty',      'rear_delt',  'isolation', 5),
  ('Dead Hang',                       'specialty',      'back',       'isolation', 5),
  ('Suitcase Carry',                  'free_weight',    'core',       'compound',  5),
  -- Longevity / mobility (Day 5)
  ('Japanese Interval Walking',       'specialty',      'cardio',     'compound',  0),
  ('Asian Squat',                     'bodyweight',     'lower_body', 'compound',  0),
  ('World''s Greatest Stretch',       'bodyweight',     'full_body',  'compound',  0),
  ('Zone 2 Cardio',                   'specialty',      'cardio',     'compound',  0),
  ('Plyometrics',                     'bodyweight',     'lower_body', 'compound',  0),
  ('Farmer''s Carry',                 'free_weight',    'core',       'compound',  5),
  -- Triceps (additional)
  ('Cable Rope Overhead Extension',   'cable',          'triceps',    'isolation', 4.5),
  -- Shoulders (additional)
  ('Standing Barbell OHP',            'free_weight',    'shoulders',  'compound',  5),
  ('Landmine Press',                  'specialty',      'shoulders',  'compound',  5),
  -- Biceps (additional)
  ('Hammer Curls',                    'free_weight',    'biceps',     'isolation', 5),
  ('EZ Bar Curls',                    'free_weight',    'biceps',     'isolation', 5),
  -- Rear Delt (additional)
  ('Cable Rear Delt Fly',             'cable',          'rear_delt',  'isolation', 4.5),
  -- Core
  ('Pallof Press',                    'cable',          'core',       'isolation', 4.5),
  ('Cable Woodchop',                  'cable',          'core',       'isolation', 4.5),
  ('Ab Wheel Rollout',                'specialty',      'core',       'isolation', 5),
  ('Hanging Leg Raise',               'specialty',      'core',       'isolation', 5),
  ('Cable Serratus Punch',            'cable',          'core',       'isolation', 4.5)
on conflict (name) do nothing;

-- ============================================================
-- USER PROFILE  (replace 'USER_UUID' with your auth.uid())
-- ============================================================
-- After sign-in, run this in the Supabase SQL editor with your real UUID:
-- insert into users (id, email, display_name) values ('USER_UUID', 'your@email.com', 'Chadley')
-- on conflict (id) do nothing;

-- ============================================================
-- NOTE: Split days, split_day_exercises, and progression_targets
-- are seeded by the app on first login using the data below.
-- See src/utils/seedUserData.js for the seeding function.
-- ============================================================
