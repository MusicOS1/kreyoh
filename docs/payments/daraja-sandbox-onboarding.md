# FACKTS Music — Daraja sandbox onboarding

**Status:** Onboarding runbook only. No payment processing code, merchant credentials, production configuration, or live transactions have been activated by this document.

## 1. Get Safaricom's test credentials

1. Visit https://developer.safaricom.co.ke/ and register or sign in as an individual or company.
2. Open **My Apps / Create App**. Name it **FACKTS Music Sandbox**.
3. Enable **M-PESA Express / Lipa na M-PESA Online (STK Push)**. Add other API products later only if required.
4. Copy **Consumer Key** and **Consumer Secret** from the created app, and find the portal's **M-PESA Express test shortcode** and **test passkey**.
5. Keep secrets in a private password manager and environment variables; do not paste them into ChatGPT, GitHub issues, PRs, commits, browser/client code, or screenshots.

Official entry point: https://developer.safaricom.co.ke/

### Environment variables to configure later (server-side only)

```dotenv
DARAJA_ENV=sandbox
DARAJA_CONSUMER_KEY=
DARAJA_CONSUMER_SECRET=
DARAJA_SHORTCODE=
DARAJA_PASSKEY=
DARAJA_CALLBACK_URL=
DARAJA_ENABLED=false
```

These are **names only**. Real values must go into server-only deployment secrets (or a local, gitignored `.env.local`). Keep `DARAJA_ENABLED=false` until backend implementation, authentication, audit logging and tests are ready. Never use `NEXT_PUBLIC_` for any payment secret.

## 2. Sandbox is not a real merchant account

- Daraja's sandbox is for test requests, statuses and callbacks; no real customer money is collected.
- Safaricom uses sandbox credentials, sandbox host `https://sandbox.safaricom.co.ke`, and test shortcodes for this phase.
- A successful API acceptance response means **request accepted**, not **money received**.
- Only the authoritative, correlated **completed** callback (and appropriate secondary reconciliation where needed) should advance a pending invoice to paid in a production system.
- Failed, cancelled, expired and duplicate transactions must never credit project revenue.
- A sandbox test is not sufficient for live transactions. Live payments require an eligible, approved Paybill/Till/merchant shortcode with the appropriate Safaricom account access and production credentials.

## 3. Proposed FACKTS Music flow

1. A project manager raises a **recording session invoice** tied to project, session, payer, amount (KES), reference, creator and audit trail.
2. A signed-in payer chooses M-PESA and provides a Kenyan phone number.
3. Server checks access and invoice eligibility, idempotently creates a payment attempt, requests OAuth token, and calls M-PESA Express on Safaricom's sandbox API. Do not trust amount or recipient passed by browser.
4. Save Safaricom request IDs and keep invoice **pending**. Never mark paid on STK request acceptance.
5. Server receives HTTPS callback; correlate by CheckoutRequestID and MerchantRequestID, safely parse callback, reject duplicates/replays and reconcile amount/receipt/phone against the attempt before crediting it.
6. On success, generate a receipt and one balanced finance ledger entry with references to project, session, invoice and verified payment. On failure/timeout, record the failure without a paid ledger entry.
7. Support reconciliation/status queries when confirmation is delayed; handle out-of-order callbacks, idempotent retries, logging and access control.

### Minimum data to persist

- Invoice: `id, project_id, session_id, payer_id, purpose, amount_kes, status, created_at`
- Attempt: `id, invoice_id, phone_e164, checkout_request_id, merchant_request_id, result_code, status, created_at`
- Verification: `attempt_id, verified_at, mpesa_receipt, confirmed_amount, source, raw_event_reference`
- Ledger: `id, project_id, invoice_id, payment_attempt_id, type, amount_kes, recorded_at`
- Audit: server actor, action, time, reference and outcome, without recording M-PESA PINs or credentials.

Use an additive schema reviewed against current production data and RLS policies; do not overwrite the existing project finance model. Never use a frontend-only callback to mark an invoice paid.

## 4. Test cases before any real payment

- Correct invoice details, amount and project association
- OAuth success/failure and rotated credentials
- Sandbox STK initiation acceptance vs real result distinction
- Successful callback; payment transitions pending → paid exactly once
- Cancelled/failed/expired payments; no revenue ledger credit
- Delayed/missing callbacks and status-query reconciliation
- Duplicate and out-of-order callbacks; receipt uniqueness
- Incorrect amount/phone/invoice references; reject or hold for manual review
- Authorized access, throttling, secrets not exposed to client
- Finance team can inspect reconciled project records, not raw credentials
- Separate dev/staging/prod environments and explicit go-live checklist

## 5. Live activation is separate

Safaricom's published go-live process asks for an existing live business shortcode (Paybill/Till), the organization name, and an M-PESA organization portal Business Administrator/Business Manager username. The required merchant KYC paperwork and processing time depend on account type and Safaricom review. Contact **M-PESABusiness@Safaricom.co.ke** to apply for a shortcode or organization portal support.

**Do not use sandbox payments to collect Saturday event contributions.** Use an already-operational, properly authorized collection method until the live merchant account is approved, configured and tested.

Official API background: https://developer.safaricom.co.ke/apis/TransactionStatus
