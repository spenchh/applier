# InternPilot — Implementation Plan

A human-in-the-loop command center for managing, tailoring, and submitting
internship applications. This document is the concise build plan; see
`README.md` for usage, compliance design, and roadmap.

## Guiding principles

1. **Human-in-the-loop, always.** No application is ever submitted or exported
   without explicit, per-application user approval. "Require review before
   submission" is locked on and cannot be disabled.
2. **Truthful by construction.** The AI may only use facts stored in the
   Truth Vault (`ProfileFact`), the user's resume, and explicit user input.
   Every generated claim cites its supporting facts; unsupported claims are
   flagged, never silently included.
3. **Compliant by design.** No scraping, no CAPTCHA/anti-bot bypass, no fake
   accounts, no auto-apply, no automated activity on restricted platforms.
   Restricted-platform URLs are forced into Manual Mode.
4. **Runs without paid APIs.** A deterministic `mock` LLM provider powers the
   full demo flow with zero API keys.

## Tech stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + a small shadcn-style component library (CVA + tailwind-merge)
- Prisma ORM (SQLite local; Postgres-ready schema)
- React Hook Form + Zod for validation
- Server Actions for mutations; route handlers for a few endpoints
- Vitest for unit tests
- Service-layer architecture (`src/lib/services`, `src/lib/adapters`, `src/lib/llm`)

## Architecture layers

```
UI (App Router pages + components)
  -> Server Actions  (src/lib/actions)        // thin, validated entry points
    -> Services      (src/lib/services)       // business logic, orchestration
      -> LLM provider (src/lib/llm)           // mock | anthropic | openai
      -> Adapters     (src/lib/adapters)      // manual/email/greenhouse/...
      -> Prisma       (src/lib/db)            // persistence
    -> Audit log      (src/lib/audit)         // generation/approval/submission
```

## Build increments

- [x] 0. Repo scaffolding: configs, env, gitignore, plan.
- [x] 1. Prisma schema covering all required models + seed data.
- [x] 2. Core libs: db client, env loader, encryption helper, utils, audit log.
- [x] 3. LLM abstraction: provider interface, mock provider, anthropic/openai
       (REST, no SDK), prompt builders, task functions, Zod output schemas.
- [x] 4. Services: resume, job (parse + dedupe + risk flags), fit, tailor,
       truth-check, application.
- [x] 5. Adapters: ManualAdapter, EmailAdapter, Greenhouse/Lever/Ashby/
       SmartRecruiters scaffolds, restricted-platform guard, registry.
- [x] 6. UI component kit + app shell (sidebar nav, top bar).
- [x] 7. Screens: Dashboard, Onboarding, Profile/Truth Vault, Resume Manager,
       Job Inbox, Job Detail, Tailoring Studio, Review Queue, Submission,
       Tracker, Analytics, Settings.
- [x] 8. Server actions wiring each screen to the services.
- [x] 9. Tests: parsing schema, fit scoring, unsupported-claim detection,
       approval gate, restricted-platform Manual Mode, dedup, adapter
       fallback, sensitive-question handling.
- [x] 10. README (setup, env, compliance, roadmap) + final verification.

## Data model (Prisma)

`UserProfile`, `ProfileFact`, `Resume`, `ResumeVersion`, `Company`,
`JobPosting`, `JobQuestion`, `Application`, `ApplicationAnswer`, `CoverLetter`,
`FileAsset`, `SubmissionAttempt`, `AuditLog`, `FollowUpTask`, plus `AppSettings`
for provider/compliance configuration.

SQLite has no native enums or arrays, so:
- Enums are modeled as `String` columns with TypeScript const unions + Zod
  validation at the service boundary.
- List/array fields are stored as JSON strings (`*Json`) with typed
  accessors. This keeps the schema Postgres-portable (swap to `String[]`/
  enums later with a focused migration).

## Submission modes

1. **Manual Mode** (always available) — opens the posting URL, shows tailored
   materials with copy buttons, user submits and marks applied.
2. **Official Adapter Mode** — Greenhouse/Lever/Ashby/SmartRecruiters scaffolds;
   real submission requires configured API keys and always requires approval;
   falls back to Manual Mode when not configured or fields are missing.
3. **Email Mode** — when a posting lists an application email; drafts an email
   with attachments; sends only if a provider is configured and the user
   confirms, otherwise exports a `.eml` draft.

## Explicitly out of scope (by design, not omission)

Background auto-apply, scraping of restricted platforms, browser automation,
CAPTCHA/anti-bot bypass, fabricating any user fact. See README compliance notes.
