-- 2026-09-06 — Chest fly onto Push A, replacing the second dip day.
--
-- WHY: Dips with Knee Raise ran on BOTH push days. Since the 2026-08-07 tag
-- fix it counts as chest, so the two push days were four pressing movements
-- plus the same lower-chest compound twice — no stretch-position isolation
-- anywhere in the week. Push A loses the dip and gains the Arsenal Fly
-- Machine; Push B keeps it.
--
-- Push A is chosen over Push B for two reasons:
--   * Region spread. Push A is incline-biased (PL Incline + DB 45 Incline), so
--     a fly there covers the mid-chest stretch the inclines miss, while Push B
--     keeps flat pressing + dips for the mid-to-lower spread.
--   * Tricep balance. Push A carries the only direct tricep work in the split
--     (Cable Rope Overhead Extension). Pulling the dip off Push A and leaving
--     it on Push B — which has no direct tricep work — splits tricep loading
--     evenly across the two days instead of stacking it on one.
--
-- Chest set count is unchanged at 14/wk core (target 12): 3 fly sets replace
-- 3 dip sets one-for-one. Nothing else in the split moves — both pull-day
-- hinges (Romanian Deadlift on Pull A, Single-Leg RDL on Pull B) stay as they
-- are, so hamstrings hold at 6 sets/wk.
--
-- The fly starts with no weight target — the app renders that as TBD and the
-- coach fills it after the first session, same as Single-Leg RDL did in the
-- 2026-08-07 rebalance.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. Remove Dips from push_a, with its progression targets.
--    Scoped to the (day, exercise) pair — Dips stays on push_b and
--    on full_body_2, and keeps its targets there.
-- ============================================================
with targets as (
  select sd.id as split_day_id, e.id as exercise_id
  from split_days sd
  join exercises e on e.name = 'Dips with Knee Raise'
  where sd.day_key = 'push_a'
    and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
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
-- 2. Add the fly in the slot the dip held (push_a #5). The Arsenal
--    Fly Machine is already in the catalog (2.5lb selectorized
--    increment) — no new exercise row needed.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier, optional)
select sd.id, e.id, 'straight', 3, 12, 15, 5, null, 'pa_fly',
       'Slow 3s eccentric + peak squeeze', false
from split_days sd
join exercises e on e.name = 'Arsenal Fly Machine'
where sd.day_key = 'push_a'
  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
on conflict (split_day_id, short_id) do nothing;

-- ============================================================
-- 3. Verification — final push_a roster.
-- ============================================================
select
  sd.day_key,
  sde.sort_order as ex_no,
  e.name         as exercise,
  e.muscle_group,
  sde.set_type,
  sde.optional,
  sde.target_sets as sets,
  sde.target_reps_min || '-' || sde.target_reps_max as reps
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b')
order by sd.sort_order, sde.sort_order;
