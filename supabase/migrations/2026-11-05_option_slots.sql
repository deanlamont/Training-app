-- 2026-11-05 — "Pick one" option slots across the 4-day and 3-day splits.
--
-- WHY: Tennis / pickleball / disc golf already load the joints, and overuse pain
-- is a real constraint. Each slot now offers 2-3 interchangeable exercises; the
-- app lets you pick one per session and skips the rest. Each option keeps its
-- own weight and progression, and every option in a slot has the same set
-- count, so weekly volume per muscle is unchanged whichever you pick.
--
-- SLOTS (option_group label = slot name):
--   Upper Chest Press : PL Incline / DB 45 Incline / Underhand DB Press (50 lb)
--                       on Push A, Full Body 1, Full Body 3
--   Flat Press        : PL Flat / DB Flat            on Push B, Full Body 2
--   Vertical Pull     : Pull-up / Pulldown over / Pulldown under
--                       on Pull B, Full Body 1, 2, 3  (Pull A keeps its two
--                       vertical pulls as separate slots)
--   Row               : Seated Row V-bar / Chest-Supported Row High
--                       on Pull A, Pull B, Full Body 2, 3
--   Biceps            : Cable Curls / Incline DB Curls / EZ Bar Curls
--                       on Pull A, Pull B, Full Body 1, 2
--   Triceps           : Rope Overhead Extension / Tricep Pushdowns
--                       on Push A, Full Body 1
--   Quads             : Bulgarian Split Squat / Leg Extensions (chipper)
--                       on Push A, Push B, Full Body 1, 3
--
-- The DB presses were flagged optional on 2026-08-05; as slot options they are
-- core (optional = false) and go to 4 sets to match their slot.
-- Weights for new options are copied from the same exercise on another day when
-- one exists; Underhand DB Press starts at 50. Anything else shows TBD until
-- first logged (progression_targets.target_weight is NOT NULL, so no row).
--
-- Idempotent. Re-runnable. Single-Leg RDL is intentionally NOT used anywhere.

-- ============================================================
-- 0. Schema + catalog.
-- ============================================================
alter table split_day_exercises
  add column if not exists option_group text;

insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment) values
  ('Underhand DB Press', 'free_weight', 'chest',   'compound',  5),
  ('Tricep Pushdowns',   'cable',       'triceps', 'isolation', 4.5),
  ('EZ Bar Curls',       'free_weight', 'biceps',  'isolation', 5)
on conflict (name) do nothing;

-- ============================================================
-- 1. Existing rows join their slot (core, matching set count).
-- ============================================================
drop table if exists _slot_existing;
create temporary table _slot_existing as
select * from (values
  ('push_a',      'Nautilus PL Incline Bench',          'Upper Chest Press', 4),
  ('push_a',      'DB 45 Degree Incline',               'Upper Chest Press', 4),
  ('push_a',      'Cable Rope Overhead Extension',      'Triceps',           3),
  ('push_a',      'Bulgarian Split Squat',              'Quads',             3),
  ('push_b',      'Nautilus PL Flat Bench',             'Flat Press',        4),
  ('push_b',      'DB Flat Bench',                      'Flat Press',        4),
  ('push_b',      'Nautilus Leg Extensions',            'Quads',             null),
  ('pull_a',      'Nautilus Seated Row V-bar',          'Row',               4),
  ('pull_a',      'Cable Curls',                        'Biceps',            null),
  ('pull_b',      'Nautilus Chest Supported Row High',  'Row',               4),
  ('pull_b',      'Incline DB Curls',                   'Biceps',            3),
  ('pull_b',      'Nautilus Lat Pulldown underhand',    'Vertical Pull',     3),
  ('full_body_1', 'Nautilus PL Incline Bench',          'Upper Chest Press', 4),
  ('full_body_1', 'Pull-up',                            'Vertical Pull',     3),
  ('full_body_1', 'Cable Curls',                        'Biceps',            3),
  ('full_body_1', 'Cable Rope Overhead Extension',      'Triceps',           3),
  ('full_body_1', 'Bulgarian Split Squat',              'Quads',             3),
  ('full_body_2', 'Nautilus PL Flat Bench',             'Flat Press',        4),
  ('full_body_2', 'DB Flat Bench',                      'Flat Press',        4),
  ('full_body_2', 'Nautilus Lat Pulldown overhand',     'Vertical Pull',     3),
  ('full_body_2', 'Nautilus Seated Row V-bar',          'Row',               4),
  ('full_body_2', 'Incline DB Curls',                   'Biceps',            3),
  ('full_body_3', 'Nautilus PL Incline Bench',          'Upper Chest Press', 4),
  ('full_body_3', 'DB 45 Degree Incline',               'Upper Chest Press', 4),
  ('full_body_3', 'Nautilus Lat Pulldown underhand',    'Vertical Pull',     3),
  ('full_body_3', 'Nautilus Chest Supported Row High',  'Row',               4),
  ('full_body_3', 'Nautilus Leg Extensions',            'Quads',             null)
) as t(day_key, exercise, grp, sets);

update split_day_exercises sde
   set option_group = t.grp,
       optional     = false,
       target_sets  = coalesce(t.sets, sde.target_sets)
  from _slot_existing t
  join split_days sd on sd.day_key = t.day_key
                    and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  join exercises e   on e.name = t.exercise
 where sde.split_day_id = sd.id
   and sde.exercise_id  = e.id;

-- Keep the current-week targets' set counts in step with the plan rows.
update progression_targets pt
   set target_sets = t.sets
  from _slot_existing t
  join split_days sd on sd.day_key = t.day_key
                    and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  join exercises e   on e.name = t.exercise
 where t.sets is not null
   and pt.user_id     = sd.user_id
   and pt.split_day_id = sd.id
   and pt.exercise_id  = e.id
   and pt.week_number  = sd.current_week;

drop table if exists _slot_existing;

-- ============================================================
-- 2. New options. sort_order 1000+ keeps them after the anchor row; the app
--    places each slot where its first option sits.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier, optional, option_group)
select sd.id, e.id, v.set_type, v.sets, v.rmin, v.rmax,
       1000 + v.ord, v.note, v.day_key || '_' || v.code, v.intensifier, false, v.grp
from (values
  -- ── PUSH A ──
  ('push_a','Upper Chest Press','Underhand DB Press',               'straight', 4::int, 10::int, 12::int, 1::int, 'ud_db_press', 'Palms toward you on a 30-45° incline. Elbows tucked, control the lowering.'::text, null::text),
  ('push_a','Triceps',          'Tricep Pushdowns',                 'straight', 3, 12, 15, 2, 'pushdown',   null, 'Slow 3s eccentric + squeeze at lockout'),
  ('push_a','Quads',            'Nautilus Leg Extensions',          'chipper',  null, 60, 60, 3, 'leg_ext',    'controlled reps only — no kicking the stack up', 'Slow 3s eccentric + 1s squeeze at top'),
  -- ── PUSH B ──
  ('push_b','Quads',            'Bulgarian Split Squat',            'straight', 3, 8, 10, 1, 'bulgarian',  '/leg. Rear foot elevated on bench. Front shin vertical, drop straight down. Bodyweight to start, add DBs as it gets easy.', null),
  -- ── PULL A ──
  ('pull_a','Row',              'Nautilus Chest Supported Row High','straight', 4, 10, 15, 1, 'cs_row_high', null, null),
  ('pull_a','Biceps',           'Incline DB Curls',                 'straight', 3, 12, 15, 2, 'inc_db_curl', null, 'Slow 3s eccentric (deep stretch)'),
  ('pull_a','Biceps',           'EZ Bar Curls',                     'straight', 3, 10, 12, 3, 'ez_curl',    null, 'Slow 3s eccentric + peak squeeze'),
  -- ── PULL B ──
  ('pull_b','Row',              'Nautilus Seated Row V-bar',        'straight', 4, 10, 12, 1, 'row_vbar',   null, null),
  ('pull_b','Biceps',           'Cable Curls',                      'straight', 3, 12, 15, 2, 'cable_curl', null, 'Slow 3s eccentric + peak squeeze'),
  ('pull_b','Biceps',           'EZ Bar Curls',                     'straight', 3, 10, 12, 3, 'ez_curl',    null, 'Slow 3s eccentric + peak squeeze'),
  ('pull_b','Vertical Pull',    'Nautilus Lat Pulldown overhand',   'straight', 3, 8, 10, 4, 'pd_over',    'or close-grip V-handle for rear delt bias', null),
  ('pull_b','Vertical Pull',    'Pull-up',                          'straight', 3, 5, 10, 5, 'pullup',     'bodyweight (+/- assist)', null),
  -- ── FULL BODY 1 ──
  ('full_body_1','Upper Chest Press','DB 45 Degree Incline',        'straight', 4, 10, 12, 1, 'db_inc',     null, null),
  ('full_body_1','Upper Chest Press','Underhand DB Press',          'straight', 4, 10, 12, 2, 'ud_db_press','Palms toward you on a 30-45° incline. Elbows tucked, control the lowering.', null),
  ('full_body_1','Vertical Pull','Nautilus Lat Pulldown overhand',  'straight', 3, 8, 10, 3, 'pd_over',    'or close-grip V-handle for rear delt bias', null),
  ('full_body_1','Vertical Pull','Nautilus Lat Pulldown underhand', 'straight', 3, 8, 12, 4, 'pd_under',   null, null),
  ('full_body_1','Biceps',      'Incline DB Curls',                 'straight', 3, 12, 15, 5, 'inc_db_curl', null, 'Slow 3s eccentric (deep stretch)'),
  ('full_body_1','Biceps',      'EZ Bar Curls',                     'straight', 3, 10, 12, 6, 'ez_curl',    null, 'Slow 3s eccentric + peak squeeze'),
  ('full_body_1','Triceps',     'Tricep Pushdowns',                 'straight', 3, 12, 15, 7, 'pushdown',   null, 'Slow 3s eccentric + squeeze at lockout'),
  ('full_body_1','Quads',       'Nautilus Leg Extensions',          'chipper',  null, 60, 60, 8, 'leg_ext',    'controlled reps only — no kicking the stack up', 'Slow 3s eccentric + 1s squeeze at top'),
  -- ── FULL BODY 2 ──
  ('full_body_2','Vertical Pull','Pull-up',                         'straight', 3, 5, 10, 1, 'pullup',     'bodyweight (+/- assist)', null),
  ('full_body_2','Vertical Pull','Nautilus Lat Pulldown underhand', 'straight', 3, 8, 12, 2, 'pd_under',   null, null),
  ('full_body_2','Row',         'Nautilus Chest Supported Row High','straight', 4, 10, 15, 3, 'cs_row_high', null, null),
  ('full_body_2','Biceps',      'Cable Curls',                      'straight', 3, 12, 15, 4, 'cable_curl', null, 'Slow 3s eccentric + peak squeeze'),
  ('full_body_2','Biceps',      'EZ Bar Curls',                     'straight', 3, 10, 12, 5, 'ez_curl',    null, 'Slow 3s eccentric + peak squeeze'),
  -- ── FULL BODY 3 ──
  ('full_body_3','Upper Chest Press','Underhand DB Press',          'straight', 4, 10, 12, 1, 'ud_db_press','Palms toward you on a 30-45° incline. Elbows tucked, control the lowering.', null),
  ('full_body_3','Vertical Pull','Nautilus Lat Pulldown overhand',  'straight', 3, 8, 10, 2, 'pd_over',    'or close-grip V-handle for rear delt bias', null),
  ('full_body_3','Vertical Pull','Pull-up',                         'straight', 3, 5, 10, 3, 'pullup',     'bodyweight (+/- assist)', null),
  ('full_body_3','Row',         'Nautilus Seated Row V-bar',        'straight', 4, 10, 12, 4, 'row_vbar',   null, null),
  ('full_body_3','Quads',       'Bulgarian Split Squat',            'straight', 3, 8, 10, 5, 'bulgarian',  '/leg. Rear foot elevated on bench. Front shin vertical, drop straight down. Bodyweight to start, add DBs as it gets easy.', null)
) as v(day_key, grp, exercise, set_type, sets, rmin, rmax, ord, code, note, intensifier)
join split_days sd on sd.day_key = v.day_key
                  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
join exercises e  on e.name = v.exercise
where not exists (
  select 1 from split_day_exercises x
   where x.split_day_id = sd.id and x.exercise_id = e.id
)
on conflict (split_day_id, short_id) do nothing;

-- ============================================================
-- 3. Weights for new options.
--    3a. Underhand DB Press starts at 50 lb everywhere it appears.
--    3b. Everything else copies the same exercise's current target from
--        another day, if there is one (otherwise it stays TBD).
-- ============================================================
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
select sd.user_id, sde.exercise_id, sd.id, sd.current_week, 1,
       50, sde.target_sets, sde.target_reps_min, sde.target_reps_max,
       2, sde.set_type, 'options'
from split_day_exercises sde
join split_days sd on sd.id = sde.split_day_id
join exercises e   on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and e.name = 'Underhand DB Press'
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;

insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
select sd.user_id, sde.exercise_id, sd.id, sd.current_week, 1,
       src.target_weight, sde.target_sets, sde.target_reps_min, sde.target_reps_max,
       2, sde.set_type, 'options'
from split_day_exercises sde
join split_days sd on sd.id = sde.split_day_id
join lateral (
  select pt.target_weight
  from progression_targets pt
  join split_days sd2 on sd2.id = pt.split_day_id
  where pt.exercise_id = sde.exercise_id
    and pt.user_id     = sd.user_id
    and sd2.id        <> sd.id
    and pt.week_number = sd2.current_week
  order by pt.created_at desc
  limit 1
) src on true
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sde.option_group is not null
  and sde.sort_order >= 1000
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;

-- ============================================================
-- 4. Verification — every slot, with its options.
-- ============================================================
select
  sd.day_key,
  sde.option_group as slot,
  e.name           as option,
  sde.set_type,
  sde.target_sets  as sets,
  pt.target_weight as weight
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
left join progression_targets pt
       on pt.split_day_id = sd.id and pt.exercise_id = e.id
      and pt.week_number = sd.current_week and pt.mesocycle = 1
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sde.option_group is not null
order by sd.sort_order, sde.option_group, sde.sort_order;
