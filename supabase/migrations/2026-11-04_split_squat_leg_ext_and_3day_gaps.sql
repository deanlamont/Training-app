-- 2026-11-04 — Alternate Bulgarian Split Squat / Leg Extensions; close 3-day gaps.
--
-- WHY: Tennis + pickleball + disc golf already load the knees, hips and calves
-- through cutting and rotation, and the user is feeling overuse pain. Bulgarian
-- Split Squats on BOTH lower-body days is the highest-fatigue, highest-joint-
-- stress option, so the two days now use different quad movements:
--
--   4-day:  Push A = Bulgarian Split Squat   | Push B = Leg Extensions (60-rep chipper)
--   3-day:  Full Body 1 = Bulgarian          | Full Body 3 = Leg Extensions (60-rep chipper)
--
-- Quad volume is unchanged (3 working sets / 60 controlled reps per exposure),
-- but one of the two exposures per week is now machine-stable and low-skill.
-- Leg Extensions were cut on 5/27, 6/9 and 8/7 for quad dominance / tennis calf
-- overcompensation; they come back as ONE exposure per week, never stacked on
-- the Bulgarian day, with controlled reps only. Easy to reverse if the calf
-- symptom returns.
--
-- 3-DAY GAPS (audit vs per-muscle weekly set targets, see 2026-08-07):
--   * Back was 12 sets vs a 16 target (the 4-day gets 17). Full Body 2 had only
--     one pull. Added Lat Pulldown overhand (3 sets) to Full Body 2 and took
--     both rows (FB2 Seated Row V-bar, FB3 Chest-Supported Row High) 3 -> 4
--     sets. Back -> ~17, vertical pulling now on all three days.
--   * Hamstrings were 3 sets (RDL only). Swapped Cable Rope Overhead Extension
--     on Full Body 3 for Single-Leg RDL (3/side). Triceps stay covered by Rope
--     OH on FB1, Dips and the pressing. FB3 stays ~26 core sets.
--
-- Leg Extensions carry no progression_targets row (untracked weight, as on the
-- earlier chipper rows). Single-Leg RDL is already in the catalog.
--
-- Idempotent. Re-runnable. Only touches push_b, full_body_2, full_body_3.

-- ============================================================
-- 1. Removals (+ their progression targets, for these days only).
-- ============================================================
with removals(day_key, exercise) as (
  values
    ('push_b',      'Bulgarian Split Squat'),
    ('full_body_3', 'Bulgarian Split Squat'),
    ('full_body_3', 'Cable Rope Overhead Extension')
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
-- 2. Additions.
-- ============================================================
insert into split_day_exercises
  (split_day_id, exercise_id, set_type, target_sets, target_reps_min,
   target_reps_max, sort_order, note, short_id, intensifier, optional)
select sd.id, e.id, a.set_type, a.sets, a.rep_min, a.rep_max,
       a.sort_order, a.note, a.short_id, a.intensifier, false
from (values
    ('push_b',      'Nautilus Leg Extensions',        'chipper',  null::int, 60, 60, 6,  'controlled reps only — no kicking the stack up', 'pb_leg_ext',  'Slow 3s eccentric + 1s squeeze at top'),
    ('full_body_3', 'Nautilus Leg Extensions',        'chipper',  null::int, 60, 60, 9,  'controlled reps only — no kicking the stack up', 'fb3_leg_ext', 'Slow 3s eccentric + 1s squeeze at top'),
    ('full_body_3', 'Single-Leg RDL',                 'straight', 3,         8,  10, 8,  '/side',                                        'fb3_sl_rdl',  null::text),
    ('full_body_2', 'Nautilus Lat Pulldown overhand', 'straight', 3,         8,  10, 3,  'or close-grip V-handle for rear delt bias',    'fb2_pd_over', null::text)
  ) as a(day_key, exercise, set_type, sets, rep_min, rep_max, sort_order, note, short_id, intensifier)
join split_days sd on sd.day_key = a.day_key
                  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
join exercises e  on e.name = a.exercise
on conflict (split_day_id, short_id) do nothing;

-- ============================================================
-- 3. Seed the new Lat Pulldown row's weight from the same exercise on
--    another day (Single-Leg RDL stays TBD; Leg Extensions untracked).
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
  and sde.short_id = 'fb2_pd_over'
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do nothing;

-- ============================================================
-- 4. Rows 3 -> 4 sets (plan row and current-week target).
-- ============================================================
with rows(day_key, exercise) as (
  values
    ('full_body_2', 'Nautilus Seated Row V-bar'),
    ('full_body_3', 'Nautilus Chest Supported Row High')
),
targets as (
  select sd.id as split_day_id, sd.current_week, e.id as exercise_id
  from rows r
  join split_days sd on sd.day_key = r.day_key
                    and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  join exercises e  on e.name = r.exercise
),
upd_pt as (
  update progression_targets pt
     set target_sets = 4
    from targets t
   where pt.split_day_id = t.split_day_id
     and pt.exercise_id  = t.exercise_id
     and pt.week_number  = t.current_week
  returning 1
)
update split_day_exercises sde
   set target_sets = 4
  from targets t
 where sde.split_day_id = t.split_day_id
   and sde.exercise_id  = t.exercise_id;

-- ============================================================
-- 5. Final ordering for Full Body 2 (pulldown slots in before the row).
-- ============================================================
update split_day_exercises sde
   set sort_order = p.ord
from (values
    ('full_body_2', 'Nautilus PL Flat Bench',            1),
    ('full_body_2', 'DB Flat Bench',                     2),
    ('full_body_2', 'Nautilus Lat Pulldown overhand',    3),
    ('full_body_2', 'Nautilus Seated Row V-bar',         4),
    ('full_body_2', 'Arsenal Lateral Raises',            5),
    ('full_body_2', 'Incline DB Curls',                  6),
    ('full_body_2', 'Dips with Knee Raise',              7),
    ('full_body_2', 'Romanian Deadlift',                 8),
    ('full_body_2', 'Hip Thrust',                        9)
  ) as p(day_key, exercise, ord)
join split_days sd on sd.day_key = p.day_key
                  and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
join exercises e  on e.name = p.exercise
where sde.split_day_id = sd.id
  and sde.exercise_id  = e.id;

-- ============================================================
-- 6. Verification — lower-body and affected days.
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
  and sd.day_key in ('push_a','push_b','full_body_1','full_body_2','full_body_3')
order by sd.sort_order, sde.sort_order;
