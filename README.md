# InternPilot

A human-in-the-loop **internship application command center**. InternPilot helps a
student store their verified background, import postings, analyze fit, tailor
materials **truthfully**, review every packet, and track outcomes — without ever
fabricating facts, scraping restricted platforms, or auto-submitting anything.

> **This is not a spam bot.** Every application requires your explicit review and
> approval before anything is submitted or exported. That guardrail is locked on
> and cannot be disabled.

---

## What it does

- **Profile & Truth Vault** — store verified facts (experience, projects,
  education, skills, awards, leadership, …). This is the *only* source the AI may
  use when tailoring. Each fact controls whether it may appear on a resume, in
  cover letters, and in answers.
- **Resume Manager** — paste a master resume; it's parsed into ATS-friendly
  sections. Preview and print to PDF from the browser.
- **Job Inbox** — add jobs by pasting a description, importing from a public ATS
  URL (Greenhouse/Lever), manual entry, or CSV. Jobs are parsed, deduplicated,
  and screened for **risk indicators**.
- **Job Detail** — fit score, matched/missing qualifications, keywords, risk
  flags, recommended resume template, required materials, and application
  questions.
- **Tailoring Studio** — generates a tailored resume, cover letter, and
  short-answer responses. Every claim **cites the facts it used**. A
  **truth check** classifies claims as supported / weak / unsupported, and an
  **ATS keyword coverage** panel shows what's present, missing, and intentionally
  omitted (because unsupported).
- **Review Queue** — batch workflow: review each packet one at a time; approve,
  edit, skip, or archive.
- **Submission Screen** — shows the exact fields and files that will be submitted
  or copied, separates consent/sensitive fields, includes a compliance checklist,
  and requires a final accuracy confirmation. Three modes: **Manual**, **Email**,
  and **Official Adapter** (with graceful fallback to Manual).
- **Tracker** — Kanban + table views across the full pipeline, with CSV export.
- **Analytics** — funnel, response/interview/offer rates, applications by week,
  top sources, resume-version performance, deadline misses, time-to-response.
- **Settings** — LLM provider, default template, compliance controls, data
  export, and delete-all.

## What it intentionally does **not** do

InternPilot is designed to make you faster and more organized — never dishonest
or banned. By design it will **not**:

- Scrape LinkedIn, Indeed, Handshake, Simplify, RippleMatch, Glassdoor, or any
  site that prohibits automated access. Those URLs are stored for tracking and
  forced into **Manual Mode** (open & apply yourself).
- Bypass CAPTCHAs, login gates, email/phone verification, rate limits, anti-bot
  controls, paywalls, or hidden anti-abuse fields.
- Use stealth browser automation or auto-click/apply/message anywhere.
- Create fake accounts or impersonate recruiters, employers, or schools.
- Auto-submit applications, or run any "background auto-apply everything" feature.
- Fabricate experience, skills, credentials, awards, GPA, graduation date, work
  authorization, location, availability, citizenship, visa/sponsorship status, or
  demographic / disability / veteran information.
- Auto-answer voluntary demographic / self-identification questions.
- Answer legal eligibility questions unless you've explicitly stored a verified
  fact **and** confirm it per application.

It surfaces posting **risk indicators** but never claims a posting is "safe."

---

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** + a small shadcn-style component kit (CVA + tailwind-merge)
- **Prisma ORM** — SQLite locally, Postgres-portable schema
- **React Hook Form**-friendly forms + **Zod** validation at every boundary
- **Server Actions** for mutations; route handlers for exports/previews
- **Vitest** for tests
- Clean **service-layer architecture** (`src/lib/services`, `src/lib/adapters`,
  `src/lib/llm`)
- LLM provider abstraction with a **mock** provider — runs the full demo with
  **zero API keys**

---

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # defaults work out of the box (mock provider + SQLite)

# 3. Create the database and apply the schema
npx prisma migrate dev      # or: npx prisma db push

# 4. Seed realistic demo data (fictional student + 2 jobs + 1 generated packet)
npm run db:seed

# 5. Run it
npm run dev                 # http://localhost:3000
```

Other scripts:

```bash
npm run build       # prisma generate + next build
npm run start       # run the production build
npm test            # run the Vitest suite (uses an isolated /tmp test DB + mock LLM)
npm run typecheck   # tsc --noEmit
npm run prisma:studio
```

### Environment variables

Copy `.env.example` to `.env`. The app runs fully with the defaults (no secrets).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | DB connection. Default: `file:./dev.db` (SQLite). |
| `LLM_PROVIDER` | yes | `mock` (default), `anthropic`, or `openai`. |
| `ANTHROPIC_API_KEY` | optional | Needed only when `LLM_PROVIDER=anthropic`. |
| `OPENAI_API_KEY` | optional | Needed only when `LLM_PROVIDER=openai`. |
| `ENCRYPTION_KEY` | recommended | 32-byte key for field-level encryption of sensitive profile data. `openssl rand -base64 32`. |
| `APP_BASE_URL` | optional | Base URL (default `http://localhost:3000`). |
| `NEXTAUTH_SECRET` | optional | Reserved for auth (not in MVP). |
| `EMAIL_FROM`, `RESEND_API_KEY` | optional | Email Mode sending. If unset, Email Mode exports a draft instead. |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` | optional | Reserved for future Gmail draft integration. |

**No API keys are hardcoded and no secrets are committed.** Keys are read from the
environment only — never entered or stored in the database. If you select a paid
provider without its key, InternPilot safely falls back to the mock provider.

### Database setup

Local development uses **SQLite**. The schema is written to be
**Postgres-portable**: "enums" are `String` columns validated by Zod, and list
values are stored as JSON strings. To target Postgres later, change the
datasource `provider` to `postgresql`, point `DATABASE_URL` at your database, and
run a migration.

### Seed data

`npm run db:seed` creates a fictional CS student (Jordan Rivera), Truth Vault
facts (education, a prior internship, two projects, a leadership role, skills,
coursework), a parsed master resume, two internship postings (a Software
Engineering and a Data Analyst role), and one application with a fully generated,
truth-checked packet — so you can explore every screen immediately.

---

## Using the MVP (end-to-end flow)

1. **Onboard** — fill in your profile (`/onboarding`). Sensitive fields are
   optional, but anything you enter must be accurate.
2. **Build your Truth Vault** — add facts (`/profile?tab=vault`).
3. **Add a job** — paste a description at `/jobs/new` (or import a public ATS URL).
4. The app **parses** the posting, screens **risk indicators**, and **dedupes** it.
5. Open the job to see the **fit score**, matched/missing skills, and keywords.
6. Click **Analyze & tailor** to generate the packet in the **Tailoring Studio**.
7. Review the **truth check** and **keyword coverage**; edit any answer; fix
   unsupported claims.
8. **Approve packet** → land on the **Submission Screen**.
9. Confirm accuracy, then use **Manual Mode** copy buttons to apply on the
   employer's site, and **mark it submitted**.
10. Track everything in the **Tracker**; watch your **Analytics** update.

---

## Compliance & safety design

- **Human-in-the-loop, enforced in code.** `submitApplication` is the single
  submission entry point; it refuses to proceed unless the application is
  *approved* **and** the user passes the *accuracy confirmation*.
  "Require review before submission" is locked on.
- **Truthful by construction.** The mock provider only ever emits content derived
  from stored facts, and real providers are held to the same rules via the system
  prompt. Every artifact cites supporting fact IDs; unsupported claims are flagged
  by the truth check, never silently included.
- **Restricted platforms** are detected by host and forced into Manual Mode — no
  fetching, scraping, or automation. URL import only attempts **official/public
  ATS APIs** (Greenhouse, Lever) and otherwise asks you to paste the description.
- **Risk indicators only.** The app surfaces scam/quality signals (asks for
  payment, crypto/payment-forwarding, messaging-app-only interviews, early
  requests for sensitive PII, unrealistic pay, …) but never asserts safety.
- **Sensitive questions.** Demographic / self-identification questions are never
  auto-answered. Eligibility answers come only from explicitly stored facts and
  always require per-application confirmation.
- **Security.** All inputs are validated with Zod; rendered job descriptions are
  escaped by React (no `dangerouslySetInnerHTML`); resume previews are sandboxed
  iframes. Sensitive profile fields are encrypted at rest. Audit logs record
  generation, approval, and submission with sanitized metadata — never full
  resumes, answers, or secrets. Settings include data export and delete-all.

### Submission modes

1. **Manual Mode** (always available) — opens the posting, shows tailored
   materials with copy buttons, you apply and mark it submitted. Works everywhere.
2. **Official Adapter Mode** — Greenhouse / Lever / Ashby / SmartRecruiters
   adapter scaffolds. Real submission requires a configured API key and always
   requires approval; otherwise it **falls back to Manual Mode**.
3. **Email Mode** — for postings that list an application email. Drafts an email
   with attachments; sends only if an email provider is configured and you
   confirm, otherwise exports a draft.

---

## Testing

```bash
npm test
```

Covers: job-parsing schema validation, deterministic risk-flag detection, fit
scoring, unsupported-claim detection, sensitive-question handling, deduplication
(exact + fuzzy), restricted-platform → Manual Mode routing, adapter submission
fallback, and the **submission approval gate** (an application cannot be submitted
unless approved *and* confirmed). The suite uses an isolated `/tmp` SQLite
database and the mock LLM provider — no API keys required.

---

## Notable limitations (MVP)

- **PDF export** is via the browser print dialog on a clean ATS-friendly HTML
  render. **DOCX export** is abstracted but not yet implemented (see roadmap).
- ATS adapters **import** from public APIs where feasible (Greenhouse, Lever);
  Ashby/SmartRecruiters import and all authenticated **submission** paths are
  scaffolded with clear `TODO`s and require explicit credentials.
- Single-user, no authentication (NextAuth env vars are reserved for later).
- Email sending requires a provider; otherwise a draft is exported.

---

## Roadmap

**Phase 1 (this MVP)** — Manual application workflow · resume tailoring · truth
checking · tracker.

**Phase 2** — Better PDF/DOCX export · Gmail draft integration · calendar
reminders · richer CSV import/export · contact/referral CRM.

**Phase 3** — Official ATS adapters (authenticated submission) · a browser
extension for *user-initiated* autofill on permitted sites only · advanced
analytics · multi-resume experiment tracking.

**Phase 4** — Team / career-center mode · referral outreach workflows · interview
prep assistant · offer comparison.

---

## Project structure

```
src/
  app/                 # App Router pages + API route handlers
  components/          # UI kit, forms, shared display components
  lib/
    actions/           # Server actions (thin, validated entry points)
    services/          # Business logic (job, fit, tailor, application, analytics…)
    adapters/          # Manual / Email / Greenhouse / Lever / Ashby / SmartRecruiters
    llm/               # Provider abstraction (mock | anthropic | openai), prompts, schemas
    text/              # Pure deterministic heuristics (risk flags, keyword extraction)
    validation/        # Zod schemas
prisma/                # schema.prisma + seed.ts
tests/                 # Vitest suite
```

See `IMPLEMENTATION_PLAN.md` for the build plan and architecture notes.
