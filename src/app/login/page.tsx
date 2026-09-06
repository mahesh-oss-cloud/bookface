'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      // Don't distinguish "no such account" from "wrong password" — that tells an
      // outsider which of the four addresses are real.
      setError('That email and password don’t match an account.')
      setBusy(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-hd">
          <div className="mark">Y</div>
          <div className="wordmark">Bookface</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email" type="email" value={email} required autoComplete="email"
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password" type="password" value={password} required autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="notice notice-err" style={{ marginBottom: 10 }}>{error}</div>}

          <button className="btn btn-p" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <p className="login-note">
          Bookface is for founders in the batch and their group partner. Accounts are
          created by the partner &mdash; there is no public sign-up.
        </p>
      </div>
    </div>
  )
}
