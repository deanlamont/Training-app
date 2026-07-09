// Simple progressive overload.
//   Hit the top of the rep range on every working set → +5lb. Otherwise hold
//   the weight and push reps. Old 'act'/'mini' set types from historical myo
//   sessions are treated as regular work sets.
// No RIR, no auto-deload. To back off a stalled lift, edit the weight manually.

const DEFAULT_INCREMENT = 5

function decideOne(ex, sets) {
  // Challenge rows (optional final-set games) are excluded — a drop set at
  // -30% or a 5s-tempo set must not block or fake a weight increase.
  const work = (sets || []).filter(s =>
    s && s.type !== 'swap' && s.type !== 'challenge' && s.reps != null && s.w != null
  )

  if (!work.length) {
    return { nextWeight: ex.w, status: 'skipped', note: 'skipped' }
  }

  const increment = ex.increment ?? DEFAULT_INCREMENT

  // Chipper: one total-rep target, chipped away in as few sets as possible.
  // Weight goes up once the full target fits in 3 or fewer sets.
  if (ex.type === 'chipper') {
    const target = ex.max ?? ex.min ?? 0
    const total = work.reduce((a, s) => a + (s.reps || 0), 0)
    if (target > 0 && total >= target && work.length <= 3) {
      return {
        nextWeight: (ex.w ?? 0) + increment,
        status: 'up',
        note: `chipped ${total} in ${work.length} sets → +${increment}lb`,
      }
    }
    return {
      nextWeight: ex.w,
      status: 'hold',
      note: `chip: ${total}/${target} in ${work.length} sets — get it under 4 sets to move up`,
    }
  }

  const maxReps = ex.max ?? ex.min ?? 0
  const hitMax = work.every(s => s.reps >= maxReps)

  if (hitMax) {
    return {
      nextWeight: (ex.w ?? 0) + increment,
      status: 'up',
      note: `+${increment}lb`,
    }
  }
  return { nextWeight: ex.w, status: 'hold', note: 'hold, push reps' }
}

/**
 * @param {Array} exercises  — session exercises (with .id, .name, .w, .min, .max, .type, ._exercise_id)
 * @param {Object} logs      — { [exerciseId]: Array<SetLog> }
 * @param {number} cycle     — the cycle just completed
 * @returns {{ next_cycle, targets, session_summary }}
 */
export function computeNextTargets(exercises, logs, cycle) {
  const targets = []
  const movers = []

  for (const ex of exercises) {
    const decision = decideOne(ex, logs[ex.id])
    targets.push({
      exercise_id: ex.id,
      exercise_name: ex.name,
      _exercise_id: ex._exercise_id,
      set_type: ex.type,
      target_weight: decision.nextWeight,
      target_sets: ex.sets ?? null,
      target_reps_min: ex.min,
      target_reps_max: ex.max,
      status: decision.status,
      note: decision.note,
    })
    if (decision.status === 'up') movers.push(`${ex.name} ↑`)
  }

  const logged = targets.filter(t => t.status !== 'skipped').length
  const summary = movers.length
    ? `${logged} exercises logged. ${movers.slice(0, 3).join(', ')}${movers.length > 3 ? '…' : ''}`
    : `${logged} exercises logged. All holding.`

  return {
    next_cycle: cycle + 1,
    targets,
    session_summary: summary,
  }
}
