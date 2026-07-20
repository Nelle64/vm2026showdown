# Demo script — 90 seconds

Target: a portfolio video or a live walkthrough for a recruiter. Keep it under 90 seconds.

**0:00 – 0:10 · Hook**
> "VM 2026 Showdown is a private prediction league my ten friends actually used through the whole World Cup — 104 matches, 1 028 tips, live leaderboard, automatic scoring."

Show the landing page, then the leaderboard.

**0:10 – 0:25 · Player flow**
> "As a player you sign in with Google, join a league with an invite code, and predict every match. The prediction locks server-side — one minute before kickoff, or at a round deadline set by the admin."

Open the match list, expand a round, submit a tip, show the countdown badge.

**0:25 – 0:40 · The moment it locks**
> "The instant a match locks, everyone's tips become visible in this matrix. Points are computed by a Postgres trigger the moment the admin enters a result — three for exact, one for the correct outcome."

Show the predictions matrix and the leaderboard updating.

**0:40 – 0:55 · Bonus + tournament**
> "There's a separate bonus track — multiple choice, free text, numeric closest-wins, and composite questions like 'first goalscorer plus minute'. And a live tournament view with groups and the knockout bracket."

Flick through Bonus and Tournament tabs.

**0:55 – 1:15 · Summary**
> "When the tournament ends, the summary page builds a podium and twenty-plus fun-fact categories — most exact scores, biggest underdog believer, most against Sweden, closest to the real total goals. Every category has its own ranking so nobody leaves without a title."

Scroll the summary page.

**1:15 – 1:30 · Close**
> "Built as a portfolio project in an AI-assisted stack, but I owned the scoring rules, the data model, the locking logic and every production fix. The interesting parts are in Postgres — triggers, RLS, and RPCs — because that's where correctness has to live."

Cut to the case study section of the README.
