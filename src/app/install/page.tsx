import { headers } from 'next/headers'
import QRCode from 'qrcode'
import InstallPrompt from './InstallPrompt'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Install Bookface',
  description: 'Add Bookface to your home screen.',
}

export default async function InstallPage() {
  // The QR has to point at wherever this is actually deployed, so it is built
  // from the request rather than a hardcoded URL — the same page works on a
  // preview deployment, production, or a laptop on the LAN.
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  const url = `${proto}://${host}/install`

  const qr = await QRCode.toString(url, {
    type: 'svg', margin: 0, width: 168,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })

  return (
    <div className="login">
      <div className="login-card install-card">
        <div className="login-hd">
          <div className="mark">Y</div>
          <div className="wordmark">Bookface</div>
        </div>

        <div className="block">
          <div className="block-hd"><h2>Add Bookface to your phone</h2></div>
          <div className="pad">
            <InstallPrompt />
          </div>
        </div>

        <div className="block qr-block">
          <div className="block-hd"><h2>On a phone</h2><span className="aside">Scan to open</span></div>
          <div className="pad qr-pad">
            <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
            <code className="qr-url">{url}</code>
          </div>
        </div>

        <p className="login-note">
          Bookface is for founders in the Winter 2026 batch and their group partner.
          Installing it does not sign you in &mdash; you will still need the Bookface ID
          issued to you.
        </p>
      </div>
    </div>
  )
}
