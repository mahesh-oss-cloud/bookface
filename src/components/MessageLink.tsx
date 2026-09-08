import Link from 'next/link'

/**
 * The envelope next to a person. `to` addresses someone who holds an account;
 * `person` addresses their entry in the people directory, which every founder,
 * partner and investor has. Those are kept against the entry and land in a real
 * inbox the moment that person is issued an account — the thread says so rather
 * than the icon quietly implying otherwise.
 */
export default function MessageLink({
  to,
  person,
  name,
  label = false,
}: {
  to?: string
  person?: string
  name: string
  label?: boolean
}) {
  const href = to ? `/messages?with=${to}` : `/messages?person=${person}`
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
