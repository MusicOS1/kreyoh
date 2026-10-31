# FACKTS Music — Pre-Session-5 Admin Diagnostics

## Why

The legacy Control Room Analytics page measured activity but could not reliably explain failed sign-ins, session interruptions, or application crashes. This targeted upgrade extends operational intelligence without changing accepted pages or commercial modules.

## What is instrumented

- Main and Control Room sign-in submissions: attempts, classified failures, response duration; existing successes remain recorded in auth_events.
- Admin access denial is distinguished from wrong credentials.
- Error categories: incorrect credentials, unconfirmed email, rate-limited, timeout, network, service unavailable, missing fields, denied access, unknown.
- Auth/session-status service unavailability and network exceptions in the service incident log.
- Authenticated browser runtime errors, unhandled rejections and React route render errors, captured without raw stack traces, messages, credentials or query strings.
- Admin-only /admin/diagnostics: 24-hour/7-day/30-day windows, counts, reasons, service sources, routes, trends and incident feed.
- Existing /admin/analytics and /admin/system link to the new diagnostics screen.

## Reused schema and permissions

Uses existing auth_events (historical successful authentication), platform_events (new authentication diagnostics, category authentication), and system_incidents (service/browser errors). The auth_events event_name check permits only known historical event names, so **new diagnostic event names are stored in platform_events**. No new database migration is needed.

Only administrators with explicit Control Room "system" access can see diagnostics. The authenticated browser ingestion route accepts a fixed enum, route pathname without query, and rate-limits reports to five per user per minute. Login failures can be recorded with a null user_id; they do not include the attempted email, passwords or tokens.

## Important limits

- Existing unrecorded failures cannot be reconstructed.
- Supabase hosted auth requests, external Vercel function crashes and provider outages that never reach these app handlers require separate official provider log/monitoring integration for exhaustive coverage.
- Authenticated browser incidents are captured, not anonymous visitor browser errors. Authenticated user IDs are visible to authorised system administrators only through the protected underlying incident records.
- A user leaving the browser before sending a report or a failed storage write may leave a gap.
- The dashboard bounds per-period source history to protect app performance, clearly indicating the limits.
- Existing system_incidents is an incident history, not an automated service-level availability monitor.
- Retention and incident response policy should be approved before claiming long-term complete logging.

## Verification

Test the following in a safe preview environment: failed credentials on both forms, temporary simulated auth failures, valid login, unauthorised admin access, authenticated route render failure, unhandled rejection, repeated browser reports (rate limiting), unauthorised /admin/diagnostics access, and /admin/analytics and /admin/system links. Confirm that no plaintext email, password, query string, session cookie or stack trace is stored.

Do not seed false historical incidents into production. No changes are made to Project 001 tracks, beats, sessions, financial history, rights or releases.
