import Link from 'next/link'

/**
 * The envelope next to a person. It only appears for someone who actually has
 * an account, because a message needs somewhere to land.
 */
export default function MessageLink({
  to,
  name,
  label = false,
}: {
  to: string
  name: string
  label?: boolean
}) {
  return (
    <Link
      className={`msgbtn${label ? ' msgbtn-lg' : ''}`}
      href={`/messages?with=${to}`}
      title={`Message ${name}`}
      aria-label={`Message ${name}`}
    >
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1"
              fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2 4.5 8 8.8l6-4.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      {label && <span>Message</span>}
    </Link>
  )
}
