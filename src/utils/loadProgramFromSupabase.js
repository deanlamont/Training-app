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
        intensifier,
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
          intensifier: sde.intensifier ?? undefined,
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

const DAY_ORDER = { push_a: 1, push_b: 2, pull_a: 3, pull_b: 4, day_5: 5 }

/**
 * Persists an edited program back to Supabase. Replaces split_day_exercises
 * for each day (delete + insert) and upserts current-week progression_targets.
 */
export async function saveProgramToSupabase(userId, program, progress) {
  if (!supabase || !userId) return

  const { data: exercises, error: exErr } = await supabase
    .from('exercises')
    .select('id, name')
  if (exErr || !exercises?.length) {
    throw new Error('exercises master table empty or unreachable')
  }
  const exMap = Object.fromEntries(exercises.map(e => [e.name, e.id]))

  for (const [dayKey, day] of Object.entries(program)) {
    const currentWeek = progress[dayKey]?.week ?? 4

    const { data: dayRow, error: dayErr } = await supabase
      .from('split_days')
      .upsert(
        {
          user_id: userId,
          day_key: dayKey,
          day_label: day.label,
          subtitle: day.sub ?? null,
          sort_order: DAY_ORDER[dayKey] ?? 99,
          current_week: currentWeek,
        },
        { onConflict: 'user_id,day_key' }
      )
      .select()
      .single()
    if (dayErr) throw new Error(`split_days upsert failed (${dayKey}): ${dayErr.message}`)

    await supabase.from('split_day_exercises').delete().eq('split_day_id', dayRow.id)

    const sdeRows = []
    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i]
      const exerciseId = exMap[ex.name]
      if (!exerciseId) {
        console.warn(`[saveProgram] Exercise not in master table: "${ex.name}" — skipped`)
        continue
      }
      sdeRows.push({
        split_day_id: dayRow.id,
        exercise_id: exerciseId,
        set_type: ex.type,
        target_sets: ex.sets ?? null,
        target_reps_min: ex.min,
        target_reps_max: ex.max,
        sort_order: i + 1,
        note: ex.note ?? null,
        short_id: ex.id,
        intensifier: ex.intensifier ?? null,
      })
    }
    if (sdeRows.length) {
      const { error: sdeErr } = await supabase.from('split_day_exercises').insert(sdeRows)
      if (sdeErr) throw new Error(`split_day_exercises insert failed (${dayKey}): ${sdeErr.message}`)
    }

    const targetRows = day.exercises
      .filter(ex => ex.w != null && exMap[ex.name])
      .map(ex => ({
        user_id: userId,
        exercise_id: exMap[ex.name],
        split_day_id: dayRow.id,
        week_number: currentWeek,
        mesocycle: 1,
        target_weight: ex.w,
        target_sets: ex.sets ?? null,
        target_reps_min: ex.min,
        target_reps_max: ex.max,
        target_rir: 2,
        set_type: ex.type,
        source: 'edit',
      }))
    if (targetRows.length) {
      const { error: tErr } = await supabase
        .from('progression_targets')
        .upsert(targetRows, {
          onConflict: 'user_id,exercise_id,split_day_id,week_number,mesocycle',
        })
      if (tErr) throw new Error(`progression_targets upsert failed (${dayKey}): ${tErr.message}`)
    }
  }
}

/**
 * Builds the home-screen "RECENT" history list from completed sessions.
 * Returns the most recent 20, newest first.
 */
export async function loadHistoryFromSupabase(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('sessions')
    .select('week_number, completed_at, notes, split_days ( day_key, day_label )')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(20)
  if (error) {
    console.error('[loadHistoryFromSupabase]', error)
    return []
  }
  return (data ?? []).map(r => ({
    date: r.completed_at,
    dayKey: r.split_days?.day_key ?? null,
    label: r.split_days?.day_label ?? '(unknown)',
    week: r.week_number,
    summary: r.notes ?? null,
  }))
}
