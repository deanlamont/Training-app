/**
 * Builds the user prompt sent to Claude after a completed session.
 * @param {Object} params
 * @param {Object} params.session        — session row from Supabase
 * @param {Array}  params.setLogs        — all set_logs for this session, each with exercise_name joined
 * @param {Array}  params.previousTargets — progression_targets from LAST week for context
 * @param {Array}  params.activeFlags    — any unresolved flags for this user
 */
export function buildTrainingPrompt({ session, setLogs, previousTargets, activeFlags }) {
  const { week_number, mesocycle, session_date } = session;

  // Group set logs by exercise
  const byExercise = {};
  for (const log of setLogs) {
    if (!byExercise[log.exercise_name]) byExercise[log.exercise_name] = [];
    byExercise[log.exercise_name].push(log);
  }

  // Format sets into readable blocks
  const exerciseBlocks = Object.entries(byExercise).map(([name, sets]) => {
    const setType = sets[0].set_type.startsWith('myo') ? 'myo-reps' : 'straight sets';
    const setLines = sets.map(s => {
      const label = s.set_type === 'myo_activation'
        ? `  Activation: ${s.weight}lb × ${s.reps} reps${s.rir != null ? ` (${s.rir} RIR)` : ''}`
        : s.set_type === 'myo_mini'
          ? `  Mini set ${s.set_number}: ${s.weight}lb × ${s.reps} reps`
          : `  Set ${s.set_number}: ${s.weight}lb × ${s.reps} reps${s.rir != null ? ` (${s.rir} RIR)` : ''}`;
      return label + (s.notes ? ` — ${s.notes}` : '');
    }).join('\n');
    return `${name} [${setType}]:\n${setLines}`;
  }).join('\n\n');

  // Previous targets context
  const prevBlock = previousTargets.length > 0
    ? previousTargets.map(t =>
        `  ${t.exercise_name}: ${t.target_weight}lb, ${t.target_sets ? `${t.target_sets}×` : 'myo '}${t.target_reps_min}${t.target_reps_max !== t.target_reps_min ? `-${t.target_reps_max}` : ''} reps @ ${t.target_rir} RIR`
      ).join('\n')
    : '  None (first session of mesocycle)';

  // Active flags
  const flagBlock = activeFlags.length > 0
    ? activeFlags.map(f => `  ⚠ ${f.exercise_name}: ${f.flag_type} — ${f.flag_message}`).join('\n')
    : '  None';

  return `SESSION COMPLETED
Date: ${session_date}
Week: ${week_number}  |  Mesocycle: ${mesocycle}
Day: ${session.day_label}

SETS LOGGED:
${exerciseBlocks}

PREVIOUS WEEK TARGETS (for reference):
${prevBlock}

ACTIVE FLAGS (carry these forward):
${flagBlock}

Based on this session, return next week's (Week ${week_number + 1}) progression targets for every exercise above. Apply RP progressive overload principles. Return ONLY valid JSON as specified.`;
}
