import { supabase } from './supabaseClient.js';

export async function seedUserData(userId) {
  const splitDays = [
    { day_key: 'push_a', day_label: 'Push A', subtitle: 'Incline Chest · Shoulders · Triceps · Legs', sort_order: 1, current_week: 4 },
    { day_key: 'push_b', day_label: 'Push B', subtitle: 'Flat Chest · Shoulders · Triceps · Legs',   sort_order: 2, current_week: 4 },
    { day_key: 'pull_a', day_label: 'Pull A', subtitle: 'Back Width · Biceps · Hamstrings',           sort_order: 3, current_week: 4 },
    { day_key: 'pull_b', day_label: 'Pull B', subtitle: 'Upper Back · Biceps · Hamstrings',           sort_order: 4, current_week: 4 },
    { day_key: 'day_5',  day_label: 'Day 5',  subtitle: 'Arms · Core (Optional)',                     sort_order: 5, current_week: 4 },
  ];

  const { data: days, error: dErr } = await supabase
    .from('split_days')
    .upsert(splitDays.map(d => ({ ...d, user_id: userId })), {
      onConflict: 'user_id,day_key',
      ignoreDuplicates: false,
    })
    .select();

  if (dErr) throw new Error(`Split day seed failed: ${dErr.message}`);

  const dayMap = Object.fromEntries(days.map(d => [d.day_key, d.id]));

  const { data: exercises } = await supabase.from('exercises').select('id, name');
  const exMap = Object.fromEntries(exercises.map(e => [e.name, e.id]));

  const sde = [
    // PUSH A
    { day: 'push_a', ex: 'Nautilus PL Incline Bench',      sid: 'pa_inc',      type: 'straight', sets: 4, min: 8,  max: 8,  order: 1,  note: '/side' },
    { day: 'push_a', ex: 'DB 45 Degree Incline',            sid: 'pa_db_inc',   type: 'straight', sets: 3, min: 10, max: 12, order: 2 },
    { day: 'push_a', ex: 'Nautilus PL Seated Press',        sid: 'pa_seat_pr',  type: 'straight', sets: 3, min: 10, max: 10, order: 3,  note: '/side' },
    { day: 'push_a', ex: 'Arsenal Fly Machine',             sid: 'pa_fly',      type: 'myo',      sets: null, min: 12, max: 15, order: 4 },
    { day: 'push_a', ex: 'Arsenal Lateral Raises',          sid: 'pa_lat_r',    type: 'myo',      sets: null, min: 12, max: 15, order: 5 },
    { day: 'push_a', ex: 'Cable Rope Overhead Extension',   sid: 'pa_rope_oh',  type: 'straight', sets: 3, min: 12, max: 12, order: 6 },
    { day: 'push_a', ex: 'Tricep Pushdowns',                sid: 'pa_pushdn',   type: 'myo',      sets: null, min: 12, max: 15, order: 7 },
    { day: 'push_a', ex: 'Nautilus Xpload Leg Press Incline', sid: 'pa_leg_pr',   type: 'straight', sets: 3, min: 10, max: 10, order: 8,  note: '/side' },
    { day: 'push_a', ex: 'Nautilus Leg Extensions',         sid: 'pa_leg_ext',  type: 'myo',      sets: null, min: 12, max: 15, order: 9 },
    { day: 'push_a', ex: 'Cable Woodchop',                  sid: 'pa_woodchop', type: 'straight', sets: 2, min: 12, max: 12, order: 10, note: '/side' },

    // PUSH B
    { day: 'push_b', ex: 'Nautilus PL Flat Bench',          sid: 'pb_flat',     type: 'straight', sets: 4, min: 8,  max: 10, order: 1,  note: '/side' },
    { day: 'push_b', ex: 'DB Flat Bench',                   sid: 'pb_db_flat',  type: 'straight', sets: 3, min: 10, max: 12, order: 2 },
    { day: 'push_b', ex: 'Standing Barbell OHP',            sid: 'pb_ohp',      type: 'straight', sets: 3, min: 8,  max: 10, order: 3 },
    { day: 'push_b', ex: 'Arsenal Fly Machine',             sid: 'pb_fly',      type: 'myo',      sets: null, min: 12, max: 15, order: 4 },
    { day: 'push_b', ex: 'Arsenal Lateral Raises',          sid: 'pb_lat_r',    type: 'myo',      sets: null, min: 12, max: 15, order: 5 },
    { day: 'push_b', ex: 'Cable Rope Overhead Extension',   sid: 'pb_rope_oh',  type: 'myo',      sets: null, min: 12, max: 15, order: 6 },
    { day: 'push_b', ex: 'Bodybuilder Squat Machine',       sid: 'pb_squat',    type: 'straight', sets: 3, min: 8,  max: 10, order: 7,  note: '/side' },
    { day: 'push_b', ex: 'Nautilus Leg Extensions',         sid: 'pb_leg_ext',  type: 'myo',      sets: null, min: 12, max: 15, order: 8 },
    { day: 'push_b', ex: 'Cable Woodchop',                  sid: 'pb_woodchop', type: 'straight', sets: 2, min: 12, max: 12, order: 9,  note: '/side' },

    // PULL A
    { day: 'pull_a', ex: 'Nautilus Lat Pulldown overhand',    sid: 'pla_pd_over', type: 'straight', sets: 4, min: 8,  max: 10, order: 1 },
    { day: 'pull_a', ex: 'Nautilus Chest Supported Row Mid',  sid: 'pla_row_mid', type: 'straight', sets: 3, min: 10, max: 12, order: 2 },
    { day: 'pull_a', ex: 'Cable Face Pulls',                  sid: 'pla_fp',      type: 'myo',      sets: null, min: 15, max: 20, order: 3 },
    { day: 'pull_a', ex: 'Cable Lat Prayers',                 sid: 'pla_lat_pr',  type: 'myo',      sets: null, min: 12, max: 15, order: 4 },
    { day: 'pull_a', ex: 'Cable Curls',                       sid: 'pla_cc',      type: 'myo',      sets: null, min: 12, max: 15, order: 5 },
    { day: 'pull_a', ex: 'Hammer Curls',                      sid: 'pla_hammer',  type: 'straight', sets: 3, min: 12, max: 12, order: 6 },
    { day: 'pull_a', ex: 'Romanian Deadlift',                 sid: 'pla_rdl',     type: 'straight', sets: 3, min: 8,  max: 8,  order: 7 },
    { day: 'pull_a', ex: 'Nautilus Hamstring Curls',          sid: 'pla_ham',     type: 'myo',      sets: null, min: 12, max: 15, order: 8 },
    { day: 'pull_a', ex: 'Pallof Press',                      sid: 'pla_pallof',  type: 'straight', sets: 2, min: 12, max: 12, order: 9, note: '/side' },

    // PULL B
    { day: 'pull_b', ex: 'Nautilus Lat Pulldown underhand',    sid: 'plb_pd_under', type: 'straight', sets: 4, min: 8,  max: 12, order: 1 },
    { day: 'pull_b', ex: 'Nautilus Chest Supported Row High',  sid: 'plb_row_high', type: 'straight', sets: 3, min: 10, max: 15, order: 2 },
    { day: 'pull_b', ex: 'Cable Face Pulls',                   sid: 'plb_fp',       type: 'myo',      sets: null, min: 15, max: 20, order: 3 },
    { day: 'pull_b', ex: 'Chest Supported Rear Delt Raises',   sid: 'plb_cs_rd',    type: 'myo',      sets: null, min: 12, max: 15, order: 4 },
    { day: 'pull_b', ex: 'Incline DB Curls',                   sid: 'plb_inc_curl', type: 'myo',      sets: null, min: 12, max: 15, order: 5 },
    { day: 'pull_b', ex: 'Cable Curls',                        sid: 'plb_cc',       type: 'straight', sets: 3, min: 12, max: 12, order: 6 },
    { day: 'pull_b', ex: 'Nautilus Hamstring Curls',           sid: 'plb_ham',      type: 'myo',      sets: null, min: 12, max: 15, order: 7 },
    { day: 'pull_b', ex: 'Hip Abductor Machine',               sid: 'plb_hip_ab',   type: 'straight', sets: 3, min: 15, max: 15, order: 8 },
    { day: 'pull_b', ex: 'Pallof Press',                       sid: 'plb_pallof',   type: 'straight', sets: 2, min: 12, max: 12, order: 9, note: '/side' },

    // DAY 5
    { day: 'day_5', ex: 'EZ Bar Curls',                  sid: 'd5_ez',        type: 'straight', sets: 4, min: 10, max: 10, order: 1 },
    { day: 'day_5', ex: 'Incline DB Curls',               sid: 'd5_inc_curl',  type: 'myo',      sets: null, min: 12, max: 15, order: 2 },
    { day: 'day_5', ex: 'Tricep Pushdowns',               sid: 'd5_pushdn',    type: 'myo',      sets: null, min: 12, max: 15, order: 3 },
    { day: 'day_5', ex: 'Cable Rope Overhead Extension',  sid: 'd5_rope_oh',   type: 'straight', sets: 3, min: 12, max: 12, order: 4 },
    { day: 'day_5', ex: 'Arsenal Lateral Raises',         sid: 'd5_lat_r',     type: 'myo',      sets: null, min: 12, max: 15, order: 5 },
    { day: 'day_5', ex: 'Ab Wheel Rollout',               sid: 'd5_ab_wheel',  type: 'straight', sets: 3, min: 10, max: 10, order: 6 },
    { day: 'day_5', ex: 'Hanging Leg Raise',              sid: 'd5_leg_raise', type: 'straight', sets: 3, min: 12, max: 12, order: 7 },
  ];

  const sdeRows = sde.map(e => ({
    split_day_id: dayMap[e.day],
    exercise_id:  exMap[e.ex],
    short_id:     e.sid,
    set_type:     e.type,
    target_sets:  e.sets ?? null,
    target_reps_min: e.min,
    target_reps_max: e.max,
    sort_order:   e.order,
    note:         e.note ?? null,
  }));

  const { error: sdeErr } = await supabase
    .from('split_day_exercises')
    .upsert(sdeRows, { onConflict: 'split_day_id,short_id', ignoreDuplicates: false });

  if (sdeErr) throw new Error(`Exercise seed failed: ${sdeErr.message}`);

  // Cycle 4 targets
  const cycle4Targets = [
    // PUSH A
    { day: 'push_a', ex: 'Nautilus PL Incline Bench',     w: 45,   sets: 4, min: 8,  max: 8,  rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'DB 45 Degree Incline',           w: 55,   sets: 3, min: 10, max: 12, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Nautilus PL Seated Press',       w: 60,   sets: 3, min: 10, max: 10, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Arsenal Fly Machine',            w: 30,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
    { day: 'push_a', ex: 'Arsenal Lateral Raises',         w: 40,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
    { day: 'push_a', ex: 'Cable Rope Overhead Extension',  w: 45,   sets: 3, min: 12, max: 12, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Tricep Pushdowns',               w: 54,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
    { day: 'push_a', ex: 'Nautilus Xpload Leg Press Incline', w: 90,   sets: 3, min: 10, max: 10, rir: 2, type: 'straight' },
    { day: 'push_a', ex: 'Nautilus Leg Extensions',        w: 120,  sets: null, min: 12, max: 15, rir: 1, type: 'myo' },

    // PUSH B
    { day: 'push_b', ex: 'Nautilus PL Flat Bench',         w: 60,   sets: 4, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'DB Flat Bench',                  w: 65,   sets: 3, min: 10, max: 12, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Standing Barbell OHP',           w: 25,   sets: 3, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Arsenal Fly Machine',            w: 30,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
    { day: 'push_b', ex: 'Arsenal Lateral Raises',         w: 30,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
    { day: 'push_b', ex: 'Cable Rope Overhead Extension',  w: 45,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
    { day: 'push_b', ex: 'Bodybuilder Squat Machine',      w: 90,   sets: 3, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'push_b', ex: 'Nautilus Leg Extensions',        w: 120,  sets: null, min: 12, max: 15, rir: 1, type: 'myo' },

    // PULL A
    { day: 'pull_a', ex: 'Nautilus Lat Pulldown overhand',    w: 121,  sets: 4, min: 8,  max: 10, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Nautilus Chest Supported Row Mid',  w: 140,  sets: 3, min: 10, max: 12, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Cable Face Pulls',                  w: 43,   sets: null, min: 15, max: 20, rir: 1, type: 'myo' },
    { day: 'pull_a', ex: 'Cable Lat Prayers',                 w: 58.5, sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
    { day: 'pull_a', ex: 'Cable Curls',                       w: 43,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
    { day: 'pull_a', ex: 'Hammer Curls',                      w: 35,   sets: 3, min: 12, max: 12, rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Romanian Deadlift',                 w: 135,  sets: 3, min: 8,  max: 8,  rir: 2, type: 'straight' },
    { day: 'pull_a', ex: 'Nautilus Hamstring Curls',          w: 80,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },

    // PULL B
    { day: 'pull_b', ex: 'Nautilus Lat Pulldown underhand',    w: 121,  sets: 4, min: 8,  max: 12, rir: 2, type: 'straight' },
    { day: 'pull_b', ex: 'Nautilus Chest Supported Row High',  w: 50,   sets: 3, min: 10, max: 15, rir: 2, type: 'straight' },
    { day: 'pull_b', ex: 'Cable Face Pulls',                   w: 58.5, sets: null, min: 15, max: 20, rir: 1, type: 'myo' },
    { day: 'pull_b', ex: 'Incline DB Curls',                   w: 20,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
    { day: 'pull_b', ex: 'Cable Curls',                        w: 38.5, sets: 3, min: 12, max: 12, rir: 2, type: 'straight' },
    { day: 'pull_b', ex: 'Nautilus Hamstring Curls',           w: 80,   sets: null, min: 12, max: 15, rir: 1, type: 'myo' },
  ];

  const targetRows = cycle4Targets
    .filter(t => t.w !== null)
    .map(t => ({
      user_id:      userId,
      exercise_id:  exMap[t.ex],
      split_day_id: dayMap[t.day],
      week_number:  4,
      mesocycle:    1,
      target_weight: t.w,
      target_sets:  t.sets,
      target_reps_min: t.min,
      target_reps_max: t.max,
      target_rir:   t.rir,
      set_type:     t.type,
      source:       'seed',
    }));

  const { error: tErr } = await supabase
    .from('progression_targets')
    .upsert(targetRows, {
      onConflict: 'user_id,exercise_id,split_day_id,week_number,mesocycle',
      ignoreDuplicates: false,
    });

  if (tErr) throw new Error(`Target seed failed: ${tErr.message}`);

  return { dayMap, exMap };
}
