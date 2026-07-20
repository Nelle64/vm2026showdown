# Portfolio checklist

Ship these before sharing the repo with a recruiter.

## Repo hygiene

- [ ] Repo description set on GitHub with a one-liner + live URL.
- [ ] Topics: `react`, `typescript`, `tanstack-start`, `supabase`, `postgres`, `tailwindcss`, `portfolio`.
- [ ] `README.md` renders correctly on GitHub (check headings, tables, images).
- [ ] `README.sv.md` linked from the top of the English README.
- [ ] Live URL pinned in the "About" sidebar.
- [ ] License note is honest ("private portfolio project, no OSS license").

## Screenshots

Place in `docs/screenshots/` with these exact names so the README renders them:

- [ ] `01-landing.png`
- [ ] `02-matches.png`
- [ ] `03-predictions-matrix.png`
- [ ] `04-tournament.png`
- [ ] `05-leaderboard.png`
- [ ] `06-summary.png`
- [ ] `07-admin.png`
- [ ] `08-bonus.png`

Tips:

- Use the mobile viewport for at least half of them — this app is mobile-first.
- Crop to content; no browser chrome.
- Anonymise real names/avatars if any player didn't consent to public display.

## Documentation

- [ ] `docs/case-study.md` reflects your actual decisions — edit anything that isn't true for you.
- [ ] `docs/architecture.md` matches the current schema (update if you rename tables or change scoring).
- [ ] `docs/demo-script.md` timings match a real recording.

## Optional but strong

- [ ] Short screen-recording (60–90 s) embedded near the top of the README as a GIF or linked as a YouTube unlisted video.
- [ ] Architecture diagram exported as an SVG in `docs/`.
- [ ] pgTAP tests for the scoring trigger, or at least a documented manual test matrix.
- [ ] A "how I would scale this to 1000 leagues" note appended to the case study.

## Commit

```
docs: add product case study, architecture and screenshots
```
