-- 2026-08-24 — Pull B: swap Single-Leg RDL for the barbell Romanian Deadlift.
--
-- WHY: user request. Single-Leg RDL landed on Pull B two weeks ago in the
-- 2026-08-07 rebalance, which added it (rather than a second barbell hinge)
-- to close a hamstring volume gap — 3 sets/wk against a 8-10 target. The
-- hamstring sets are unchanged by this swap; what changes is the loading.
-- The barbell RDL carries far more systemic and lower-back load than the
-- unilateral version, and Pull A already runs 3 × 8 of it, so the week now
-- holds two heavy hinges instead of one heavy and one light. Watch lower-back
-- recovery between the two pull days; if it stacks up, dropping Pull B to
-- 2 sets or moving it to a rep range above 10 is the first lever.
--
-- Sets, slot and rep scheme match the Pull A instance (3 × 8, sort_order 5).
-- Starting weight is copied from the most recent RDL target on another day so
-- the row doesn't come up TBD — the user can correct it in the app.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. Remove Single-Leg RDL from Pull B, its progression target
--    with it. The exercise stays in the master catalog.
-- ============================================================
with targets as (
  select sd.id as split_day_id, e.id as exercise_id
  from split_days sd
  join split_day_exercises sde on sde.split_day_id = sd.id
  join exercises e            on e.id = sde.exercise_id
  where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
    and sd.day_key = 'pull_b'
    and e.name     = 'Single-Leg RDL'
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
-- 2. Add Romanian Deadlift in the slot it vacated.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier, optional)
select sd.id, e.id, 'straight', 3, 8, 8, 5, null, 'plb_rdl', null::text, false
from split_days sd
join exercises e on e.name = 'Romanian Deadlift'
where sd.day_key = 'pull_b'
  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
on conflict (split_day_id, short_id) do nothing;

-- ============================================================
-- 3. Seed the weight from the RDL's current target on another day.
-- ============================================================
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
select
  sd.user_id, sde.exercise_id, sd.id, sd.current_week, 1,
  src.target_weight, sde.target_sets, sde.target_reps_min, sde.target_reps_max,
  2, sde.set_type, 'pull_b_rdl_swap'
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
  and sd.day_key = 'pull_b'
  and sde.short_id = 'plb_rdl'
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;

-- ============================================================
-- 4. Verification — Pull B as it now stands.
-- ============================================================
select
  sde.sort_order as ex_no,
  e.name         as exercise,
  e.muscle_group,
  sde.set_type,
  sde.target_sets as sets,
  sde.target_reps_min as rep_min,
  sde.target_reps_max as rep_max
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key = 'pull_b'
order by sde.sort_order;
