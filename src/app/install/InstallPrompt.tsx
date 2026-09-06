'use client'

import { useEffect, useState } from 'react'

/**
 * The one-tap install only exists on Android.
 *
 * Chrome fires `beforeinstallprompt` when the app meets its installability
 * criteria; capturing that event lets a button open the real OS install dialog.
 * iOS has no equivalent — Apple exposes no API for triggering Add to Home
 * Screen, and no amount of JavaScript changes that — so Safari gets exact
 * instructions instead of a button that would do nothing.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'desktop' | 'unknown'

function detect(): Platform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  // iPadOS 13+ reports itself as a Mac, so a touch-capable "Mac" is an iPad.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>('unknown')
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null)
  const [inApp, setInApp] = useState(false)

  useEffect(() => {
    setPlatform(detect())
    setInApp(window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as { standalone?: boolean }).standalone === true)

    const onPrompt = (e: Event) => {
      // Chrome shows its own mini-infobar unless this is prevented; we want the
      // button below to be the trigger instead.
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => { setInstalled(true); setDeferred(null) }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome: choice } = await deferred.userChoice
    setOutcome(choice)
    // The event can only be used once; Chrome fires a fresh one if it is still
    // installable.
    setDeferred(null)
  }

  if (inApp || installed) {
    return (
      <div className="notice notice-ok">
        <strong>Bookface is installed.</strong> You can close this page and open it
        from your home screen.
      </div>
    )
  }

  if (platform === 'ios') return <IosSteps />

  if (platform === 'android') {
    return (
      <div>
        {deferred ? (
          <>
            <button className="btn btn-p install-btn" onClick={install}>Install Bookface</button>
            <p className="install-note">
              This opens Android&rsquo;s own install dialog. Bookface then behaves like any
              other app on the phone &mdash; its own icon, no browser bar.
            </p>
          </>
        ) : (
          <>
            <p className="install-note" style={{ marginTop: 0 }}>
              {outcome === 'dismissed'
                ? 'Install was dismissed. Reload this page to try again, or use the menu below.'
                : 'Chrome has not offered the install dialog on this page yet.'}
            </p>
            <ol className="install-steps">
              <li>Open Chrome&rsquo;s menu &mdash; the <strong>⋮</strong> at the top right.</li>
              <li>Tap <strong>Install app</strong>, or <strong>Add to Home screen</strong>.</li>
              <li>Confirm. The Bookface icon appears with your other apps.</li>
            </ol>
            <p className="install-note">
              The one-tap button only appears in Chrome, and only over HTTPS.
            </p>
          </>
        )}
      </div>
    )
  }

  if (platform === 'desktop') {
    return (
      <div>
        <p className="install-note" style={{ marginTop: 0 }}>
          Bookface installs on a phone. Scan the code below, or send yourself this
          page&rsquo;s address and open it on your phone.
        </p>
      </div>
    )
  }

  return <p className="install-note">Checking your device&hellip;</p>
}

/** Safari's share glyph, so the instruction points at something recognisable. */
function ShareGlyph() {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" aria-hidden="true"
         style={{ verticalAlign: '-2px', margin: '0 1px' }}>
      <path d="M6.5 1v8.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M3.6 3.6 6.5 0.8l2.9 2.8" stroke="currentColor" strokeWidth="1.4" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.2 6.4H1v7.4h11V6.4h-1.2" stroke="currentColor" strokeWidth="1.4" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IosSteps() {
  return (
    <div>
      <ol className="install-steps">
        <li>
          Tap the <strong>Share</strong> button <ShareGlyph />{' '}&mdash; at the bottom
          of Safari, or top right on an iPad.
        </li>
        <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
        <li>Tap <strong>Add</strong>. The Bookface icon appears on your home screen.</li>
      </ol>
      <p className="install-note">
        It has to be <strong>Safari</strong>. Chrome and Firefox on iPhone cannot add to the
        home screen &mdash; Apple does not let them, and gives no way for this page to
        open the dialog for you.
      </p>
    </div>
  )
}
