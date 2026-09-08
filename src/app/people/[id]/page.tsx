import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import MessageLink from '@/components/MessageLink'
import Expertise from '../Expertise'
import type { Person, TagFacet } from '@/lib/types'
import { initials } from '@/lib/people'

export const dynamic = 'force-dynamic'

const KIND_LABEL: Record<string, string> = {
  founder: 'Founder',
  investor: 'Investor',
  partner: 'Partner',
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('people').select('*').eq('id', id).maybeSingle()
  const p = data as Person | null
  if (!p) notFound()

  const isYou = p.profile_id === user.id

  // Batchmates are the reason a directory is useful at all: the person you are
  // looking at is a door to everyone who went through at the same time.
  const batch = p.batches[0] ?? null
  const [tagRes, alsoRes] = await Promise.all([
    isYou
      ? supabase.from('people_tags').select('*').order('people', { ascending: false }).limit(12)
      : Promise.resolve({ data: [] }),
    batch
      ? supabase.from('people').select('id, name, org, role_title, avatar_url, profile_id')
          .contains('batches', [batch]).neq('id', p.id).order('name').limit(8)
      : Promise.resolve({ data: [] }),
  ])

  const suggestions = ((tagRes.data ?? []) as TagFacet[]).map(t => t.tag)
  const also = (alsoRes.data ?? []) as Pick<
    Person, 'id' | 'name' | 'org' | 'role_title' | 'avatar_url' | 'profile_id'
  >[]

  const first = p.name.split(/\s+/)[0]

  return (
    <>
      <Chrome current="/people" />
      <div className="wrap cols">
        <div>
          <div className="block">
            <div className="co-hero">
              {p.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img className="co-logo" src={p.avatar_url} alt="" width={56} height={56}
                       style={{ borderRadius: '50%', objectFit: 'cover', padding: 0 }} />
                : <span className="co-logo co-logo-fb" style={{ borderRadius: '50%', fontSize: 18 }}
                        aria-hidden="true">{initials(p.name)}</span>}
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1 className="co-title">
                  {p.name}
                  {p.kind !== 'founder' && <span className="kindpill">{KIND_LABEL[p.kind]}</span>}
                  {isYou && <span className="tag">you</span>}
                </h1>
                <p className="co-liner">
                  {p.role_title}
                  {p.role_title && p.org && ' · '}
                  {p.org}
                </p>
                <div className="co-meta" style={{ marginTop: 7 }}>
                  {p.batches.map(b => (
                    <Link className="batchtag" key={b} href={`/people?batch=${b}`}>{b}</Link>
                  ))}
                  {!isYou && <span className="herepill">On Bookface</span>}
                  {/* The bare ID. The suffix on the login form belongs to the
                      sign-in, not to the person, and reads as a batch claim here. */}
                  {p.bookface_id && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--meta)' }}>
                      {p.bookface_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="pr-act" style={{ flex: 'none' }}>
                {!isYou && (p.profile_id
                  ? <MessageLink to={p.profile_id} name={p.name} label />
                  : <MessageLink person={p.id} name={p.name} label />)}
                {p.source_url && (
                  <a className="offbook" href={p.source_url} target="_blank" rel="noreferrer">
                    Public record &#8599;
                  </a>
                )}
              </div>
            </div>
          </div>

          {p.known_for && (
            <div className="block">
              <div className="block-hd"><h2>Known for</h2></div>
              <div className="co-body"><p className="co-desc">{p.known_for}</p></div>
            </div>
          )}

          <div className="block">
            <div className="block-hd">
              <h2>Ask me about</h2>
              <span className="aside">{isYou ? 'Only you can set this' : 'Set by them'}</span>
            </div>
            {isYou ? (
              <Expertise initial={p.expertise} suggestions={suggestions} />
            ) : p.expertise.length > 0 ? (
              <div className="pad">
                <div className="chips">
                  {p.expertise.map(t => (
                    <Link className="chip chip-own" key={t} href={`/people?tag=${encodeURIComponent(t)}`}>{t}</Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty">
                <strong>{first} hasn&rsquo;t said yet</strong>
                <p>
                  This is the one thing on a profile only its owner can write, so it
                  stays empty until {first} fills it in.
                </p>
              </div>
            )}
          </div>

          {p.works_on.length > 0 && (
            <div className="block">
              <div className="block-hd">
                <h2>Works on</h2>
                <span className="aside">From what their companies do</span>
              </div>
              <div className="pad">
                <div className="chips">
                  {p.works_on.map(t => (
                    <Link className="chip" key={t} href={`/people?tag=${encodeURIComponent(t)}`}>{t}</Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {p.companies.length > 0 && (
            <div className="block">
              <div className="block-hd">
                <h2>Companies</h2>
                <span className="aside">{p.companies.length}</span>
              </div>
              {p.companies.map(c => (
                <Link className="co-founder" key={c.id} href={`/directory/${c.id}`}>
                  {c.logo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className="co-face" src={c.logo_url} alt="" width={40} height={40}
                           style={{ borderRadius: 3, objectFit: 'contain', background: '#fff' }} />
                    : <span className="co-face" style={{ borderRadius: 3 }} aria-hidden="true">
                        {c.name.trim().charAt(0).toUpperCase() || '?'}
                      </span>}
                  <span style={{ minWidth: 0 }}>
                    <span className="co-fname">
                      {c.name}
                      {c.batch && <span className="batchtag">{c.batch}</span>}
                    </span>
                    {c.title && <span className="co-ftitle" style={{ display: 'block' }}>{c.title}</span>}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside>
          <div className="block">
            <div className="block-hd"><h2>Elsewhere</h2></div>
            <div className="quick">
              {p.linkedin_url && (
                <a href={p.linkedin_url} target="_blank" rel="noreferrer">LinkedIn ↗</a>
              )}
              {p.source_url && (
                <a href={p.source_url} target="_blank" rel="noreferrer">Where this comes from ↗</a>
              )}
              <Link href={`/people?q=${encodeURIComponent(p.name)}`}>Search this name</Link>
            </div>
          </div>

          <div className="block">
            <div className="block-hd"><h2>How we know this</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              {/* Assembled as a string rather than as JSX: mixing expressions and
                  wrapped prose is how you end up shipping "Connoris named on". */}
              <p style={{ margin: 0 }}>
                {p.source === 'public'
                  ? 'Compiled from public record rather than a company listing. Nothing here is inferred, and the link above says where to check it.'
                  : p.companies.length === 1
                    ? `Read off the public listing of the company ${first} is named on \u2014 the same names that company publishes itself.`
                    : `Read off the public listings of the ${p.companies.length} companies ${first} is named on \u2014 the same names those companies publish themselves.`}
              </p>
              {p.account_state === 'onboarded' && (
                <p style={{ margin: '8px 0 0' }}>
                  {`${first} is on Bookface and holds the ID above. Their sign-in has not been set up yet, so anything you send waits in their inbox until it is.`}
                </p>
              )}
            </div>
          </div>

          {also.length > 0 && (
            <div className="block">
              <div className="block-hd">
                <h2>Also in {batch}</h2>
                <span className="aside"><Link href={`/people?batch=${batch}`}>All</Link></span>
              </div>
              {also.map(o => (
                <Link className="row" key={o.id} href={`/people/${o.id}`} style={{ textDecoration: 'none' }}>
                  <span className="av" style={{ width: 26, height: 26, fontSize: 10 }}>
                    {initials(o.name)}
                  </span>
                  <span className="what" style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', color: 'var(--link)' }}>{o.name}</span>
                    <span style={{ display: 'block', color: 'var(--meta)', fontSize: 11 }}>{o.org}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
