import { TRAINING_SYSTEM_PROMPT } from './claudeSystemPrompt.js';
import { buildTrainingPrompt } from './buildTrainingPrompt.js';
import { supabase } from '../utils/supabaseClient.js';

/**
 * After a session completes:
 * 1. Fetch all set logs + context from Supabase
 * 2. Call Claude API
 * 3. Parse response
 * 4. Save targets + flags to Supabase
 * 5. Return the result for UI display
 */
export async function processSessionWithClaude(sessionId) {
  // --- 1. Fetch session + set logs ---
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select(`
      *,
      split_days ( day_key, day_label )
    `)
    .eq('id', sessionId)
    .single();

  if (sErr) throw new Error(`Session fetch failed: ${sErr.message}`);

  const { data: setLogs, error: slErr } = await supabase
    .from('set_logs')
    .select(`
      *,
      exercises ( name )
    `)
    .eq('session_id', sessionId)
    .order('logged_at', { ascending: true });

  if (slErr) throw new Error(`Set logs fetch failed: ${slErr.message}`);

  // Flatten exercise name onto each log
  const logsWithName = setLogs.map(l => ({
    ...l,
    exercise_name: l.exercises?.name ?? 'Unknown'
  }));

  // --- 2. Fetch previous week targets ---
  const { data: previousTargets } = await supabase
    .from('progression_targets')
    .select(`*, exercises ( name )`)
    .eq('user_id', session.user_id)
    .eq('split_day_id', session.split_day_id)
    .eq('week_number', session.week_number - 1)
    .eq('mesocycle', session.mesocycle);

  const prevWithName = (previousTargets ?? []).map(t => ({
    ...t,
    exercise_name: t.exercises?.name ?? 'Unknown'
  }));

  // --- 3. Fetch active flags ---
  const { data: activeFlags } = await supabase
    .from('flags')
    .select(`*, exercises ( name )`)
    .eq('user_id', session.user_id)
    .eq('resolved', false);

  const flagsWithName = (activeFlags ?? []).map(f => ({
    ...f,
    exercise_name: f.exercises?.name ?? 'Unknown'
  }));

  // --- 4. Build prompt ---
  const userPrompt = buildTrainingPrompt({
    session: {
      ...session,
      day_label: session.split_days?.day_label
    },
    setLogs: logsWithName,
    previousTargets: prevWithName,
    activeFlags: flagsWithName
  });

  // --- 5. Call Claude API ---
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: TRAINING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${err}`);
  }

  const apiData = await response.json();
  const rawText = apiData.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  // --- 6. Parse JSON response ---
  let parsed;
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error(`Claude returned invalid JSON:\n${rawText}`);
  }

  // --- 7. Save targets to Supabase ---
  const exerciseMap = await getExerciseMap(parsed.targets.map(t => t.exercise_name));

  const targetRows = parsed.targets.map(t => ({
    user_id: session.user_id,
    exercise_id: exerciseMap[t.exercise_name],
    split_day_id: session.split_day_id,
    week_number: parsed.week_number,
    mesocycle: parsed.mesocycle,
    target_weight: t.target_weight,
    target_sets: t.target_sets ?? null,
    target_reps_min: t.target_reps_min,
    target_reps_max: t.target_reps_max,
    target_rir: t.target_rir,
    set_type: t.set_type,
    source: 'claude_api'
  }));

  const { error: insertErr } = await supabase
    .from('progression_targets')
    .upsert(targetRows, {
      onConflict: 'user_id,exercise_id,split_day_id,week_number,mesocycle'
    });

  if (insertErr) throw new Error(`Target insert failed: ${insertErr.message}`);

  // --- 8. Save new flags ---
  if (parsed.flags?.length > 0) {
    const flagRows = parsed.flags.map(f => ({
      user_id: session.user_id,
      exercise_id: exerciseMap[f.exercise_name],
      flag_type: f.flag_type,
      flag_message: f.flag_message,
      week_number: parsed.week_number,
      mesocycle: parsed.mesocycle
    }));

    await supabase.from('flags').insert(flagRows);
  }

  // --- 9. Mark session complete ---
  await supabase
    .from('sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', sessionId);

  return parsed;
}

// Helper: look up exercise IDs by name
async function getExerciseMap(names) {
  const unique = [...new Set(names)];
  const { data } = await supabase
    .from('exercises')
    .select('id, name')
    .in('name', unique);

  const map = {};
  for (const ex of (data ?? [])) map[ex.name] = ex.id;
  return map;
}
