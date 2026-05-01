import { useState, useRef, useEffect } from 'react'
import { supabase } from './utils/supabaseClient'
import {
  loadProgramFromSupabase,
  saveSessionTargets,
  saveProgramToSupabase,
  loadHistoryFromSupabase,
} from './utils/loadProgramFromSupabase'
import { seedUserData } from './utils/seedUserData'
import SignIn from './components/SignIn'
import {
  createSessionRow,
  writeExerciseSets,
  markSessionComplete,
  fetchMostRecentSessionAny,
} from './utils/sessionSync'
import { computeNextTargets } from './utils/progression'
import { subscribe as subscribeQueue, getStatus as getQueueStatus, clearFailed } from './utils/writeQueue'

const APP_VERSION = 'v2026-04-24-rebuild'
const MESO = 1

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#F5F0E8', surface: '#FFFFFF', border: '#D8D3C8',
  text: '#1A1A1A', sub: '#555555', muted: '#999999',
  acc: '#2D6A4F', accLight: '#EAF3DE',
  blue: '#185FA5', orange: '#854F0B', red: '#B04040',
  innerBg: '#F9F6F1',
}

// ─── Mobility routine (15-min pre-bed wind-down) ────────────────────────────
// Targets: tight hips / lower back / hamstrings, weak core, AND disc-golf coil
// (thoracic rotation + hip-shoulder separation). The 🥏 moves directly train coil.
const MOBILITY_ROUTINE = [
  { id: 'm_catcow',  name: 'Cat-Cow',                  duration: 60,  description: 'On hands and knees. Inhale and arch (cow), exhale and round (cat). Move slow with the breath. Spinal warm-up.' },
  { id: 'm_wgs',     name: "World's Greatest Stretch", duration: 90,  perSide: true, coil: true, description: 'Deep lunge, same-side hand inside the front foot. Drive the opposite hand to the ceiling and rotate the chest open. Hips + thoracic — pure coil.' },
  { id: 'm_open',    name: 'Open Books',               duration: 90,  perSide: true, coil: true, description: 'Side-lying, knees stacked and pinned at 90°. Top arm sweeps across the floor in a slow arc until the shoulder blade is flat. Eyes follow the hand. Best single drill for thoracic rotation.' },
  { id: 'm_9090',    name: '90/90 Hip Switches',       duration: 90,  description: 'Both knees bent at 90° — one shin in front, one to the side. Sit tall and rock the knees down to switch. Builds the hip internal rotation your lead leg posts on.' },
  { id: 'm_couch',   name: 'Couch Stretch',            duration: 120, perSide: true, description: 'Back foot up on a couch or wall, front foot forward in a lunge. Squeeze the rear glute and tuck the pelvis. The desk-job hip-flexor fix.' },
  { id: 'm_pigeon',  name: 'Pigeon Pose',              duration: 90,  perSide: true, description: 'Front shin across the mat (about 90° at the knee), back leg straight behind. Sink the chest forward and breathe into the glute.' },
  { id: 'm_ham',     name: 'Lying Hamstring Stretch',  duration: 90,  perSide: true, description: 'On your back, lift one leg straight up. Strap around the foot or hands behind the thigh. Knee soft, foot flexed.' },
  { id: 'm_twist',   name: 'Supine Spinal Twist',      duration: 60,  perSide: true, coil: true, description: 'On your back, drop a bent knee across the body. Opposite arm wide, gaze the other way. Lumbar release + thoracic rotation.' },
  { id: 'm_bridge',  name: 'Glute Bridge — 10 slow',   duration: 60,  description: '10 reps. Drive through the heels, squeeze the glutes hard at the top, 2-second pause. Wakes up the posterior chain.' },
  { id: 'm_deadbug', name: 'Dead Bug — 8 per side',    duration: 60,  description: 'On your back, arms up, knees stacked over hips. Slowly extend opposite arm and leg. Lower back stays pressed flat — anti-extension core.' },
  { id: 'm_birddog', name: 'Bird Dog — 8 per side',    duration: 60,  description: 'Hands and knees. Reach opposite arm and leg long, hold 2 seconds. Hips stay square. Anti-rotation core — the same pattern that resists overswing.' },
  { id: 'm_child',   name: "Child's Pose",             duration: 60,  description: 'Knees wide, big toes touching, hips back to heels, arms long. Slow 4-count in, 6-count out. Decompress and wind down.' },
]
const MOBILITY_DONE_KEY = 'swolebro_mobility_done'

function SyncPill() {
  const [s, setS] = useState(getQueueStatus())
  useEffect(() => subscribeQueue(setS), [])

  let bg, fg, text
  if (s.failed > 0) {
    bg = '#FBE9E7'; fg = C.red
    text = `${s.failed} failed — tap to dismiss`
  } else if (!s.online) {
    bg = '#FFF3E0'; fg = C.orange
    text = s.queued > 0 ? `Offline · ${s.queued} pending` : 'Offline'
  } else if (s.queued > 0 || s.inFlight > 0) {
    bg = '#FFF8E1'; fg = C.orange
    text = `Syncing ${s.queued + s.inFlight}…`
  } else {
    bg = '#EAF3DE'; fg = C.acc
    text = 'Synced'
  }

  return (
    <button
      onClick={() => { if (s.failed > 0) clearFailed() }}
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 10,
        padding: '4px 10px', fontSize: 11, fontWeight: 600,
        background: bg, color: fg, border: 'none', borderRadius: 999,
        cursor: s.failed > 0 ? 'pointer' : 'default',
        fontFamily: 'inherit', letterSpacing: 0.5,
      }}
    >
      {text}
    </button>
  )
}

function fmtClock(s) {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss.toString().padStart(2, '0')}`
}

function fmt(n) {
  if (n == null) return 'TBD'
  return Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(1)).toString()
}

function targetStr(ex) {
  if (ex.type === 'straight') {
    const reps = ex.max !== ex.min ? `${ex.min}-${ex.max}` : ex.min
    return `${ex.sets}×${reps} @ ${fmt(ex.w)}lb${ex.note ?? ''}`
  }
  return `Myo @ ${fmt(ex.w)}lb`
}

// ═══════════════════════════════════════════════════════════════════════════
// Home Screen
// ═══════════════════════════════════════════════════════════════════════════
function HomeScreen({ split, progress, history, onStart, onEdit, hasActiveSession, activeSessionKey, onResumeSession, onRecover, onMobility, userEmail, onSignOut }) {
  const days = Object.values(split)
  const mainDays = days.filter(d => d.key !== 'day_5')
  const optDay = days.find(d => d.key === 'day_5')
  const [expandedIdx, setExpandedIdx] = useState(null)
  const recentHistory = history.slice(0, 3)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '36px 20px 40px', background: C.bg }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 15, color: C.acc, letterSpacing: 4, marginBottom: 8, fontWeight: 'bold' }}>SWOLEBRO TRAINING</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Lake Bod 2026</div>
        <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>Mesocycle {MESO} · RP Method</div>
        {userEmail && (
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
            {userEmail} ·{' '}
            <button onClick={onSignOut}
              style={{ background: 'none', border: 'none', color: C.muted, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'inherit' }}>
              sign out
            </button>
          </div>
        )}
      </div>

      {hasActiveSession && (
        <button onClick={onResumeSession}
          style={{ width: '100%', marginBottom: 20, padding: '18px 20px', background: C.accLight, border: `1px solid ${C.acc}`, borderRadius: 14, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ fontSize: 15, color: C.acc, letterSpacing: 2, fontWeight: 'bold', marginBottom: 4 }}>SESSION IN PROGRESS</div>
          <div style={{ fontSize: 17, color: C.text, fontWeight: 600 }}>
            {split[activeSessionKey]?.label} — tap to resume →
          </div>
        </button>
      )}

      {recentHistory.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, color: C.muted, letterSpacing: 2, marginBottom: 10, fontWeight: 'bold' }}>RECENT</div>
          {recentHistory.map((h, i) => {
            const date = new Date(h.date)
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const isExpanded = expandedIdx === i
            return (
              <div key={i} onClick={() => setExpandedIdx(isExpanded ? null : i)}
                style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{h.label}</div>
                  <div style={{ fontSize: 15, color: C.muted }}>{dateStr}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
                  <div style={{ fontSize: 15, color: C.acc, fontWeight: 'bold', letterSpacing: 1 }}>CYCLE {h.week}</div>
                  {h.summary && <div style={{ fontSize: 15, color: C.muted }}>{isExpanded ? '▲' : '▼'}</div>}
                </div>
                {isExpanded && h.summary && (
                  <div style={{ fontSize: 15, color: C.sub, marginTop: 8, lineHeight: 1.5, borderTop: `0.5px solid ${C.border}`, paddingTop: 8 }}>{h.summary}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ fontSize: 15, color: C.muted, letterSpacing: 2, marginBottom: 12, fontWeight: 'bold' }}>SELECT TODAY'S SESSION</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {mainDays.map(d => {
          const cycle = progress[d.key]?.week ?? 3
          return (
            <button key={d.key} onClick={() => onStart(d.key)}
              style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: '20px 16px', textAlign: 'left', cursor: 'pointer', color: C.text, fontFamily: 'inherit' }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: C.text }}>{d.label}</div>
              <div style={{ fontSize: 15, color: C.sub }}>{d.sub}</div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 15, color: C.muted, fontWeight: 'bold', letterSpacing: 1 }}>{d.exercises.length} EX</div>
                <div style={{ fontSize: 15, color: C.acc, fontWeight: 'bold', letterSpacing: 1 }}>CYCLE {cycle}</div>
              </div>
            </button>
          )
        })}
      </div>

      {optDay && (
        <button onClick={() => onStart('day_5')}
          style={{ width: '100%', marginBottom: 12, padding: '18px 20px', background: C.surface, border: `0.5px dashed ${C.border}`, borderRadius: 14, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Day 5 — Optional</div>
            <div style={{ fontSize: 15, color: C.sub, marginTop: 2 }}>Arms · Abs · Weak Points</div>
          </div>
          <div style={{ fontSize: 15, color: C.muted, fontWeight: 'bold', letterSpacing: 1 }}>CYCLE {progress['day_5']?.week ?? 1}</div>
        </button>
      )}

      <button onClick={onMobility}
        style={{ width: '100%', marginBottom: 16, padding: '18px 20px', background: C.surface, border: `0.5px solid ${C.blue}`, borderLeft: `3px solid ${C.blue}`, borderRadius: 14, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Mobility · Pre-Bed</div>
          <div style={{ fontSize: 15, color: C.sub, marginTop: 2 }}>Hips · Back · Hams · Coil · 15 min</div>
        </div>
        <div style={{ fontSize: 15, color: C.blue, fontWeight: 'bold', letterSpacing: 1 }}>WIND DOWN</div>
      </button>

      <button onClick={onEdit}
        style={{ width: '100%', padding: '14px 0', background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 14, color: C.muted, fontSize: 15, fontWeight: 'bold', letterSpacing: 2, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
        EDIT PROGRAM
      </button>
      {onRecover && (
        <button onClick={onRecover}
          style={{ width: '100%', padding: '14px 0', background: 'none', border: `0.5px dashed ${C.border}`, borderRadius: 14, color: C.acc, fontSize: 14, fontWeight: 'bold', letterSpacing: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
          ⟳ RECOVER LAST CLOUD SESSION
        </button>
      )}
      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: C.muted, letterSpacing: 1 }}>
        {APP_VERSION}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Peek Modal
// ═══════════════════════════════════════════════════════════════════════════
function PeekModal({ split, currentDayKey, onClose }) {
  const days = Object.values(split)
  const [peekKey, setPeekKey] = useState(() => {
    const others = days.filter(d => d.key !== currentDayKey)
    return others[0]?.key ?? days[0].key
  })
  const day = split[peekKey]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.surface, borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, color: C.muted, letterSpacing: 2, fontWeight: 'bold' }}>QUICK LOOK</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', padding: '10px 16px 0', gap: 8 }}>
          {days.map(d => (
            <button key={d.key} onClick={() => setPeekKey(d.key)}
              style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, border: `1px solid ${peekKey === d.key ? C.acc : C.border}`, background: peekKey === d.key ? C.accLight : 'none', color: peekKey === d.key ? C.acc : C.sub, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {d.label}{d.key === currentDayKey ? ' ●' : ''}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 20px 12px', fontSize: 15, color: C.sub }}>{day.sub}</div>
          {day.exercises.map((ex, i) => (
            <div key={ex.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 20px', borderBottom: `0.5px solid ${C.border}`, gap: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: C.muted, fontSize: 15, fontWeight: 'bold' }}>{i + 1}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{ex.name}</div>
                <div style={{ fontSize: 15, color: C.sub, marginTop: 2 }}>{targetStr(ex)}</div>
              </div>
              <div style={{ fontSize: 15, color: ex.type === 'myo' ? C.orange : C.blue, letterSpacing: 1, fontWeight: 'bold' }}>{ex.type === 'myo' ? 'MYO' : 'SETS'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Numeric stepper (weight / reps)
// ═══════════════════════════════════════════════════════════════════════════
function Stepper({ value, onChange, step = 1, min = 0, max = 9999, label }) {
  function bump(dir) {
    const v = (value ?? 0) + dir * step
    onChange(Math.max(min, Math.min(max, v)))
  }
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1, marginBottom: 4, fontWeight: 'bold' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'stretch', background: C.innerBg, border: `0.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <button onClick={() => bump(-1)} aria-label="decrement"
          style={{ width: 40, background: 'none', border: 'none', color: C.sub, fontSize: 22, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>−</button>
        <input type="number" inputMode="decimal" value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          style={{ flex: 1, background: 'none', border: 'none', color: C.text, fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none', minWidth: 0, width: '100%' }} />
        <button onClick={() => bump(1)} aria-label="increment"
          style={{ width: 40, background: 'none', border: 'none', color: C.sub, fontSize: 22, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// RIR picker (0 / 1 / 2 / 3 / 4+)
// ═══════════════════════════════════════════════════════════════════════════
function RirPicker({ value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1, marginBottom: 4, fontWeight: 'bold' }}>RIR (optional)</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2, 3, 4].map(r => {
          const active = value === r
          return (
            <button key={r} onClick={() => onChange(active ? null : r)}
              style={{ flex: 1, padding: '10px 0', background: active ? C.acc : C.innerBg, border: `0.5px solid ${active ? C.acc : C.border}`, borderRadius: 10, color: active ? '#fff' : C.sub, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {r === 4 ? '4+' : r}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Exercise Card (collapsed / expanded with set entry)
// ═══════════════════════════════════════════════════════════════════════════
function ExerciseCard({ ex, sets, expanded, onExpand, onLogSet, onDeleteSet, onSkip, supabaseSessionId }) {
  const workSets = sets.filter(s => s.type !== 'swap')
  const hasAnyLogs = workSets.length > 0
  const skipped = sets.some(s => s.type === 'swap')

  // Determine default weight/reps for next set
  const lastSet = [...workSets].reverse().find(s => s.type !== 'mini')
  const defaultWeight = lastSet?.w ?? ex.w ?? 0
  const defaultReps = lastSet?.reps ?? Math.round(((ex.min ?? 8) + (ex.max ?? ex.min ?? 8)) / 2)

  // Local form state (only when expanded)
  const [weight, setWeight] = useState(defaultWeight)
  const [reps, setReps] = useState(defaultReps)
  const [rir, setRir] = useState(null)
  const [mode, setMode] = useState('straight') // 'straight' | 'activation' | 'mini'

  // When entering expanded mode, reset to defaults
  useEffect(() => {
    if (expanded) {
      const last = [...workSets].reverse().find(s => s.type !== 'mini')
      setWeight(last?.w ?? ex.w ?? 0)
      setReps(last?.reps ?? Math.round(((ex.min ?? 8) + (ex.max ?? ex.min ?? 8)) / 2))
      setRir(null)
      if (ex.type === 'myo') {
        const hasActivation = workSets.some(s => s.type === 'act')
        setMode(hasActivation ? 'mini' : 'activation')
      } else {
        setMode('straight')
      }
    }
  }, [expanded, ex.id])

  const step = ex.type === 'straight' && ex.name.toLowerCase().includes('cable') ? 2.5 : 5

  function doLogSet() {
    if (weight == null || reps == null || reps <= 0) return
    let newSet
    if (mode === 'activation') {
      newSet = { type: 'act', w: weight, reps, rir }
    } else if (mode === 'mini') {
      const miniCount = workSets.filter(s => s.type === 'mini').length
      newSet = { type: 'mini', num: miniCount + 1, w: weight, reps }
    } else {
      const strCount = workSets.filter(s => s.type !== 'act' && s.type !== 'mini').length
      newSet = { num: strCount + 1, w: weight, reps, rir }
    }
    onLogSet(newSet)
    // After logging: mini mode sticks at mini, straight increments set count
    if (mode === 'activation') setMode('mini')
    // Haptic
    if (navigator.vibrate) navigator.vibrate(30)
  }

  // Collapsed view
  if (!expanded) {
    return (
      <button onClick={onExpand}
        style={{ width: '100%', textAlign: 'left', background: hasAnyLogs ? C.innerBg : C.surface, border: `0.5px solid ${C.border}`, borderLeft: `3px solid ${hasAnyLogs ? C.acc : skipped ? C.muted : C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', color: C.text }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{ex.name}</div>
            <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>{targetStr(ex)}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {hasAnyLogs ? (
              <div style={{ fontSize: 15, color: C.acc, fontWeight: 700 }}>
                ✓ {workSets.length} {workSets.length === 1 ? 'set' : 'sets'}
              </div>
            ) : skipped ? (
              <div style={{ fontSize: 14, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>SKIPPED</div>
            ) : (
              <div style={{ fontSize: 14, color: ex.type === 'myo' ? C.orange : C.blue, fontWeight: 700, letterSpacing: 1 }}>{ex.type === 'myo' ? 'MYO' : 'SETS'}</div>
            )}
          </div>
        </div>
      </button>
    )
  }

  // Expanded view
  return (
    <div style={{ background: C.surface, border: `0.5px solid ${C.acc}`, borderLeft: `3px solid ${C.acc}`, borderRadius: 12, padding: 16, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{ex.name}</div>
          <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>Target: {targetStr(ex)}</div>
        </div>
        <button onClick={onExpand} aria-label="collapse"
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer', padding: '0 4px' }}>×</button>
      </div>

      {/* Logged sets */}
      {workSets.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {workSets.map((s, i) => {
            const label = s.type === 'act' ? 'Activation'
                        : s.type === 'mini' ? `Mini ${s.num}`
                        : `Set ${s.num}`
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: C.innerBg, borderRadius: 8, marginBottom: 4 }}>
                <div style={{ flex: 1, fontSize: 14, color: C.sub, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 15, color: C.text, fontWeight: 700, fontFamily: 'monospace', marginRight: 10 }}>
                  {fmt(s.w)}lb × {s.reps}{s.rir != null ? ` · ${s.rir} RIR` : ''}
                </div>
                <button onClick={() => onDeleteSet(i)} aria-label="delete set"
                  style={{ background: 'none', border: 'none', color: C.red, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit' }}>
                  DEL
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Mode indicator for myo */}
      {ex.type === 'myo' && (
        <div style={{ fontSize: 12, color: C.orange, letterSpacing: 1, marginBottom: 8, fontWeight: 'bold' }}>
          {mode === 'activation' ? 'LOG ACTIVATION SET' : 'LOG MINI SET'}
        </div>
      )}

      {/* Entry form */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Stepper value={weight} onChange={setWeight} step={step} label="WEIGHT (lb)" />
        <Stepper value={reps} onChange={setReps} step={1} min={0} max={50} label="REPS" />
      </div>
      {mode !== 'mini' && (
        <div style={{ marginBottom: 14 }}>
          <RirPicker value={rir} onChange={setRir} />
        </div>
      )}

      <button onClick={doLogSet}
        style={{ width: '100%', padding: 16, background: C.acc, border: 'none', borderRadius: 12, color: '#fff', fontSize: 17, fontWeight: 800, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
        LOG SET
      </button>

      {!hasAnyLogs && !skipped && (
        <button onClick={onSkip}
          style={{ width: '100%', padding: 10, background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
          SKIP THIS EXERCISE
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Screen (workout logging)
// ═══════════════════════════════════════════════════════════════════════════
function SessionScreen({
  dayKey, split, onBack, onCompleteClick, currentCycle,
  sessionLogs, setSessionLogs,
  sessionExercises,
  supabaseSessionId,
}) {
  const day = split[dayKey]
  const [expandedId, setExpandedId] = useState(null)
  const [showPeek, setShowPeek] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [timerEnd, setTimerEnd] = useState(null)
  const [timerDuration, setTimerDuration] = useState(null)
  const [timerNow, setTimerNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setTimerNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  function startTimer(secs) { setTimerDuration(secs); setTimerEnd(Date.now() + secs * 1000) }
  function cancelTimer() { setTimerEnd(null); setTimerDuration(null) }

  const timerRemaining = timerEnd ? Math.max(0, Math.ceil((timerEnd - timerNow) / 1000)) : null
  const timerDone = timerEnd && timerRemaining === 0
  useEffect(() => {
    if (timerDone) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      setTimerEnd(null); setTimerDuration(null)
    }
  }, [timerDone])

  const loggedCount = sessionExercises.filter(ex => (sessionLogs[ex.id] || []).some(s => s.type !== 'swap')).length

  function logSet(exerciseId, newSet) {
    const next = { ...sessionLogs, [exerciseId]: [...(sessionLogs[exerciseId] || []).filter(s => s.type !== 'swap'), newSet] }
    setSessionLogs(next)
    // Fire async Supabase write
    const ex = sessionExercises.find(e => e.id === exerciseId)
    if (ex?._exercise_id && supabaseSessionId) {
      writeExerciseSets({ sessionId: supabaseSessionId, exerciseUuid: ex._exercise_id, sets: next[exerciseId] })
    }
    // Auto-start 60s rest after a non-mini set
    if (newSet.type !== 'mini' && !timerEnd) startTimer(60)
  }

  function deleteSet(exerciseId, idx) {
    const existing = sessionLogs[exerciseId] || []
    const workSets = existing.filter(s => s.type !== 'swap')
    const next = { ...sessionLogs, [exerciseId]: workSets.filter((_, i) => i !== idx) }
    setSessionLogs(next)
    const ex = sessionExercises.find(e => e.id === exerciseId)
    if (ex?._exercise_id && supabaseSessionId) {
      writeExerciseSets({ sessionId: supabaseSessionId, exerciseUuid: ex._exercise_id, sets: next[exerciseId] })
    }
  }

  function skipExercise(exerciseId) {
    const next = { ...sessionLogs, [exerciseId]: [{ type: 'swap' }] }
    setSessionLogs(next)
    setExpandedId(null)
  }

  return (
    <>
      {showPeek && <PeekModal split={split} currentDayKey={dayKey} onClose={() => setShowPeek(false)} />}
      {showCompleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCompleteConfirm(false)} />
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'relative', background: C.surface, borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 360, border: `0.5px solid ${C.border}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>Finish session?</div>
            <div style={{ fontSize: 15, color: C.sub, lineHeight: 1.5, marginBottom: 24 }}>
              You logged {loggedCount} of {sessionExercises.length} exercises. We'll calculate next week's targets.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCompleteConfirm(false)}
                style={{ flex: 1, padding: '14px 0', background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 12, color: C.sub, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                KEEP GOING
              </button>
              <button onClick={() => { setShowCompleteConfirm(false); onCompleteClick() }}
                style={{ flex: 1, padding: '14px 0', background: C.acc, border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                FINISH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `0.5px solid ${C.border}`, gap: 12, background: C.surface }}>
        <button onClick={onBack} aria-label="back"
          style={{ background: 'none', border: 'none', color: C.sub, fontSize: 28, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>{day.label}</div>
          <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>{day.sub} · Cycle {currentCycle}</div>
        </div>
        <button onClick={() => setShowPeek(true)}
          style={{ background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 13, fontWeight: 'bold', letterSpacing: 1, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', marginRight: 4 }}>DAYS</button>
        <div style={{ fontSize: 15, color: C.muted, fontFamily: 'monospace', fontWeight: 'bold' }}>{loggedCount}/{sessionExercises.length}</div>
      </div>

      {/* Exercise list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 14px 12px', background: C.bg }}>
        {sessionExercises.map(ex => (
          <ExerciseCard key={ex.id}
            ex={ex}
            sets={sessionLogs[ex.id] || []}
            expanded={expandedId === ex.id}
            onExpand={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
            onLogSet={s => logSet(ex.id, s)}
            onDeleteSet={i => deleteSet(ex.id, i)}
            onSkip={() => skipExercise(ex.id)}
            supabaseSessionId={supabaseSessionId}
          />
        ))}

        <button onClick={() => setShowCompleteConfirm(true)}
          disabled={loggedCount === 0}
          style={{ width: '100%', marginTop: 12, padding: 18, background: loggedCount === 0 ? C.border : C.acc, border: 'none', borderRadius: 14, color: '#fff', fontSize: 17, fontWeight: 800, letterSpacing: 1, cursor: loggedCount === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          FINISH SESSION
        </button>
      </div>

      {/* Rest timer bar */}
      <div style={{ flexShrink: 0, borderTop: `0.5px solid ${C.border}`, background: C.surface }}>
        {timerEnd ? (
          <div onClick={cancelTimer} style={{ cursor: 'pointer', padding: '12px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 'bold', letterSpacing: 1 }}>REST</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.acc, fontFamily: 'monospace' }}>
                {Math.floor(timerRemaining / 60)}:{String(timerRemaining % 60).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 13, color: C.muted, letterSpacing: 1 }}>TAP TO CANCEL</div>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: C.acc, borderRadius: 2, transition: 'width 0.25s linear', width: `${(timerRemaining / timerDuration) * 100}%` }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', gap: 8 }}>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 'bold', letterSpacing: 1, marginRight: 4 }}>REST</div>
            {[['60s', 60], ['90s', 90], ['2m', 120], ['3m', 180]].map(([label, secs]) => (
              <button key={label} onClick={() => startTimer(secs)}
                style={{ flex: 1, padding: '9px 0', background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: 10, color: C.sub, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Results Screen
// ═══════════════════════════════════════════════════════════════════════════
function ResultsScreen({ day, result, currentCycle, onDone, onBack }) {
  const targets = result?.targets ?? []
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 40px', background: C.bg }}>
      <div style={{ fontSize: 15, color: C.acc, letterSpacing: 3, marginBottom: 8, fontWeight: 'bold' }}>
        NEXT {day.label.toUpperCase()} — CYCLE {result?.next_cycle ?? currentCycle + 1}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, marginBottom: 6, color: C.text }}>{day.label}</div>
      {result?.session_summary && (
        <div style={{ background: C.accLight, border: `0.5px solid #9EC4A8`, borderRadius: 12, padding: '14px 18px', margin: '18px 0 24px' }}>
          <div style={{ fontSize: 13, color: C.acc, letterSpacing: 1, marginBottom: 6, fontWeight: 'bold' }}>SESSION SUMMARY</div>
          <div style={{ fontSize: 15, color: C.text, lineHeight: 1.6 }}>{result.session_summary}</div>
        </div>
      )}
      <div style={{ marginBottom: 28 }}>
        {targets.map((t, i) => {
          const color = t.status === 'up' ? C.acc : t.status === 'deload' ? C.red : t.status === 'skipped' ? C.muted : C.sub
          const arrow = t.status === 'up' ? '↑' : t.status === 'deload' ? '↓' : t.status === 'skipped' ? '—' : '='
          return (
            <div key={i} style={{ borderBottom: `0.5px solid ${C.border}`, padding: '14px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{t.exercise_name}</div>
                {t.note && <div style={{ fontSize: 13, color, marginTop: 3 }}>↳ {t.note}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 20, color, fontWeight: 800, fontFamily: 'monospace' }}>
                  {fmt(t.target_weight)}lb {arrow}
                </div>
                <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
                  {t.target_sets ? t.target_sets + '×' : 'myo '}
                  {t.target_reps_min}{t.target_reps_max !== t.target_reps_min ? '-' + t.target_reps_max : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={onDone}
        style={{ width: '100%', padding: 18, borderRadius: 14, background: C.acc, color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
        SAVE & BACK TO HOME
      </button>
      <button onClick={onBack}
        style={{ width: '100%', padding: 14, borderRadius: 14, background: 'none', color: C.sub, fontSize: 14, fontWeight: 700, letterSpacing: 1, border: `0.5px solid ${C.border}`, cursor: 'pointer', fontFamily: 'inherit' }}>
        BACK TO SESSION
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Edit Screen (unchanged from prior)
// ═══════════════════════════════════════════════════════════════════════════
function EditScreen({ split, onSave, onBack }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(split)))
  const [openDay, setOpenDay] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)

  function updateExercise(dayKey, idx, field, value) {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const numFields = ['sets', 'min', 'max', 'w']
      if (numFields.includes(field)) next[dayKey].exercises[idx][field] = value === '' ? null : Number(value)
      else next[dayKey].exercises[idx][field] = value
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
      next[dayKey].exercises.push({ id: `new_${Date.now()}`, name: 'New Exercise', type: 'straight', sets: 3, min: 8, max: 12, w: null })
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

  const inputStyle = { background: C.innerBg, border: `0.5px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 15, padding: '8px 10px', width: '100%', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '16px 18px', borderBottom: `0.5px solid ${C.border}`, gap: 12, background: C.surface }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.sub, fontSize: 28, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>←</button>
        <div style={{ flex: 1, fontSize: 20, fontWeight: 700, color: C.text }}>Edit Program</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 120px' }}>
        {Object.values(draft).map(day => (
          <div key={day.key} style={{ marginBottom: 12 }}>
            <button onClick={() => { setOpenDay(openDay === day.key ? null : day.key); setEditingIdx(null) }}
              style={{ width: '100%', background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', textAlign: 'left', cursor: 'pointer', color: C.text, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{day.label}</div>
                <div style={{ fontSize: 14, color: C.sub, marginTop: 2 }}>{day.sub}</div>
              </div>
              <div style={{ fontSize: 14, color: C.muted, fontWeight: 'bold' }}>{day.exercises.length} EX {openDay === day.key ? '▲' : '▼'}</div>
            </button>
            {openDay === day.key && (
              <div style={{ borderLeft: `2px solid ${C.border}`, marginLeft: 16, paddingLeft: 14, marginTop: 8 }}>
                {day.exercises.map((ex, i) => {
                  const isEditing = editingIdx === `${day.key}-${i}`
                  return (
                    <div key={ex.id + i} style={{ background: isEditing ? C.surface : 'transparent', border: isEditing ? `0.5px solid ${C.border}` : '0.5px solid transparent', borderRadius: 10, padding: '12px 14px', marginBottom: 6 }}>
                      {!isEditing ? (
                        <div onClick={() => setEditingIdx(`${day.key}-${i}`)} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{ex.name}</div>
                            <div style={{ fontSize: 13, color: ex.type === 'myo' ? C.orange : C.blue, fontWeight: 'bold', letterSpacing: 1 }}>{ex.type === 'myo' ? 'MYO' : 'SETS'}</div>
                          </div>
                          <div style={{ fontSize: 14, color: C.muted, marginTop: 3 }}>{targetStr(ex)}</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>NAME</div>
                            <input value={ex.name} onChange={e => updateExercise(day.key, i, 'name', e.target.value)} style={inputStyle} />
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>TYPE</div>
                              <select value={ex.type} onChange={e => updateExercise(day.key, i, 'type', e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
                                <option value="straight">Straight</option>
                                <option value="myo">Myo</option>
                              </select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>WEIGHT</div>
                              <input type="number" value={ex.w ?? ''} placeholder="TBD" onChange={e => updateExercise(day.key, i, 'w', e.target.value)} style={inputStyle} />
                            </div>
                          </div>
                          {ex.type === 'straight' && (
                            <div style={{ display: 'flex', gap: 10 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>SETS</div>
                                <input type="number" value={ex.sets ?? ''} onChange={e => updateExercise(day.key, i, 'sets', e.target.value)} style={inputStyle} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>MIN</div>
                                <input type="number" value={ex.min ?? ''} onChange={e => updateExercise(day.key, i, 'min', e.target.value)} style={inputStyle} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>MAX</div>
                                <input type="number" value={ex.max ?? ''} onChange={e => updateExercise(day.key, i, 'max', e.target.value)} style={inputStyle} />
                              </div>
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>NOTE</div>
                            <input value={ex.note || ''} placeholder="e.g. /side" onChange={e => updateExercise(day.key, i, 'note', e.target.value || undefined)} style={inputStyle} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => moveExercise(day.key, i, -1)} disabled={i === 0}
                              style={{ flex: 1, padding: '8px 0', background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: 8, color: i === 0 ? C.border : C.sub, fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>UP</button>
                            <button onClick={() => moveExercise(day.key, i, 1)} disabled={i === day.exercises.length - 1}
                              style={{ flex: 1, padding: '8px 0', background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: 8, color: i === day.exercises.length - 1 ? C.border : C.sub, fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>DOWN</button>
                            <button onClick={() => removeExercise(day.key, i)}
                              style={{ flex: 1, padding: '8px 0', background: '#FFF0F0', border: '0.5px solid #FFCCCC', borderRadius: 8, color: '#CC3333', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>DELETE</button>
                          </div>
                          <button onClick={() => setEditingIdx(null)}
                            style={{ padding: '8px 0', background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 8, color: C.sub, fontSize: 14, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>DONE</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                <button onClick={() => addExercise(day.key)}
                  style={{ width: '100%', padding: '12px 0', background: 'none', border: `0.5px dashed ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 14, fontWeight: 'bold', letterSpacing: 1, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit' }}>
                  + ADD EXERCISE
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '16px 18px', background: C.surface, borderTop: `0.5px solid ${C.border}`, boxSizing: 'border-box' }}>
        <button onClick={() => onSave(draft)}
          style={{ width: '100%', padding: '14px 0', background: C.acc, border: 'none', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>SAVE CHANGES</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Mobility Screen (15-min pre-bed wind-down)
// ═══════════════════════════════════════════════════════════════════════════
function MobilityScreen({ onBack }) {
  const totalSeconds = MOBILITY_ROUTINE.reduce((sum, m) => sum + m.duration, 0)

  // Auto-reset completion if the stored entries are from a previous day
  const [completed, setCompletedRaw] = useState(() => {
    let stored = {}
    try { stored = JSON.parse(localStorage.getItem(MOBILITY_DONE_KEY) || '{}') } catch {}
    const today = new Date().toDateString()
    const isStale = Object.values(stored).some(ts => new Date(ts).toDateString() !== today)
    if (isStale) {
      try { localStorage.removeItem(MOBILITY_DONE_KEY) } catch {}
      return {}
    }
    return stored
  })

  const [activeId, setActiveId] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [running, setRunning] = useState(false)

  function setCompleted(next) {
    setCompletedRaw(next)
    try { localStorage.setItem(MOBILITY_DONE_KEY, JSON.stringify(next)) } catch {}
  }

  function startMove(move) {
    setActiveId(move.id)
    setSecondsLeft(move.duration)
    setRunning(true)
  }

  function markDone(id) {
    setCompleted({ ...completed, [id]: Date.now() })
    if (activeId === id) { setActiveId(null); setRunning(false); setSecondsLeft(0) }
    if (navigator.vibrate) navigator.vibrate(40)
  }

  function unmark(id) {
    const next = { ...completed }
    delete next[id]
    setCompleted(next)
  }

  function resetAll() {
    setCompleted({})
    setActiveId(null); setRunning(false); setSecondsLeft(0)
  }

  useEffect(() => {
    if (!running) return
    if (secondsLeft <= 0) {
      if (activeId) {
        setCompleted({ ...completed, [activeId]: Date.now() })
        if (navigator.vibrate) navigator.vibrate([60, 40, 60])
        setActiveId(null); setRunning(false); setSecondsLeft(0)
      }
      return
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [running, secondsLeft, activeId])

  const doneCount = Object.keys(completed).length
  const allDone = doneCount === MOBILITY_ROUTINE.length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '36px 20px 40px', background: C.bg }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', color: C.muted, fontSize: 15, fontWeight: 'bold', letterSpacing: 2, cursor: 'pointer', padding: '0 0 16px', fontFamily: 'inherit' }}>
        ← BACK
      </button>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, color: C.acc, letterSpacing: 4, marginBottom: 8, fontWeight: 'bold' }}>WIND-DOWN MOBILITY</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>15-Minute Pre-Bed</div>
        <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>Hips · Lower back · Hamstrings · Core · Disc-golf coil</div>
      </div>

      <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1, fontWeight: 'bold' }}>PROGRESS</div>
          <div style={{ fontSize: 17, color: C.text, fontWeight: 700 }}>{doneCount} / {MOBILITY_ROUTINE.length} moves</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1, fontWeight: 'bold' }}>TOTAL</div>
          <div style={{ fontSize: 17, color: C.text, fontWeight: 700 }}>{Math.round(totalSeconds / 60)} min</div>
        </div>
      </div>

      {allDone && (
        <div style={{ background: C.accLight, border: `1px solid ${C.acc}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16, color: C.acc, fontWeight: 700, fontSize: 15, textAlign: 'center', letterSpacing: 1 }}>
          NICE — ALL DONE. SLEEP WELL.
        </div>
      )}

      {MOBILITY_ROUTINE.map(move => {
        const isDone = !!completed[move.id]
        const isActive = activeId === move.id
        const accent = isActive ? C.acc : isDone ? C.acc : C.border
        return (
          <div key={move.id}
            style={{ background: isDone ? C.innerBg : C.surface, border: `0.5px solid ${isActive ? C.acc : C.border}`, borderLeft: `3px solid ${accent}`, borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{move.name}</div>
                  {move.coil && (
                    <div style={{ fontSize: 10, color: C.orange, letterSpacing: 1, fontWeight: 'bold', border: `0.5px solid ${C.orange}`, padding: '2px 6px', borderRadius: 4 }}>COIL</div>
                  )}
                </div>
                <div style={{ fontSize: 14, color: C.sub, marginTop: 4, lineHeight: 1.4 }}>{move.description}</div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: C.blue, fontWeight: 700, letterSpacing: 1 }}>{fmtClock(move.duration)}</div>
                {move.perSide && (
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>BOTH SIDES</div>
                )}
              </div>
            </div>

            {isActive ? (
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, fontSize: 28, fontWeight: 700, color: C.acc, fontFamily: 'monospace', textAlign: 'center', background: C.innerBg, borderRadius: 8, padding: '8px 0' }}>
                  {fmtClock(secondsLeft)}
                </div>
                <button onClick={() => setRunning(r => !r)}
                  style={{ padding: '12px 14px', background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {running ? 'PAUSE' : 'RESUME'}
                </button>
                <button onClick={() => markDone(move.id)}
                  style={{ padding: '12px 14px', background: C.acc, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
                  DONE
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button onClick={() => startMove(move)}
                  style={{ flex: 1, padding: '11px 0', background: isDone ? 'none' : C.acc, border: isDone ? `0.5px solid ${C.border}` : 'none', borderRadius: 10, color: isDone ? C.sub : '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {isDone ? 'REDO' : 'START'}
                </button>
                {isDone ? (
                  <button onClick={() => unmark(move.id)}
                    style={{ padding: '11px 16px', background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 10, color: C.acc, fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✓
                  </button>
                ) : (
                  <button onClick={() => markDone(move.id)}
                    style={{ padding: '11px 16px', background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' }}>
                    SKIP
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {doneCount > 0 && (
        <button onClick={resetAll}
          style={{ width: '100%', marginTop: 16, padding: '14px 0', background: 'none', border: `0.5px solid ${C.border}`, borderRadius: 14, color: C.muted, fontSize: 14, fontWeight: 'bold', letterSpacing: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
          RESET ROUTINE
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// App Root
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState('home')
  const [split, setSplit] = useState(null)
  const [progress, setProgress] = useState(null)
  const [history, setHistory] = useState([])
  const [dataReady, setDataReady] = useState(false)

  const wakeLockRef = useRef(null)
  const supabaseUserRef = useRef(null)

  // Real auth state (Stage 2). Replaces the prior anonymous-auth path.
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  // Keep ref in sync so existing callsites that read supabaseUserRef.current keep working.
  useEffect(() => { supabaseUserRef.current = user }, [user])

  async function signOut() {
    try { await supabase?.auth.signOut() } catch (e) { console.error('[signOut]', e) }
  }

  async function acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {}
  }
  function releaseWakeLock() { wakeLockRef.current?.release(); wakeLockRef.current = null }

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && screen === 'session') acquireWakeLock()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [screen])

  useEffect(() => {
    if (!user) {
      setSplit(null); setProgress(null); setHistory([]); setDataReady(false)
      return
    }
    let cancelled = false
    async function initSupabase() {
      try {
        let result = await loadProgramFromSupabase(user.id)
        if (!result?.program) {
          await seedUserData(user.id)
          result = await loadProgramFromSupabase(user.id)
        }
        const hist = await loadHistoryFromSupabase(user.id)
        if (cancelled) return
        if (result?.program) {
          setSplit(result.program)
          setProgress(result.progress)
        }
        setHistory(hist)
        setDataReady(true)
      } catch (e) {
        console.error('[supabase init]', e)
        if (!cancelled) setDataReady(true)  // surface the empty state instead of an infinite spinner
      }
    }
    initSupabase()
    return () => { cancelled = true }
  }, [user?.id])

  async function reloadHistory() {
    if (!user) return
    const hist = await loadHistoryFromSupabase(user.id)
    setHistory(hist)
  }

  // Session state (persisted)
  // Session state lives in React only — refreshing the tab clears it.
  // The "Recover last cloud session" button on Home re-hydrates from Supabase.
  const [dayKey, setDayKey]                   = useState(null)
  const [sessionLogs, setSessionLogs]         = useState({})
  const [sessionExercises, setSessionExercises] = useState([])
  const [sessionScreen, setSessionScreen]     = useState('session')
  const [sessionResult, setSessionResult]     = useState(null)
  const [supabaseSessionId, setSupabaseSessionId] = useState(null)

  const hasActiveSession = !!dayKey && sessionExercises.length > 0
  const currentCycle = dayKey ? (progress?.[dayKey]?.week ?? (dayKey === 'day_5' ? 1 : 3)) : 3

  async function startSession(key) {
    const day = split[key]
    const cycle = progress[key]?.week ?? (key === 'day_5' ? 1 : 3)
    const freshExercises = JSON.parse(JSON.stringify(day.exercises))
    setDayKey(key)
    setSessionLogs({})
    setSessionExercises(freshExercises)
    setSessionScreen('session')
    setSessionResult(null)
    setSupabaseSessionId(null)
    setScreen('session')
    acquireWakeLock()

    const user = supabaseUserRef.current
    if (user) {
      const newId = await createSessionRow({
        userId: user.id,
        splitDayId: day._split_day_id,
        weekNumber: cycle,
        mesocycle: MESO,
      })
      if (newId) setSupabaseSessionId(newId)
    }
  }

  function finishSessionClick() {
    const day = split[dayKey]
    const result = computeNextTargets(sessionExercises, sessionLogs, currentCycle)
    setSessionResult(result)
    setSessionScreen('results')
  }

  async function saveAndGoHome() {
    const day = split[dayKey]
    let finalProgress = progress
    if (dayKey && sessionResult?.targets?.length > 0) {
      const nextCycle = sessionResult.next_cycle ?? (currentCycle + 1)
      const updatedSplit = JSON.parse(JSON.stringify(split))
      const dayExercises = updatedSplit[dayKey]?.exercises ?? []
      for (const target of sessionResult.targets) {
        const ex = dayExercises.find(e => e.id === target.exercise_id || e.name === target.exercise_name)
        if (ex && target.target_weight != null) ex.w = target.target_weight
      }
      setSplit(updatedSplit)
      const updatedProgress = { ...progress, [dayKey]: { week: nextCycle } }
      setProgress(updatedProgress)
      finalProgress = updatedProgress

      if (user) {
        try {
          await saveSessionTargets(user.id, dayKey, split[dayKey]?._split_day_id, sessionResult.targets, dayExercises, nextCycle)
        } catch (e) {
          console.error('[saveSessionTargets]', e)
          alert(`Couldn't save your progress to the cloud: ${e.message}\n\nYour session data is still here.`)
          return
        }
      }
    }

    if (supabaseSessionId) {
      markSessionComplete(supabaseSessionId, sessionResult?.session_summary ?? null)
    }

    // Optimistic prepend so the just-finished session is immediately visible
    // in RECENT. The fire-and-forget reload below reconciles once the queue
    // flushes the completed_at write.
    const optimisticEntry = {
      date: new Date().toISOString(),
      dayKey,
      label: split[dayKey]?.label ?? dayKey,
      week: currentCycle,
      summary: sessionResult?.session_summary ?? null,
    }
    setHistory([optimisticEntry, ...history].slice(0, 20))

    releaseWakeLock()
    setDayKey(null)
    setSessionLogs({})
    setSessionExercises([])
    setSessionScreen('session')
    setSessionResult(null)
    setSupabaseSessionId(null)
    setScreen('home')

    void reloadHistory()
  }

  async function recoverLatest() {
    const user = supabaseUserRef.current
    if (!user) { alert('Not connected to cloud.'); return }
    const latest = await fetchMostRecentSessionAny(user.id)
    if (!latest) { alert('No cloud sessions found.'); return }
    const dayEntry = Object.entries(split).find(([, d]) => d._split_day_id === latest.splitDayId)
    if (!dayEntry) { alert('Cloud session references an unknown day.'); return }
    const [key, day] = dayEntry
    if (!latest.setLogs.length) { alert(`No set logs stored for ${day.label}.`); return }

    const logsByShortId = {}
    for (const log of latest.setLogs) {
      const ex = day.exercises.find(e => e._exercise_id === log.exercise_id)
      if (!ex) continue
      if (!logsByShortId[ex.id]) logsByShortId[ex.id] = []
      const w = Number(log.weight)
      if (log.set_type === 'myo_activation') logsByShortId[ex.id].push({ type: 'act', w, reps: log.reps, rir: log.rir })
      else if (log.set_type === 'myo_mini') logsByShortId[ex.id].push({ type: 'mini', num: log.set_number, w, reps: log.reps })
      else logsByShortId[ex.id].push({ num: log.set_number, w, reps: log.reps, rir: log.rir })
    }

    setDayKey(key)
    setSessionLogs(logsByShortId)
    setSessionExercises(day.exercises)
    setSessionScreen('session')
    setSessionResult(null)
    setSupabaseSessionId(latest.sessionId)
    setScreen('session')
  }

  if (!supabase) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, color: C.red, fontFamily: '-apple-system, Arial, sans-serif' }}>
        Supabase env vars missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
      </div>
    )
  }
  if (!authReady) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: '-apple-system, Arial, sans-serif' }}>
        Loading…
      </div>
    )
  }
  if (!user) return <SignIn />
  if (!dataReady || !split || !progress) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: '-apple-system, Arial, sans-serif' }}>
        Loading your program…
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto', height: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', color: C.text, fontFamily: '-apple-system, Arial, sans-serif' }}>
      <SyncPill />
      {screen === 'home' && (
        <HomeScreen split={split} progress={progress} history={history}
          onStart={startSession} onEdit={() => setScreen('edit')}
          hasActiveSession={hasActiveSession} activeSessionKey={dayKey}
          onResumeSession={() => setScreen('session')} onRecover={recoverLatest}
          onMobility={() => setScreen('mobility')}
          userEmail={user.email} onSignOut={signOut} />
      )}
      {screen === 'mobility' && (
        <MobilityScreen onBack={() => setScreen('home')} />
      )}
      {screen === 'edit' && (
        <EditScreen split={split} onSave={async s => {
          if (user) {
            try {
              await saveProgramToSupabase(user.id, s, progress)
            } catch (e) {
              console.error('[edit save]', e)
              alert(`Couldn't save your edits to the cloud: ${e.message}`)
              return
            }
          }
          setSplit(s)
          setScreen('home')
        }} onBack={() => setScreen('home')} />
      )}
      {screen === 'session' && dayKey && (
        sessionScreen === 'results' && sessionResult ? (
          <ResultsScreen
            day={split[dayKey]}
            result={sessionResult}
            currentCycle={currentCycle}
            onDone={saveAndGoHome}
            onBack={() => setSessionScreen('session')}
          />
        ) : (
          <SessionScreen
            dayKey={dayKey} split={split}
            onBack={() => { releaseWakeLock(); setScreen('home') }}
            onCompleteClick={finishSessionClick}
            currentCycle={currentCycle}
            sessionLogs={sessionLogs} setSessionLogs={setSessionLogs}
            sessionExercises={sessionExercises}
            supabaseSessionId={supabaseSessionId}
          />
        )
      )}
    </div>
  )
}
