# Session 3 initial audit

Baseline: e666ce5f5b7fc5887aaafe529b70c1a432fa543a, PR #19 (draft, unmerged), dependent on PR #18. New branch: feat/session3-creative-production. Session 2 real-account acceptance and administrator safety rollout remain deferred; this session does not apply those patches.

| Area | Existing implementation | Integration gap |
| --- | --- | --- |
| Projects | Active membership, invitations, project switcher, lead, stage, activity | No connected production command centre; count-based progress is not production approval |
| Beats | Reusable beat library, artist claims, track conversion, producer credits | Assignment/track links exist; claims are not licences or ownership |
| Sessions | Scheduling, participants, notes, outcomes, contributions, follow-up tasks | Participant visibility, attendance and update audit need tightening |
| Files | R2 presigned direct PUT, private download, immutable random version paths | Audio capped at 250 MB, one-shot transfer; no durable multipart recovery or upload ownership ledger |
| Versions | project_assets, uploader, date, kind, notes, previous versions, player | No per-version review state, designated reviewer or decision history |
| Tasks/notifications | Project/track/session tasks, assignees, dates, inbox, project deep links | Production review events need targeted, atomic notifications/tasks without duplicates |
| Credits/splits | Track contributors, approval, real split plan/revision/consent RPCs | Keep economic approval separate from creative version approval and legal ownership |
| Release | Track passport, rights evidence, metadata, artwork, release records | No final-master approval gate or snapshot-bound project-lead sign-off |
| Professional history | Personal internal credits, session contributions, independently verified claims | Reuse private history; never auto-publish private assets or manufacture claims |
| Oversight | Existing Control Room project and track records | Link production blockers; platform grants must not confer creative approval rights |

Implementation will reuse projects.current_stage, tracks.development_status, project_assets, project_tasks, activity_log, platform_events and notifications. Necessary additive schema: upload intent ledger; per-asset review fields and session attendance fields. No duplicate project, track, rights, split or portfolio tables. New workflow mutations must validate current membership and project scope on the server and in transactional database functions.

Validation will use isolated PostgreSQL/browser fixtures. No authorised R2 environment or real participant credentials are present; external storage, real Supabase Auth/RLS and genuine Project 001 owner acceptance must be reported separately. Existing Project 001 records, live schema/data, public design and authentication remain untouched.
