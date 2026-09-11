-- 2026-09-11 — Second shoulder press option on both push days (Arnold Press).
--
-- WHY: The Nautilus PL Seated Press aggravates an already-sore shoulder. Rather
-- than drop vertical pressing (front delts still need the pattern, and the
-- machine is fine on good days), each push day now carries TWO presses and you
-- pick one per session based on how the shoulder feels that day:
--
--   * Nautilus PL Seated Press — the machine. Fixed path, heavier load.
--   * Arnold Press             — dumbbells, starting at 35lb. Starts palms-in
--                                (neutral) at chin height and rotates out as
--                                you press, so the shoulder is never pinned in
--                                a fixed groove. That neutral start is what
--                                usually makes it tolerable when the machine
--                                is not.
--
-- BOTH are marked `optional`, which is what makes the choice real: an optional
-- exercise stays in the plan but does not gate session completion (see the
-- 2026-08-05 migration), so skipping whichever one you did not pick still
-- reads as a full day and progression.js holds its weight rather than letting
-- it drift. The tradeoff is that a day with NEITHER press also reads complete —
-- accepted deliberately: the pain call is yours to make, not the app's.
--
-- Weekly overhead volume is unchanged (3 sets per push day, 6/week — the
-- weeklyVolume.js 'shoulders' target), since only one of the two is done.
--
-- Arnold Press is push-day only; the 3-day full-body split is untouched.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 1. Master catalog.
--    free_weight / 'shoulders' (front-delt press, same as the other overhead
--    presses — see the 2026-08-07 side-delt tag split), 5lb DB increments.
-- ============================================================
insert into exercises (name, equipment_category, muscle_group, movement_type, weight_increment)
values ('Arnold Press', 'free_weight', 'shoulders', 'compound', 5)
on conflict (name) do nothing;

-- ============================================================
-- 2. Make room directly after the seated press on each push day.
--    Skipped once Arnold Press is already on the day, so re-runs don't
--    keep pushing everything down.
-- ============================================================
with anchor as (
  select sd.id as split_day_id, sde.sort_order as anchor_order
  from split_days sd
  join split_day_exercises sde on sde.split_day_id = sd.id
  join exercises e            on e.id = sde.exercise_id
  where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
    and sd.day_key in ('push_a', 'push_b')
    and e.name = 'Nautilus PL Seated Press'
    and not exists (
      select 1
      from split_day_exercises sde2
      join exercises e2 on e2.id = sde2.exercise_id
      where sde2.split_day_id = sd.id
        and e2.name = 'Arnold Press'
    )
)
update split_day_exercises sde
   set sort_order = sde.sort_order + 1
  from anchor a
 where sde.split_day_id = a.split_day_id
   and sde.sort_order   > a.anchor_order;

-- ============================================================
-- 3. Add the Arnold Press row to Push A and Push B.
--    3 sets of 10-12 — a 35lb dumbbell press runs higher reps than the
--    machine, and the lighter top end is the point on a sore shoulder.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier, optional)
select sd.id, e.id, 'straight', 3, 10, 12, anchor.anchor_order + 1, a.note, a.short_id, null, true
from (values
    ('push_a', 'pa_arnold', ' · alternate to the Seated Press — do one or the other. Palms in at chin height, rotate out as you press. Stop short of pain.'),
    ('push_b', 'pb_arnold', ' · alternate to the Seated Press — do one or the other. Palms in at chin height, rotate out as you press. Stop short of pain.')
  ) as a(day_key, short_id, note)
join split_days sd on sd.day_key = a.day_key
                  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
join exercises e  on e.name = 'Arnold Press'
join lateral (
  select sde.sort_order as anchor_order
  from split_day_exercises sde
  join exercises e2 on e2.id = sde.exercise_id
  where sde.split_day_id = sd.id
    and e2.name = 'Nautilus PL Seated Press'
  limit 1
) anchor on true
on conflict (split_day_id, short_id) do nothing;

-- Keep the ordering correct even on a re-run (or if the seated press moved).
update split_day_exercises sde
   set sort_order = anchor.anchor_order + 1
  from split_days sd,
       exercises e,
       lateral (
         select sde2.sort_order as anchor_order
         from split_day_exercises sde2
         join exercises e2 on e2.id = sde2.exercise_id
         where sde2.split_day_id = sd.id
           and e2.name = 'Nautilus PL Seated Press'
         limit 1
       ) anchor
 where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_a', 'push_b')
   and sde.split_day_id = sd.id
   and e.id = sde.exercise_id
   and e.name = 'Arnold Press';

-- ============================================================
-- 4. Starting weight: 35lb per dumbbell, on both push days.
--    Claude/progression takes over from here after the first logged session.
-- ============================================================
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max,
   target_rir, set_type, source)
select sd.user_id, sde.exercise_id, sd.id, sd.current_week, 1,
       35, sde.target_sets, sde.target_reps_min, sde.target_reps_max,
       2, sde.set_type, 'arnold_press_alternate'
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b')
  and e.name = 'Arnold Press'
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;

-- ============================================================
-- 5. The machine press becomes optional too — otherwise skipping it on a
--    sore day leaves the session reading incomplete, which is exactly the
--    friction this migration removes. Its note points at the alternate.
-- ============================================================
update split_day_exercises sde
   set optional = true,
       note = case
                when coalesce(sde.note, '') like '%Arnold%' then sde.note
                else coalesce(sde.note, '') || ' · or swap for the Arnold Press'
              end
from split_days sd, exercises e
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b')
  and sde.split_day_id = sd.id
  and e.id = sde.exercise_id
  and e.name = 'Nautilus PL Seated Press';

-- ============================================================
-- 6. Verification — both push days, with the two presses adjacent and both
--    flagged optional, and the Arnold Press sitting at 35lb.
-- ============================================================
select
  sd.day_key,
  sde.sort_order      as ex_no,
  e.name              as exercise,
  e.muscle_group,
  sde.set_type,
  sde.target_sets     as sets,
  sde.target_reps_min as rep_min,
  sde.target_reps_max as rep_max,
  sde.optional,
  pt.target_weight    as weight,
  sde.note
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
left join progression_targets pt
       on pt.split_day_id = sd.id
      and pt.exercise_id  = sde.exercise_id
      and pt.week_number  = sd.current_week
      and pt.mesocycle    = 1
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b')
order by sd.sort_order, sde.sort_order;
