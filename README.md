# Momentum

Momentum is an AI accountability command center for students. It turns school deadlines, projects, career work, and proof into a realistic daily execution plan.

## What it does

- Builds a daily "do next" plan from commitments, goals, deadlines, and proof gaps.
- Tracks goals, tasks, completion proof, and weekly accountability signals.
- Syncs Canvas assignments with a one-time access token.
- Syncs GitHub repositories into proof cards and project-maintenance tasks.
- Imports Simplify, Handshake, syllabus, or notes text when a public API is not practical.
- Keeps Google Calendar and Outlook connection slots ready for OAuth-based integrations.

## Why this exists

Simplify is better for fast job applications. Momentum is for becoming the person who can execute consistently: finish class work, build projects, keep proof fresh, apply without panic, and know what to do today.

## Local development

```bash
npm install
npm run db:generate
npm run dev
```

If `DATABASE_URL` is not provided on Vercel, the app falls back to SQLite in `/tmp/momentum.db`. Use a managed database before relying on this for long-term production data.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Legacy tools

The previous internship-application pages remain in the repo as hidden legacy tooling while Momentum takes over the main navigation.
