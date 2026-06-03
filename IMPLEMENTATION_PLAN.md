# InternPilot Implementation Plan

## Scope

Build a local-first internship application command center with a strict human-in-the-loop workflow. The MVP supports profile facts, resumes, job intake across many internship families, fit analysis, truthful tailoring, application review, manual submission, tracking, analytics, compliance checks, blank-by-default seed data, and tests.

## Milestones

1. Foundation: Next.js App Router, TypeScript, Tailwind CSS, Prisma, SQLite, Zod, React Hook Form, Vitest, and a provider-neutral AI wrapper with mock mode.
2. Data and services: profile facts, resumes, diversified job parsing, fit scoring, truthful tailoring, adapter fallback, approval gates, and audit logs.
3. Product screens: dashboard, onboarding, profile/truth vault, resume manager, job inbox, job detail, tailoring studio, review queue, submission, tracker, analytics, and settings.
4. Verification: seed data, unit tests, typecheck, lint, production build, and local dev smoke test.

## Intentional Limitations

- No scraping of restricted platforms.
- No automatic application submission without explicit approval.
- No CAPTCHA, login, hidden-field, rate-limit, or bot-detection bypassing.
- No fabricated credentials, dates, eligibility, demographic answers, or experience.
- PDF export is browser-print based in the MVP; DOCX export is a future extension.
- Demo data is opt-in only and must not be deployed as user-facing data.
