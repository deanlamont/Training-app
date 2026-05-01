import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'

const C = {
  bg: '#F5F0E8', surface: '#FFFFFF', border: '#D8D3C8',
  text: '#1A1A1A', sub: '#555555', muted: '#999999',
  acc: '#2D6A4F', red: '#B04040',
}

export default function SignIn() {
  const [step, setStep] = useState('email')   // 'email' | 'code'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  async function sendCode(e) {
    e?.preventDefault?.()
    if (!email.trim() || busy) return
    setBusy(true); setError(null); setInfo(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
      setStep('code')
      setInfo('Check your inbox. Paste the 6-digit code, or tap the link.')
    } catch (err) {
      setError(err.message || 'Could not send code. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(e) {
    e?.preventDefault?.()
    const token = code.trim()
    if (!token || busy) return
    setBusy(true); setError(null); setInfo(null)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'email',
      })
      if (error) throw error
      // Auth listener in App will pick up the session and re-render.
    } catch (err) {
      setError(err.message || 'Invalid or expired code.')
      setBusy(false)
    }
  }

  function startOver() {
    setStep('email'); setCode(''); setError(null); setInfo(null)
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', color: C.text, fontFamily: '-apple-system, Arial, sans-serif' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '60px 24px 40px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 15, color: C.acc, letterSpacing: 4, marginBottom: 8, fontWeight: 'bold' }}>SWOLEBRO TRAINING</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Sign in</div>
          <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>
            {step === 'email'
              ? 'Enter your email — we’ll send you a 6-digit code.'
              : `Code sent to ${email}`}
          </div>
        </div>

        {step === 'email' && (
          <form onSubmit={sendCode}>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" disabled={busy || !email.trim()} style={btnStyle(busy)}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verifyCode}>
            <input
              type="text"
              autoComplete="one-time-code"
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              style={{ ...inputStyle, fontSize: 22, letterSpacing: 6, textAlign: 'center' }}
            />
            <button type="submit" disabled={busy || code.length < 6} style={btnStyle(busy)}>
              {busy ? 'Verifying…' : 'Verify code'}
            </button>
            <button type="button" onClick={startOver} disabled={busy}
              style={{ ...btnStyle(busy), background: 'transparent', color: C.sub, marginTop: 8, border: 'none' }}>
              Use a different email
            </button>
          </form>
        )}

        {info && (
          <div style={{ marginTop: 20, padding: '12px 14px', background: '#EAF3DE', border: `1px solid ${C.acc}`, borderRadius: 10, color: C.acc, fontSize: 14 }}>
            {info}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 20, padding: '12px 14px', background: '#FBE9E7', border: `1px solid ${C.red}`, borderRadius: 10, color: C.red, fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 40, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
          On iOS Safari private tabs the link may open in your default browser.
          The 6-digit code keeps you in this tab.
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  fontSize: 17,
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  color: C.text,
  fontFamily: 'inherit',
  marginBottom: 12,
  boxSizing: 'border-box',
}

function btnStyle(busy) {
  return {
    width: '100%',
    padding: '14px 16px',
    fontSize: 17,
    fontWeight: 600,
    background: busy ? C.muted : C.acc,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  }
}
