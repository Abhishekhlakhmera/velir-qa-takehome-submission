# Test Strategy & Framework Review — Shady Meadows B&B

**Site under test:** [automationintesting.online](https://automationintesting.online/)
**Framework:** Playwright + TypeScript
**Prepared by:** Abhishekh Lakhmera

A product-level test strategy for the site, plus a review of the Playwright/TypeScript automation framework used to exercise it — what it covers, what it misses, and where it should go next.

---

## Part 01 — Website Test Strategy

### 1.1 Product analysis

Shady Meadows B&B is a small hotel-booking demo: a marketing homepage that lets a visitor check room availability by date, browse a three-room catalog (Single, Double, Suite), submit a booking as a guest with no account required, and send a general inquiry through a contact form. A separate, authenticated admin area exists for staff to manage the property. Under the hood it's backed by a REST API (`/api/booking`, `/api/room`) that the frontend calls directly — nothing is server-rendered on submit.

Three critical paths fall out of that shape:

- **Guest booking** — browse rooms → pick dates → fill the reservation form → get a confirmed booking. This is the only path that generates revenue, and every other feature exists to support it.
- **Property operations** — a staff member logs into `/admin` to manage room inventory, review bookings, and read guest messages. Nothing about the business runs without this working correctly and staying behind auth.
- **Pre-sale inquiry** — a visitor who isn't ready to book yet reaches out via the contact form instead. Lower stakes than the other two, but it's the site's only lead-capture mechanism for undecided visitors.

### 1.2 Key features to test

Five features carry most of the product's risk and complexity. "Success" is stated concretely for each, since that's what a test actually checks against.

| Feature / workflow | What success looks like |
|---|---|
| **Availability & booking widget** — homepage date picker + per-room reservation form | Only valid, future check-in/check-out combinations are accepted; a room already booked for the selected range is refused or shown unavailable; a valid submission for an available room results in one confirmed booking — no more, no fewer. |
| **Room catalog & detail page** | Price, features, images, and policies shown on each card match what the API returns for that room, and clicking "Book now" carries the visitor to the correct room's reservation page with the dates they selected still intact. |
| **Reservation form validation** | Required fields block submission with a clear message; a malformed email or phone number is rejected (not just too-short — actually invalid); a fully valid submission returns a booking confirmation with no console errors or broken page state. |
| **Contact / inquiry form** | A well-formed message is accepted and acknowledged; markup or script typed into any field is neutralized on render, never executed and never reflected back as live HTML. |
| **Admin authentication** | Every `/admin/*` route requires a valid session — no credentials, wrong credentials, and a forged/expired token are all treated the same way: redirected to login, protected data never rendered. |

### 1.3 Failure states & edge cases

The set below is what I'd want covered before calling the booking flow trustworthy — most of it maps directly onto the ten test cases actually automated in Part 2:

- Checkout date on or before the selected check-in date
- Two guests booking the same room for overlapping date ranges
- Malformed email or phone — wrong *format*, not just wrong length
- Required booking fields (name, email, phone) left blank
- Script or HTML injected into any free-text field (name, message, subject)
- Unauthenticated or token-forged access to any `/admin/*` route
- A direct API write that skips the UI's rules entirely (calendar, form validation)
- Negative, zero, or absurd values — price, stay length, field length
- Lookups against a booking or room ID that doesn't exist
- Two guests booking the identical room/date slot at effectively the same instant
- A rejected request crashing the page to a generic error screen instead of showing the guest a usable message — a failure mode in its own right, independent of whether the underlying rejection was correct

### 1.4 Test strategy

The strategy centers on one idea: this site's entire value depends on the booking flow being both *usable* and *trustworthy*. Everything else is secondary to that.

**What to test first, and why**
The end-to-end booking flow — availability check → room select → form → confirmation. It's the single path every visitor who matters passes through, it touches the most moving parts (calendar, pricing, validation, the API), and every one of the ten assigned test cases eventually intersects it somewhere.

**What's most critical to the business**
A guest being able to complete a valid booking, and the availability engine being honest about what's actually free. A site that can't take a booking has no business; a site that quietly takes conflicting ones has an angry-guest problem it won't see coming.

**What poses the highest risk if broken**
Overbooking. A double-sold room is invisible until a real guest shows up to a room that isn't theirs — by then it's a refund, a reputational hit, and possibly a support incident, not a caught bug. An exposed admin surface or unsanitized input is a close second: both are silent until someone exploits them.

### 1.5 Testing types for the eventual plan

| Type | Why it belongs in the plan |
|---|---|
| Functional UI | Confirms the booking, browsing, and contact flows work the way a real guest experiences them. |
| API / contract | Proves the backend enforces its own rules independent of whatever the UI happens to allow — the actual source of truth. |
| Negative & boundary | Bad dates, bad data, empty fields, extreme values — where booking systems actually break. |
| Security | AuthN/authZ on the admin surface, injection handling on every free-text field that gets stored or displayed. |
| Concurrency | The one failure mode (overbooking) identified above as highest-risk can only be caught by tests that race requests against each other. |
| Cross-browser & responsive | A booking form that breaks on Safari or at mobile width silently turns away exactly the guests trying to book from their phone. |
| Accessibility | A booking form a screen-reader or keyboard-only user can't complete is a booking that doesn't happen. |
| Visual regression | Catches the class of bug functional assertions miss entirely — a price rendered off-card, an overlapping element hiding a button. |
| Performance / load | Availability checks and booking writes need to hold up under realistic concurrent traffic, not just two requests fired in a test. |
| Smoke (CI-gated) | A fast, small subset run on every change so the team gets signal in minutes, not after a full nightly run. |

---

## Part 02 — Framework Analysis

### 2.1 What the framework is testing

It's a Playwright + TypeScript suite driving `automationintesting.online` directly — real browser, real API, no mocking. It started as five tests proving out the happy-path booking flow and basic API discovery; it now also covers the ten exploratory/security test cases assigned separately, organized under `tests/edge-cases` and `tests/security`.

| | |
|---|---|
| Spec files | **10** |
| Tests, all green | **45** |
| Page objects | **3** |
| Confirmed live-site defects | **6** |

### 2.2 Scenario coverage: UI vs. API

**UI**
- Happy-path booking and empty-form field presence (original suite)
- Checkout date ≤ check-in, via the actual datepicker widget
- Overlapping booking, asserted against the network response (the DOM can't be trusted here — see 2.5)
- 4 malformed-email variants + a too-short phone number
- 5 required-field-omission cases, plus a UI/API agreement check
- XSS payloads in both the booking form and the contact form
- Admin routes with no auth, a forged token, and invalid credentials
- Two-browser-context concurrent booking race

**API**
- Endpoint auth probe and booking-creation contract discovery (original suite)
- Checkout ≤ check-in and overlapping-booking rejection (409)
- Malformed email/phone and missing-field rejection
- Negative and zero `totalprice`, a 1000-char name, a 10-year stay
- Lookups against a non-existent booking ID and room ID (numeric and non-numeric)
- Booking created against a room ID that doesn't exist
- Two simultaneous create-booking requests for the same slot
- Writes with no auth token, contrasted against reads that require one

### 2.3 What's not tested

- **Everything behind the admin login** — room CRUD, booking management, replying to guest messages. No valid credentials are available, so this is a blind spot by necessity, not by oversight.
- Booking modification or cancellation
- Whether a contact-form message is actually delivered or stored — only that it isn't a script-injection vector
- Deposit/payment handling — `depositpaid` is a boolean flag with no real payment gateway behind it
- Cross-browser or responsive behavior — `playwright.config.ts` only runs a Chromium project, despite the README describing three
- Accessibility — no automated a11y checks anywhere in the suite
- Visual regression
- Load beyond two or three concurrent requests
- Whether the unsanitized input the API accepts (see 2.5's fixed-bug notes) actually renders unescaped in an authenticated view — flagged, not verified
- Anything in CI — there's no workflow file; the suite only runs when someone runs it by hand

### 2.4 Gaps between the strategy and the automation

- The strategy names **admin operations** as a critical business path; automation can only test its front door (auth), not the workflows behind it. This is the largest gap, and it's blocked by access, not by effort.
- Cross-browser, responsive, accessibility, visual, and load testing are all called out in 1.5 as necessary types — **none** are represented yet. The suite today is functional-and-security-only, single-browser.
- Concurrency is proven at "two requests at once," which shows the API has *some* locking — it doesn't show that locking holds under realistic traffic. A real load/race test at scale is still open.
- Booking confirmation content isn't verified end-to-end — nothing checks that a successful booking is later retrievable, or that a guest gets a usable confirmation, only that the create call returns 201.

### 2.5 Framework quality

**Is it solid?** Reasonably solid for its scope, but it wasn't battle-tested going in. Writing the new suite surfaced two real defects in the existing helper code — not in the site, in the framework itself:

> ✅ **Fixed** — `HotelBookingPage.getErrorMessages()` silently returned `null` even when a validation error was clearly on screen. Two compounding bugs: it called `locator.isVisible({ timeout })`, which — despite accepting a timeout — doesn't poll or retry, so it checked before the banner had rendered; and its fallback selector (`role=alert li`) isn't valid Playwright syntax, so it never matched anything either. This weakened the *original* positive/negative specs too, just silently — `if (errorMessages)` conditionals never fired.

> ✅ **Fixed** — `ApiHelper.createBooking()` used raw `fetch()`, which reproducibly threw `UND_ERR_REQ_CONTENT_LENGTH_MISMATCH` on POST requests against this host in this Node/OS combination — confirmed by running the original suite unmodified before making any changes. Switched to Playwright's `APIRequestContext`, which doesn't hit the issue.

**Does it apply an architectural pattern?** Yes — Page Object Model, applied cleanly. `HotelBookingPage`, `HomePage`, and `AdminPage` own selectors and interactions; `ApiHelper` owns HTTP calls; `TestDataGenerator` owns fixtures; specs stay declarative and read like a checklist rather than a script.

**Is it easy to understand, easy to add to?** Yes on both counts. Naming is consistent, the three-layer split (pages / api+data / specs) is easy to hold in your head, and the two established patterns — add a page-object method, write a spec against it — cover almost every new case without inventing a third pattern. The `@tc1`…`@tc10` plus `@ui`/`@api` tagging convention means a new test slots in and is independently runnable without touching anything else.

**What would I improve?**

1. **Wire up CI.** There's no workflow file at all right now — the suite only runs when a person remembers to run it.
2. **Type the API layer.** Every payload and response is `any`; real interfaces would catch a wrong field name at compile time instead of a 400 at runtime.
3. **Add data cleanup.** Nothing ever deletes a booking. The shared demo instance accumulates test data permanently — this suite's own new tests included — with no isolated or ephemeral environment to run against instead.
4. **Get admin test credentials.** Unlocks the single biggest coverage gap identified in 2.3/2.4.
5. **Single-source the base URL.** It's duplicated today — `playwright.config.ts`'s `baseURL` and `ApiHelper.BASE_URL` — so pointing the suite at a different environment means editing two places and hoping they stay in sync.

**One thing it does well**
The Page Object Model discipline is genuinely followed, not just nominally present. Every selector lives in exactly one place, so a markup change is a one-line fix in a page object rather than a find-and-replace across a dozen specs — that's the single difference between a framework that survives the site's next redesign and one that gets quietly rewritten after it.

### 2.6 Next steps

If the team wanted to expand this automation, these are the three changes I'd prioritize, in order:

1. **Stand up CI.** A GitHub Actions workflow running the full suite on a browser matrix — every PR, plus a scheduled nightly run against the live demo — with the HTML report published as a build artifact. This is the fastest way to turn 45 passing tests into an actual safety net instead of a suite someone has to remember to run.
2. **Get a dedicated admin test account.** Unlocks automated coverage of room, booking, and message management — the largest blind spot in the suite today, and squarely the "critical to the business" path named in 1.4.
3. **Add cleanup and single-source the environment config.** Either a teardown step (delete what a test creates) or a move to an isolated per-run environment, plus one shared `BASE_URL` instead of two hardcoded copies — so the suite stops permanently accumulating bookings on a shared demo instance and can be pointed at staging or prod without hand-editing two files.

---

*References: `tests/edge-cases`, `tests/security`, `tests/pages`, `tests/utils`*
