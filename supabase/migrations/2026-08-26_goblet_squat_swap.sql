-- 2026-08-26: Swap Bulgarian Split Squat -> Goblet Squat on Push B + Full Body 3.
--
-- WHY: Bulgarian Split Squat ran TWICE a week in both splits — Push A + Push B
-- in the 4-day, Full Body 1 + Full Body 3 in the 3-day. That is a lot of
-- unilateral, balance-limited work for a pattern where the limiting factor is
-- usually the standing leg's stabilisers rather than the quads. Each split now
-- keeps ONE Bulgarian day (Push A / Full Body 1) and gets one bilateral squat
-- day (Push B / Full Body 3).
--
-- Goblet Squat — kettlebell or DB held at the chest — rather than the
-- Bodybuilder Squat Machine that used to sit in the Push B slot: the
-- 2026-06-09 tennis rebuild dropped that machine because machine isolation was
-- driving quad dominance -> glute inhibition -> calf overcompensation on court.
-- A goblet squat is free-weight and self-limiting, so it restores the bilateral
-- pattern without reintroducing that problem. It was already added to the
-- exercise master by the same June rebuild but never assigned to a day.
--
-- Reps go 8 -> 12-15 with a paused bottom position. A KB at the chest caps out
-- on load long before a barbell would, so reps and time under tension have to
-- carry the stimulus. Sets stay at 3 on both days, so weekly quad volume and
-- Push B's 19 core sets are unchanged.
--
-- Implemented as in-place exercise_id swaps on the existing
-- split_day_exercises rows (preserves sort_order and optional flag), matching
-- the 2026-07-01 lunge/leg-press swap. The old progression_targets rows are
-- DELETED rather than repointed: their weight is a per-side DB load for a
-- split squat and means nothing for a two-handed KB at the chest. The app
-- renders a missing target as TBD — log the KB actually used on the first
-- session and normal progression takes over from there.
--
-- set_logs is untouched — historical sessions keep referencing the exercise
-- that was actually logged at the time.
--
-- Idempotent. Re-runnable.

-- ============================================================
-- 0. Kettlebells step in ~10lb jumps (16 -> 20 -> 24kg), not the 5lb
--    default the June rebuild seeded. progression.js adds this increment
--    on a successful week, so a 5lb bump would suggest a bell that
--    doesn't exist on the rack.
-- ============================================================
update exercises set weight_increment = 10 where name = 'Goblet Squat';

-- ============================================================
-- 1. Drop the outgoing progression targets (per-side DB load — not
--    transferable to a goblet). Must run BEFORE the exercise_id swap
--    below, which is what identifies these rows.
-- ============================================================
delete from progression_targets pt
 using split_days sd
 where pt.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_b', 'full_body_3')
   and pt.exercise_id = (select id from exercises where name = 'Bulgarian Split Squat');

-- ============================================================
-- 2. PUSH B + FULL BODY 3 — Bulgarian Split Squat -> Goblet Squat.
--    In place, so the slot keeps its sort_order (Push B 6, Full Body 3 9).
-- ============================================================
update split_day_exercises sde
   set exercise_id = (select id from exercises where name = 'Goblet Squat'),
       short_id = case sd.day_key when 'push_b' then 'pb_goblet' else 'fb3_goblet' end,
       set_type = 'straight',
       target_sets = 3,
       target_reps_min = 12,
       target_reps_max = 15,
       note = 'Kettlebell or DB at the chest, elbows tucked inside the knees. Heels flat, knees tracking over the toes, hips to parallel or below if your ankles allow.',
       intensifier = '1s pause at the bottom — no bouncing out of the hole'
  from split_days sd
 where sde.split_day_id = sd.id
   and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and sd.day_key in ('push_b', 'full_body_3')
   and sde.exercise_id = (select id from exercises where name = 'Bulgarian Split Squat');

-- ============================================================
-- 3. Day subtitles — Push B is no longer a single-leg day.
-- ============================================================
update split_days
   set subtitle = 'Flat Chest · Shoulders · Triceps · Squat + Explosive'
 where user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
   and day_key = 'push_b';

-- ============================================================
-- 4. Verification — the two changed days, plus the two days that
--    keep the Bulgarian, so the one-of-each split is visible.
-- ============================================================
select
  sd.day_key,
  sde.sort_order as ex_no,
  e.name         as exercise,
  e.muscle_group,
  sde.target_sets as sets,
  sde.target_reps_min || '-' || sde.target_reps_max as reps,
  pt.target_weight
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
left join progression_targets pt
       on pt.split_day_id = sd.id
      and pt.exercise_id  = sde.exercise_id
      and pt.week_number  = sd.current_week
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b', 'full_body_1', 'full_body_3')
  and e.name in ('Goblet Squat', 'Bulgarian Split Squat')
order by sd.sort_order, sde.sort_order;
