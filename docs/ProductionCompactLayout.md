# Compact Production room

Scope: `/production` only. No shared navigation, homepage, portal, API, permission, schema or creative-record changes.

Tracks are compact expandable rows with stage, readiness and progress. Search by title or code, filter by readiness and show eight tracks per page. Checklists, file reviews, uploads and history remain available inside each track. Project tools, people, tasks, sessions and planning share one expandable overview. Listening and recent activity are expandable. Open track and file sections remain open after saving. Hash links reveal the correct page and section.

## Validation

- 135 existing tests pass.
- TypeScript and the optimized production build pass.
- All 14 production browser scenarios pass against isolated local Auth/REST/PostgreSQL/S3 fixtures.
- Twelve-track catalogue exercises pagination, search, readiness filtering, clearing empty results, deep links and keyboard expansion.
- Desktop (1440px) and mobile (390px) screenshots reviewed; no horizontal overflow.
- Existing version submissions, revisions, independent approvals, release sign-off, planning and 272 MiB multipart recovery remain functional.

Browser evidence: [desktop](production-compact/Desktop.png), [mobile](production-compact/Mobile.png), [results](production-compact/Results.json). Images are cropped to the Production room; the shared header is outside this change. These are real local production-build browser captures with synthetic records, not real-account or external R2 acceptance.

## Run locally

Stop the server with Ctrl+C, then:

```bash
git switch feat/session3-creative-production
git pull --ff-only origin feat/session3-creative-production
npm run dev
```

Open http://localhost:3000/production.
