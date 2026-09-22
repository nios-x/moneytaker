# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16.3.5 (App Router, Server Actions), React 19.2, TypeScript, Tailwind CSS v4 — existing scaffold in this repo. Data: Supabase Postgres (user-chosen). Payments: UPI deep link + QR generated locally per the NPCI URL spec; **no payment gateway, no aggregator, no MDR**. Deploy target assumed Vercel (no writable local disk — this is why file-based storage was ruled out).

## Users

**Primary:** a 20s–30s adult in or around Gurugram who saw the Social by Chance house party on Instagram, tapped the link-in-bio on a phone, and is deciding in under a minute whether to spend ₹1,200–₹1,700 to spend an evening with people they have never met. They are standing up, on mobile data, one thumb, possibly mid-scroll. Their hesitation is not price — it is *"who else is going, and is this real?"*

**Secondary:** the organiser, reconciling payments against a bank statement on a phone and checking guests in at the door on the night.

## Product Purpose

Replace the Google Form + separate UPI screenshot dance with one page that takes a registration and a payment in a single uninterrupted flow. Success = a stranger goes from Instagram tap to paid-and-registered without leaving the page, and the organiser can tell at a glance who has actually paid.

## Positioning

Not a ticketing platform. A single event's own front door: 0% fees, money lands directly in the organiser's bank account in seconds, and the guest never meets a checkout that looks like a checkout. The scarcity is real (a house, a pool, a fixed headcount), not manufactured.

## Operating Context

- Traffic arrives almost entirely from an Instagram link-in-bio or story swipe-up → **mobile-first is not a breakpoint concern, it is the design target**. Desktop is the minority case.
- Payment happens in a *different app*. The guest leaves for GPay/PhonePe/Paytm and must come back. The page has to survive that round-trip and still know who they are.
- UPI gives no callback. Confirmation is manual: the organiser matches a bank statement against self-reported UTRs.
- The organiser reconciles on a phone, often the day of the event.

## Capabilities and Constraints

- **Flow:** collect name + phone + email + gender → save as `pending` with a unique ref → show UPI QR and deep link for the right amount → guest pays elsewhere → guest returns and enters their 12-digit UTR → status `submitted` → organiser marks `paid`.
- **Pricing (fixed, real):** Male ₹1,700 · Female ₹1,200.
- **Event (fixed, real):** 26th September. Gurugram city. Exact venue shared only with confirmed guests. Dress code casual & comfy. Carry an extra set of clothes for the pool.
- **Capacity:** hard per-gender cap, with live spots-left shown publicly. At zero, registration closes and the page offers a waitlist.
- **Confirmation channel:** email. The form therefore collects an email address (added on the organiser's instruction; the original brief said name + phone only).
- **Admin:** a password-gated `/admin` route listing every registration with totals, gated by an env-var password. No user accounts, no auth provider.
- Every UPI amount is server-derived from gender. The client never sends a price.
- A UTR is *self-reported* and proves nothing on its own. The UI must never imply the payment is verified.

## Brand Commitments

- Name: **Social by Chance**. 
- Confirmed voice, from the organiser's own copy: warm, lowercase-friendly, emoji-tolerant, second person. Its two anchor lines are binding:
  - *"What if one night could turn complete strangers into your next favourite people?"*
  - *"Come as strangers. Leave with stories."*
- Existing collateral leans purple (💜).

## Evidence on Hand

- Real: event date, venue city, dress code, pool, prices, the activity list (poolside, food & drinks, games, music & dancing, curated crowd), and the two taglines above.
- **Absent, must not be fabricated:** past-event photos, guest counts, testimonials, press, founder names, company registration, refund policy, exact venue address, Instagram handle, organiser phone number. No photography of real attendees exists for this page. Any face shown would be a lie about who has attended.
- UPI ID is supplied by the organiser at deploy time via `UPI_VPA`; it is not in the repo.

## Product Principles

1. **One page, one thumb, no dead ends.** Every step resolves on the same URL. A guest who leaves for a UPI app and comes back must land exactly where they left.
2. **Never imply a payment is verified when it is not.** Self-reported UTR is a receipt of intent. Say so plainly.
3. **The offer must be intelligible before the form is.** A stranger decides on the vibe first and the ₹ second; the page must earn the number before it asks for it.
4. **Scarcity must be true.** The counter reflects the real cap or it does not ship.
5. **No invented proof.** No stock crowds, no fake testimonials, no attendee faces. Desire comes from craft and language, not borrowed evidence.

## Accessibility & Inclusion

Mobile, one-handed, frequently outdoors or in low light. Touch targets ≥44px, real focus states, form fields typed for mobile keyboards (`tel`, `email`, numeric UTR). The gender field sets the price, so its labels must be unambiguous and non-judgemental.
