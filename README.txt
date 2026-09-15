FACKTS MUSIC — FINANCE REPORT IMPORT PATH FIX

Fixes only:
app/api/projects/[projectId]/finance-report/route.ts

Corrects the three imports from six parent traversals to five:

../../../../../lib/supabase/server
../../../../../lib/supabase/admin
../../../../../lib/financeAccess

No SQL.
No data changes.
No finance logic changes.
No voting changes.

RUN:
npm run build
