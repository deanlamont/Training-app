-- 2026-07-20: Add an alternate 3-day full-body split (Full Body 1/2/3).
--
-- WHY: A fallback for weeks with only 3 lifting slots (e.g. tennis-heavy
-- weeks). Combines Push A/B + Pull A/B into 3 balanced full-body days.
-- Progressive overload is continuous across both splits: each Full Body
-- exercise seeds from the user's CURRENT live weight (see the targets block)
-- and stays synced with the 4-day split via app-side forward-sync thereafter.
-- Coexists with the existing days (sort_order 6/7/8, after Day 5).
--
-- Idempotent — re-runnable. All inserts upsert on their natural keys.
-- All referenced exercises already exist in the catalog; none are created.

-- ── Split days ──────────────────────────────────────────────────────────────
insert into split_days (user_id, day_key, day_label, subtitle, sort_order, current_week)
select u.id, v.day_key, v.day_label, v.subtitle, v.sort_order, 4
from (select id from auth.users where email = 'chadleydean@gmail.com') u
cross join (values
  ('full_body_1', 'Full Body 1', 'Incline · Vertical Pull · Quads',            6),
  ('full_body_2', 'Full Body 2', 'Flat · Horizontal Pull · Hamstrings',        7),
  ('full_body_3', 'Full Body 3', 'DB Chest · Vertical Pull · Quads + Posterior', 8)
) as v(day_key, day_label, subtitle, sort_order)
on conflict (user_id, day_key) do update
  set day_label = excluded.day_label,
      subtitle  = excluded.subtitle,
      sort_order = excluded.sort_order;

-- ── Split day exercises ─────────────────────────────────────────────────────
insert into split_day_exercises
  (split_day_id, exercise_id, short_id, set_type, target_sets,
   target_reps_min, target_reps_max, sort_order, note, intensifier)
select sd.id, ex.id, v.short_id, v.set_type, v.target_sets,
       v.rmin, v.rmax, v.sort_order, v.note, v.intensifier
from (values
  -- FULL BODY 1
  ('full_body_1', 'fb1_inc',      'Nautilus PL Incline Bench',        'straight', 4::int,  8::int,  8::int,  1::int, '/side'::text, null::text),
  ('full_body_1', 'fb1_pd_over',  'Nautilus Lat Pulldown overhand',   'straight', 3, 8,  10, 2, 'or close-grip V-handle for rear delt bias', null),
  ('full_body_1', 'fb1_seat_pr',  'Nautilus PL Seated Press',         'straight', 3, 10, 10, 3, '/side', null),
  ('full_body_1', 'fb1_cc',       'Cable Curls',                      'straight', 3, 12, 15, 4, null, 'Slow 3s eccentric + peak squeeze'),
  ('full_body_1', 'fb1_rope_oh',  'Cable Rope Overhead Extension',    'straight', 3, 12, 12, 5, null, null),
  ('full_body_1', 'fb1_leg_pr',   'Nautilus Xpload Leg Press Incline','straight', 3, 10, 10, 6, '/side', null),
  ('full_body_1', 'fb1_fp',       'Cable Face Pulls',                 'straight', 3, 15, 20, 7, null, '1s pause + squeeze at peak'),
  ('full_body_1', 'fb1_kb',       'Kettlebell Swing',                 'straight', 3, 15, 20, 8, 'conditioning finisher (optional on match days)', null),
  -- FULL BODY 2
  ('full_body_2', 'fb2_flat',     'Nautilus PL Flat Bench',           'straight', 4, 8,  10, 1, '/side', null),
  ('full_body_2', 'fb2_row_high', 'Nautilus Chest Supported Row High','straight', 3, 10, 15, 2, null, null),
  ('full_body_2', 'fb2_lat_r',    'Arsenal Lateral Raises',           'straight', 3, 12, 15, 3, null, 'Slow 3s eccentric + 1s pause at top'),
  ('full_body_2', 'fb2_inc_curl', 'Incline DB Curls',                 'straight', 3, 12, 15, 4, null, 'Slow 3s eccentric (deep stretch)'),
  ('full_body_2', 'fb2_rope_oh',  'Cable Rope Overhead Extension',    'straight', 3, 12, 15, 5, null, 'Slow 3s eccentric (long-head stretch)'),
  ('full_body_2', 'fb2_rdl',      'Romanian Deadlift',                'straight', 3, 8,  8,  6, null, null),
  ('full_body_2', 'fb2_rd_fly',   'Cable Rear Delt Fly',              'straight', 3, 12, 15, 7, null, 'Slow 3s eccentric + peak squeeze'),
  ('full_body_2', 'fb2_suitcase', 'Suitcase Carry',                   'straight', 2, 20, 20, 8, '/side, walking (anti-rotation core)', null),
  -- FULL BODY 3
  ('full_body_3', 'fb3_db_inc',   'DB 45 Degree Incline',             'straight', 3, 10, 12, 1, null, null),
  ('full_body_3', 'fb3_pd_under', 'Nautilus Lat Pulldown underhand',  'straight', 3, 8,  12, 2, null, null),
  ('full_body_3', 'fb3_seat_pr',  'Nautilus PL Seated Press',         'straight', 3, 8,  10, 3, '/side', null),
  ('full_body_3', 'fb3_hammer',   'Hammer Curls',                     'straight', 3, 12, 12, 4, null, null),
  ('full_body_3', 'fb3_rope_oh',  'Cable Rope Overhead Extension',    'straight', 3, 12, 15, 5, null, null),
  ('full_body_3', 'fb3_squat',    'Bodybuilder Squat Machine',        'straight', 3, 8,  10, 6, '/side', null),
  ('full_body_3', 'fb3_ham',      'Nautilus Hamstring Curls',         'straight', 3, 12, 15, 7, null, 'Slow 3s eccentric + 1s squeeze'),
  ('full_body_3', 'fb3_thrust',   'Hip Thrust',                       'straight', 3, 8,  12, 8, 'optional — skip if legs are toast from a match', '2s pause + squeeze at top')
) as v(day_key, short_id, ex_name, set_type, target_sets, rmin, rmax, sort_order, note, intensifier)
join split_days sd
  on sd.day_key = v.day_key
 and sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
join exercises ex on ex.name = v.ex_name
on conflict (split_day_id, short_id) do update
  set exercise_id     = excluded.exercise_id,
      set_type        = excluded.set_type,
      target_sets     = excluded.target_sets,
      target_reps_min = excluded.target_reps_min,
      target_reps_max = excluded.target_reps_max,
      sort_order      = excluded.sort_order,
      note            = excluded.note,
      intensifier     = excluded.intensifier;

-- ── Progression targets (week 4, mesocycle 1) ───────────────────────────────
insert into progression_targets
  (user_id, exercise_id, split_day_id, week_number, mesocycle,
   target_weight, target_sets, target_reps_min, target_reps_max, target_rir, set_type, source)
-- target_weight is pulled from the user's CURRENT live weight for each
-- exercise (highest-weight-wins across every day's current-week row, the same
-- rule as 2026-06-19_sync_shared_exercise_weights) so Full Body is aligned with
-- the 4-day split from first load — no catch-up lag. The v.w column is only a
-- fallback for an exercise that has no existing target yet. sets/reps/rir are
-- Full Body's own straight-set prescription.
select u.id, ex.id, sd.id, 4, 1,
       coalesce(live.w, v.w), v.sets, v.rmin, v.rmax, v.rir, v.set_type, 'mirror'
from (values
  -- FULL BODY 1
  ('full_body_1', 'Nautilus PL Incline Bench',        45::numeric,  4::int, 8::int,  8::int,  2::int, 'straight'::text),
  ('full_body_1', 'Nautilus Lat Pulldown overhand',   121, 3, 8,  10, 2, 'straight'),
  ('full_body_1', 'Nautilus PL Seated Press',         60,  3, 10, 10, 2, 'straight'),
  ('full_body_1', 'Cable Curls',                      43,  3, 12, 15, 1, 'straight'),
  ('full_body_1', 'Cable Rope Overhead Extension',    45,  3, 12, 12, 2, 'straight'),
  ('full_body_1', 'Nautilus Xpload Leg Press Incline',90,  3, 10, 10, 2, 'straight'),
  ('full_body_1', 'Cable Face Pulls',                 58.5,3, 15, 20, 1, 'straight'),
  ('full_body_1', 'Kettlebell Swing',                 35,  3, 15, 20, 1, 'straight'),
  -- FULL BODY 2
  ('full_body_2', 'Nautilus PL Flat Bench',           60,  4, 8,  10, 2, 'straight'),
  ('full_body_2', 'Nautilus Chest Supported Row High',50,  3, 10, 15, 2, 'straight'),
  ('full_body_2', 'Arsenal Lateral Raises',           40,  3, 12, 15, 1, 'straight'),
  ('full_body_2', 'Incline DB Curls',                 20,  3, 12, 15, 1, 'straight'),
  ('full_body_2', 'Cable Rope Overhead Extension',    45,  3, 12, 15, 1, 'straight'),
  ('full_body_2', 'Romanian Deadlift',                135, 3, 8,  8,  2, 'straight'),
  ('full_body_2', 'Cable Rear Delt Fly',              30,  3, 12, 15, 1, 'straight'),
  ('full_body_2', 'Suitcase Carry',                   40,  2, 20, 20, 2, 'straight'),
  -- FULL BODY 3
  ('full_body_3', 'DB 45 Degree Incline',             55,  3, 10, 12, 2, 'straight'),
  ('full_body_3', 'Nautilus Lat Pulldown underhand',  121, 3, 8,  12, 2, 'straight'),
  ('full_body_3', 'Nautilus PL Seated Press',         60,  3, 8,  10, 2, 'straight'),
  ('full_body_3', 'Hammer Curls',                     35,  3, 12, 12, 2, 'straight'),
  ('full_body_3', 'Cable Rope Overhead Extension',    45,  3, 12, 15, 1, 'straight'),
  ('full_body_3', 'Bodybuilder Squat Machine',        90,  3, 8,  10, 2, 'straight'),
  ('full_body_3', 'Nautilus Hamstring Curls',         80,  3, 12, 15, 1, 'straight'),
  ('full_body_3', 'Hip Thrust',                       95,  3, 8,  12, 2, 'straight')
) as v(day_key, ex_name, w, sets, rmin, rmax, rir, set_type)
cross join (select id from auth.users where email = 'chadleydean@gmail.com') u
join split_days sd on sd.day_key = v.day_key and sd.user_id = u.id
join exercises ex on ex.name = v.ex_name
left join lateral (
  -- current live weight for this exercise: max across every day's current week
  select max(pt.target_weight) as w
    from progression_targets pt
    join split_days sd2 on sd2.id = pt.split_day_id
   where pt.user_id     = u.id
     and pt.exercise_id = ex.id
     and pt.mesocycle   = 1
     and pt.week_number = sd2.current_week
) live on true
on conflict (user_id, exercise_id, split_day_id, week_number, mesocycle) do update
  set target_weight   = excluded.target_weight,
      target_sets     = excluded.target_sets,
      target_reps_min = excluded.target_reps_min,
      target_reps_max = excluded.target_reps_max,
      target_rir      = excluded.target_rir,
      set_type        = excluded.set_type,
      source          = excluded.source;
