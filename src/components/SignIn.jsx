import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { C } from '../theme'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e?.preventDefault?.()
    if (!email.trim() || !password || busy) return
    setBusy(true); setError(null)

    try {
      // Try sign in first.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (!signInErr) return  // auth listener in App takes over

      // No account yet → create one.
      if (signInErr.message?.toLowerCase().includes('invalid login credentials')) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (signUpErr) throw signUpErr
        return  // session created, listener takes over
      }

      throw signInErr
    } catch (err) {
      setError(err.message || 'Could not sign in.')
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', color: C.text, fontFamily: '-apple-system, Arial, sans-serif' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '60px 24px 40px' }}>
        <div style={{ marginBottom: 36 }}>
          <img
            src="/brand/swolebro-lockup-transparent.png"
            alt="SwoleBro"
            style={{ width: 180, display: 'block', margin: '0 auto 16px' }}
          />
          <div style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Sign in</div>
          <div style={{ fontSize: 14, color: C.sub, marginTop: 4 }}>
            First time? Just enter an email and password — your account is created on the spot.
          </div>
        </div>

        <form onSubmit={submit}>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            inputMode="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
          <button type="submit" disabled={busy || !email.trim() || !password} style={btnStyle(busy)}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 20, padding: '12px 14px', background: C.failBg, border: `1px solid ${C.red}`, borderRadius: 10, color: C.red, fontSize: 14 }}>
            {error}
          </div>
        )}
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
