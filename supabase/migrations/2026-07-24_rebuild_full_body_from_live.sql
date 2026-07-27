-- 2026-07-24: Rebuild Full Body 1/2/3 from the LIVE Push/Pull program.
--
-- WHY: The 2026-07-20 migration built these days from src/utils/seedUserData.js,
-- which is the ORIGINAL seed and has drifted badly from the live database.
-- That put five exercises back into the program that had been deliberately
-- removed (Leg Press Xpload, Kettlebell Swing, Bodybuilder Squat Machine,
-- Nautilus Hamstring Curls, Suitcase Carry), used a stale Face Pull weight,
-- and missed every in-app change since June — Bulgarian Split Squat, Dips with
-- Knee Raise, Chabbles Workout, Lateral Band Walks, and the chipper set types.
--
-- This migration is a full replace: it clears the three Full Body days and
-- rebuilds them using ONLY exercises currently on push_a/push_b/pull_a/pull_b,
-- at their verified live current-week weights (read 2026-07-24):
--
--   Incline Bench 80    Flat Bench 80        Pulldown overhand 151
--   DB 45 Incline 60    DB Flat Bench 70     Pulldown underhand 136
--   Seated Press 75     Lateral Raises 65    Seated Row V-bar 136
--   Rope OH Ext 49      Face Pulls 44        Chest Supp Row High 55
--   Bulgarian Split 10  Cable Curls 58.5     Hammer Curls 50
--   Incline DB Curls 25 RDL 145              Hip Thrust 85
--
-- All 27 slots are covered: every lift on the 4-day split appears at least
-- once across the three days. Nine exercises per day.
--
-- Weights are written explicitly rather than derived, because the 07-20
-- migration's live-lookup silently fell back to hardcoded values for any
-- exercise lacking a progression_targets row at its day's current_week
-- (that is how Face Pulls ended up at 58.5 instead of 44).
--
-- Bodyweight / untracked movements (Dips, Chabbles Workout, Lateral Band
-- Walks, Leg Extensions) get no progression_targets row, matching how they
-- are stored on the live push/pull days. Pull-up carries weight 0, as on Pull A.
--
-- After this runs, app-side forward-sync (mirrorWeightsToSharedDays) keeps
-- every shared lift in step across the 3-day and 4-day splits automatically.
--
-- Idempotent. Re-runnable. Only touches full_body_1/2/3.

-- ============================================================
-- 1. Clear the existing Full Body rows (clean replace).
-- ============================================================
delete from progression_targets pt
 using split_days sd
 where pt.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('full_body_1', 'full_body_2', 'full_body_3');

delete from split_day_exercises sde
 using split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('full_body_1', 'full_body_2', 'full_body_3');

-- ============================================================
-- 2. Refresh subtitles to match the rebuilt content.
-- ============================================================
update split_days set subtitle = 'Incline · Vertical Pull · Quads'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and day_key = 'full_body_1';
update split_days set subtitle = 'Flat · Horizontal Pull · Posterior Chain'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and day_key = 'full_body_2';
update split_days set subtitle = 'DB Chest · Full Back · Glutes'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and day_key = 'full_body_3';

-- ============================================================
-- 3. Exercises — notes and intensifiers carried over verbatim
--    from the live push/pull rows.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, short_id, set_type, target_sets,
   target_reps_min, target_reps_max, sort_order, note, intensifier)
select sd.id, ex.id, v.short_id, v.set_type, v.sets,
       v.rmin, v.rmax, v.ord, v.note, v.intensifier
from (values
  -- ── FULL BODY 1 — Incline · Vertical Pull · Quads ──────────────────────
  ('full_body_1','fb1_inc',     'Nautilus PL Incline Bench',      'straight', 4::int, 8::int,  8::int,  1::int, '/side'::text, null::text),
  ('full_body_1','fb1_pullup',  'Pull-up',                        'straight', 3, 5,  10, 2, 'bodyweight (+/- assist)', null),
  ('full_body_1','fb1_pd_over', 'Nautilus Lat Pulldown overhand', 'straight', 3, 8,  10, 3, 'or close-grip V-handle for rear delt bias', null),
  ('full_body_1','fb1_seat_pr', 'Nautilus PL Seated Press',       'straight', 3, 10, 10, 4, '/side', null),
  ('full_body_1','fb1_fp',      'Cable Face Pulls',               'straight', 3, 15, 20, 5, null, '1s pause + squeeze at peak'),
  ('full_body_1','fb1_cc',      'Cable Curls',                    'straight', 3, 12, 15, 6, null, 'Slow 3s eccentric + peak squeeze'),
  ('full_body_1','fb1_rope_oh', 'Cable Rope Overhead Extension',  'straight', 3, 12, 12, 7, null, null),
  ('full_body_1','fb1_bulg',    'Bulgarian Split Squat',          'straight', 3, 8,  10, 8, '/leg. Rear foot elevated on bench. Front shin vertical, drop straight down. Bodyweight to start, add DBs as it gets easy.', null),
  ('full_body_1','fb1_leg_ext', 'Nautilus Leg Extensions',        'chipper',  null, 60, 60, 9, 'controlled reps only — no kicking the stack up', 'Slow 3s eccentric + 1s squeeze at top'),

  -- ── FULL BODY 2 — Flat · Horizontal Pull · Posterior Chain ─────────────
  ('full_body_2','fb2_flat',     'Nautilus PL Flat Bench',        'straight', 4, 8,  10, 1, '/side', null),
  ('full_body_2','fb2_db_flat',  'DB Flat Bench',                 'straight', 3, 10, 12, 2, null, null),
  ('full_body_2','fb2_row_vbar', 'Nautilus Seated Row V-bar',     'straight', 3, 10, 12, 3, null, null),
  ('full_body_2','fb2_lat_r',    'Arsenal Lateral Raises',        'straight', 3, 12, 15, 4, null, 'Slow 3s eccentric + 1s pause at top'),
  ('full_body_2','fb2_inc_curl', 'Incline DB Curls',              'straight', 3, 12, 15, 5, null, 'Slow 3s eccentric (deep stretch)'),
  ('full_body_2','fb2_dips',     'Dips with Knee Raise',          'straight', 3, 8,  12, 6, null, null),
  ('full_body_2','fb2_rdl',      'Romanian Deadlift',             'straight', 3, 8,  8,  7, null, null),
  ('full_body_2','fb2_thrust',   'Hip Thrust',                    'chipper',  null, 50, 50, 8, 'full lockout every rep — no half reps as fatigue builds', '2s pause + squeeze at top'),
  ('full_body_2','fb2_chabbles', 'Chabbles Workout',              'straight', 3, 10, 10, 9, null, null),

  -- ── FULL BODY 3 — DB Chest · Full Back · Glutes ────────────────────────
  ('full_body_3','fb3_db_inc',   'DB 45 Degree Incline',            'straight', 3, 10, 12, 1, null, null),
  ('full_body_3','fb3_pd_under', 'Nautilus Lat Pulldown underhand', 'straight', 3, 8,  12, 2, null, null),
  ('full_body_3','fb3_row_high', 'Nautilus Chest Supported Row High','straight', 3, 10, 15, 3, null, null),
  ('full_body_3','fb3_seat_pr',  'Nautilus PL Seated Press',        'straight', 3, 8,  10, 4, '/side', null),
  ('full_body_3','fb3_fp',       'Cable Face Pulls',                'straight', 3, 15, 20, 5, null, '1s pause + squeeze at peak'),
  ('full_body_3','fb3_hammer',   'Hammer Curls',                    'straight', 3, 12, 12, 6, null, null),
  ('full_body_3','fb3_rope_oh',  'Cable Rope Overhead Extension',   'straight', 3, 12, 15, 7, null, 'Slow 3s eccentric (long-head stretch)'),
  ('full_body_3','fb3_bulg',     'Bulgarian Split Squat',           'straight', 3, 8,  8,  8, '/leg. Rear foot elevated on bench. Front shin vertical, drop straight down. Bodyweight to start, add DBs as it gets easy.', null),
  ('full_body_3','fb3_band_walk','Lateral Band Walks',              'straight', 3, 15, 15, 9, '/side. Band above knees or around ankles. Quarter squat, small controlled steps. Knees push OUT into the band the whole time.', null)
) as v(day_key, short_id, ex_name, set_type, sets, rmin, rmax, ord, note, intensifier)
join split_days sd
  on sd.day_key = v.day_key
 and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
join exercises ex on ex.name = v.ex_name
on conflict (split_day_id, short_id) do update
  set exercise_id     = excluded.exercise_id,
      set_type        = excluded.set_type,
      target_sets     = excluded.target_sets,
      target_reps_min = excluded.target_reps_min,
      target_reps_max = excluded.target_reps_max,
      sort_order      = excluded.sort_order,
      note            = excluded.note,
      intensifier     = excluded.intensifier;

-- ============================================================
-- 4. Progression targets at each day's current_week, using the
--    verified live weights. Bodyweight/untracked lifts omitted.
-- ============================================================
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
select u.id, ex.id, sd.id, sd.current_week, 1,
       v.w, v.sets, v.rmin, v.rmax, v.rir, v.set_type, 'mirror'
from (values
  -- FULL BODY 1
  ('full_body_1','Nautilus PL Incline Bench',      80::numeric, 4::int,   8::int,  8::int,  2::int, 'straight'::text),
  ('full_body_1','Pull-up',                        0,   3,    5,  10, 2, 'straight'),
  ('full_body_1','Nautilus Lat Pulldown overhand', 151, 3,    8,  10, 2, 'straight'),
  ('full_body_1','Nautilus PL Seated Press',       75,  3,    10, 10, 2, 'straight'),
  ('full_body_1','Cable Face Pulls',               44,  3,    15, 20, 1, 'straight'),
  ('full_body_1','Cable Curls',                    58.5,3,    12, 15, 1, 'straight'),
  ('full_body_1','Cable Rope Overhead Extension',  49,  3,    12, 12, 2, 'straight'),
  ('full_body_1','Bulgarian Split Squat',          10,  3,    8,  10, 2, 'straight'),
  -- FULL BODY 2
  ('full_body_2','Nautilus PL Flat Bench',         80,  4,    8,  10, 2, 'straight'),
  ('full_body_2','DB Flat Bench',                  70,  3,    10, 12, 2, 'straight'),
  ('full_body_2','Nautilus Seated Row V-bar',      136, 3,    10, 12, 2, 'straight'),
  ('full_body_2','Arsenal Lateral Raises',         65,  3,    12, 15, 1, 'straight'),
  ('full_body_2','Incline DB Curls',               25,  3,    12, 15, 1, 'straight'),
  ('full_body_2','Romanian Deadlift',              145, 3,    8,  8,  2, 'straight'),
  ('full_body_2','Hip Thrust',                     85,  null, 50, 50, 2, 'chipper'),
  -- FULL BODY 3
  ('full_body_3','DB 45 Degree Incline',            60,  3,    10, 12, 2, 'straight'),
  ('full_body_3','Nautilus Lat Pulldown underhand', 136, 3,    8,  12, 2, 'straight'),
  ('full_body_3','Nautilus Chest Supported Row High',55, 3,    10, 15, 2, 'straight'),
  ('full_body_3','Nautilus PL Seated Press',        75,  3,    8,  10, 2, 'straight'),
  ('full_body_3','Cable Face Pulls',                44,  3,    15, 20, 1, 'straight'),
  ('full_body_3','Hammer Curls',                    50,  3,    12, 12, 2, 'straight'),
  ('full_body_3','Cable Rope Overhead Extension',   49,  3,    12, 15, 1, 'straight'),
  ('full_body_3','Bulgarian Split Squat',           10,  3,    8,  8,  2, 'straight')
) as v(day_key, ex_name, w, sets, rmin, rmax, rir, set_type)
cross join (select id from auth.users where email = 'chadleydean@gmail.com') u
join split_days sd on sd.day_key = v.day_key and sd.user_id = u.id
join exercises ex  on ex.name = v.ex_name
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do update
  set target_weight   = excluded.target_weight,
      target_sets     = excluded.target_sets,
      target_reps_min = excluded.target_reps_min,
      target_reps_max = excluded.target_reps_max,
      target_rir      = excluded.target_rir,
      set_type        = excluded.set_type,
      source          = excluded.source;
