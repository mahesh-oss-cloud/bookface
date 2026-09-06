# Bookface

A founder portal for one accelerator batch. Four accounts, one batch, one company
using it for real.

## Why it is shaped this way

The thing that determined the schema was working out **who writes what**. In an
accelerator, founders self-report their own weekly numbers — one chosen metric,
reported every week, with a short note on what shipped, what they learned and what
is blocking them. The partner reads that going into office hours. The partner does
not key the numbers in.

So that rule lives in the database, not in the interface:

| Policy | Effect |
| --- | --- |
| `weekly_insert_own` | A founder may file only their own company's week |
| `weekly_update_own` | A founder may amend only their own company's week |
| `weekly_read` | A founder sees their own; a partner sees every company's |
| `directory_write` | Only a partner curates the imported company directory |

`my_company_id()` and `is_partner()` both take **no parameters** and derive the
caller from `auth.uid()`, so there is no way to ask them about somebody else.

Hiding the "Weekly update" nav item from partners is cosmetic. Row-level security
is what actually stops them.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm run dev
```

There is no sign-up route. Bookface is invite-only by construction — accounts are
created directly against the database.

## Signing in

Nobody logs in with an email address. The batch issues a **Bookface ID** on
acceptance, and that ID is the identity here — you type `saharshkeerthi`, not an
address. Underneath, Supabase auth is an email/password provider, so the ID is
expanded to `<id>@w26.bookface.test` before it reaches the auth API. `.test` is
reserved by RFC 2606 so it can never collide with a real domain, and no mail is
ever sent to it. That expansion lives in one place, `src/lib/identity.ts`, and
the domain is never rendered.

| Bookface ID | Name | Title | Access |
| --- | --- | --- | --- |
| `saharshkeerthi` | Saharsh Keerthi | CEO | founder |
| `arhaanrahil` | Arhaan Rahil | CTO | founder |
| `satwikreddy` | Satwik Reddy | COO | founder |
| `maheshkumarbal` | Mahesh Kumar Bal | Founder & CFO | founder |
| `jaredfriedman` | Jared Friedman | Group Partner | partner |

The four founders share one company, Blackbird Finance. The partner belongs to
no company, which is why the read policies key off `is_partner()` rather than a
company match.

## On a phone

Bookface installs to the home screen. `app/manifest.ts` declares `display:
standalone`, so once installed there is no browser chrome and it behaves like
any other app on the device; the icons are the same orange Y the header uses,
because an installed icon that does not match the header is a different app as
far as the person tapping it is concerned.

The nav is not the desktop nav shrunk down. Eight items in a row at 390px is a
row of targets nobody can hit, so the phone gets a bottom tab bar within thumb
reach — Home, Company, Forum, and Weekly update for a founder, Batch in place of
Weekly update for the partner — with everything else behind More. Tab targets are
44px minimum, inputs are 16px so iOS Safari does not zoom on focus, and
`viewport-fit=cover` plus `env(safe-area-inset-*)` handles the notch and the
home indicator rather than letterboxing around them.

### /install

One public link to send people: `https://<host>/install`. It is reachable signed
out, because it is the link you send before anyone has an account.

What it can do depends on the platform, and the difference is a hard limit
rather than an omission. Chrome on Android fires `beforeinstallprompt` when the
app is installable; capturing it lets a button open Android's real install
dialog, so it genuinely is one tap. iOS exposes no such API — Apple gives a page
no way to trigger Add to Home Screen — so Safari gets the exact three taps
instead of a button that would do nothing. The page detects which it is on
(treating a touch-capable "Macintosh" as an iPad, which is how iPadOS reports
itself), notices when it is already running installed and says so, and on a
desktop shows a QR built from the request host so it works on a preview
deployment, production, or a laptop on the LAN without hardcoding a URL.

### The service worker

`public/sw.js` exists for installability and a launch that is not a blank
screen. It caches build output and icons only — never a navigation, never
anything from Supabase. A cached HTML page is somebody's authenticated view, and
handing it back later, to a different account on a shared phone or after RLS
would have refused it, would leak precisely what row-level security exists to
prevent. Offline shows a static page that says so rather than stale data.

`sw.js` and `manifest.webmanifest` are excluded from the proxy matcher rather
than merely listed as public routes: registration refuses a worker script that
arrives via a redirect, and the proxy redirects unauthenticated requests to
/login. That failure is silent — no error, no install prompt — so the matcher is
load-bearing.

## Dates

The batch window is known and Demo Day is fixed; the start date is not agreed
yet. `batches.dates_confirmed` says so, and while it is false the app never
prints a start date and `weekNumber()` returns 0 rather than counting weeks from
a placeholder — which is what previously made the home page announce that the
programme had finished. No week is marked current, nothing is greyed out as
past, and `batch_events.date_confirmed` renders each provisional entry as TBC.
Demo Day carries a real date because it is the one date that is real.

Set `dates_confirmed = true` once kickoff is agreed and the whole strip starts
tracking by itself.

## The company

All four founders share one company, Blackbird Finance, so all four land on the
same `/company` profile — the batch's view of what they are building.

`companies` carries the identity (logo, one-liner, description, sector, location,
founded year). `company_facts` carries everything else as `(section, label,
detail)` rows in five sections: product, integration, compliance, pricing, stack.
That is deliberately generic — another company can describe a completely
different business without a schema change, which matters because the directory
is meant to hold the rest of the batch.

Writes follow the same rule as weekly updates: `facts_insert_own` and
`companies_update_own` both require `company_id = my_company_id() AND NOT
is_partner()`, so a founder edits only their own company and the partner edits
none. The partner sees a "read only" note rather than a form that would fail.

## Data

Nothing is seeded but structure: the batch, its twelve weeks, the programme
milestones, and the company. No metrics, and no company directory — both start
empty on purpose and fill up from real input. The directory takes a CSV with a
header row and a `name` column; everything else is optional.

## Stack

Next.js 16 (App Router, `proxy.ts` rather than the old `middleware.ts`), Supabase
for auth and Postgres, no UI framework. Typography is Verdana, deliberately: this
shares a lineage with Hacker News, and loading a fashionable grotesque is what
makes an internal tool look generated rather than built.
