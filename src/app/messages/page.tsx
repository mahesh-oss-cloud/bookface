import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import Composer from './Composer'
import MarkRead from './MarkRead'
import type { Profile, Company, Message, DirectoryFounder, DirectoryCompany } from '@/lib/types'
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
  /** Set when the thread is addressed to an account directly. A founder thread
      still reaches a real inbox once that founder's row is linked to one. */
  profileId: string | null
  founder: DirectoryFounder | null
  linkedin: string | null
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string; founder?: string }>
}) {
  const params = await searchParams
  const withId = (params.with ?? '').trim()
  const founderId = (params.founder ?? '').trim()

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

  // Every directory founder this person has written to, plus the one they are
  // opening right now even if nothing has been sent yet.
  const founderIds = Array.from(new Set([
    ...messages.map(m => m.recipient_founder_id).filter((v): v is string => !!v),
    ...(founderId ? [founderId] : []),
  ]))

  const { data: founderRows } = founderIds.length
    ? await supabase.from('directory_founders').select('*').in('id', founderIds)
    : { data: [] }
  const founders = (founderRows ?? []) as DirectoryFounder[]

  const { data: founderCoRows } = founders.length
    ? await supabase.from('directory_companies').select('id, name, batch')
        .in('id', Array.from(new Set(founders.map(f => f.company_id))))
    : { data: [] }
  const founderCompanies = new Map(
    ((founderCoRows ?? []) as Pick<DirectoryCompany, 'id' | 'name' | 'batch'>[])
      .map(c => [c.id, c])
  )

  const personThreads: Thread[] = people.filter(p => p.id !== user.id).map(p => {
    const items = messages.filter(
      m => (m.sender_id === p.id && m.recipient_id === user.id)
        || (m.sender_id === user.id && m.recipient_id === p.id)
    )
    return {
      key: `p:${p.id}`,
      href: `/messages?with=${p.id}`,
      name: p.full_name,
      sub: [p.title, companyName(p)].filter(Boolean).join(' · ') || null,
      items,
      last: items[items.length - 1] ?? null,
      unread: items.filter(m => m.recipient_id === user.id && !m.read_at).length,
      profileId: p.id,
      founder: null,
      linkedin: null,
    }
  })

  const founderThreads: Thread[] = founders.map(f => {
    const items = messages.filter(m => m.recipient_founder_id === f.id)
    const co = founderCompanies.get(f.company_id)
    return {
      key: `f:${f.id}`,
      href: `/messages?founder=${f.id}`,
      name: f.name,
      sub: [f.title, co ? `${co.name}${co.batch ? ` (${co.batch})` : ''}` : null]
        .filter(Boolean).join(' · ') || null,
      items,
      last: items[items.length - 1] ?? null,
      unread: 0,
      profileId: null,
      founder: f,
      linkedin: f.linkedin_url,
    }
  })

  const threads = [...personThreads, ...founderThreads].sort((a, b) => {
    if (a.last && b.last) return a.last.created_at < b.last.created_at ? 1 : -1
    if (a.last) return -1
    if (b.last) return 1
    return a.name.localeCompare(b.name)
  })

  const open = founderId
    ? threads.find(t => t.founder?.id === founderId) ?? null
    : withId
      ? threads.find(t => t.profileId === withId) ?? null
      : null

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
                recipientFounderId={open.founder?.id}
                recipientName={open.name}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
