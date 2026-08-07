-- 2026-08-07 — Volume rebalance across the 4-day push/pull and 3-day full body.
--
-- WHY: Audit against per-muscle weekly set targets (chest 12, back 16, side
-- delts 12, rear delts 8, biceps 8, triceps 6) found three problems in the
-- 4-day plan and three in the 3-day plan.
--
-- 4-DAY:
--   * Biceps ~16 sets/wk across 4 curl exercises — Cable Curls ran on BOTH
--     pull days (chipper on A, straight on B). Cut Hammer Curls (A) and
--     Cable Curls (B) → ~9.
--   * Triceps ~12 — Cable Rope Overhead Extension sat on top of Dips, 8 chest
--     press sets and 6 overhead press sets. Cut from Push B, kept on Push A
--     (3 sets) so the long head still gets a stretched-position movement.
--   * Side delts 6 vs 12 target. Lateral Raises 3 → 6 per push day.
--   * Nautilus Leg Extensions cut from both push days. This exercise was
--     removed on 2026-05-27 and again on 2026-06-09 (machine isolation drove
--     quad dominance → glute inhibition → calf overcompensation in tennis),
--     then re-entered via the 2026-07-01 leg press swap. Removing it again.
--   * Hamstrings had 3 sets (RDL on Pull A only). Added Single-Leg RDL to
--     Pull B — already in the catalog from the June tennis rebuild, and far
--     less systemic load than a second barbell hinge.
--   * Horizontal rowing 6 → 8 (both rows 3 → 4 sets).
--
-- 3-DAY:
--   * full_body_3 had NO non-optional chest press — its only chest movement
--     was DB 45 Degree Incline, which the 2026-08-05 optional migration
--     flagged. Added Nautilus PL Incline Bench as the core press so the DB
--     is a true alternate for it.
--   * Side delts 3 sets/wk on one day → Lateral Raises on all three (4 each).
--   * full_body_1 carried two vertical pulls (Pull-up + Lat Pulldown
--     overhand). Dropped the pulldown; Pull-up covers the pattern and
--     full_body_3 has the underhand pulldown.
--   * Cut Leg Extensions (same reason as above), Hammer Curls and Lateral
--     Band Walks from full_body_3 to hold sessions near 26 sets.
--
-- TAG FIXES: Dips with Knee Raise was muscle_group 'triceps' — it is a chest
-- compound, and the mistag made chest look starved and triceps look fine when
-- the reverse was true. Romanian Deadlift was 'back' — it is hamstrings, and
-- was inflating back volume while hiding a hamstring gap. Both corrupt every
-- volume rollup, so they are fixed here.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 0. Master-table tag corrections.
-- ============================================================
update exercises set muscle_group = 'chest'      where name = 'Dips with Knee Raise';
update exercises set muscle_group = 'hamstrings' where name = 'Romanian Deadlift';

-- ============================================================
-- 1. Remove exercises. progression_targets go too, but only for
--    the (day, exercise) pairs being dropped — the same exercise
--    on another day keeps its target.
-- ============================================================
with removals(day_key, exercise) as (
  values
    ('push_a',      'Nautilus Leg Extensions'),
    ('push_b',      'Nautilus Leg Extensions'),
    ('push_b',      'Cable Rope Overhead Extension'),
    ('pull_a',      'Hammer Curls'),
    ('pull_b',      'Cable Curls'),
    ('full_body_1', 'Nautilus Leg Extensions'),
    ('full_body_1', 'Nautilus Lat Pulldown overhand'),
    ('full_body_3', 'Hammer Curls'),
    ('full_body_3', 'Lateral Band Walks')
),
targets as (
  select sd.id as split_day_id, e.id as exercise_id
  from removals r
  join split_days sd on sd.day_key = r.day_key
                    and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  join exercises e  on e.name = r.exercise
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
 where sde.split_day_id = t.split_day_id
   and sde.exercise_id  = t.exercise_id;

-- ============================================================
-- 2. Add exercises.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier, optional)
select sd.id, e.id, a.set_type, a.sets, a.rep_min, a.rep_max,
       a.sort_order, a.note, a.short_id, a.intensifier, false
from (values
    ('pull_b',      'Single-Leg RDL',            'straight', 3, 8,  10, 90, '/side', 'plb_sl_rdl',  null::text),
    ('full_body_1', 'Arsenal Lateral Raises',    'straight', 4, 12, 15, 91, null,    'fb1_lat_r',   null::text),
    ('full_body_3', 'Nautilus PL Incline Bench', 'straight', 4, 8,  10, 92, null,    'fb3_pl_inc',  null::text),
    ('full_body_3', 'Arsenal Lateral Raises',    'straight', 4, 12, 15, 93, null,    'fb3_lat_r',   null::text)
  ) as a(day_key, exercise, set_type, sets, rep_min, rep_max, sort_order, note, short_id, intensifier)
join split_days sd on sd.day_key = a.day_key
                  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
join exercises e  on e.name = a.exercise
on conflict (split_day_id, short_id) do nothing;

-- ============================================================
-- 3. Seed weights for the new rows by copying the same exercise's
--    current target from a day that already has one. Single-Leg RDL
--    is new to the plan and stays TBD (the app renders null as TBD).
-- ============================================================
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
select
  sd.user_id, sde.exercise_id, sd.id, sd.current_week, 1,
  src.target_weight, sde.target_sets, sde.target_reps_min, sde.target_reps_max,
  2, sde.set_type, 'rebalance'
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
  and sde.short_id in ('fb1_lat_r', 'fb3_pl_inc', 'fb3_lat_r')
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;

-- ============================================================
-- 4. Set final sets + ordering for every affected day.
-- ============================================================
update split_day_exercises sde
   set target_sets = p.sets,
       sort_order  = p.ord
from (values
    -- PUSH A  (19 core sets)
    ('push_a', 'Nautilus PL Incline Bench',      4, 1),
    ('push_a', 'DB 45 Degree Incline',           3, 2),
    ('push_a', 'Nautilus PL Seated Press',       3, 3),
    ('push_a', 'Arsenal Lateral Raises',         6, 4),
    ('push_a', 'Dips with Knee Raise',           3, 5),
    ('push_a', 'Cable Rope Overhead Extension',  3, 6),
    ('push_a', 'Bulgarian Split Squat',          3, 7),
    -- PUSH B  (19 core sets)
    ('push_b', 'Nautilus PL Flat Bench',         4, 1),
    ('push_b', 'DB Flat Bench',                  3, 2),
    ('push_b', 'Nautilus PL Seated Press',       3, 3),
    ('push_b', 'Arsenal Lateral Raises',         6, 4),
    ('push_b', 'Dips with Knee Raise',           3, 5),
    ('push_b', 'Bulgarian Split Squat',          3, 6),
    -- PULL A
    ('pull_a', 'Pull-up',                        3, 1),
    ('pull_a', 'Nautilus Lat Pulldown overhand', 3, 2),
    ('pull_a', 'Nautilus Seated Row V-bar',      4, 3),
    ('pull_a', 'Cable Face Pulls',               3, 4),
    ('pull_a', 'Romanian Deadlift',              3, 6),
    ('pull_a', 'Chabbles Workout',               3, 7),
    -- PULL B
    ('pull_b', 'Nautilus Lat Pulldown underhand',   3, 1),
    ('pull_b', 'Nautilus Chest Supported Row High', 4, 2),
    ('pull_b', 'Cable Face Pulls',                  3, 3),
    ('pull_b', 'Incline DB Curls',                  3, 4),
    ('pull_b', 'Single-Leg RDL',                    3, 5),
    ('pull_b', 'Lateral Band Walks',                3, 7),
    ('pull_b', 'Chabbles Workout',                  3, 8),
    -- FULL BODY 1
    ('full_body_1', 'Nautilus PL Incline Bench',     4, 1),
    ('full_body_1', 'Pull-up',                       3, 2),
    ('full_body_1', 'Nautilus PL Seated Press',      3, 3),
    ('full_body_1', 'Arsenal Lateral Raises',        4, 4),
    ('full_body_1', 'Cable Face Pulls',              3, 5),
    ('full_body_1', 'Cable Curls',                   3, 6),
    ('full_body_1', 'Cable Rope Overhead Extension', 3, 7),
    ('full_body_1', 'Bulgarian Split Squat',         3, 8),
    -- FULL BODY 2
    ('full_body_2', 'Nautilus PL Flat Bench',    4, 1),
    ('full_body_2', 'DB Flat Bench',             3, 2),
    ('full_body_2', 'Nautilus Seated Row V-bar', 3, 3),
    ('full_body_2', 'Arsenal Lateral Raises',    4, 4),
    ('full_body_2', 'Incline DB Curls',          3, 5),
    ('full_body_2', 'Dips with Knee Raise',      3, 6),
    ('full_body_2', 'Romanian Deadlift',         3, 7),
    ('full_body_2', 'Chabbles Workout',          3, 9),
    -- FULL BODY 3
    ('full_body_3', 'Nautilus PL Incline Bench',       4, 1),
    ('full_body_3', 'DB 45 Degree Incline',            3, 2),
    ('full_body_3', 'Nautilus Lat Pulldown underhand', 3, 3),
    ('full_body_3', 'Nautilus Chest Supported Row High', 3, 4),
    ('full_body_3', 'Nautilus PL Seated Press',        3, 5),
    ('full_body_3', 'Arsenal Lateral Raises',          4, 6),
    ('full_body_3', 'Cable Face Pulls',                3, 7),
    ('full_body_3', 'Cable Rope Overhead Extension',   3, 8),
    ('full_body_3', 'Bulgarian Split Squat',           3, 9)
  ) as p(day_key, exercise, sets, ord)
join split_days sd on sd.day_key = p.day_key
                  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
join exercises e  on e.name = p.exercise
where sde.split_day_id = sd.id
  and sde.exercise_id  = e.id;

-- Chipper rows keep target_sets null (the rep target lives in min/max) and are
-- ordered around the straight sets above.
update split_day_exercises sde
   set sort_order = p.ord
from (values
    ('pull_a',      'Cable Curls', 5),
    ('pull_b',      'Hip Thrust',  6),
    ('full_body_2', 'Hip Thrust',  8)
  ) as p(day_key, exercise, ord)
join split_days sd on sd.day_key = p.day_key
                  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
join exercises e  on e.name = p.exercise
where sde.split_day_id = sd.id
  and sde.exercise_id  = e.id
  and sde.set_type = 'chipper';

-- ============================================================
-- 5. Verification — final plan for both splits.
-- ============================================================
select
  sd.day_key,
  sde.sort_order as ex_no,
  e.name         as exercise,
  e.muscle_group,
  sde.set_type,
  sde.optional,
  sde.target_sets as sets
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a','push_b','pull_a','pull_b',
                     'full_body_1','full_body_2','full_body_3')
order by sd.sort_order, sde.sort_order;
