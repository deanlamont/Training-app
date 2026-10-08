-- 2026-10-08 — Trim the 3-day Full Body sessions to ~70-85 minutes.
--
-- WHY: Each day ran 8-9 exercises / 26 sets (29 with optionals) plus a 50-rep
-- chipper, which lands at roughly 95-110 minutes. Target is 1-1.5 hours.
--
-- NEW SHAPE: 6-7 exercises and 20-22 working sets per day, with three
-- non-competing superset pairs. Weekly chest stays ~12 sets (4+4+4).
--
--   FB1 (20): PL Incline 4, Pull-up 3, Bulgarian 3, Lateral Raises 4,
--             SS Cable Curls 3 + Rope OH Ext 3
--   FB2 (21 + chipper): PL Flat 4, Seated Row V-bar 4, RDL 3,
--             SS Lateral Raises 4 + Face Pulls 3, Incline DB Curls 3,
--             Hip Thrust chipper (finisher)
--   FB3 (22): DB 45 Incline 4 (now core), Pulldown underhand 3,
--             Chest Supported Row High 3, Seated Press 3, Bulgarian 3,
--             SS Face Pulls 3 + Rope OH Ext 3
--
-- CUT: FB1 Seated Press + Face Pulls; FB2 DB Flat Bench (optional), Dips,
-- Chabbles; FB3 PL Incline Bench + Lateral Raises. Seated Press is now once a
-- week (shoulder is coming off a deload; incline/flat already load front delts).
-- Chabbles moves out of the gym sessions (4-day pull days are untouched).
--
-- Weights are not changed. Only touches full_body_1/2/3. Idempotent.

-- ============================================================
-- 1. Remove exercises (and their targets for that day only).
-- ============================================================
with removals(day_key, short_id) as (
  values
    ('full_body_1', 'fb1_seat_pr'),
    ('full_body_1', 'fb1_fp'),
    ('full_body_2', 'fb2_db_flat'),
    ('full_body_2', 'fb2_dips'),
    ('full_body_2', 'fb2_chabbles'),
    ('full_body_3', 'fb3_pl_inc'),
    ('full_body_3', 'fb3_lat_r')
),
targets as (
  select sde.split_day_id, sde.exercise_id, sde.id as sde_id
  from removals r
  join split_days sd on sd.day_key = r.day_key
                    and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  join split_day_exercises sde on sde.split_day_id = sd.id and sde.short_id = r.short_id
),
del_pt as (
  delete from progression_targets pt
   using targets t
   where pt.split_day_id = t.split_day_id
     and pt.exercise_id  = t.exercise_id
  returning 1
)
delete from split_day_exercises sde
 using targets t
 where sde.id = t.sde_id;

-- ============================================================
-- 2. Add Face Pulls to Full Body 2 (superset with Lateral Raises).
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, short_id, set_type, target_sets,
   target_reps_min, target_reps_max, sort_order, note, intensifier, optional)
select sd.id, e.id, 'fb2_fp', 'straight', 3, 15, 20, 50, null,
       '1s pause + squeeze at peak', false
from split_days sd
join exercises e on e.name = 'Cable Face Pulls'
where sd.day_key = 'full_body_2'
  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
on conflict (split_day_id, short_id) do nothing;

-- Seed its weight from the same lift on another day (Face Pulls ~44).
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
select sd.user_id, sde.exercise_id, sd.id, sd.current_week, 1,
       src.target_weight, 3, 15, 20, 1, 'straight', 'trim'
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
  and sde.short_id = 'fb2_fp'
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;

-- ============================================================
-- 3. Final sets, order, optional flag and superset notes.
-- ============================================================
update split_day_exercises sde
   set target_sets = p.sets,
       sort_order  = p.ord,
       optional    = false,
       note        = coalesce(p.note, sde.note)
from (values
    -- FULL BODY 1 (20 sets)
    ('full_body_1', 'fb1_inc',     4, 1, null::text),
    ('full_body_1', 'fb1_pullup',  3, 2, null),
    ('full_body_1', 'fb1_bulg',    3, 3, null),
    ('full_body_1', 'fb1_lat_r',   4, 4, null),
    ('full_body_1', 'fb1_cc',      3, 5, 'Superset A1 with Rope Overhead Extension'),
    ('full_body_1', 'fb1_rope_oh', 3, 6, 'Superset A2 with Cable Curls'),
    -- FULL BODY 2 (21 sets + chipper)
    ('full_body_2', 'fb2_flat',     4, 1, null),
    ('full_body_2', 'fb2_row_vbar', 4, 2, null),
    ('full_body_2', 'fb2_rdl',      3, 3, null),
    ('full_body_2', 'fb2_lat_r',    4, 4, 'Superset A1 with Face Pulls'),
    ('full_body_2', 'fb2_fp',       3, 5, 'Superset A2 with Lateral Raises'),
    ('full_body_2', 'fb2_inc_curl', 3, 6, null),
    -- FULL BODY 3 (22 sets)
    ('full_body_3', 'fb3_db_inc',   4, 1, null),
    ('full_body_3', 'fb3_pd_under', 3, 2, null),
    ('full_body_3', 'fb3_row_high', 3, 3, null),
    ('full_body_3', 'fb3_seat_pr',  3, 4, null),
    ('full_body_3', 'fb3_bulg',     3, 5, null),
    ('full_body_3', 'fb3_fp',       3, 6, 'Superset A1 with Rope Overhead Extension'),
    ('full_body_3', 'fb3_rope_oh',  3, 7, 'Superset A2 with Face Pulls. Slow 3s eccentric (long-head stretch)')
  ) as p(day_key, short_id, sets, ord, note)
join split_days sd on sd.day_key = p.day_key
                  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
where sde.split_day_id = sd.id
  and sde.short_id = p.short_id;

-- Hip Thrust chipper closes Full Body 2 (target_sets stays null).
update split_day_exercises sde
   set sort_order = 7, optional = false
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.day_key = 'full_body_2'
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sde.short_id = 'fb2_thrust';

-- Keep targets' set counts in step with the rows whose sets changed.
update progression_targets pt
   set target_sets = sde.target_sets
  from split_day_exercises sde
  join split_days sd on sd.id = sde.split_day_id
 where pt.split_day_id = sde.split_day_id
   and pt.exercise_id  = sde.exercise_id
   and pt.week_number  = sd.current_week
   and sd.day_key in ('full_body_1', 'full_body_2', 'full_body_3')
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sde.target_sets is not null;

-- ============================================================
-- 4. Subtitles.
-- ============================================================
update split_days set subtitle = 'Incline · Vertical Pull · Quads'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and day_key = 'full_body_1';
update split_days set subtitle = 'Flat · Horizontal Pull · Posterior Chain'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and day_key = 'full_body_2';
update split_days set subtitle = 'DB Chest · Full Back · Quads'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com') and day_key = 'full_body_3';

-- ============================================================
-- 5. Verification.
-- ============================================================
select sd.day_key, sde.sort_order as ex_no, e.name as exercise,
       sde.set_type, sde.optional, sde.target_sets as sets, sde.note
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('full_body_1','full_body_2','full_body_3')
order by sd.sort_order, sde.sort_order;
