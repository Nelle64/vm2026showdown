# Architecture — VM 2026 Showdown

## High-level

```
┌────────────────┐        ┌─────────────────────────┐        ┌──────────────────────┐
│   Browser      │  HTTPS │  TanStack Start (SSR)   │  RPC   │  Supabase Postgres   │
│  React 19      │◄──────►│  Cloudflare Workers     │◄──────►│  RLS + triggers +    │
│  Tailwind v4   │        │  server functions       │        │  RPC functions       │
└────────────────┘        └─────────────────────────┘        └──────────┬───────────┘
        ▲                              ▲                                │
        │ Realtime (WS)                │ /api/public/sync               │ pg_cron + pg_net
        └──────────────────────────────┴────────────────────────────────┘
                                       │
                                       ▼
                              football-data.org (WC)
```

## Data model (core tables)

- `profiles` — public user profile (display name, avatar).
- `user_roles` — separate role table; never join roles onto `profiles`.
- `games` — a league. Owns `lock_mode` (`per_match` | `per_round`), `invite_code`.
- `game_members` — membership with `is_admin` flag.
- `game_join_requests` — pending applications, admin-approved.
- `game_rounds` — round definitions and per-round `lock_at` (only used in `per_round` mode).
- `matches` — synced from football-data.org, plus manually-added bronze/final if needed. Regulation-time score only.
- `predictions` — one row per (user, match). RLS refuses writes after lock; refuses reads of other users' rows until lock.
- `bonus_questions` — types: `multiple_choice`, `free_text`, `number_closest`, `composite`. Each carries its own `lock_at` and `points` config.
- `bonus_answers` — one per (user, question). Same read/write lock semantics as predictions.

## Scoring

**Match scoring** — a trigger on `matches` fires when a result is set or changed. It:

1. Reads regulation-time score.
2. For every prediction on that match, computes 3 (exact), 1 (correct outcome) or 0.
3. Writes points back to the prediction row.
4. Runs in one transaction, so corrections re-score atomically.

**Bonus scoring** — `settle_bonus_question(question_id)` RPC, admin-only:

- Multiple choice / free text: exact match → full points.
- `number_closest`: closest absolute margin → full points; ties split.
- `composite`: sub-answers scored independently and summed.
- Free-text can be manually graded with `admin_set_bonus_answer_points` for typos.

## Locking

- `per_match`: RLS check is `now() < match.kickoff - interval '1 minute'`.
- `per_round`: RLS check is `now() < round.lock_at`.
- Both checks live server-side on `predictions` insert/update policies. UI disables inputs early as a hint; the DB refuses late writes regardless.

## Security

- RLS on every `public` table with explicit `GRANT`s per role.
- Roles in `user_roles`, checked via `SECURITY DEFINER` `has_role()` to avoid recursive RLS.
- Predictions and bonus answers unreadable to other users until lock, enforced by policy predicates against the lock timestamp.
- Admin mutations (`set_match_result`, `settle_bonus_question`, `approve_join_request`, …) go through RPCs that re-check `has_role()`.
- `/api/public/sync` verifies a shared secret header, is idempotent, and only touches match metadata.
- Storage buckets for avatars scoped to the owning user.

## Realtime

- Supabase Realtime channels on `predictions`, `matches`, `game_members`.
- Client treats events as invalidation signals for TanStack Query, not as authoritative data.
- On reconnect, the query refetches from the DB.

## Sync pipeline

1. `pg_cron` fires hourly.
2. `pg_net` calls `https://vm2026showdown.lovable.app/api/public/sync` with the shared secret.
3. The route fetches WC fixtures from football-data.org.
4. Upserts by external ID; writes `regularTime` when present, else `fullTime` for non-knockout matches; leaves knockout `fullTime` alone when `regularTime` is missing to avoid ET leakage.
5. Any changed result triggers the scoring trigger automatically.

## Tech choices, briefly

- **TanStack Start on Cloudflare Workers.** Edge SSR, one runtime for routes and server functions.
- **Supabase.** RLS + triggers + Realtime in one place; no separate backend service to run.
- **Postgres for logic that must be correct.** Scoring and locking are business rules, not UI state.
