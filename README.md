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
