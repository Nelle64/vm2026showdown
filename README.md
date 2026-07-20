# VM 2026 Showdown

![VM 2026 Showdown](docs/screenshots/01-landing.png)

> A private prediction league for the FIFA World Cup 2026 — full product, from onboarding to final summary.
> **Live:** [vm2026showdown.lovable.app](https://vm2026showdown.lovable.app) · **Swedish README:** [README.sv.md](./README.sv.md)

A multi-user web app where friends create private leagues, predict every World Cup match, answer bonus questions and follow a live leaderboard. Built as a portfolio project to demonstrate end-to-end product thinking — authentication, permissions, time-critical business rules, automatic scoring, external API integration, realtime updates and admin tooling — in a real, in-production application used by 10 real players across 104 matches and 1 028 predictions.

---

## Why this project

Most portfolio apps stop at CRUD. This one models a real domain with real edge cases:

- **Multi-user with private data** — every user only sees their own leagues, tips and bonus answers until deadlines pass.
- **Time-critical rules** — predictions must lock at the exact right moment, in the right timezone, whether the admin chose `per_match` or `per_round` locking.
- **Server-authoritative scoring** — points are computed by Postgres triggers and RPCs, not by clients, so results are consistent, auditable and recomputable.
- **A full lifecycle** — from Google sign-in and league invites to a final summary page with a podium and 20+ fun-fact rankings.

Demo dataset from the finished tournament: **104 matches · 1 028 predictions · 10 players**, with automatic leaderboard, separate bonus scoring, podium and aggregated statistics.

---

## Screenshots

|                                                                   |                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| ![Landing](docs/screenshots/01-landing.png)                       | ![Matches](docs/screenshots/02-matches.png)            |
| ![Predictions matrix](docs/screenshots/03-predictions-matrix.png) | ![Tournament tree](docs/screenshots/04-tournament.png) |
| ![Leaderboard](docs/screenshots/05-leaderboard.png)               | ![Summary / podium](docs/screenshots/06-summary.png)   |
| ![Admin panel](docs/screenshots/07-admin.png)                     | ![Bonus questions](docs/screenshots/08-bonus.png)      |

---

## Features

- 🔐 **Auth** — Google sign-in via Supabase Auth, with pending-invite handoff after login.
- 🏆 **Private leagues** — create games, share invite codes, admin approves join requests.
- ⚽ **Match predictions** — predict every WC 2026 match; locks either per match (1 min before kickoff) or per round (single admin-set deadline).
- 📊 **Automatic scoring** — Postgres triggers award 3 p for an exact score, 1 p for the correct outcome, computed the moment a result is entered.
- ❓ **Bonus questions** — multiple choice, free text, numeric with closest-wins and composite questions (e.g. "first goalscorer + minute"); separate bonus leaderboard.
- 🏟️ **Tournament view** — group tables and knockout bracket, expandable.
- 🥇 **Final summary** — podium + 20+ fun-fact categories (Rebellen, Ensamvargen, Rätt siffror – fel lag, Största smällen, …), each with a per-category ranking dialog.
- 🔔 **Realtime UX** — leaderboards and admin views update live via Supabase Realtime; the database row remains the source of truth.
- 📱 **Mobile-first** — bottom nav, responsive layouts, PWA manifest.

---

## Tech stack

| Layer               | Choice                                                                |
| ------------------- | --------------------------------------------------------------------- |
| Framework           | TanStack Start (React 19, Vite 7) on Cloudflare Workers               |
| Styling             | Tailwind CSS v4 + shadcn/ui                                           |
| Backend / DB / Auth | Supabase (via Lovable Cloud) — Postgres, RLS, Realtime, Storage       |
| Match data          | [football-data.org](https://www.football-data.org) (competition `WC`) |
| Scheduling          | `pg_cron` + `pg_net` hitting a public sync route                      |
| Language            | TypeScript                                                            |
| Package manager     | Bun                                                                   |

See [`docs/architecture.md`](./docs/architecture.md) for the full diagram and data model.

---

## Three technical decisions worth calling out

1. **Database-centric scoring.** Points are computed in Postgres via triggers and RPCs, not in the client. One source of truth, automatic recomputation when a result is corrected, and rules that can be audited in SQL.
2. **Two locking modes.** `per_match` locks each match 1 minute before kickoff; `per_round` locks every match in a round at one admin-set deadline. This encodes two different real-world use cases — playing casually vs. running a strict office pool — and forced explicit decisions about the authoritative clock (server), what happens exactly at the deadline, and how admin edits to a deadline propagate.
3. **Realtime as UX, not truth.** Supabase Realtime pushes leaderboard and admin view updates, but the persisted row is authoritative. Clients revalidate against the DB on reconnect, so a dropped socket never desynchronises scores.

More context — trade-offs, edge cases and what I would change next — in [`docs/case-study.md`](./docs/case-study.md).

---

## Security-conscious design

Everything below is implemented in code and migrations in this repo. This is not a formal audit — it is a description of the controls in place.

- **RLS on every public table**, with `GRANT`s scoped to the roles each policy allows.
- **Roles in a separate `user_roles` table**, never on `profiles`. Admin checks go through a `SECURITY DEFINER` `has_role()` function to avoid recursive RLS and client-side tampering.
- **Predictions and bonus answers stay private until lock time**, enforced by RLS predicates against the match/question lock timestamp — not by hiding fields in the UI.
- **Admin-only mutations** (setting results, grading bonus answers, approving join requests) run through RPCs that re-check `has_role()` server-side.
- **`/api/public/sync`** is the one intentionally-public endpoint (needed for `pg_cron`). It is idempotent, verifies a shared secret, and writes only match metadata / results — no user data path.
- **Regularity-time only.** Sync stores 90-minute results (`regularTime` from football-data.org), never scores that include extra time or penalties, matching the game's rules.

See [`docs/architecture.md`](./docs/architecture.md#security) for the full list.

---

## What I built vs. what the tool did

This project was built in [Lovable](https://lovable.dev) as an AI-assisted development environment. Being honest about that matters — but so does being honest about the work.

**I owned:**

- Product requirements, user journeys and acceptance criteria for both players and admins.
- The scoring rules (3/1/0, bonus scoring separate from match scoring, closest-wins for numeric bonuses, composite question grading).
- The data model — tables, relationships, and the RLS policies that keep predictions private until lock.
- The two locking modes and their edge cases (timezones, deadline changes, late-arriving results).
- Choosing and integrating football-data.org after API-Football turned out not to cover WC 2026 on the free tier.
- Debugging real production issues: PostgREST join quirks, Supabase's 1 000-row default cutting off predictions, duplicate matches after API sync, extra-time results leaking into scoring, an ambiguous SQL column in a join RPC.
- Testing edge cases around permissions, lock timing and re-scoring.
- Iterating the mobile and desktop experience with real users during the tournament.

Lovable accelerated writing boilerplate, scaffolding routes and generating migration drafts. Every decision above, and every fix to a bug that only shows up with real users and real data, is mine.

---

## Run it locally

Requirements: [Bun](https://bun.sh), a Supabase project, a football-data.org API key.

```bash
bun install
bun dev            # http://localhost:8080
bun run build      # production build
```

`.env`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
FOOTBALL_DATA_API_KEY=...          # read only in server functions
```

---

## Further reading

- [`docs/case-study.md`](./docs/case-study.md) — problem, users, hardest business rules, trade-offs, what went wrong, what's next.
- [`docs/architecture.md`](./docs/architecture.md) — data model, RLS, scoring triggers, realtime, sync pipeline, security.
- [`docs/demo-script.md`](./docs/demo-script.md) — 90-second walkthrough script for a portfolio video.
- [`docs/portfolio-checklist.md`](./docs/portfolio-checklist.md) — GitHub polish checklist.

---

## License

Private portfolio project. No open-source license granted.
