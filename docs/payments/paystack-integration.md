# FACKTS Music — Paystack project checkout

**Branch:** `feature/paystack-project-payments`  
**Scope:** Project invoices for recording sessions, studio set design, camera hire, contributions and production services; Paystack hosted M-PESA checkout; verified receipts and project finance integration.

## Safety defaults

- Code is disabled unless `PAYSTACK_PAYMENTS_ENABLED=true`.
- Default `PAYSTACK_MODE=test`; live mode additionally requires `PAYSTACK_LIVE_ENABLED=true`.
- No API or webhook secrets are stored in source code or exposed to browsers.
- Do not deploy to production until the database migration, credentials, user acceptance and real settlement arrangements are validated.
- The webhook validates Paystack's current `Paystack-Signature` with `whsec_`, and supports `x-paystack-signature` with the secret API key as a legacy fallback **only when the signing secret is absent**.
- Sandbox receipts do not feed real project finance balances; only verified **live** payments create `revenue_records`.

## 1. Paystack dashboard actions

1. Sign in at https://dashboard.paystack.com/ and check that the account is correctly classified as a Kenya individual/Starter merchant and that account activation/KYC is approved.
2. Under Preferences, enable **Mobile Money** (M-PESA) if available.
3. Under Developers → API configuration, find test and live secret API keys. **Do not share them in chat or GitHub.**
4. Obtain a **webhook signing secret** (`whsec_`) from the Paystack dashboard if supported for the selected mode; the integration also supports Paystack's legacy signed webhook until configured.
5. Set your test webhook URL to `https://YOUR_PREVIEW_OR_STAGING_DOMAIN/api/payments/paystack/webhook`. Use a separate live webhook URL for the production domain when approved.
6. Ensure the business's payout account in Paystack is correct. Customer money settles to Paystack's approved merchant settlement account; this implementation has **no artist wallet or auto-payout**.

Official developer docs:
- https://paystack.com/docs/payments/accept-payments/
- https://paystack.com/docs/api/transaction/
- https://paystack.com/docs/payments/webhooks/
- https://paystack.com/docs/payments/payment-channels/

## 2. Vercel environment variables

Set the following **in the server-side environment variables UI** for the relevant FACKTS Music Vercel deployment (never `NEXT_PUBLIC_` and never commit actual values):

```dotenv
# Test rollout
PAYSTACK_PAYMENTS_ENABLED=false
PAYSTACK_MODE=test
PAYSTACK_TEST_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_SITE_URL=https://YOUR_PREVIEW_OR_STAGING_DOMAIN

# Later, only after live activation and separate approval:
# PAYSTACK_MODE=live
# PAYSTACK_LIVE_SECRET_KEY=
# PAYSTACK_LIVE_ENABLED=true
```

During testing switch `PAYSTACK_PAYMENTS_ENABLED=true` only on the intended preview or staging environment. Ensure `PAYSTACK_SITE_URL` matches that deployment and is HTTPS. Keep production flags off.

## 3. Database

Apply migration `supabase/migrations/20261115130000_paystack_project_payments.sql` to **staging first**, verify table RLS and function grants, then plan an additive production rollout.

New tables:
- `project_payment_invoices` — immutable billed amount, project, optional studio session, description and shareable random token.
- `project_payment_attempts` — unique provider reference, mode, payer email, status.
- `project_payment_receipts` — idempotent verified receipt; references project finance revenue record for live payments only.

Only server-side Supabase service role may read/write these tables. `project_paystack_confirm` is restricted to the service role and performs atomic confirmation, preventing repeated callback ledger credits.

## 4. User experience

1. Project finance administrator opens `/payments`, chooses purpose, description and fixed KES amount, optionally selects a recording session and/or designated payer email.
2. Administrator copies shareable `/payments/pay/<token>` URL. The guest enters an email and clicks **Pay with M-PESA**.
3. FACKTS server validates invoice amount and mode and initializes **Paystack Checkout**, restricted to `mobile_money`.
4. User completes the phone prompt on Paystack. Paystack redirects to `/payments/complete?reference=...`.
5. Completion page asks the server to **verify with Paystack**; a signed `charge.success` webhook also verifies from Paystack.
6. When all fields match, the atomic RPC posts the receipt once, closes the invoice, and — in **live mode only** — adds a paid `revenue_records` entry to the existing project finance dashboard.
7. Failed, cancelled, mismatched or pending payments never count as income.

## 5. Acceptance checklist

- [ ] Existing platform compiles on Next.js 16 and TypeScript.
- [ ] Staging migration applied; no older project revenue or membership rows modified.
- [ ] Unauthorized user cannot create an invoice.
- [ ] Wrong project session rejected.
- [ ] Guest checkout accepts only issued token, valid email and fixed amount.
- [ ] Disabled checkout fails closed.
- [ ] Only trusted Paystack hosted checkout URL accepted.
- [ ] Test successful payment marked paid, with **no real-income revenue record**.
- [ ] Failed/abandoned/pending payment does not credit finance.
- [ ] Duplicate and delayed callbacks create a single receipt and at most one revenue posting.
- [ ] Signature tampering and stale timestamp rejected.
- [ ] Wrong currency, amount, mode, payer, channel or reference rejected.
- [ ] Live-only smoke test after activation confirms settlement and reconciliation.
- [ ] Finance administrator verifies genuine payout/settlement before concluding the first live transaction.

**No changes to musician credits, ownership, royalties or payout rules.** Those require their own provider/legal workflow.
