import { supabase } from './supabaseClient.js';

/**
 * Called on first login. Seeds the user's split days, exercise assignments,
 * and current week targets so they can jump straight into logging.
 */
export async function seedUserData(userId) {
  // --- SPLIT DAYS ---
  const splitDays = [
    { day_key: 'push_a', day_label: 'Push A — Chest & Triceps', sort_order: 1 },
    { day_key: 'push_b', day_label: 'Push B — Chest & Shoulders', sort_order: 2 },
    { day_key: 'pull_a', day_label: 'Pull A — Back Width & Biceps', sort_order: 3 },
    { day_key: 'pull_b', day_label: 'Pull B — Biceps & Upper Back', sort_order: 4 },
  ];

  const { data: days, error: dErr } = await supabase
    .from('split_days')
    .upsert(splitDays.map(d => ({ ...d, user_id: userId })), {
      onConflict: 'user_id,day_key',
      ignoreDuplicates: false
    })
    .select();

  if (dErr) throw new Error(`Split day seed failed: ${dErr.message}`);

  const dayMap = Object.fromEntries(days.map(d => [d.day_key, d.id]));

  // --- EXERCISE LOOKUP ---
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name');

  const exMap = Object.fromEntries(exercises.map(e => [e.name, e.id]));

  // --- SPLIT DAY EXERCISES ---
  const sde = [
    // PUSH A
    { day: 'push_a', ex: 'Nautilus PL Incline Bench',   type: 'straight', sets: 3, min: 8,  max: 8,  order: 1 },
    { day: 'push_a', ex: 'Arsenal Lateral Raises',       type: 'myo',      sets: null, min: 10, max: 15, order: 2 },
    { day: 'push_a', ex: 'DB Flat Bench',                type: 'straight', sets: 3, min: 8,  max: 8,  order: 3 },
    { day: 'push_a', ex: 'Hack Squat',                   type: 'straight', sets: 3, min: 8,  max: 8,  order: 4 },
    { day: 'push_a', ex: 'Tricep Pushdowns',             type: 'myo',      sets: null, min: 10, max: 15, order: 5 },
    { day: 'push_a', ex: 'Nautilus Leg Extensions',      type: 'myo',      sets: null, min: 10, max: 15, order: 6 },
    { day: 'push_a', ex: 'Tricep Overhead Extension',    type: 'straight', sets: 3, min: 15, max: 15, order: 7 },
    { day: 'push_a', ex: 'Arsenal Fly Machine',          type: 'myo',      sets: null, min: 10, max: 15, order: 8 },

    // PUSH B
    { day: 'push_b', ex: 'Nautilus PL Flat Bench',       type: 'straight', sets: 3, min: 8,  max: 10, order: 1 },
    { day: 'push_b', ex: 'DB 45 Degree Incline',         type: 'straight', sets: 3, min: 10, max: 12, order: 2 },
    { day: 'push_b', ex: 'Arsenal Lateral Raises',       type: 'myo',      sets: null, min: 10, max: 15, order: 3 },
    { day: 'push_b', ex: 'Nautilus PL Seated Press',     type: 'straight', sets: 3, min: 10, max: 10, order: 4 },
    { day: 'push_b', ex: 'Close Grip DB Bench',          type: 'straight', sets: 3, min: 10, max: 12, order: 5 },
    { day: 'push_b', ex: 'Nautilus Xpload Leg Press',    type: 'straight', sets: 3, min: 10, max: 10, order: 6 },
    { day: 'push_b', ex: 'Nautilus Leg Extensions',      type: 'myo',      sets: null, min: 10, max: 15, order: 7 },
    { day: 'push_b', ex: 'Arsenal Fly Machine',          type: 'myo',      sets: null, min: 10, max: 15, order: 8 },

    // PULL A
    { day: 'pull_a', ex: 'Nautilus Lat Pulldown overhand',   type: 'straight', sets: 4, min: 8,  max: 10, order: 1 },
    { day: 'pull_a', ex: 'Romanian Deadlift',                 type: 'straight', sets: 3, min: 8,  max: 10, order: 2 },
    { day: 'pull_a', ex: 'Nautilus Chest Supported Row Mid',  type: 'straight', sets: 3, min: 10, max: 12, order: 3 },
    { day: 'pull_a', ex: 'Nautilus Hamstring Curls',          type: 'myo',      sets: null, min: 10, max: 15, order: 4 },
    { day: 'pull_a', ex: 'Nautilus Seated Row V-bar',         type: 'straight', sets: 3, min: 12, max: 12, order: 5 },
    { day: 'pull_a', ex: 'Cable Curls',                       type: 'myo',      sets: null, min: 10, max: 15, order: 6 },
    { day: 'pull_a', ex: 'Cable Face Pulls',                  type: 'myo',      sets: null, min: 10, max: 15, order: 7 },
    { day: 'pull_a', ex: 'Cable Lat Prayers',                 type: 'myo',      sets: null, min: 10, max: 15, order: 8 },
    { day: 'pull_a', ex: 'Chest Supported Rear Delt Raises',  type: 'myo',      sets: null, min: 12, max: 20, order: 9 },

    // PULL B
    { day: 'pull_b', ex: 'Nautilus Lat Pulldown underhand',   type: 'straight', sets: 4, min: 8,  max: 12, order: 1 },
    { day: 'pull_b', ex: 'Incline DB Curls',                  type: 'myo',      sets: null, min: 10, max: 15, order: 2 },
    { day: 'pull_b', ex: 'Nautilus Chest Supported Row High', type: 'straight', sets: 3, min: 10, max: 15, order: 3 },
    { day: 'pull_b', ex: 'Cable Face Pulls',                  type: 'myo',      sets: null, min: 10, max: 15, order: 4 },
    { day: 'pull_b', ex: 'Nautilus Seated Row wide',          type: 'straight', sets: 3, min: 10, max: 12, order: 5 },
    { day: 'pull_b', ex: 'Cable Curls',                       type: 'myo',      sets: null, min: 10, max: 15, order: 6 },
    { day: 'pull_b', ex: 'Nautilus Hamstring Curls',          type: 'myo',      sets: null, min: 10, max: 15, order: 7 },
    { day: 'pull_b', ex: 'Chest Supported Rear Delt Raises',  type: 'myo',      sets: null, min: 12, max: 20, order: 8 },
  ];

  const sdeRows = sde.map(e => ({
    split_day_id: dayMap[e.day],
    exercise_id: exMap[e.ex],
    set_type: e.type,
    target_sets: e.sets,
    target_reps_min: e.min,
    target_reps_max: e.max,
    sort_order: e.order
  }));

  const { error: sdeErr } = await supabase
    .from('split_day_exercises')
    .upsert(sdeRows, { ignoreDuplicates: true });

  if (sdeErr) throw new Error(`Exercise assignment seed failed: ${sdeErr.message}`);

  // --- WEEK 3 TARGETS (current state) ---
  // TBD weights seeded as null — Claude will fill these after first session
  const week3Targets = [
    // PUSH A
    { day: 'push_a', ex: 'Nautilus PL Incline Bench',   w: 55,   sets: 3, min: 8,  max: 8,  rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Arsenal Lateral Raises',       w: 35,   sets: null, min: 10, max: 15, rir: 0, type: 'myo' },
    { day: 'push_a', ex: 'DB Flat Bench',                w: 70,   sets: 3, min: 8,  max: 8,  rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Hack Squat',                   w: 45,   sets: 3, min: 8,  max: 8,  rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Tricep Pushdowns',             w: 54,   sets: null, min: 10, max: 15, rir: 0, type: 'myo' },
    { day: 'push_a', ex: 'Nautilus Leg Extensions',      w: 100,  sets: null, min: 10, max: 15, rir: 0, type: 'myo' },
    { day: 'push_a', ex: 'Tricep Overhead Extension',    w: 44,   sets: 3, min: 15, max: 15, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Arsenal Fly Machine',          w: 27.5, sets: null, min: 10, max: 15, rir: 0, type: 'myo' },

    // PUSH B
    { day: 'push_b', ex: 'Nautilus PL Flat Bench',       w: 80,   sets: 3, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'DB 45 Degree Incline',         w: 55,   sets: 3, min: 10, max: 12, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Arsenal Lateral Raises',       w: 35,   sets: null, min: 10, max: 15, rir: 0, type: 'myo' },
    { day: 'push_b', ex: 'Nautilus PL Seated Press',     w: 55,   sets: 3, min: 10, max: 10, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Close Grip DB Bench',          w: null, sets: 3, min: 10, max: 12, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Nautilus Xpload Leg Press',    w: 75,   sets: 3, min: 10, max: 10, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Nautilus Leg Extensions',      w: 120,  sets: null, min: 10, max: 15, rir: 0, type: 'myo' },
    { day: 'push_b', ex: 'Arsenal Fly Machine',          w: 25,   sets: null, min: 10, max: 15, rir: 0, type: 'myo' },

    // PULL A
    { day: 'pull_a', ex: 'Nautilus Lat Pulldown overhand',   w: 148, sets: 4, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Romanian Deadlift',                 w: null, sets: 3, min: 8, max: 10, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Nautilus Chest Supported Row Mid',  w: 135, sets: 3, min: 10, max: 12, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Nautilus Hamstring Curls',          w: 80,  sets: null, min: 10, max: 15, rir: 0, type: 'myo' },
    { day: 'pull_a', ex: 'Nautilus Seated Row V-bar',         w: 120, sets: 3, min: 12, max: 12, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Cable Curls',                       w: 38.5, sets: null, min: 10, max: 15, rir: 0, type: 'myo' },
    { day: 'pull_a', ex: 'Cable Face Pulls',                  w: 54,  sets: null, min: 10, max: 15, rir: 0, type: 'myo' },
    { day: 'pull_a', ex: 'Cable Lat Prayers',                 w: 54,  sets: null, min: 10, max: 15, rir: 0, type: 'myo' },
    { day: 'pull_a', ex: 'Chest Supported Rear Delt Raises',  w: null, sets: null, min: 12, max: 20, rir: 0, type: 'myo' },
  ];

  const targetRows = week3Targets
    .filter(t => t.w !== null)
    .map(t => ({
      user_id: userId,
      exercise_id: exMap[t.ex],
      split_day_id: dayMap[t.day],
      week_number: 3,
      mesocycle: 1,
      target_weight: t.w,
      target_sets: t.sets,
      target_reps_min: t.min,
      target_reps_max: t.max,
      target_rir: t.rir,
      set_type: t.type,
      source: 'seed'
    }));

  const { error: tErr } = await supabase
    .from('progression_targets')
    .upsert(targetRows, {
      onConflict: 'user_id,exercise_id,split_day_id,week_number,mesocycle',
      ignoreDuplicates: true
    });

  if (tErr) throw new Error(`Target seed failed: ${tErr.message}`);

  return { dayMap, exMap };
}
