import { useState, useRef, useEffect } from 'react'

const WEEK = 3
const MESO = 1
const ACC = '#C8FF00'
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY

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

  return `You are a concise RP Strength coach tracking a live gym session. Be brief — 1-2 sentences max. Athlete is mid-workout.

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
{"type":"add_flag","exercise_id":"<id>","flag_type":"injury|note","message":"<text>"}
{"type":"complete_session"}`
}

const PROG_SYS = `Expert RP Strength coach. Return next week's targets. Add 5lb compounds OR +1 rep. Nautilus=5lb increments. Cable=4.5lb. Return ONLY valid JSON, no markdown:
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
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages,
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('')
}

// ── STYLES ──────────────────────────────────────────────────
const s = {
  app: { maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif', color: '#fff' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #181818', gap: 12 },
  backBtn: { background: 'none', border: 'none', color: '#555', fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 },
  tabBar: { flexShrink: 0, display: 'flex', borderTop: '1px solid #181818' },
  dayBtn: { background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 16px', textAlign: 'left', cursor: 'pointer', color: '#fff', fontFamily: 'Arial, sans-serif' },
  sendBtn: { background: ACC, border: 'none', borderRadius: 10, width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logBtn: { width: '100%', padding: 18, borderRadius: 12, background: ACC, color: '#080808', fontFamily: 'Arial, sans-serif', fontSize: 18, fontWeight: 'bold', letterSpacing: 1, border: 'none', cursor: 'pointer' },
  mono: { fontFamily: "'Courier New', monospace" },
}

// ── HOME SCREEN ──────────────────────────────────────────────
function HomeScreen({ onStart }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...s.mono, fontSize: 10, color: ACC, letterSpacing: 3, marginBottom: 8 }}>GHOST CARD TRAINING</div>
        <div style={{ fontSize: 58, fontWeight: 'bold', lineHeight: 1 }}>WEEK {WEEK}</div>
        <div style={{ fontSize: 14, color: '#444', letterSpacing: 3, marginTop: 6 }}>MESOCYCLE {MESO} · RP METHOD</div>
      </div>
      <div style={{ fontSize: 11, color: '#333', letterSpacing: 2, marginBottom: 12 }}>SELECT TODAY'S SESSION</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Object.values(SPLIT).map(d => (
          <button key={d.key} onClick={() => onStart(d.key)} style={s.dayBtn}>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{d.label}</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{d.sub}</div>
            <div style={{ marginTop: 10, fontSize: 10, color: '#2a2a2a', letterSpacing: 1 }}>{d.exercises.length} EXERCISES</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── SESSION SCREEN ───────────────────────────────────────────
function SessionScreen({ dayKey, onBack }) {
  const day = SPLIT[dayKey]
  const [tab, setTab] = useState('coach')
  const [exercises, setExercises] = useState(() => JSON.parse(JSON.stringify(day.exercises)))
  const [logs, setLogs] = useState({})
  const [chat, setChat] = useState([{
    role: 'assistant',
    content: `${day.label} today — ${day.exercises.length} exercises. Tell me what you do as you go and I'll log everything. Tap WORKOUT to check your targets anytime.`
  }])
  const [thinking, setThinking] = useState(false)
  const [input, setInput] = useState('')
  const [screen, setScreen] = useState('session') // session | processing | results
  const [result, setResult] = useState(null)
  const chatRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chat, thinking])

  const loggedCount = exercises.filter(ex => (logs[ex.id] || []).length > 0).length

  async function send() {
    const text = input.trim()
    if (!text || thinking) return
    const newChat = [...chat, { role: 'user', content: text }]
    setChat(newChat)
    setThinking(true)
    setInput('')
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
        if (a.type === 'log_sets' && a.exercise_id) {
          newLogs[a.exercise_id] = (a.sets || []).map(s => ({ ...s, type: 'straight' }))
        }
        if (a.type === 'log_myo' && a.exercise_id) {
          const mc = a.mini_sets ?? 4
          const la = [{ type: 'act', w: a.activation?.w, reps: a.activation?.reps }]
          for (let i = 0; i < mc; i++) la.push({ type: 'mini', num: i + 1, w: a.activation?.w, reps: 5 })
          newLogs[a.exercise_id] = la
        }
        if (a.type === 'swap_exercise' && a.from_id) {
          const idx = newEx.findIndex(e => e.id === a.from_id)
          if (idx >= 0) { newEx[idx] = { ...newEx[idx], name: a.to_name, w: null }; newLogs[a.from_id] = [{ type: 'swap' }] }
        }
        if (a.type === 'complete_session') doComplete = true
      }

      setLogs(newLogs)
      setExercises(newEx)
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
      setResult(parsed)
      setScreen('results')
    } catch (e) {
      setResult({ session_summary: `Error: ${e.message}`, targets: [], flags: [] })
      setScreen('results')
    }
  }

  if (screen === 'processing') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #222', borderTopColor: ACC, animation: 'spin .8s linear infinite' }} />
      <div style={{ fontSize: 16, color: '#444', letterSpacing: 2 }}>CALCULATING WEEK {WEEK + 1}...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (screen === 'results') return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 18px' }}>
      <div style={{ ...s.mono, fontSize: 10, color: ACC, letterSpacing: 3, marginBottom: 8 }}>WEEK {result?.week_number || WEEK + 1} TARGETS</div>
      <div style={{ fontSize: 36, fontWeight: 'bold', lineHeight: 1, marginBottom: 4 }}>{day.label}</div>
      {result?.session_summary && (
        <div style={{ background: '#0a1500', border: '1px solid #1a2a00', borderRadius: 10, padding: '12px 14px', margin: '14px 0 20px' }}>
          <div style={{ fontSize: 10, color: ACC, letterSpacing: 1, marginBottom: 5 }}>COACH NOTE</div>
          <div style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>{result.session_summary}</div>
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        {(result?.targets || []).map((t, i) => (
          <div key={i} style={{ borderBottom: '1px solid #141414', padding: '12px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 'bold' }}>{t.exercise_name}</div>
              {t.coaching_note && <div style={{ fontSize: 11, color: '#ff9500', marginTop: 2 }}>↳ {t.coaching_note}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ ...s.mono, fontSize: 15, color: ACC, fontWeight: 'bold' }}>{fmt(t.target_weight)}lb</div>
              <div style={{ fontSize: 11, color: '#3a3a3a' }}>{t.target_sets ? t.target_sets + '×' : 'myo '}{t.target_reps_min}{t.target_reps_max !== t.target_reps_min ? '-' + t.target_reps_max : ''}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onBack} style={s.logBtn}>DONE · BACK TO HOME</button>
    </div>
  )

  return (
    <>
      <div style={s.header}>
        <button onClick={onBack} style={s.backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', lineHeight: 1.1 }}>{day.label}</div>
          <div style={{ fontSize: 12, color: '#333' }}>{day.sub}</div>
        </div>
        <div style={{ ...s.mono, fontSize: 11, color: '#333' }}>{loggedCount}/{exercises.length}</div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'coach' ? (
          <>
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
              {chat.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                  <div style={{
                    maxWidth: '84%', padding: '10px 13px',
                    borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                    background: m.role === 'user' ? ACC : '#1c1c1c',
                    color: m.role === 'user' ? '#080808' : '#ddd',
                    fontSize: 15, lineHeight: 1.45,
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
                  <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 3px', background: '#1c1c1c', fontSize: 20, color: '#555', letterSpacing: 4 }}>
                    ...
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #181818', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                rows={1} value={input} placeholder="Tell me what you did..."
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                style={{ flex: 1, background: '#141414', border: '1px solid #222', borderRadius: 10, color: '#fff', fontFamily: 'Arial, sans-serif', fontSize: 16, padding: '10px 12px', lineHeight: 1.3, resize: 'none', outline: 'none', overflowY: 'hidden' }}
              />
              <button onClick={send} style={s.sendBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #111', gap: 10, opacity: logged ? 0.5 : 1 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${logged ? '#4aff4a' : '#222'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: logged ? '#0a1e00' : 'transparent' }}>
                    {logged ? <span style={{ color: '#4aff4a', fontSize: 13 }}>✓</span> : <span style={{ color: '#2a2a2a', fontSize: 10 }}>{i + 1}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 'bold', lineHeight: 1.1 }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>{target}</div>
                  </div>
                  <div style={{ fontSize: 10, color: ex.type === 'myo' ? '#ff9500' : '#4a9eff', letterSpacing: 1, flexShrink: 0 }}>
                    {ex.type === 'myo' ? 'MYO' : 'SETS'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={s.tabBar}>
        {['coach', 'workout'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, border: 'none', background: 'none',
            color: tab === t ? '#fff' : '#3a3a3a',
            fontFamily: 'Arial, sans-serif', fontSize: 13, fontWeight: 'bold', letterSpacing: 2,
            padding: '13px 0', cursor: 'pointer',
            borderTop: `2px solid ${tab === t ? ACC : 'transparent'}`,
          }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
    </>
  )
}

// ── APP ──────────────────────────────────────────────────────
export default function App() {
  const [dayKey, setDayKey] = useState(null)

  return (
    <div style={s.app}>
      {!dayKey
        ? <HomeScreen onStart={k => setDayKey(k)} />
        : <SessionScreen dayKey={dayKey} onBack={() => setDayKey(null)} />
      }
    </div>
  )
}
