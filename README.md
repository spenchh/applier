# InternPilot

InternPilot is a local-first internship application command center. It helps a student store verified profile facts, import postings, score fit, generate truthful application packets, review every claim, and track outcomes.

## What It Does

- Supports email/password sign-in with remembered sessions, then stores profile basics, resumes, verified facts, skills, projects, education, work history, and eligibility facts per account.
- Imports postings from pasted descriptions, manual fields, URLs, and official ATS-style URLs where appropriate.
- Provides a compliant `/discover` feed with mock discovery by default and optional Adzuna, USAJOBS, and Remotive connectors when configured.
- Parses jobs with a mock LLM provider that works without paid API keys.
- Lets users set target role families and industries, including software, data, product, design/UX, marketing, finance, consulting, research, operations, policy/legal, communications, sales, HR, and general internships.
- Provides an AI wrapper configuration layer for mock, OpenAI, or Anthropic-backed generation while keeping truth checks provider-independent.
- Scores fit against the Truth Vault.
- Generates tailored resume text, cover letters, application answers, recruiter-style notes, truth checks, and keyword coverage.
- Requires explicit review and approval before submission or export.
- Tracks applications through saved, drafted, review, approved, submitted, assessment, interview, offer, rejection, withdrawal, and archive states.
- Exports application tracker CSV and local JSON data.

## What It Intentionally Does Not Do

- No scraping of LinkedIn, Indeed, Handshake, Simplify, RippleMatch, or restricted platforms.
- No CAPTCHA, login, hidden-field, anti-bot, rate-limit, or terms bypassing.
- No background auto-apply workflow.
- No automatic demographic, disability, veteran, citizenship, sponsorship, or legal eligibility answers.
- No fabricated skills, metrics, awards, employment, GPA, dates, authorization, or credentials.

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run db:push` is kept as the standard Prisma command. On this Windows/Node setup it returned a blank schema-engine error, so `npm run db:init` uses Prisma's generated SQL plus `prisma db execute` to initialize the same SQLite schema.

## Environment Variables

- `DATABASE_URL`: SQLite locally, for example `file:./dev.db`.
- `LLM_PROVIDER`: `mock`, `anthropic`, or `openai`; MVP defaults to `mock`.
- `ENCRYPTION_KEY`: local encryption placeholder for future sensitive-field helpers.
- `APP_BASE_URL`: local app URL.
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`: optional future provider keys.
- `EMAIL_FROM`, `RESEND_API_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`: optional future email draft/send integrations.
- `DISCOVERY_CACHE_TTL_MINUTES`, `DISCOVERY_USER_AGENT`: discovery connector cache/user-agent controls.
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY`: optional Adzuna search connector.
- `USAJOBS_API_KEY`, `USAJOBS_USER_AGENT`: optional USAJOBS search connector.
- `REMOTIVE_ENABLED`: set to `true` to opt into Remotive's public remote-jobs API.

## Database And Seed Data

The Prisma schema is in `prisma/schema.prisma`. Seed data is blank by default. It clears local profiles, resumes, jobs, applications, and audit logs, then initializes app settings.

```bash
npm run db:seed
```

Optional demo data exists for development only:

```bash
SEED_DEMO=true npm run db:seed
```

The optional demo account is `student@example.edu` with password `demo-password-123`.

The production app should not include demo profiles or demo jobs. `.vercelignore` excludes local `.env` files and SQLite database files from CLI deployments.

Local database files and generated storage are ignored by git.

On Vercel, the MVP can initialize an empty SQLite database in `/tmp` so the app boots cleanly, but that storage is ephemeral. Configure a persistent Postgres-compatible database before relying on hosted sign-in sessions or saved profile/application data across deployments and server restarts.

## MVP Workflow

1. Complete onboarding.
2. Add Truth Vault facts.
3. Use Discover to search/filter compliant source results, or paste/manually enter a posting.
4. Save a discovered role into the Job Inbox, which reuses the existing dedupe pipeline.
5. Review parsed requirements, risk flags, and fit analysis.
6. Generate an application packet.
7. Review tailored resume, cover letter, answers, truth check, and keyword coverage.
8. Approve the packet.
9. Use Manual Mode copy/checklist tools to apply.
10. Mark the application submitted.
11. Track outcomes and export analytics.

## Compliance Design

InternPilot defaults to Manual Mode. Official adapter scaffolds exist for Greenhouse, Lever, Ashby, SmartRecruiters, and email, but they fall back unless credentials and permitted integrations are configured. All submission paths check approval state first and write audit records.

Restricted platform URLs are stored for tracking and tailoring only. The app does not scrape or automate activity on those sites.

Discovery connectors only use configured, permitted sources. Mock discovery works with no keys. Adzuna and USAJOBS require API keys, and Remotive is opt-in via `REMOTIVE_ENABLED=true`. Connector failures are shown in the UI and do not block the app.

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Tests cover job parsing schema behavior, fit scoring, unsupported claim detection, approval gates, restricted platform fallback, deduplication, adapter fallback, sensitive question handling, discovery connector normalization, discovery filters, and sourced-job save inputs.

## Roadmap

Phase 1:
- Manual application workflow
- Compliant discovery feed with mock and optional external connectors
- Resume tailoring
- Truth checking
- Tracker
- Role-family and industry targeting
- AI wrapper settings with mock mode

Phase 2:
- Better PDF/DOCX export
- Gmail draft integration
- Calendar reminders
- CSV import/export
- Contact/referral CRM
- Persistent production database integration such as Postgres

Phase 3:
- Official ATS adapters
- Browser extension for user-initiated autofill only on permitted sites
- Advanced analytics
- Multi-resume experiment tracking

Phase 4:
- Team/career-center mode
- Referral outreach workflows
- Interview prep assistant
- Offer comparison
