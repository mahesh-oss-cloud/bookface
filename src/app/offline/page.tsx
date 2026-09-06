export const metadata = { title: 'Offline — Bookface' }

/**
 * Shown only when the device has no connection. It deliberately shows no data:
 * everything in Bookface is scoped to who is signed in, and a cached copy of
 * somebody's numbers is not something to hand back later.
 */
export default function OfflinePage() {
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-hd">
          <div className="mark">Y</div>
          <div className="wordmark">Bookface</div>
        </div>
        <div className="block">
          <div className="block-hd"><h2>No connection</h2></div>
          <div className="pad" style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7 }}>
            <p style={{ margin: '0 0 10px' }}>
              Bookface needs a connection. Nothing is kept on the device &mdash; what you
              can see depends on who is signed in, and that is decided by the server every
              time you ask.
            </p>
            <p style={{ margin: 0, color: 'var(--meta)', fontSize: 11 }}>
              Reconnect and pull to refresh.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
