// Deterministic RP-method progression. No LLM, no JSON, no network.
// Given a completed session, returns next-cycle targets for every exercise.

const DEFAULT_INCREMENT = 5

function avg(nums) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// Returns { nextWeight, status, note } for one exercise given its logged sets.
function decideOne(ex, sets) {
  const work = (sets || []).filter(s =>
    s && s.type !== 'swap' && s.reps != null && s.w != null
  )

  // Skipped entirely
  if (!work.length) {
    return { nextWeight: ex.w, status: 'skipped', note: 'skipped' }
  }

  const increment = ex.increment ?? DEFAULT_INCREMENT
  const rirs = work.map(s => s.rir).filter(r => r != null)
  const avgRir = avg(rirs)

  // Myo-reps: the activation set drives progression
  if (ex.type === 'myo') {
    const activation = work.find(s => s.type === 'act') || work[0]
    const reps = activation.reps
    if (reps >= 15) {
      return {
        nextWeight: (ex.w ?? activation.w) + increment,
        status: 'up',
        note: `+${increment}lb (activation hit ${reps})`,
      }
    }
    if (activation.rir != null && activation.rir <= 0) {
      return {
        nextWeight: Math.max(0, (ex.w ?? activation.w) - increment),
        status: 'deload',
        note: 'activation grinding — back off',
      }
    }
    return { nextWeight: ex.w ?? activation.w, status: 'hold', note: 'hold, push reps' }
  }

  // Straight sets
  const minReps = ex.min ?? 0
  const maxReps = ex.max ?? minReps
  const missedMin = work.some(s => s.reps < minReps)
  const hitMax = work.every(s => s.reps >= maxReps)

  if (avgRir !== null && avgRir <= 0) {
    return {
      nextWeight: Math.max(0, (ex.w ?? 0) - increment),
      status: 'deload',
      note: 'grinding — back off',
    }
  }
  if (missedMin) {
    return { nextWeight: ex.w, status: 'hold', note: 'fell short — hold' }
  }
  if (hitMax && (avgRir === null || avgRir >= 2)) {
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
    else if (decision.status === 'deload') movers.push(`${ex.name} ↓`)
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
