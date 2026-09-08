import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import Composer from './Composer'
import MarkRead from './MarkRead'
import type { Profile, Company, Message, Person } from '@/lib/types'
import { initials, shortWhen, fullWhen } from '@/lib/people'

export const dynamic = 'force-dynamic'

/** A conversation, whether the other end holds an account or not. */
type Thread = {
  key: string
  href: string
  name: string
  sub: string | null
  items: Message[]
  last: Message | null
  unread: number
  /** Set when the thread is addressed to an account directly. A directory
      thread still reaches a real inbox once that entry is linked to one. */
  profileId: string | null
  person: Person | null
  linkedin: string | null
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string; person?: string }>
}) {
  const params = await searchParams
  const withId = (params.with ?? '').trim()
  const personId = (params.person ?? '').trim()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [peopleRes, coRes, msgRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id, avatar_url').order('full_name'),
    supabase.from('companies').select('id, name'),
    // RLS already limits this to messages you sent or received; there is no
    // filter here that a client could remove to widen it.
    supabase.from('messages').select('*').order('created_at', { ascending: true }),
  ])

  const people = (peopleRes.data ?? []) as Profile[]
  const companies = (coRes.data ?? []) as Pick<Company, 'id' | 'name'>[]
  const messages = (msgRes.data ?? []) as Message[]
  const byId = new Map(people.map(p => [p.id, p]))
  const companyName = (p: Profile) => companies.find(c => c.id === p.company_id)?.name ?? null

  // Everyone in the directory this person has written to, plus the one they are
  // opening right now even if nothing has been sent yet.
  const personIds = Array.from(new Set([
    ...messages.map(m => m.recipient_person_id).filter((v): v is string => !!v),
    ...(personId ? [personId] : []),
  ]))

  const { data: personRows } = personIds.length
    ? await supabase.from('people').select('*').in('id', personIds)
    : { data: [] }
  const directory = (personRows ?? []) as Person[]

  // A message sent to your own directory entry, before you held an account, is
  // a message to you — it belongs in the thread with whoever sent it.
  const mine = new Set(directory.filter(d => d.profile_id === user.id).map(d => d.id))
  const toMe = (m: Message) =>
    m.recipient_id === user.id || (m.recipient_person_id != null && mine.has(m.recipient_person_id))

  const accountThreads: Thread[] = people.filter(p => p.id !== user.id).map(p => {
    const items = messages.filter(
      m => (m.sender_id === p.id && toMe(m))
        || (m.sender_id === user.id && m.recipient_id === p.id)
    )
    return {
      key: `p:${p.id}`,
      href: `/messages?with=${p.id}`,
      name: p.full_name,
      sub: [p.title, companyName(p)].filter(Boolean).join(' · ') || null,
      items,
      last: items[items.length - 1] ?? null,
      unread: items.filter(m => toMe(m) && !m.read_at).length,
      profileId: p.id,
      person: null,
      linkedin: null,
    }
  })

  const directoryThreads: Thread[] = directory.filter(d => !mine.has(d.id)).map(d => {
    const items = messages.filter(m => m.recipient_person_id === d.id)
    const batch = d.batches[0] ? ` (${d.batches[0]})` : ''
    return {
      key: `d:${d.id}`,
      href: `/messages?person=${d.id}`,
      name: d.name,
      sub: [d.role_title, d.org ? `${d.org}${batch}` : null].filter(Boolean).join(' · ') || null,
      items,
      last: items[items.length - 1] ?? null,
      unread: 0,
      profileId: null,
      person: d,
      linkedin: d.linkedin_url,
    }
  })

  const threads = [...accountThreads, ...directoryThreads].sort((a, b) => {
    if (a.last && b.last) return a.last.created_at < b.last.created_at ? 1 : -1
    if (a.last) return -1
    if (b.last) return 1
    return a.name.localeCompare(b.name)
  })

  const open = personId
    ? threads.find(t => t.person?.id === personId) ?? null
    : withId
      ? threads.find(t => t.profileId === withId) ?? null
      : null

  const unreadIds = open
    ? open.items.filter(m => toMe(m) && !m.read_at).map(m => m.id)
    : []

  return (
    <>
      <Chrome current="/messages" />
      <div className={`wrap cols-msg${open ? ' has-thread' : ''}`}>
        <div className="block msg-list">
          <div className="block-hd">
            <h2>Messages</h2>
            <span className="aside">{threads.length}</span>
          </div>
          {threads.map(t => (
            <Link key={t.key} href={t.href} className={`convo${open?.key === t.key ? ' on' : ''}`}>
              <span className="av" style={{ width: 28, height: 28, fontSize: 10 }}>
                {initials(t.name)}
              </span>
              <span className="convo-body">
                <span className="convo-top">
                  <strong>{t.name}</strong>
                  {t.last && <span className="convo-when">{shortWhen(t.last.created_at)}</span>}
                </span>
                <span className="convo-prev">
                  {t.last
                    ? <>{t.last.sender_id === user.id && <span className="dim">You: </span>}{t.last.body}</>
                    : <span className="dim">{t.sub}</span>}
                </span>
              </span>
              {t.unread > 0 && <span className="unread">{t.unread}</span>}
            </Link>
          ))}
        </div>

        <div className="block msg-thread">
          {!open ? (
            <>
              <div className="block-hd"><h2>No conversation open</h2></div>
              <div className="empty">
                <strong>Pick someone on the left</strong>
                <p>
                  A conversation stays between the two of you. Partners cannot read
                  it, and neither can anyone else in the batch.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="block-hd">
                <h2>
                  {open.linkedin
                    ? <a href={open.linkedin} target="_blank" rel="noreferrer">{open.name}</a>
                    : open.name}
                  {open.sub && <span className="convo-sub">{open.sub}</span>}
                </h2>
                <Link className="aside back" href="/messages">All conversations</Link>
              </div>

              <MarkRead ids={unreadIds} />

              <div className="thread">
                {open.items.length === 0 ? (
                  <div className="empty">
                    <strong>Nothing yet</strong>
                    <p>This is the start of your conversation with {open.name.split(' ')[0]}.</p>
                  </div>
                ) : open.items.map(m => {
                  const mine = m.sender_id === user.id
                  return (
                    <div key={m.id} className={`bubble-row${mine ? ' mine' : ''}`}>
                      <div className="bubble">
                        <div className="bubble-who">
                          {mine ? 'You' : byId.get(m.sender_id)?.full_name ?? 'Unknown'}
                          <span className="bubble-when">{fullWhen(m.created_at)}</span>
                        </div>
                        <div className="bubble-body">{m.body}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <Composer
                recipientId={open.profileId ?? undefined}
                recipientPersonId={open.person?.id}
                recipientName={open.name}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
