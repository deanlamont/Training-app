import { supabase } from './supabaseClient.js'

/**
 * Creates a Supabase `sessions` row at the start of a workout.
 * Returns the new session UUID, or null if Supabase is unavailable.
 * Never throws — failures are logged and the app falls back to localStorage only.
 */
export async function createSessionRow({ userId, splitDayId, weekNumber, mesocycle = 1 }) {
  if (!supabase || !userId || !splitDayId) return null
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        split_day_id: splitDayId,
        week_number: weekNumber,
        mesocycle,
      })
      .select('id')
      .single()
    if (error) throw error
    return data?.id ?? null
  } catch (e) {
    console.error('[createSessionRow] failed', e)
    return null
  }
}

/**
 * Writes (or rewrites) the logged sets for a single exercise within a session.
 * Deletes any prior set_logs for that (session, exercise) pair, then inserts fresh rows.
 * Silently skips if we don't have the exercise UUID (e.g. after a swap to unknown exercise).
 */
export async function writeExerciseSets({ sessionId, exerciseUuid, sets }) {
  if (!supabase || !sessionId || !exerciseUuid || !Array.isArray(sets)) return
  try {
    await supabase
      .from('set_logs')
      .delete()
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseUuid)

    const rows = sets
      .filter(s => s && s.type !== 'swap' && s.w != null && s.reps != null)
      .map((s, i) => ({
        session_id: sessionId,
        exercise_id: exerciseUuid,
        set_number: s.type === 'act' ? 0 : (s.num ?? i + 1),
        set_type: s.type === 'act' ? 'myo_activation'
                : s.type === 'mini' ? 'myo_mini'
                : 'straight',
        weight: s.w,
        reps: s.reps,
        rir: s.rir ?? null,
      }))

    if (rows.length) {
      const { error } = await supabase.from('set_logs').insert(rows)
      if (error) throw error
    }
  } catch (e) {
    console.error('[writeExerciseSets] failed', e)
  }
}

/**
 * Looks up an exercise in the master table by name. Case-insensitive exact match first,
 * then a loose contains-match as fallback so the coach's phrasing ("DB Curl") resolves
 * against the canonical name ("DB Curls").
 * Returns { id, name } from the master table, or null if nothing matches.
 */
export async function resolveExerciseByName(name) {
  if (!supabase || !name) return null
  const trimmed = name.trim()
  try {
    // exact case-insensitive
    const { data: exact } = await supabase
      .from('exercises')
      .select('id, name')
      .ilike('name', trimmed)
      .limit(1)
    if (exact?.length) return exact[0]

    // fuzzy: any name containing the query or vice versa
    const { data: fuzzy } = await supabase
      .from('exercises')
      .select('id, name')
      .ilike('name', `%${trimmed}%`)
      .limit(1)
    if (fuzzy?.length) return fuzzy[0]

    return null
  } catch (e) {
    console.error('[resolveExerciseByName] failed', e)
    return null
  }
}

/**
 * Marks a session as complete. Non-blocking — errors are logged, not thrown.
 */
export async function markSessionComplete(sessionId) {
  if (!supabase || !sessionId) return
  try {
    await supabase
      .from('sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId)
  } catch (e) {
    console.error('[markSessionComplete] failed', e)
  }
}
