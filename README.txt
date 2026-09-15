FACKTS MUSIC — SIMPLE CASH + OPPORTUNITY SUMMARY

THIS PATCH DOES NOT REMOVE MEMBER RECORDS.

EVERY MEMBER RECORD REMAINS:
- Member ID
- Name
- KES 2,000 monthly due
- Monthly paid position
- Outstanding / credit
- Lifetime paid
- Transaction history
- Transaction IDs
- M-Pesa / bank references
- Notes
- Clickable member detail
- Clickable transaction detail

ONLY THE HEADLINE PROJECT FINANCE SUMMARY IS SIMPLIFIED.

TOP FINANCE CARDS

1. CASH COLLECTED
Actual membership payment transactions received.

2. OPPORTUNITY REVENUE EXPECTED
Current active commercial opportunity value.
For each active opportunity the system uses:
- contracted value first, if present
- otherwise negotiated value
- otherwise estimated value

Lost and completed opportunities are excluded from expected pipeline value.

3. OPPORTUNITY REVENUE RECEIVED
Actual PAID commercial revenue records.

4. EXPENSES PAID
Actual project expenses marked Paid.

5. CASH AVAILABLE
Cash Collected
+ Opportunity Revenue Received
- Expenses Paid

IMPORTANT:
Expected opportunity revenue NEVER increases Cash Available.
It stays separate until money is actually received.

6. ACTIVE OPPORTUNITIES
Count with link to /opportunities.

THE OPPORTUNITY PANEL ALSO SHOWS
- organisation/opportunity
- stage
- best current value
- next action
- link to full Opportunities page

EXECUTIVE PROJECT REPORT
The finance section is simplified to the same language:
- Cash collected
- Opportunity revenue expected
- Opportunity revenue received
- Expenses paid
- Cash available

Member-level monthly/transaction records still exist in Finance.

FILES
app/finance/page.tsx
app/api/projects/[projectId]/report/route.ts

NO SQL REQUIRED.
NO MEMBER DATA IS DELETED.
NO TRANSACTIONS ARE DELETED.
NO VOTING CHANGES.

RUN
npm run build
npm run dev
