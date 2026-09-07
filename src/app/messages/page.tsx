import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import Composer from './Composer'
import MarkRead from './MarkRead'
import type { Profile, Company, Message } from '@/lib/types'
import { initials, shortWhen, fullWhen } from '@/lib/people'

export const dynamic = 'force-dynamic'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>
}) {
  const params = await searchParams
  const withId = (params.with ?? '').trim()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [peopleRes, coRes, msgRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id').order('full_name'),
    supabase.from('companies').select('id, name'),
    // RLS already limits this to messages you sent or received; there is no
    // filter here that a client could remove to widen it.
    supabase.from('messages').select('*').order('created_at', { ascending: true }),
  ])

  const people = (peopleRes.data ?? []) as Profile[]
  const companies = (coRes.data ?? []) as Pick<Company, 'id' | 'name'>[]
  const messages = (msgRes.data ?? []) as Message[]

  const others = people.filter(p => p.id !== user.id)
  const byId = new Map(people.map(p => [p.id, p]))
  const companyName = (p: Profile) => companies.find(c => c.id === p.company_id)?.name ?? null

  const threads = others.map(p => {
    const items = messages.filter(
      m => (m.sender_id === p.id && m.recipient_id === user.id)
        || (m.sender_id === user.id && m.recipient_id === p.id)
    )
    const last = items[items.length - 1] ?? null
    const unread = items.filter(m => m.recipient_id === user.id && !m.read_at).length
    return { person: p, items, last, unread }
  }).sort((a, b) => {
    if (a.last && b.last) return a.last.created_at < b.last.created_at ? 1 : -1
    if (a.last) return -1
    if (b.last) return 1
    return a.person.full_name.localeCompare(b.person.full_name)
  })

  const open = withId ? threads.find(t => t.person.id === withId) ?? null : null
  const unreadIds = open
    ? open.items.filter(m => m.recipient_id === user.id && !m.read_at).map(m => m.id)
    : []

  return (
    <>
      <Chrome current="/messages" />
      <div className={`wrap cols-msg${open ? ' has-thread' : ''}`}>
        <div className="block msg-list">
          <div className="block-hd">
            <h2>Messages</h2>
            <span className="aside">{others.length} people</span>
          </div>
          {threads.map(t => (
            <Link
              key={t.person.id}
              href={`/messages?with=${t.person.id}`}
              className={`convo${open?.person.id === t.person.id ? ' on' : ''}`}
            >
              <span className="av" style={{ width: 28, height: 28, fontSize: 10 }}>
                {initials(t.person.full_name)}
              </span>
              <span className="convo-body">
                <span className="convo-top">
                  <strong>{t.person.full_name}</strong>
                  {t.last && <span className="convo-when">{shortWhen(t.last.created_at)}</span>}
                </span>
                <span className="convo-prev">
                  {t.last
                    ? <>{t.last.sender_id === user.id && <span className="dim">You: </span>}{t.last.body}</>
                    : <span className="dim">{t.person.title}</span>}
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
                  Messages here go to the person you send them to and stay between
                  the two of you. Partners cannot read them, and neither can anyone
                  else in the batch.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="block-hd">
                <h2>
                  {open.person.full_name}
                  <span className="convo-sub">
                    {open.person.title}
                    {companyName(open.person) && <> &middot; {companyName(open.person)}</>}
                  </span>
                </h2>
                <Link className="aside back" href="/messages">All conversations</Link>
              </div>

              <MarkRead ids={unreadIds} />

              <div className="thread">
                {open.items.length === 0 ? (
                  <div className="empty">
                    <strong>Nothing yet</strong>
                    <p>
                      This is the start of your conversation with {open.person.full_name.split(' ')[0]}.
                    </p>
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

              <Composer recipientId={open.person.id} recipientName={open.person.full_name} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
