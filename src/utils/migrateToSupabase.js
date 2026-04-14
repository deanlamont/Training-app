import { supabase } from './supabaseClient.js'

const DAY_ORDER = { push_a: 1, push_b: 2, pull_a: 3, pull_b: 4, day_5: 5 }

/**
 * One-time migration: seeds the user's current split (from localStorage/DEFAULT_SPLIT)
 * into the normalized Supabase tables (split_days, split_day_exercises, progression_targets).
 *
 * Safe to call multiple times — uses upserts and delete+reinsert patterns.
 * The app sets localStorage flag 'supabase_migrated' after success so it only runs once.
 */
export async function migrateToSupabase(userId, split, progress) {
  if (!supabase) return

  // 1. Build exercise name → UUID map from master table
  const { data: exercises, error: exErr } = await supabase
    .from('exercises')
    .select('id, name')

  if (exErr || !exercises?.length) {
    throw new Error('exercises table empty or unreachable — run seed.sql first')
  }

  const exMap = Object.fromEntries(exercises.map(e => [e.name, e.id]))

  // 3. Seed each training day
  for (const [dayKey, day] of Object.entries(split)) {
    const currentWeek = progress[dayKey]?.week ?? (dayKey === 'day_5' ? 1 : 3)

    // 3a. Upsert split_days row
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

    // 3b. Replace all exercises for this day (delete + insert for clean ordering)
    await supabase.from('split_day_exercises').delete().eq('split_day_id', dayRow.id)

    const sdeRows = []
    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i]
      const exerciseId = exMap[ex.name]
      if (!exerciseId) {
        console.warn(`[migrate] Exercise not in master table: "${ex.name}" — skipped`)
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
        short_id: ex.id,          // preserve short app-key (e.g. 'nb_inc') for coach
      })
    }

    if (sdeRows.length) {
      const { error: sdeErr } = await supabase.from('split_day_exercises').insert(sdeRows)
      if (sdeErr) throw new Error(`split_day_exercises insert failed (${dayKey}): ${sdeErr.message}`)
    }

    // 3c. Upsert progression_targets for exercises that have a known current weight
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
        source: 'migration',
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
