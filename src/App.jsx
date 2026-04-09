import { useState, useRef, useEffect, useCallback } from 'react'

const WEEK = 4
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
  red:     '#FF5555',
}

const DEFAULT_SPLIT = {
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
      { id: 'rdl',      name: 'Romanian Deadlift',           type: 'straight', sets: 3, min: 8,  max: 8,  w: 135 },
      { id: 'row_mid',  name: 'CS Row Mid',                  type: 'straight', sets: 3, min: 10, max: 12, w: 140 },
      { id: 'ham_a',    name: 'Nautilus Hamstring Curls',    type: 'myo',      w: 80 },
      { id: 'row_v',    name: 'Seated Row V-bar',            type: 'straight', sets: 3, min: 12, max: 12, w: 120 },
      { id: 'cc_a',     name: 'Cable Curls',                 type: 'myo',      w: 43 },
      { id: 'fp_a',     name: 'Cable Face Pulls',            type: 'myo',      w: 58.5 },
      { id: 'lat_pr',   name: 'Cable Lat Prayers',           type: 'myo',      w: 58.5 },
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

const STORAGE_KEY = 'swolebro_program'
const SESSION_KEY = 'swolebro_active_session'

function loadProgram() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_SPLIT))
}

function saveProgram(split) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(split))
}

function loadActiveSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveActiveSession(sessionState) {
  if (sessionState) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionState))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

function fmt(n) {
  if (n == null) return 'TBD'
  return Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(1)).toString()
}

function buildCoachSys(day, logs, exercises) {
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

function buildProgPrompt(day, logs, exercises) {
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

/* ============================================================
   CONFIRM DIALOG — used when backing out of an active session
   ============================================================ */
function ConfirmDialog({ message, subtext, onConfirm, onCancel, confirmLabel = 'LEAVE', cancelLabel = 'STAY' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onCancel}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '28px 24px 22px', maxWidth: 340, width: '100%' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>{message}</div>
        {subtext && <div style={{ fontSize: 15, color: C.sub, lineHeight: 1.5, marginBottom: 24 }}>{subtext}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: '15px 0', background: C.acc, border: 'none', borderRadius: 12, color: C.bg, fontSize: 16, fontWeight: 800, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '15px 0', background: 'none', border: `1px solid ${C.border}`, borderRadius: 12, color: C.red, fontSize: 16, fontWeight: 800, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   PEEK MODAL — view another day's exercises without leaving session
   ============================================================ */
function PeekModal({ split, currentDayKey, onClose }) {
  const otherDays = Object.values(split).filter(d => d.key !== currentDayKey)
  const [selectedDay, setSelectedDay] = useState(otherDays[0]?.key || null)
  const day = split[selectedDay]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'column' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} />
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', margin: '60px 12px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden', maxHeight: 'calc(100vh - 72px)' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: C.muted, letterSpacing: 2, fontWeight: 'bold' }}>QUICK LOOK</div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.sub, fontSize: 28, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>
        {/* Day tabs */}
        <div style={{ flexShrink: 0, display: 'flex', padding: '12px 16px 0', gap: 8 }}>
          {otherDays.map(d => (
            <button key={d.key} onClick={() => setSelectedDay(d.key)}
              style={{ flex: 1, padding: '10px 0', background: selectedDay === d.key ? C.surface : 'transparent', border: `1px solid ${selectedDay === d.key ? C.border : 'transparent'}`, borderRadius: 10, color: selectedDay === d.key ? C.text : C.muted, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {d.label}
            </button>
          ))}
        </div>
        {/* Exercise list */}
        {day && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            <div style={{ padding: '8px 20px 12px', fontSize: 14, color: C.sub }}>{day.sub}</div>
            {day.exercises.map((ex, i) => {
              const target = ex.type === 'straight'
                ? `${ex.sets}×${ex.min}${ex.max !== ex.min ? '-' + ex.max : ''} @ ${fmt(ex.w)}lb${ex.note ?? ''}`
                : `Myo-reps @ ${fmt(ex.w)}lb`
              return (
                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${C.border}`, gap: 14 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: C.muted, fontSize: 13, fontWeight: 'bold' }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{ex.name}</div>
                    <div style={{ fontSize: 14, color: C.sub, marginTop: 3 }}>{target}</div>
                  </div>
                  <div style={{ fontSize: 12, color: ex.type === 'myo' ? C.orange : C.blue, letterSpacing: 1, fontWeight: 'bold', flexShrink: 0 }}>
                    {ex.type === 'myo' ? 'MYO' : 'SETS'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   HOME SCREEN
   ============================================================ */
function HomeScreen({ split, onStart, onEdit, activeSession, onResume }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '36px 20px 40px' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 13, color: C.acc, letterSpacing: 4, marginBottom: 10, fontWeight: 'bold' }}>SWOLEBRO TRAINING</div>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: C.text }}>WEEK {WEEK}</div>
        <div style={{ fontSize: 18, color: C.sub, letterSpacing: 2, marginTop: 8 }}>MESOCYCLE {MESO} · RP METHOD</div>
      </div>

      {/* Resume active session banner */}
      {activeSession && (
        <button onClick={onResume}
          style={{ width: '100%', marginBottom: 20, padding: '18px 20px', background: '#0D1F00', border: `1px solid ${C.acc}44`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, flexShrink: 0, boxShadow: `0 0 8px ${C.green}` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.acc }}>Resume {split[activeSession.dayKey]?.label}</div>
            <div style={{ fontSize: 14, color: C.sub, marginTop: 3 }}>{activeSession.loggedCount} exercises logged · tap to continue</div>
          </div>
          <div style={{ color: C.acc, fontSize: 22, fontWeight: 'bold' }}>→</div>
        </button>
      )}

      <div style={{ fontSize: 13, color: C.muted, letterSpacing: 2, marginBottom: 16, fontWeight: 'bold' }}>SELECT TODAY'S SESSION</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {Object.values(split).map(d => {
          const isActive = activeSession?.dayKey === d.key
          return (
            <button key={d.key} onClick={() => onStart(d.key)}
              style={{ background: C.surface, border: `1px solid ${isActive ? C.acc + '44' : C.border}`, borderRadius: 14, padding: '22px 18px', textAlign: 'left', cursor: 'pointer', color: C.text, fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}>
              {isActive && <div style={{ position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: '50%', background: C.green }} />}
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: C.text }}>{d.label}</div>
              <div style={{ fontSize: 15, color: C.sub }}>{d.sub}</div>
              <div style={{ marginTop: 14, fontSize: 13, color: C.muted, fontWeight: 'bold', letterSpacing: 1 }}>{d.exercises.length} EXERCISES</div>
            </button>
          )
        })}
      </div>
      <button onClick={onEdit}
        style={{ width: '100%', marginTop: 20, padding: '16px 0', background: 'none', border: `1px solid ${C.border}`, borderRadius: 14, color: C.muted, fontSize: 14, fontWeight: 'bold', letterSpacing: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
        EDIT PROGRAM
      </button>
    </div>
  )
}

/* ============================================================
   EDIT SCREEN
   ============================================================ */
function EditScreen({ split, onSave, onBack }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(split)))
  const [openDay, setOpenDay] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)

  function updateExercise(dayKey, idx, field, value) {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const numFields = ['sets', 'min', 'max', 'w']
      if (numFields.includes(field)) {
        next[dayKey].exercises[idx][field] = value === '' ? null : Number(value)
      } else {
        next[dayKey].exercises[idx][field] = value
      }
      return next
    })
  }

  function removeExercise(dayKey, idx) {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next[dayKey].exercises.splice(idx, 1)
      return next
    })
    setEditingIdx(null)
  }

  function addExercise(dayKey) {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next[dayKey].exercises.push({
        id: `new_${Date.now()}`, name: 'New Exercise', type: 'straight', sets: 3, min: 8, max: 12, w: null
      })
      return next
    })
  }

  function moveExercise(dayKey, idx, dir) {
    const target = idx + dir
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const arr = next[dayKey].exercises
      if (target < 0 || target >= arr.length) return prev
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return next
    })
    setEditingIdx(null)
  }

  function handleSave() {
    saveProgram(draft)
    onSave(draft)
  }

  function handleReset() {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_SPLIT))
    setDraft(fresh)
    saveProgram(fresh)
    onSave(fresh)
  }

  const inputStyle = {
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
    fontSize: 15, padding: '8px 10px', width: '100%', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '16px 18px', borderBottom: `1px solid ${C.border}`, gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.sub, fontSize: 30, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>←</button>
        <div style={{ flex: 1, fontSize: 22, fontWeight: 800, color: C.text }}>Edit Program</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 120px' }}>
        {Object.values(draft).map(day => (
          <div key={day.key} style={{ marginBottom: 16 }}>
            <button onClick={() => { setOpenDay(openDay === day.key ? null : day.key); setEditingIdx(null) }}
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', textAlign: 'left', cursor: 'pointer', color: C.text, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{day.label}</div>
                <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>{day.sub}</div>
              </div>
              <div style={{ fontSize: 14, color: C.muted, fontWeight: 'bold' }}>{day.exercises.length} EX {openDay === day.key ? '▲' : '▼'}</div>
            </button>

            {openDay === day.key && (
              <div style={{ borderLeft: `2px solid ${C.border}`, marginLeft: 16, paddingLeft: 14, marginTop: 8 }}>
                {day.exercises.map((ex, i) => {
                  const isEditing = editingIdx === `${day.key}-${i}`
                  return (
                    <div key={ex.id + i} style={{ background: isEditing ? C.surface : 'transparent', border: isEditing ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: 10, padding: '12px 14px', marginBottom: 6 }}>
                      {!isEditing ? (
                        <div onClick={() => setEditingIdx(`${day.key}-${i}`)} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{ex.name}</div>
                            <div style={{ fontSize: 12, color: ex.type === 'myo' ? C.orange : C.blue, fontWeight: 'bold', letterSpacing: 1 }}>{ex.type === 'myo' ? 'MYO' : 'SETS'}</div>
                          </div>
                          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                            {ex.type === 'straight' ? `${ex.sets}×${ex.min}-${ex.max} @ ${fmt(ex.w)}lb${ex.note || ''}` : `Myo @ ${fmt(ex.w)}lb`}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>NAME</div>
                            <input value={ex.name} onChange={e => updateExercise(day.key, i, 'name', e.target.value)} style={inputStyle} />
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>TYPE</div>
                              <select value={ex.type} onChange={e => updateExercise(day.key, i, 'type', e.target.value)}
                                style={{ ...inputStyle, appearance: 'auto' }}>
                                <option value="straight">Straight</option>
                                <option value="myo">Myo</option>
                              </select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>WEIGHT</div>
                              <input type="number" value={ex.w ?? ''} placeholder="TBD" onChange={e => updateExercise(day.key, i, 'w', e.target.value)} style={inputStyle} />
                            </div>
                          </div>
                          {ex.type === 'straight' && (
                            <div style={{ display: 'flex', gap: 10 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>SETS</div>
                                <input type="number" value={ex.sets ?? ''} onChange={e => updateExercise(day.key, i, 'sets', e.target.value)} style={inputStyle} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>MIN REPS</div>
                                <input type="number" value={ex.min ?? ''} onChange={e => updateExercise(day.key, i, 'min', e.target.value)} style={inputStyle} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>MAX REPS</div>
                                <input type="number" value={ex.max ?? ''} onChange={e => updateExercise(day.key, i, 'max', e.target.value)} style={inputStyle} />
                              </div>
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>NOTE</div>
                            <input value={ex.note || ''} placeholder="e.g. /side" onChange={e => updateExercise(day.key, i, 'note', e.target.value || undefined)} style={inputStyle} />
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <button onClick={() => moveExercise(day.key, i, -1)} disabled={i === 0}
                              style={{ flex: 1, padding: '8px 0', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: i === 0 ? C.border : C.sub, fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                              ▲ UP
                            </button>
                            <button onClick={() => moveExercise(day.key, i, 1)} disabled={i === day.exercises.length - 1}
                              style={{ flex: 1, padding: '8px 0', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: i === day.exercises.length - 1 ? C.border : C.sub, fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                              ▼ DOWN
                            </button>
                            <button onClick={() => removeExercise(day.key, i)}
                              style={{ flex: 1, padding: '8px 0', background: '#2A0000', border: '1px solid #5A0000', borderRadius: 8, color: '#FF5555', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                              DELETE
                            </button>
                          </div>
                          <button onClick={() => setEditingIdx(null)}
                            style={{ padding: '8px 0', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.sub, fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                            DONE EDITING
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                <button onClick={() => addExercise(day.key)}
                  style={{ width: '100%', padding: '12px 0', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 14, fontWeight: 'bold', letterSpacing: 1, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit' }}>
                  + ADD EXERCISE
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '16px 18px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', background: C.bg, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, boxSizing: 'border-box' }}>
        <button onClick={handleReset}
          style={{ flex: 1, padding: '16px 0', background: 'none', border: `1px solid ${C.border}`, borderRadius: 12, color: C.muted, fontSize: 15, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
          RESET
        </button>
        <button onClick={handleSave}
          style={{ flex: 2, padding: '16px 0', background: C.acc, border: 'none', borderRadius: 12, color: C.bg, fontSize: 17, fontWeight: 800, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
          SAVE CHANGES
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   SESSION SCREEN — with persistence, peek modal, fixed chat
   ============================================================ */
function SessionScreen({ dayKey, split, onBack, savedSession, onSessionChange }) {
  const day = split[dayKey]
  const [tab, setTab] = useState('coach')
  const [exercises, setExercises] = useState(() => savedSession?.exercises ? JSON.parse(JSON.stringify(savedSession.exercises)) : JSON.parse(JSON.stringify(day.exercises)))
  const [logs, setLogs] = useState(() => savedSession?.logs || {})
  const [chat, setChat] = useState(() => savedSession?.chat || [{ role: 'assistant', content: `${day.label} — ${day.exercises.length} exercises. Tell me what you did and I'll log it all. Use Enter for new lines, tap SEND when ready. Check WORKOUT tab for targets anytime, or tap 👁 to peek at other days.` }])
  const [thinking, setThinking] = useState(false)
  const [input, setInput] = useState('')
  const [screen, setScreen] = useState('session')
  const [result, setResult] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showPeek, setShowPeek] = useState(false)
  const chatRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [chat, thinking])

  // Persist session state to localStorage on every change
  useEffect(() => {
    if (screen === 'session') {
      const loggedCount = exercises.filter(ex => (logs[ex.id] || []).length > 0).length
      onSessionChange({ dayKey, exercises, logs, chat, loggedCount })
    }
  }, [exercises, logs, chat, screen])

  const loggedCount = exercises.filter(ex => (logs[ex.id] || []).length > 0).length

  function handleBack() {
    if (loggedCount > 0 && screen === 'session') {
      setShowConfirm(true)
    } else {
      onSessionChange(null)
      onBack()
    }
  }

  function confirmLeave() {
    // Session stays saved — just go home
    setShowConfirm(false)
    onBack()
  }

  function confirmDiscard() {
    onSessionChange(null)
    onBack()
  }

  async function send() {
    const text = input.trim()
    if (!text || thinking) return
    const newChat = [...chat, { role: 'user', content: text }]
    setChat(newChat); setThinking(true); setInput('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    try {
      const firstUser = newChat.findIndex(m => m.role === 'user')
      const msgs = newChat.slice(firstUser).map(m => ({ role: m.role, content: m.content }))
      const raw = await callClaude(buildCoachSys(day, logs, exercises), msgs)
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
      const raw = await callClaude(PROG_SYS, [{ role: 'user', content: buildProgPrompt(day, finalLogs, finalEx) }], 1000)
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      setResult(parsed); setScreen('results')
      // Clear saved session on completion
      onSessionChange(null)
    } catch (e) {
      setResult({ session_summary: `Error: ${e.message}`, targets: [], flags: [] }); setScreen('results')
      onSessionChange(null)
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
      {showConfirm && (
        <ConfirmDialog
          message="Leave this session?"
          subtext="Your progress is saved. You can resume from the home screen, or discard it."
          cancelLabel="STAY"
          confirmLabel="GO HOME"
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmLeave}
        />
      )}
      {showPeek && (
        <PeekModal split={split} currentDayKey={dayKey} onClose={() => setShowPeek(false)} />
      )}

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${C.border}`, gap: 10 }}>
        <button onClick={handleBack} aria-label="Back" style={{ background: 'none', border: 'none', color: C.sub, fontSize: 30, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{day.label}</div>
          <div style={{ fontSize: 15, color: C.sub, marginTop: 3 }}>{day.sub}</div>
        </div>
        <button onClick={() => setShowPeek(true)} aria-label="Peek other days"
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', color: C.sub, fontSize: 18, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>
          👁
        </button>
        <div style={{ fontSize: 17, color: C.muted, fontFamily: 'monospace', fontWeight: 'bold' }}>{loggedCount}/{exercises.length}</div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'coach' ? (
          <>
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', WebkitOverflowScrolling: 'touch' }}>
              {chat.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                  <div style={{ maxWidth: '85%', padding: '14px 18px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? C.acc : C.surface, color: m.role === 'user' ? C.bg : C.text, fontSize: 17, lineHeight: 1.5, fontWeight: m.role === 'user' ? 600 : 400, whiteSpace: 'pre-wrap' }}>
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
            {/* Chat input — fixed to bottom with safe area padding */}
            <div style={{ padding: '10px 14px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'flex-end', background: C.bg }}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                placeholder="Type your sets... Enter for new line"
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={e => {
                  // Enter = newline (default behavior, do nothing)
                  // Shift+Enter or Cmd+Enter = send
                  if (e.key === 'Enter' && (e.shiftKey || e.metaKey)) {
                    e.preventDefault()
                    send()
                  }
                }}
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 17, padding: '13px 15px', lineHeight: 1.4, resize: 'none', outline: 'none', overflowY: 'hidden', fontFamily: 'inherit' }}
              />
              <button onClick={send} aria-label="Send"
                style={{ background: C.acc, border: 'none', borderRadius: 12, width: 52, height: 52, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

      <div style={{ flexShrink: 0, display: 'flex', borderTop: `1px solid ${C.border}`, paddingBottom: tab === 'workout' ? 'env(safe-area-inset-bottom, 0px)' : 0 }}>
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

/* ============================================================
   APP ROOT — with session persistence
   ============================================================ */
export default function App() {
  const [screen, setScreen] = useState('home')
  const [dayKey, setDayKey] = useState(null)
  const [split, setSplit] = useState(loadProgram)
  const [activeSession, setActiveSession] = useState(loadActiveSession)
  const [showNewSessionConfirm, setShowNewSessionConfirm] = useState(false)
  const [pendingDayKey, setPendingDayKey] = useState(null)

  function handleSessionChange(sessionState) {
    setActiveSession(sessionState)
    saveActiveSession(sessionState)
  }

  function startSession(key) {
    // If there's an active session for a DIFFERENT day, confirm
    if (activeSession && activeSession.dayKey !== key && activeSession.loggedCount > 0) {
      setPendingDayKey(key)
      setShowNewSessionConfirm(true)
      return
    }
    // If resuming same day, or no active session
    setDayKey(key)
    setScreen('session')
  }

  function confirmNewSession() {
    // Discard old session, start new one
    handleSessionChange(null)
    setShowNewSessionConfirm(false)
    setDayKey(pendingDayKey)
    setPendingDayKey(null)
    setScreen('session')
  }

  function resumeSession() {
    if (activeSession) {
      setDayKey(activeSession.dayKey)
      setScreen('session')
    }
  }

  function goHome() {
    setDayKey(null)
    setScreen('home')
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', color: C.text, fontFamily: '-apple-system, Arial, sans-serif' }}>
      {showNewSessionConfirm && (
        <ConfirmDialog
          message={`Start ${split[pendingDayKey]?.label}?`}
          subtext={`You have an active ${split[activeSession?.dayKey]?.label} session with ${activeSession?.loggedCount} exercises logged. Starting a new session will discard it.`}
          cancelLabel="KEEP SESSION"
          confirmLabel="DISCARD & START"
          onCancel={() => { setShowNewSessionConfirm(false); setPendingDayKey(null) }}
          onConfirm={confirmNewSession}
        />
      )}
      {screen === 'home' && (
        <HomeScreen
          split={split}
          onStart={startSession}
          onEdit={() => setScreen('edit')}
          activeSession={activeSession}
          onResume={resumeSession}
        />
      )}
      {screen === 'edit' && <EditScreen split={split} onSave={s => { setSplit(s); setScreen('home') }} onBack={() => setScreen('home')} />}
      {screen === 'session' && (
        <SessionScreen
          dayKey={dayKey}
          split={split}
          onBack={goHome}
          savedSession={activeSession?.dayKey === dayKey ? activeSession : null}
          onSessionChange={handleSessionChange}
        />
      )}
    </div>
  )
}
