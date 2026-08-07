-- Read-only diagnostic: dump the current live plan for the 4 gym days.
-- Nothing is modified. Run in the Supabase SQL editor and paste the result back.
--
-- WHY THIS EXISTS: src/utils/seedUserData.js is the ORIGINAL seed and has
-- drifted from the live database (migrations + in-app edits changed the plan
-- without updating that file). Anything built off the seed file will be wrong.
-- This query is the source of truth for what is actually being trained.

-- QUERY 1 — per-exercise detail.
select
  sd.sort_order        as day_no,
  sd.day_key,
  sd.day_label,
  sd.current_week      as week,
  sde.sort_order       as ex_no,
  e.name               as exercise,
  e.muscle_group,
  e.movement_type,
  e.equipment_category as equipment,
  sde.set_type,
  sde.optional,
  sde.target_sets      as sets,
  sde.target_reps_min  as rep_min,
  sde.target_reps_max  as rep_max,
  pt.target_weight     as weight
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
left join progression_targets pt
       on pt.split_day_id = sd.id
      and pt.exercise_id  = sde.exercise_id
      and pt.week_number  = sd.current_week
      and pt.mesocycle    = 1
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b', 'pull_a', 'pull_b')
order by sd.sort_order, sde.sort_order;


-- QUERY 2 — weekly set volume rolled up by muscle group.
-- This is the one that answers "am I overdoing anything." Note it counts
-- DIRECT sets only: a row's sets land entirely on its own muscle_group, so
-- triceps volume from pressing and biceps volume from rows are not included.
select
  e.muscle_group,
  sum(coalesce(sde.target_sets, 0)) filter (where not sde.optional) as core_sets,
  sum(coalesce(sde.target_sets, 0)) filter (where sde.optional)     as optional_sets,
  count(*) filter (where sde.set_type = 'chipper')                  as chippers,
  count(*)                                                          as exercises
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b', 'pull_a', 'pull_b')
group by e.muscle_group
order by core_sets desc;


-- QUERY 3 — same exercise programmed on more than one day.
select
  e.name          as exercise,
  e.muscle_group,
  count(*)                                                   as on_n_days,
  string_agg(sd.day_label, ' + ' order by sd.sort_order)     as days,
  sum(coalesce(sde.target_sets, 0))                          as total_sets
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b', 'pull_a', 'pull_b')
group by e.name, e.muscle_group
having count(*) > 1
order by total_sets desc;


-- QUERY 4 — movement-pattern overlap. One row per muscle+movement, listing
-- every exercise filling that slot. Two different exercises covering the same
-- pattern is where the redundancy hides.
select
  e.muscle_group,
  e.movement_type,
  count(*)                          as slots,
  sum(coalesce(sde.target_sets, 0)) as sets,
  string_agg(
    e.name || ' [' || e.equipment_category || '] '
      || sd.day_label || ' ' || coalesce(sde.target_sets, 0) || 'x'
      || case when sde.optional then ' OPT' else '' end,
    ' | ' order by sd.sort_order, sde.sort_order
  ) as detail
from split_days sd
join split_day_exercises sde on sde.split_day_id = sd.id
join exercises e            on e.id = sde.exercise_id
where sd.user_id = (select id from auth.users where email = 'chadleydean@gmail.com')
  and sd.day_key in ('push_a', 'push_b', 'pull_a', 'pull_b')
group by e.muscle_group, e.movement_type
order by sets desc;
