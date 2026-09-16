FACKTS MUSIC — EXECUTIVE REPORT CASH CONSISTENCY FIX

This fixes only the Executive Project Report.

The Executive finance section now shows only:
- Cash collected
- Opportunity revenue expected
- Opportunity revenue received
- Expenses paid
- Cash available

Removed from the Executive PDF:
- Current membership rule
- Current-month membership collected
- Current-month member credit
- Monthly membership outstanding
- Monthly membership outstanding/credit commentary

All detailed member records, monthly dues, credits, payments and transaction audit history remain inside Finance.

IMPORTANT:
Cash Collected is still calculated from posted membership transactions.
It is NOT hard-coded.

The PDF you supplied currently shows KES 10,000 as Cash Collected on pages 1 and 4.

No SQL.
No database changes.
No member data changes.
No voting changes.

Run:
npm run build
