'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authAddress, normalizeId, BATCH_TAG } from '@/lib/identity'
import ConceptNote from '@/components/ConceptNote'

export default function LoginPage() {
  const router = useRouter()
  const [bookfaceId, setBookfaceId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const id = normalizeId(bookfaceId)
    if (!id) {
      setError('Enter the Bookface ID you were issued.')
      setBusy(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: authAddress(id),
      password,
    })

    if (authError) {
      // Don't distinguish "no such ID" from "wrong password" — that tells an
      // outsider which IDs in the batch are real.
      setError('That Bookface ID and password don’t match an account.')
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mark" src="/yc-mark.png" alt="Y Combinator" width={30} height={30} />
          <div className="wordmark">Bookface</div>
          <span className="yctag">Y Combinator</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="bookfaceId">Bookface ID</label>
            <div className="idfield">
              <input
                id="bookfaceId" type="text" value={bookfaceId} required
                autoComplete="username" autoCapitalize="off" autoCorrect="off"
                spellCheck={false} placeholder="firstnamelastname"
                onChange={e => setBookfaceId(e.target.value)}
              />
              <span className="idsuffix">@{BATCH_TAG}</span>
            </div>
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
          Sign in with the Bookface ID issued to you when you were accepted &mdash; not
          your email. Bookface is for founders in the batch and their group partner;
          accounts are created by the partner, and there is no public sign-up.
          {' '}<a href="/install">Install it on your phone &rarr;</a>
        </p>
        <ConceptNote />
      </div>
    </div>
  )
}
