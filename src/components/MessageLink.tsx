import Link from 'next/link'

/**
 * The envelope next to a person. `to` addresses someone with an account;
 * `founder` addresses a founder listed in the directory, whose messages are
 * kept but not delivered — the thread itself says so, rather than the icon
 * quietly implying otherwise.
 */
export default function MessageLink({
  to,
  founder,
  name,
  label = false,
}: {
  to?: string
  founder?: string
  name: string
  label?: boolean
}) {
  const href = to ? `/messages?with=${to}` : `/messages?founder=${founder}`
  return (
    <Link
      className={`msgbtn${label ? ' msgbtn-lg' : ''}`}
      href={href}
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
