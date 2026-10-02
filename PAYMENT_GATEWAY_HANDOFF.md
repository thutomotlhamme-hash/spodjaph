# Payment Gateway Handoff

Date: 27 August 2026

The generic non-Grad front-end journey and the gallery order engine are ready. Do not represent card / wallet transactions as successful until an approved merchant gateway is connected server-side.

## Required server-side contract

1. Browser sends only the trusted booking/enquiry reference, requested payment intent and a short-lived checkout/session token.
2. Server looks up the booking/package/order and computes the amount from trusted server-side data. Never trust a browser-provided total.
3. Server creates a hosted checkout/session with Yoco, Paystack or the approved provider and returns only the provider checkout/session information.
4. Apple Pay / Google Pay can surface first when supported; card remains fallback.
5. Provider webhook/callback verifies the transaction server-side and updates the booking/payment/gallery state.
6. `/success/` must read verified server state before displaying paid/confirmed.
7. Gallery Print Room orders should move from `pending_payment` to a paid/confirmed production state only after the provider callback is verified.

## Lane policy

- Grad House: existing live booking + existing Yoco start/verify backend where configured.
- Fixed Wedding/Event/Portrait package: payment UI can offer the configured reservation deposit or full settlement.
- Wedding balance: may use the configured wedding exception with remaining balance due up to three days after the wedding.
- Custom / `from` / add-on-only work: scope approval first; no fabricated charge.
- Brand/agency work: quote/PO-first; preserve approved payment arrangement.

## Gallery delivery policy

The client Gallery API can enforce:

- `always`
- `deposit_paid`
- `paid_in_full`

as the download gate. It can additionally require a gallery download PIN.

This allows a sneak peek / proofing experience to remain available while final high-resolution delivery stays commercially controlled.

## Current activation state

- Gallery order creation and coupon arithmetic are live server-side.
- Generic non-Grad merchant charging is still gateway-pending.
- No browser page stores or handles raw card details.
- Do not change the pending state to a fake `paid` result merely to make the demo look complete.
