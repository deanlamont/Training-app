-- 2026-08-25 — Close the 3-day hamstring gap: add the RDL to Full Body 1.
--
-- WHY: the 2026-08-07 rebalance audited the 4-day split against the weekly
-- set targets in src/utils/weeklyVolume.js and found hamstrings at 3 sets
-- against a target of 6 — one hinge, on Pull A. It fixed that for the 4-day
-- (and the 2026-08-24 swap kept it at 6, trading Pull B's Single-Leg RDL for
-- the barbell version). It never touched the 3-day, which still runs a single
-- hinge on Full Body 2 and so sits at 3 sets against the same target.
--
-- Full Body 1 is the day to carry the second one:
--   * Its only lower-body work is the Bulgarian Split Squat — knee-dominant,
--     so the day has no posterior-chain work at all. Full Body 3 also has a
--     Bulgarian, but already runs 29 sets to Full Body 1's 23.
--   * 23 -> 26 sets puts Full Body 1 on the ~26 the rebalance held the other
--     sessions to, rather than pushing an already-long session longer.
--   * Spacing the two hinges across Full Body 1 and 2 mirrors the 4-day,
--     where they sit on Pull A and Pull B.
--
-- Barbell RDL rather than the unilateral version, matching every other hinge
-- in the program: 3 x 8, same as Pull A, Pull B and Full Body 2. It goes in
-- ahead of the Bulgarian — the loaded hinge wants the fresher back, and it is
-- the same order Pull A uses.
--
-- Starting weight is copied from the most recent RDL target on another day so
-- the row does not come up TBD. From then on the app's forward-sync keeps all
-- four instances on one weight.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. Add Romanian Deadlift at slot 8, Bulgarian Split Squat
--    shifts to 9.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier, optional)
select sd.id, e.id, 'straight', 3, 8, 8, 8, null, 'fb1_rdl', null::text, false
from split_days sd
join exercises e on e.name = 'Romanian Deadlift'
where sd.day_key = 'full_body_1'
  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
on conflict (split_day_id, short_id) do nothing;

update split_day_exercises sde
   set sort_order = 9
  from split_days sd, exercises e
 where sde.split_day_id = sd.id
   and sde.exercise_id  = e.id
   and sd.day_key = 'full_body_1'
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and e.name = 'Bulgarian Split Squat';

-- ============================================================
-- 2. Seed the weight from the RDL's current target elsewhere.
-- ============================================================
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
select
  sd.user_id, sde.exercise_id, sd.id, sd.current_week, 1,
  src.target_weight, sde.target_sets, sde.target_reps_min, sde.target_reps_max,
  2, sde.set_type, 'fb1_hinge'
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
  and sd.day_key = 'full_body_1'
  and sde.short_id = 'fb1_rdl'
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;

-- ============================================================
-- 3. Subtitle now covers both halves of the leg work.
-- ============================================================
update split_days
   set subtitle = 'Incline · Vertical Pull · Legs'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and day_key = 'full_body_1';

-- ============================================================
-- 4. Verification — Full Body 1 as it now stands, then weekly
--    hamstring sets per split.
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
  and sd.day_key = 'full_body_1'
order by sde.sort_order;

select
  case when sd.day_key like 'full_body%' then '3-day' else '4-day' end as split,
  sum(sde.target_sets) as hamstring_sets_per_week
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a','push_b','pull_a','pull_b',
                     'full_body_1','full_body_2','full_body_3')
  and e.muscle_group = 'hamstrings'
group by 1;
