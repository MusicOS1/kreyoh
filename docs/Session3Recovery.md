# Session 3 project context and visibility recovery

29 October 2026. Branch: `feat/session3-creative-production`. Draft PR #20. Website production and database content are unchanged.

## Result and scope

The recovery repairs project context, catalogue search, authorised Finance navigation, Overview alignment and the professional recordings layout. It uses the existing modules and authorisation rules. No schema migration, record recreation, upload, deletion, or live permission changes were performed.

Real Supabase account login and external R2 acceptance remain deferred. Browser evidence below uses clearly synthetic accounts and records in disposable local PostgreSQL; its catalogue sizes reproduce the confirmed live baseline. It is not evidence of a signed-in live Project 001 browser session.

## Confirmed causes and fixes

- `/project-entry` was a GET that wrote the project cookie even when reached by Next.js prefetch. It now ignores speculative prefetch. Project links on My Projects and the professional dashboard use the existing membership-checked server action on ordinary clicks. This invalidates stale server context while preserving the mounted player. Modified clicks and new-tab links retain their normal link behaviour.
- Switching professional workspaces previously selected the first permitted project automatically. Workspace switching now changes only the workspace preference. An explicit project switch is required to change the selected project.
- The professional dashboard previously combined records from all permitted projects while Tracks, Beats, Sessions and Finance used the selected project. Dashboard project queries now intersect the selected project with the workspace's existing permitted memberships. Privileged workspaces still require their assigned roles.
- The Artist navigation omitted Finance for Project Lead/Admin members. The existing selected-project financial edit predicate now determines whether to add that navigation link. Finance's server checks and write permissions are unchanged. A professional identity alone still cannot grant financial access.
- Legacy DOM catalogue controls could search or paginate only the mounted cards. Native GET searches now query the complete selected-project track/beat catalogue. Pages with native controls opt out of the duplicate enhancement.
- The dashboard now has a bounded full-width container. Professional recordings use scoped catalogue padding, typography and dense rows aligned with surrounding panels. Ten-row pagination, search, statuses and links remain available. A clearly named current project and switcher appear on affected project pages at desktop and mobile widths.

## Live data protection

Read-only checks on `Fackts Music` confirmed Joseph Millighan has active Project Lead and Admin membership in Project 001. Complete-row fingerprints before and after this pass match:

| Project 001 records | Count | Unchanged row fingerprint |
| --- | ---: | --- |
| Tracks | 39 | `c246e5adf73a1b9b9c92392528870897` |
| Beats | 71 | `4b1a337f46781618a676daa3f9e227e5` |
| Recording sessions | 4 | `01b1734bbdd2c1a0ea8f8c9b1f3d493c` |
| Membership transactions | 15 | `ba3d2ca8553ff4220ebf87a8f9d58f20` |
| Revenue records | 1 | `dda8b47a65d79cfd55b6881be749446d` |

## Browser recovery evidence

The local optimized production build passes 11 recovery groups through real Next.js handlers and an isolated PostgREST fixture backed by disposable PostgreSQL:

1. My Projects and speculative project-entry requests cannot silently change project selection. An ordinary project-entry link also preserves the same mounted audio element.
2. Project 001 remains explicit across `/projects`, `/tracks`, `/beats`, `/studio-sessions`, `/finance`, `/workspaces/artist` and `/production`.
3. All 39 synthetic tracks paginate ten at a time; server search finds a record beyond page one.
4. All 71 synthetic beats use server pagination; search finds a record beyond page one.
5. All four historical session details remain accessible.
6. Project Lead sees the simple Finance form and 16 history rows: 15 membership transactions plus revenue.
7. The separate one-track project stays separate. Changing professional workspace retains that project. Artist-only membership cannot edit Finance.
8. Forged project cookies and non-member project-entry requests cannot expose another project's private tracks.
9. An Artist identity with membership but no assigned role cannot read Finance.
10. Overview and professional recordings fit desktop (1440), tablet (900) and mobile (390) widths without horizontal overflow.
11. All protected fixture track, beat, session and financial records remain unchanged.

[Machine-readable recovery results](session3-recovery/Results.json).

### Before and after

The before images are retained real browser captures from the preceding published usability pass. The after images are new captures of this recovery build. Both use synthetic records; counts differ because the new fixture deliberately reproduces the 39-track recovery case.

| View | Before | After |
| --- | --- | --- |
| Professional recordings, desktop | [Before](session3-recovery/BeforeRecordingsDesktop.webp) | [After](session3-recovery/Recordings1440.webp) |
| Professional recordings, mobile | [Before](session3-recovery/BeforeRecordingsMobile.webp) | [After](session3-recovery/Recordings390.webp) |
| Overview | Previous dashboard above | [Desktop](session3-recovery/Overview1440.webp), [Tablet](session3-recovery/Overview900.webp), [Mobile](session3-recovery/Overview390.webp) |

[Tracks](session3-recovery/tracksDesktop.webp) · [Beats](session3-recovery/beatsDesktop.webp) · [Sessions](session3-recovery/studio-sessionsDesktop.webp) · [Finance](session3-recovery/financeDesktop.webp).

## Validation

- `npm ci`: PASS.
- `npm audit`: PASS, zero vulnerabilities.
- `npm test`: PASS, 144 tests.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.
- Production-build recovery: PASS, 11 groups.
- Production-build usability: PASS, 8 groups.
- Production workflow: PASS, 14 scenarios including 272 MiB upload retry/recovery.
- Session 2 onboarding/collaboration: PASS, 19 scenarios.
- Sessions, playback and workspaces: PASS, 37 checks.
- Interaction cards: PASS, 4 groups.
- Homepage: PASS, 14 groups.
- Shared public header: PASS, 140 route/viewport combinations.

The previous published CI run failed because its Session 2 test clicked a contribution control inside a collapsed session detail. The test now opens the session through its ordinary summary control before using the existing contribution and management actions. It also verifies that a Producer cannot assign session work and uses the authorised Engineer to assign follow-up work; the application permissions were not broadened.

## Local update

Stop the existing server with Ctrl+C, then run inside the repository:

```bash
git switch feat/session3-creative-production
git pull --ff-only origin feat/session3-creative-production
npm ci
npm run dev
```

Open `/projects`, select `PROJECT 001 — TUKO WATU WENGI`, and use the visible current-project banner to verify context. No further database migration is required for this recovery. Existing Session 2 real-account acceptance, administrator safety rollout/concurrency verification and external R2 testing remain open for the agreed final acceptance after all five sessions.
