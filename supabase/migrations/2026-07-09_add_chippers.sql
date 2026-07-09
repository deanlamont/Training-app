-- 2026-07-09: Convert one exercise per gym day to the 'chipper' set_type.
--
-- WHY: MH chipper format — one total-rep target instead of fixed sets×reps.
-- Chip to the target in as few mini-sets as possible, resting just enough to
-- keep form sharp. All near-failure hypertrophy reps, rest-pause style.
-- Progression (in-app): chip the full target in ≤3 sets → +5lb next cycle.
--
-- Picks are shoulder-safe (SLAP) and form-robust under fatigue:
--   Push A — Nautilus Leg Extensions, 60 total   (machine, zero form risk)
--   Push B — Nautilus Leg Extensions, 60 total   (same chipper, weight synced —
--            two attempts per week: beat Push A's set count on Push B)
--   Pull A — Cable Curls, 100 total              (the century; strict, light)
--   Pull B — Hip Thrust, 50 total                (glute-focus day centerpiece)
--
-- target_reps_min = target_reps_max = the total-rep target.
-- target_sets = null (set count is variable by definition). Weights unchanged.
-- Idempotent — updates are no-ops once set_type is already 'chipper', and
-- silently skip any exercise no longer on the day.

-- Push A + Push B: Nautilus Leg Extensions → 60-rep chipper
update split_day_exercises sde
   set set_type        = 'chipper',
       target_sets     = null,
       target_reps_min = 60,
       target_reps_max = 60,
       note            = 'controlled reps only — no kicking the stack up'
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a', 'push_b')
   and sde.exercise_id = (select id from exercises where name = 'Nautilus Leg Extensions');

-- Pull A: Cable Curls → 100-rep chipper
update split_day_exercises sde
   set set_type        = 'chipper',
       target_sets     = null,
       target_reps_min = 100,
       target_reps_max = 100,
       note            = 'strict — no swinging as it burns'
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'pull_a'
   and sde.exercise_id = (select id from exercises where name = 'Cable Curls');

-- Pull B: Hip Thrust → 50-rep chipper
update split_day_exercises sde
   set set_type        = 'chipper',
       target_sets     = null,
       target_reps_min = 50,
       target_reps_max = 50,
       note            = 'full lockout every rep — no half reps as fatigue builds'
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key = 'pull_b'
   and sde.exercise_id = (select id from exercises where name = 'Hip Thrust');
