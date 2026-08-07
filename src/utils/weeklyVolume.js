import { supabase } from './supabaseClient.js'

/**
 * Weekly hard-set targets per muscle group.
 *
 * These are the numbers the 2026-08-07 volume rebalance was built around:
 * 12-16 sets/week is the growth sweet spot, ~6 maintains. Muscles that get
 * heavy indirect work (triceps from pressing, front delts from every press)
 * carry deliberately low DIRECT targets.
 *
 * Order here is display order — priorities first.
 */
export const VOLUME_TARGETS = [
  { key: 'chest',      label: 'Chest',      target: 12 },
  { key: 'back',       label: 'Back',       target: 16 },
  { key: 'side_delt',  label: 'Side delts', target: 12 },
  { key: 'rear_delt',  label: 'Rear delts', target: 8 },
  { key: 'biceps',     label: 'Biceps',     target: 8 },
  { key: 'triceps',    label: 'Triceps',    target: 6 },
  { key: 'shoulders',  label: 'Overhead',   target: 6 },
  { key: 'quads',      label: 'Quads',      target: 8 },
  { key: 'hamstrings', label: 'Hamstrings', target: 6 },
  { key: 'glutes',     label: 'Glutes',     target: 6 },
  { key: 'core',       label: 'Core',       target: 6 },
  { key: 'calves',     label: 'Calves',     target: 6 },
]

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** Local YYYY-MM-DD. Deliberately not toISOString() — that converts to UTC and
 *  can shift the date across midnight, putting Sunday-night sets in the wrong week. */
function localDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/**
 * Monday-anchored week containing `now`. A fixed Mon-Sun week (rather than a
 * rolling 7 days) means the board resets to zero on Monday — you get a clean
 * target to chase instead of a number that never quite starts over.
 */
export function weekBounds(now = new Date()) {
  const start = new Date(now)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

/** "WEEK OF AUG 4" */
export function weekLabel(now = new Date()) {
  const { start } = weekBounds(now)
  return `WEEK OF ${MONTHS[start.getMonth()]} ${start.getDate()}`
}

/**
 * Counts hard sets logged in the current Mon-Sun week, grouped by muscle group.
 *
 * Challenge sets are excluded — a drop set at -30% or a 5s-tempo set is a game,
 * not volume, and counting it would inflate the number that drives programming
 * decisions. Same reasoning as progression.js.
 *
 * Returns [{ key, label, target, done }], or null if Supabase is unavailable.
 */
export async function loadWeeklyVolume(userId) {
  if (!supabase || !userId) return null
  const { start, end } = weekBounds()

  const { data, error } = await supabase
    .from('set_logs')
    .select('set_type, exercises!inner(muscle_group), sessions!inner(user_id, session_date)')
    .eq('sessions.user_id', userId)
    .gte('sessions.session_date', localDate(start))
    .lte('sessions.session_date', localDate(end))

  if (error) {
    console.error('[loadWeeklyVolume]', error)
    return null
  }

  const counts = {}
  for (const row of data ?? []) {
    if (typeof row.set_type === 'string' && row.set_type.startsWith('challenge')) continue
    const mg = row.exercises?.muscle_group
    if (!mg) continue
    counts[mg] = (counts[mg] ?? 0) + 1
  }

  return VOLUME_TARGETS.map(t => ({ ...t, done: counts[t.key] ?? 0 }))
}
