import { useState, useRef, useEffect } from 'react'

const WEEK = 3
const MESO = 1
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY

const C = {
  bg:      '#080808',
  surface: '#1A1A1A',
  border:  '#2E2E2E',
  text:    '#FFFFFF',
  sub:     '#BBBBBB',
  muted:   '#888888',
  acc:     '#C8FF00',
  blue:    '#60B0FF',
  orange:  '#FFB347',
  green:   '#4AFF6A',
}

const SPLIT = {
  push_a: {
    key: 'push_a', label: 'Push A', sub: 'Chest & Triceps',
    exercises: [
      { id: 'nb_inc',    name: 'Nautilus PL Incline Bench',  type: 'straight', sets: 3, min: 8,  max: 8,  w: 55,   note: '/side' },
      { id: 'lat_r_a',  name: 'Arsenal Lateral Raises',      type: 'myo',      w: 35 },
      { id: 'db_flat',  name: 'DB Flat Bench',               type: 'straight', sets: 3, min: 8,  max: 8,  w: 70 },
      { id: 'hack',     name: 'Hack Squat',                  type: 'straight', sets: 3, min: 8,  max: 8,  w: 45,   note: '/side' },
      { id: 'tri_push', name: 'Tricep Pushdowns',            type: 'myo',      w: 54 },
      { id: 'leg_ext_a',name: 'Nautilus Leg Extensions',     type: 'myo',      w: 100 },
      { id: 'tri_over', name: 'Tricep Overhead Ext',         type: 'straight', sets: 3, min: 15, max: 15, w: 44 },
      { id: 'fly_a',    name: 'Arsenal Fly Machine',         type: 'myo',      w: 27.5 },
    ]
  },
  push_b: {
    key: 'push_b', label: 'Push B', sub: 'Chest & Shoulders',
    exercises: [
      { id: 'nb_flat',  name: 'Nautilus PL Flat Bench',      type: 'straight', sets: 3, min: 8,  max: 10, w: 80,   note: '/side' },
      { id: 'db_inc',   name: 'DB 45 Degree Incline',        type: 'straight', sets: 3, min: 10, max: 12, w: 55 },
      { id: 'lat_r_b',  name: 'Arsenal Lateral Raises',      type: 'myo',      w: 35 },
      { id: 'seat_pr',  name: 'Nautilus PL Seated Press',    type: 'straight', sets: 3, min: 10, max: 10, w: 55,   note: '/side' },
      { id: 'cg_bench', name: 'Close Grip DB Bench',         type: 'straight', sets: 3, min: 10, max: 12, w: null },
      { id: 'leg_pr',   name: 'Nautilus Leg Press',          type: 'straight', sets: 3, min: 10, max: 10, w: 75,   note: '/side' },
      { id: 'leg_ext_b',name: 'Nautilus Leg Extensions',     type: 'myo',      w: 120 },
      { id: 'fly_b',    name: 'Arsenal Fly Machine',         type: 'myo',      w: 25 },
    ]
  },
  pull_a: {
    key: 'pull_a', label: 'Pull A', sub: 'Back Width & Biceps',
    exercises: [
      { id: 'pd_over',  name: 'Lat Pulldown Overhand',       type: 'straight', sets: 4, min: 8,  max: 10, w: 148 },
      { id: 'rdl',      name: 'Romanian Deadlift',           type: 'straight', sets: 3, min: 8,  max: 10, w: null },
      { id: 'row_mid',  name: 'CS Row Mid',                  type: 'straight', sets: 3, min: 10, max: 12, w: 135 },
      { id: 'ham_a',    name: 'Nautilus Hamstring Curls',    type: 'myo',      w: 80 },
      { id: 'row_v',    name: 'Seated Row V-bar',            type: 'straight', sets: 3, min: 12, max: 12, w: 120 },
      { id: 'cc_a',     name: 'Cable Curls',                 type: 'myo',      w: 38.5 },
      { id: 'fp_a',     name: 'Cable Face Pulls',            type: 'myo',      w: 54 },
      { id: 'lat_pr',   name: 'Cable Lat Prayers',           type: 'myo',      w: 54 },
      { id: 'rd_a',     name: 'CS Rear Delt Raises',         type: 'myo',      w: null },
    ]
  },
  pull_b: {
    key: 'pull_b', label: 'Pull B', sub: 'Biceps & Upper Back',
    exercises: [
      { id: 'pd_under', name: 'Lat Pulldown Underhand',      type: 'straight', sets: 4, min: 8,  max: 12, w: null },
      { id: 'inc_curl', name: 'Incline DB Curls',            type: 'myo',      w: null },
      { id: 'row_high', name: 'CS Row High',                 type: 'straight', sets: 3, min: 10, max: 15, w: null },
      { id: 'fp_b',     name: 'Cable Face Pulls',            type: 'myo',      w: null },
      { id: 'row_wide', name: 'Seated Row Wide',             type: 'straight', sets: 3, min: 10, max: 12, w: null },
      { id: 'cc_b',     name: 'Cable Curls',                 type: 'myo',      w: null },
      { id: 'ham_b',    name: 'Nautilus Hamstring Curls',    type: 'myo',      w: null },
      { id: 'rd_b',     name: 'CS Rear Delt Raises',         type: 'myo',      w: null },
    ]
  },
}

function fmt(n) {
  if (n == null) return 'TBD'
  return Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(1)).toString()
}

function buildCoachSys(dayKey, logs, exercises) {
  const day = SPLIT[dayKey]
  const list = exercises.map((ex, i) => {
    const done = (logs[ex.id] || []).length > 0
    const t = ex.type === 'straight'
      ? `${ex.sets}x${ex.min}${ex.max !== ex.min ? '-' + ex.max : ''} @ ${ex.w ?? 'TBD'}lb${ex.note ?? ''}`
      : `Myo @ ${ex.w ?? 'TBD'}lb`
    return `${i + 1}. [${ex.id}] ${ex.name} — ${ex.type.toUpperCase()} — ${t}${done ? ' [LOGGED]' : ''}`
  }).join('\n')
  return `You are a concise RP Strength coach tracking a live gym session. Be brief — 1-2 sentences max.

SESSION: ${day.label} | Week ${WEEK} | Meso ${MESO}
EXERCISES:
${list}

Log what athlete tells you. When they say done/finished → fire complete_session.
Always return ONLY valid JSON, no markdown:
{"message":"<response>","actions":[]}

Actions:
{"type":"log_sets","exercise_id":"<id>","sets":[{"num":1,"w":55,"reps":8}]}
{"type":"log_myo","exercise_id":"<id>","activation":{"w":35,"reps":13},"mini_sets":4}
{"type":"swap_exercise","from_id":"<id>","to_name":"<new name>"}
{"type":"complete_session"}`
}

const PROG_SYS = `Expert RP Strength coach. Return next week's targets. Add 5lb compounds OR +1 rep. Nautilus=5lb increments. Cable=4.5lb. Return ONLY valid JSON:
{"week_number":4,"targets":[{"exercise_id":"<id>","exercise_name":"<n>","set_type":"straight|myo","target_weight":<num>,"target_sets":<int|null>,"target_reps_min":<int>,"target_reps_max":<int>,"target_rir":<int>,"coaching_note":"<or null>"}],"flags":[],"session_summary":"<2 sentences>"}`

function buildProgPrompt(dayKey, logs, exercises) {
  const day = SPLIT[dayKey]
  const lines = exercises.map(ex => {
    const sets = logs[ex.id] || []
    if (!sets.length) return `[${ex.id}] ${ex.name}: SKIPPED`
    if (ex.type === 'straight') return `[${ex.id}] ${ex.name}: ${sets.map(s => `Set${s.num || '?'} ${s.w}lb x${s.reps}`).join(', ')}`
    const act = sets.find(s => s.type === 'act')
    const minis = sets.filter(s => s.type === 'mini')
    return `[${ex.id}] ${ex.name}: Act ${act?.w}lb x${act?.reps}, ${minis.length} minis x5`
  })
  return `${day.label} | Week ${WEEK} Meso ${MESO}\n${lines.join('\n')}\nReturn Week 4 targets. JSON only.`
}

async function callClaude(system, messages, maxTokens = 400) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, system, messages })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('')
}

function HomeScreen({ onStart }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '36px 20px 40px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 13, color: C.acc, letterSpacing: 4, marginBottom: 10, fontWeight: 'bold' }}>SWOLEBRO TRAINING</div>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: C.text }}>WEEK {WEEK}</div>
        <div style={{ fontSize: 18, color: C.sub, letterSpacing: 2, marginTop: 8 }}>MESOCYCLE {MESO} · RP METHOD</div>
      </div>
      <div style={{ fontSize: 13, color: C.muted, letterSpacing: 2, marginBottom: 16, fontWeight: 'bold' }}>SELECT TODAY'S SESSION</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {Object.values(SPLIT).map(d => (
          <button key={d.key} onClick={() => onStart(d.key)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 18px', textAlign: 'left', cursor: 'pointer', color: C.text, fontFamily: 'inherit' }}>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: C.text }}>{d.label}</div>
            <div style={{ fontSize: 15, color: C.sub }}>{d.sub}</div>
            <div style={{ marginTop: 14, fontSize: 13, color: C.muted, fontWeight: 'bold', letterSpacing: 1 }}>{d.exercises.length} EXERCISES</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function SessionScreen({ dayKey, onBack }) {
  const day = SPLIT[dayKey]
  const [tab, setTab] = useState('coach')
  const [exercises, setExercises] = useState(() => JSON.parse(JSON.stringify(day.exercises)))
  const [logs, setLogs] = useState({})
  const [chat, setChat] = useState([{ role: 'assistant', content: `${day.label} — ${day.exercises.length} exercises. Tell me what you do as you go and I'll log it all. Tap WORKOUT to check your targets anytime.` }])
  const [thinking, setThinking] = useState(false)
  const [input, setInput] = useState('')
  const [screen, setScreen] = useState('session')
  const [result, setResult] = useState(null)
  const chatRef = useRef(null)

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [chat, thinking])

  const loggedCount = exercises.filter(ex => (logs[ex.id] || []).length > 0).length

  async function send() {
    const text = input.trim()
    if (!text || thinking) return
    const newChat = [...chat, { role: 'user', content: text }]
    setChat(newChat); setThinking(true); setInput('')
    try {
      const firstUser = newChat.findIndex(m => m.role === 'user')
      const msgs = newChat.slice(firstUser).map(m => ({ role: m.role, content: m.content }))
      const raw = await callClaude(buildCoachSys(dayKey, logs, exercises), msgs)
      let parsed
      try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) }
      catch { parsed = { message: raw, actions: [] } }
      const newLogs = { ...logs }
      const newEx = [...exercises]
      let doComplete = false
      for (const a of (parsed.actions || [])) {
        if (a.type === 'log_sets' && a.exercise_id)
          newLogs[a.exercise_id] = (a.sets || []).map(s => ({ ...s, type: 'straight' }))
        if (a.type === 'log_myo' && a.exercise_id) {
          const la = [{ type: 'act', w: a.activation?.w, reps: a.activation?.reps }]
          for (let i = 0; i < (a.mini_sets ?? 4); i++) la.push({ type: 'mini', num: i + 1, w: a.activation?.w, reps: 5 })
          newLogs[a.exercise_id] = la
        }
        if (a.type === 'swap_exercise' && a.from_id) {
          const idx = newEx.findIndex(e => e.id === a.from_id)
          if (idx >= 0) { newEx[idx] = { ...newEx[idx], name: a.to_name, w: null }; newLogs[a.from_id] = [{ type: 'swap' }] }
        }
        if (a.type === 'complete_session') doComplete = true
      }
      setLogs(newLogs); setExercises(newEx)
      setChat([...newChat, { role: 'assistant', content: parsed.message }])
      setThinking(false)
      if (doComplete) setTimeout(() => runProg(newLogs, newEx), 600)
    } catch (e) {
      setChat([...newChat, { role: 'assistant', content: `Error: ${e.message}` }])
      setThinking(false)
    }
  }

  async function runProg(finalLogs, finalEx) {
    setScreen('processing')
    try {
      const raw = await callClaude(PROG_SYS, [{ role: 'user', content: buildProgPrompt(dayKey, finalLogs, finalEx) }], 1000)
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      setResult(parsed); setScreen('results')
    } catch (e) {
      setResult({ session_summary: `Error: ${e.message}`, targets: [], flags: [] }); setScreen('results')
    }
  }

  if (screen === 'processing') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 52, height: 52, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.acc, animation: 'spin .8s linear infinite' }} />
      <div style={{ fontSize: 20, color: C.sub, letterSpacing: 2, fontWeight: 'bold' }}>CALCULATING WEEK {WEEK + 1}...</div>
    </div>
  )

  if (screen === 'results') return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 40px' }}>
      <div style={{ fontSize: 13, color: C.acc, letterSpacing: 3, marginBottom: 8, fontWeight: 'bold' }}>WEEK {result?.week_number || WEEK + 1} TARGETS</div>
      <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, marginBottom: 6, color: C.text }}>{day.label}</div>
      {result?.session_summary && (
        <div style={{ background: '#0D1F00', border: '1px solid #2A4000', borderRadius: 12, padding: '16px 18px', margin: '18px 0 24px' }}>
          <div style={{ fontSize: 13, color: C.acc, letterSpacing: 1, marginBottom: 8, fontWeight: 'bold' }}>COACH NOTE</div>
          <div style={{ fontSize: 17, color: C.sub, lineHeight: 1.6 }}>{result.session_summary}</div>
        </div>
      )}
      <div style={{ marginBottom: 28 }}>
        {(result?.targets || []).map((t, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{t.exercise_name}</div>
              {t.coaching_note && <div style={{ fontSize: 14, color: C.orange, marginTop: 4 }}>↳ {t.coaching_note}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 22, color: C.acc, fontWeight: 800, fontFamily: 'monospace' }}>{fmt(t.target_weight)}lb</div>
              <div style={{ fontSize: 15, color: C.sub, marginTop: 2 }}>{t.target_sets ? t.target_sets + '×' : 'myo '}{t.target_reps_min}{t.target_reps_max !== t.target_reps_min ? '-' + t.target_reps_max : ''}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onBack} style={{ width: '100%', padding: 20, borderRadius: 14, background: C.acc, color: C.bg, fontSize: 20, fontWeight: 800, letterSpacing: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        DONE · BACK TO HOME
      </button>
    </div>
  )

  return (
    <>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '16px 18px', borderBottom: `1px solid ${C.border}`, gap: 12 }}>
        <button onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', color: C.sub, fontSize: 30, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{day.label}</div>
          <div style={{ fontSize: 15, color: C.sub, marginTop: 3 }}>{day.sub}</div>
        </div>
        <div style={{ fontSize: 17, color: C.muted, fontFamily: 'monospace', fontWeight: 'bold' }}>{loggedCount}/{exercises.length}</div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'coach' ? (
          <>
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
              {chat.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                  <div style={{ maxWidth: '85%', padding: '14px 18px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? C.acc : C.surface, color: m.role === 'user' ? C.bg : C.text, fontSize: 17, lineHeight: 1.5, fontWeight: m.role === 'user' ? 600 : 400 }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div style={{ padding: '16px 22px', borderRadius: '18px 18px 18px 4px', background: C.surface, fontSize: 24, color: C.muted, letterSpacing: 6 }}>...</div>
                </div>
              )}
            </div>
            <div style={{ padding: '10px 14px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea rows={1} value={input} placeholder="Tell me what you did..."
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 17, padding: '13px 15px', lineHeight: 1.4, resize: 'none', outline: 'none', overflowY: 'hidden', fontFamily: 'inherit' }}
              />
              <button onClick={send} aria-label="Send" style={{ background: C.acc, border: 'none', borderRadius: 12, width: 52, height: 52, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {exercises.map((ex, i) => {
              const logged = (logs[ex.id] || []).length > 0
              const target = ex.type === 'straight'
                ? `${ex.sets}×${ex.min}${ex.max !== ex.min ? '-' + ex.max : ''} @ ${fmt(ex.w)}lb${ex.note ?? ''}`
                : `Myo-reps @ ${fmt(ex.w)}lb`
              return (
                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', padding: '18px 18px', borderBottom: `1px solid ${C.border}`, gap: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${logged ? C.green : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: logged ? '#0A2800' : 'transparent' }}>
                    {logged
                      ? <span style={{ color: C.green, fontSize: 17, fontWeight: 'bold' }}>✓</span>
                      : <span style={{ color: C.muted, fontSize: 14, fontWeight: 'bold' }}>{i + 1}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0, opacity: logged ? 0.55 : 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{ex.name}</div>
                    <div style={{ fontSize: 15, color: C.sub, marginTop: 5 }}>{target}</div>
                  </div>
                  <div style={{ fontSize: 13, color: ex.type === 'myo' ? C.orange : C.blue, letterSpacing: 1, fontWeight: 'bold', flexShrink: 0 }}>
                    {ex.type === 'myo' ? 'MYO' : 'SETS'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, display: 'flex', borderTop: `1px solid ${C.border}` }}>
        {['coach', 'workout'].map(t => (
          <button key={t} onClick={() => setTab(t)} aria-label={t}
            style={{ flex: 1, border: 'none', background: 'none', color: tab === t ? C.text : C.muted, fontSize: 16, fontWeight: 800, letterSpacing: 2, padding: '17px 0', cursor: 'pointer', borderTop: `3px solid ${tab === t ? C.acc : 'transparent'}`, fontFamily: 'inherit' }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
    </>
  )
}

export default function App() {
  const [dayKey, setDayKey] = useState(null)
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', color: C.text, fontFamily: '-apple-system, Arial, sans-serif' }}>
      {!dayKey ? <HomeScreen onStart={k => setDayKey(k)} /> : <SessionScreen dayKey={dayKey} onBack={() => setDayKey(null)} />}
    </div>
  )
}
