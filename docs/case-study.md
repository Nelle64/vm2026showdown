# Case study — VM 2026 Showdown

## The problem

Every World Cup, our group of ten friends runs a prediction pool over messaging apps and shared spreadsheets. It breaks in the same ways every time: someone submits a tip after kickoff, scoring is inconsistent when matches go to extra time, bonus questions get lost in the thread, and by the semifinals nobody trusts the standings.

The goal for VM 2026 Showdown was to replace all of that with one product that is stricter than a spreadsheet, easier than a spreadsheet, and impossible to cheat by accident.

## Users

Two roles, both real people I know:

- **Player.** Wants to predict fast on a phone, see friends' tips once a match locks, and understand exactly how many points they got and why.
- **Admin.** One person per league. Needs to approve join requests, set deadlines, correct results, grade free-text bonus answers, and trust that scoring reruns automatically after any correction.

## Hardest business rules

1. **When exactly does a prediction lock?** Two modes: `per_match` (1 minute before kickoff, per match) and `per_round` (a single admin-set deadline for every match in a round). The server clock is authoritative — the UI's disabled state is a hint, not a gate. RLS on `predictions` refuses inserts/updates after the lock timestamp regardless of what the client thinks.
2. **Regulation time only.** Points are scored against the 90-minute result, never extra time or penalties. This surfaced late — the football-data.org sync happily wrote the final `score.fullTime` value, which for knockouts includes ET. Fix: read `score.regularTime` when present.
3. **Bonus scoring is separate.** Bonus points are their own leaderboard and never fold into the match total. Composite questions (e.g. "first goalscorer + minute") split points across sub-answers; numeric bonuses award "closest wins" using absolute margin.
4. **Recomputable everything.** If an admin corrects a match result three days later, the trigger recomputes every affected prediction's points in the same transaction — no manual re-scoring, no drift.

## Trade-offs

- **Server-side scoring vs. client speed.** I picked triggers in Postgres over client-side calculation. Slightly more complex to migrate, but one source of truth and trivial to audit. Worth it.
- **football-data.org vs. API-Football.** API-Football has richer data but their free tier didn't cover WC 2026 at the time. football-data.org covers it, is free, and its `WC` competition code is stable. Fewer fields, but enough.
- **Realtime as UX.** I use Supabase Realtime for live leaderboard updates but never treat the event payload as authoritative. Clients re-read from the DB on reconnect. This means a dropped socket produces a stale screen, not a wrong score.
- **Public sync endpoint.** `pg_cron` needs to hit an HTTP endpoint. I chose a public route with a shared-secret header and idempotent writes over a private edge function with more moving parts. The endpoint only writes match metadata and results, never user data.

## What went wrong

- **PostgREST joins on `profiles` returned null in some views.** Fixed by fetching profiles in a second query and joining client-side.
- **Supabase default 1 000-row cap silently dropped predictions** on the leaderboard once the tournament passed that count. Added a `fetchAllPages` helper and paginated the three views that touch predictions at scale.
- **Duplicate final matches** appeared after the API started shipping the bronze match and final that I had inserted manually. Merged carefully so existing predictions stayed pointed at the API-owned rows.
- **Ambiguous `game_id` in `request_join_by_code`** — SQL alias fix.
- **First push of the ET-fix looked broken in production** because the cron kept running the old build until I republished.

Each of these only shows up with real users and real data. Building for ten friends made them visible fast.

## Testing

Not a formal test suite. What I did do:

- Manually walked both roles through every state transition (invite → request → approve → predict → lock → result → score → correct → re-score).
- Verified RLS by attempting each protected action as the wrong role from the browser console.
- Compared computed points against a hand-scored spreadsheet for the group stage.
- Ran the tournament with ten real users for a month.

## What I would improve

- **Automated tests.** A small pgTAP suite for the scoring triggers is the highest-value thing missing.
- **Timezone display.** Deadlines render in the browser's timezone; a per-league display timezone would remove ambiguity for travelling players.
- **Push notifications.** PWA manifest is in place but I never wired up push for "your round locks in 1 hour".
- **Admin audit log.** Result corrections are silent to players. A visible log ("admin changed FRA–ENG from 2–1 to 2–2, points recomputed") would build trust.
- **Rate-limit `/api/public/sync`.** Idempotent and secret-protected, but a proper rate limit would harden it further.
