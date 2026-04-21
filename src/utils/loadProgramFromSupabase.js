import { supabase } from './supabaseClient.js'

/**
 * Loads the user's full program from normalized Supabase tables.
 *
 * Returns { program, progress } in the same shape the app expects:
 *   program: { push_a: { key, label, sub, _split_day_id, exercises: [...] }, ... }
 *   progress: { push_a: { week: 3 }, ... }
 *
 * Each exercise carries hidden _exercise_id (UUID) so that completeSession
 * can write back to progression_targets without an extra lookup.
 *
 * Returns null if no split_days exist for this user (triggers fallback to DEFAULT_SPLIT).
 */
export async function loadProgramFromSupabase(userId) {
  if (!supabase) return null

  const { data: days, error: dErr } = await supabase
    .from('split_days')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  if (dErr || !days?.length) return null

  const program = {}
  const progress = {}

  for (const day of days) {
    const currentWeek = day.current_week ?? 3

    // Fetch ordered exercise roster with exercise name
    const { data: sdeRows } = await supabase
      .from('split_day_exercises')
      .select(`
        id,
        exercise_id,
        set_type,
        target_sets,
        target_reps_min,
        target_reps_max,
        note,
        short_id,
        exercises ( id, name )
      `)
      .eq('split_day_id', day.id)
      .order('sort_order', { ascending: true })

    // Fetch current-week weight targets for this day
    const { data: targets } = await supabase
      .from('progression_targets')
      .select('exercise_id, target_weight')
      .eq('user_id', userId)
      .eq('split_day_id', day.id)
      .eq('week_number', currentWeek)
      .eq('mesocycle', 1)

    const weightMap = Object.fromEntries(
      (targets ?? []).map(t => [t.exercise_id, t.target_weight])
    )

    program[day.day_key] = {
      key: day.day_key,
      label: day.day_label,
      sub: day.subtitle ?? '',
      _split_day_id: day.id,               // hidden — used for Supabase writes
      exercises: (sdeRows ?? []).map(sde => {
        const exId = sde.exercises?.id ?? sde.exercise_id
        return {
          // Use short_id (e.g. 'nb_inc') if available so the coach prompt stays concise
          id: sde.short_id ?? exId,
          _exercise_id: sde.exercise_id,    // hidden — used for progression_targets writes
          name: sde.exercises?.name ?? '(unknown)',
          type: sde.set_type,
          sets: sde.target_sets ?? undefined,
          min: sde.target_reps_min,
          max: sde.target_reps_max,
          w: weightMap[sde.exercise_id] ?? null,
          note: sde.note ?? undefined,
        }
      }),
    }

    progress[day.day_key] = { week: currentWeek }
  }

  return { program, progress }
}

/**
 * Writes new week's targets to progression_targets and bumps current_week
 * on the split_day after a session completes.
 */
export async function saveSessionTargets(userId, dayKey, splitDayId, targets, exercises, nextCycle) {
  if (!supabase || !splitDayId) return

  const targetRows = targets
    .map(t => {
      const ex = exercises.find(e => e.id === t.exercise_id || e.name === t.exercise_name)
      if (!ex?._exercise_id || t.target_weight == null) return null
      return {
        user_id: userId,
        exercise_id: ex._exercise_id,
        split_day_id: splitDayId,
        week_number: nextCycle,
        mesocycle: 1,
        target_weight: t.target_weight,
        target_sets: t.target_sets ?? ex.sets ?? null,
        target_reps_min: t.target_reps_min ?? ex.min,
        target_reps_max: t.target_reps_max ?? ex.max,
        target_rir: 2,
        set_type: ex.type,
        source: 'claude_api',
      }
    })
    .filter(Boolean)

  if (targetRows.length) {
    const { error: upErr } = await supabase.from('progression_targets').upsert(targetRows, {
      onConflict: 'user_id,exercise_id,split_day_id,week_number,mesocycle',
    })
    if (upErr) throw new Error(`Target upsert failed: ${upErr.message}`)
  }

  const { error: wkErr } = await supabase
    .from('split_days')
    .update({ current_week: nextCycle })
    .eq('id', splitDayId)
  if (wkErr) throw new Error(`Cycle bump failed: ${wkErr.message}`)
}
