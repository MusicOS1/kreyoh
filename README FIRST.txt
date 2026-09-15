FACKTS MUSIC — FINANCE ACCESS + AUDIT TRAIL FIX

ACCESS MODEL

FULL EDITABLE FINANCE CONTROL
Only:
- Super Admin
- Admin
- Project Lead
- Project Admin

READ-ONLY FINANCE REPORT
Allowed core project roles:
- Artist
- Producer
- Engineer
- Songwriter
- Composer
- Session Musician
- A&R
- Artist Manager / Manager
- Studio Owner
- Finance

These users can see the same underlying project finance information as a report:
- Cash collected
- Opportunity revenue expected
- Opportunity revenue received
- Expenses paid
- Cash available
- Date filters
- Transaction filters
- Membership payment audit trail
- Member ID + name
- Transaction ID
- Date
- Amount
- Payment method
- Payment reference
- Note
- Status
- Clickable member detail
- Clickable transaction detail
- CSV export
- Executive Project Report

They cannot:
- add payments
- edit payments
- reverse payments
- add/edit expenses
- add/edit commercial revenue
- change finance records

NO FINANCE ACCESS FOR PERIPHERAL-ONLY ROLES

Examples:
- Videographer
- Photographer
- Designer
- Visual Creative
- Content
- Media

If those are the only roles a member holds:
- no Financial Report action on member dashboard
- no Finance card on Reports
- direct /finance access is blocked
- member finance detail is blocked
- transaction finance detail is blocked
- finance CSV is blocked
- Executive PDF is blocked because it contains finance

This is enforced at the route/server level, not merely hidden with CSS.

FILES

lib/financeAccess.ts
app/finance/actions.ts
app/finance/page.tsx
app/member-dashboard/page.tsx
app/reports/page.tsx
app/finance/members/[memberId]/page.tsx
app/finance/transactions/[transactionId]/page.tsx
app/api/projects/[projectId]/finance-report/route.ts
app/api/projects/[projectId]/report/route.ts

NO SQL REQUIRED.
NO FINANCE RECORDS DELETED.
NO MEMBER TRANSACTIONS DELETED.
NO VOTING CHANGES.

TEST

ADMIN / PROJECT LEAD:
- /finance => editable

ARTIST / PRODUCER / A&R / MANAGER / STUDIO OWNER:
- /finance => read-only report
- audit trail visible
- member and transaction detail clickable
- no edit/reverse/add controls

VIDEOGRAPHER / DESIGNER / CONTENT-ONLY ACCOUNT:
- /finance => access unavailable
- Reports => no Finance / Executive finance report cards
- Member Dashboard => no Financial Report action
