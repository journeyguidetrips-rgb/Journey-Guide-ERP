## Architectural Plan: Journey Guide ERP — Multi-Client Ready

After reading every layer of the codebase, here are the problems grouped by severity and the complete plan to fix them.

---

# What's Actually Wrong Right Now

## 1. Broken multi-tenancy — the biggest issue

The current ownership model is incomplete. Data isolation only works for itineraries. Everything downstream is broken:

* `getBookingWithPayments`, `addClientPayment`, `addVendorPayment`, `getBookingDetails` — all accept a raw `bookingId` with no user ownership check. Any authenticated user can read or write to any booking if they know the UUID.
* `getDashboardSummary()` calls `get_dashboard_summary()` with no user filter — it returns numbers from all data in the database.
* `publishItinerary`, `deleteItinerary`, `getItinerary` (single fetch) — no user check in the service layer.
* The receipt route (`/:bookingId/client-payments/:paymentId/receipt`) directly queries `pool` with no ownership verification.
* `updateClientPayment` and `updateVendorPayment` — no user check, anyone can edit any payment.

---

## 2. Hardcoded client-specific data

In `backend/src/routes/bookings.ts` lines `491–496`, the receipt template hardcodes:

```text
Account Name: Journey Guide
Account No:   18480200006512
IFSC Code:    Fdrl0001848
UPI ID:       journeyguide64@fbl
```

This makes the system impossible to deploy for any other agency as-is.

---

## 3. No concept of an organization/tenant

Currently the model is:

```text
user → data
```

For a real agency, it needs to be:

```text
organization → users → data
```

A manager and a staff member at the same agency need to share data; two different agencies must never share data.

---

## 4. Business logic scattered in route files

`bookings.ts` (the route file) contains:

* utility functions (`formatIndian`, `numberToWords`, `displayDate`)
* HTML template building
* Puppeteer PDF generation
* direct `pool.query` calls

—all mixed together. This is what makes small changes require touching many files.

---

## 5. Security gaps

* No rate limiting on any endpoint (login endpoint is completely open to brute force)
* JWT stored in `localStorage` (vulnerable to XSS)
* No request body validation library — manual field checks scattered across all routes
* Debug `console.log` with user data in production code (`console.log("Reterived booking details")`, `console.log("In 'Get Payments' method")`, etc.)
* Static file serving from `uploads/` with no auth — any file URL is publicly accessible

---

## 6. Query fragility

`getClientPayments` and `getVendorPayments` have a subtle parameter index bug — `$1` is reserved for `userId` but then `paramIndex` starts at `1` too, causing wrong parameter binding when filters are applied.

The `userId` filter is also never actually applied in the `WHERE` clause of those queries (the `JOIN` exists but `i.user_id = $1` is missing from the conditions array).

---

# The Plan (Phased)

---

# Phase 1 — Fix Security Holes (Do This Before Any Deployment)

## 1.1 — Patch ownership checks on all endpoints

Every service function that touches bookings or payments must accept and enforce `userId`.

The pattern to use everywhere:

```sql
-- Before accessing/modifying any booking, always validate:
SELECT b.booking_id FROM bookings b
INNER JOIN itineraries i ON b.itinerary_id = i.id
WHERE b.booking_id = $1 AND i.user_id = $2
```

### Files to update

* `bookingService.ts`

  * `getBookingWithPayments`
  * `addClientPayment`
  * `addVendorPayment`
  * `getBookingDetails`
  * `updateClientPayment`
  * `updateVendorPayment`

* `routes/bookings.ts`

  * pass `req.user!.id` to every service call, including the receipt route

* `itineraryService.ts`

  * check `publishItinerary`
  * `deleteItinerary`
  * `getItinerary`
  * all scope to `userId`

---

## 1.2 — Fix the dashboard to be per-user

The PostgreSQL function `get_dashboard_summary()` needs to accept a `user_id` parameter:

```sql
-- Change the DB function signature:
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_user_id INT)
RETURNS TABLE(...) AS $$
  -- all queries filter by:
  INNER JOIN itineraries i ON b.itinerary_id = i.id
  WHERE i.user_id = p_user_id
$$ LANGUAGE sql;
```

Then:

* `bookingService.getDashboardSummary(userId)` passes it down
* the route passes `req.user!.id`

---

## 1.3 — Fix the payments query bug

In `getClientPayments` and `getVendorPayments`:

* add `i.user_id = $1` as the first condition
* fix `paramIndex` to start at `2` after reserving `$1` for `userId`

---

## 1.4 — Add rate limiting

Install `express-rate-limit` and apply it:

* Strict limit on `/api/auth/login`

  * e.g., `10 requests per 15 minutes per IP`

* General API limit on all `/api/*` routes

  * e.g., `200 requests per minute per user`

---

## 1.5 — Protect the uploads directory

Remove:

```ts
app.use('/uploads', express.static(...))
```

from `index.ts`.

Files should only be served through an authenticated route:

```http
GET /api/files/:filename
→ authenticate middleware
→ stream file from disk
```

---

## 1.6 — Remove all debug console.log calls

Replace with a proper logger (e.g., `pino` or `winston`) that can be silenced in production via:

```env
LOG_LEVEL=error
```

---

# Phase 2 — Multi-Tenancy Architecture (Organizations)

This is what makes it usable across clients.

---

## 2.1 — Add an organizations table

```sql
CREATE TABLE organizations (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(100) UNIQUE NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organization_profiles (
  org_id          INTEGER PRIMARY KEY REFERENCES organizations(id),
  logo_base64     TEXT,
  account_name    VARCHAR(255),
  account_number  VARCHAR(50),
  ifsc_code       VARCHAR(20),
  upi_id          VARCHAR(100),
  address         TEXT,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  terms           TEXT,
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 2.2 — Add organization_id to the data tables

```sql
ALTER TABLE users       ADD COLUMN org_id INTEGER REFERENCES organizations(id);
ALTER TABLE itineraries ADD COLUMN org_id INTEGER REFERENCES organizations(id);
ALTER TABLE vendors     ADD COLUMN org_id INTEGER REFERENCES organizations(id);
```

`bookings` inherits org via itinerary join, so no column is needed.

---

## 2.3 — Update the JWT payload

```ts
interface JWTPayload {
  id: number;
  email: string;
  role_id: number;
  org_id: number;
  permissions: string[];
}
```

Every query then filters by both:

* `user_id` (individual ownership)
* `org_id` (organization-level access)

Admins within an org can see all data; staff see only their own.

---

## 2.4 — Adjust data scoping rules

| Role                | Data Scope                                            |
| ------------------- | ----------------------------------------------------- |
| Admin (`role_id=1`) | All data within their `org_id`                        |
| Staff               | Only data where `itineraries.user_id = their user_id` |

This means `getBookings`, `getUserItineraries`, etc. need to check the user's role before deciding the `WHERE` clause.

---

## 2.5 — Migration strategy

Write a migration that:

1. Creates the `organizations` table with one row per existing client
2. Assigns all existing users + itineraries + vendors to their respective `org_id`
3. Populates `organization_profiles` with the currently-hardcoded values

---

# Phase 3 — Extract Hardcoded Configuration

## 3.1 — Move receipt data to the database

Remove the hardcoded bank details from `routes/bookings.ts`.

The receipt generation should query `organization_profiles` for the org of the booking's owner:

```ts
const profile = await pool.query(
  `SELECT op.* FROM organization_profiles op
   INNER JOIN users u ON u.org_id = op.org_id
   INNER JOIN itineraries i ON i.user_id = u.id
   INNER JOIN bookings b ON b.itinerary_id = i.id
   WHERE b.booking_id = $1`,
  [bookingId]
);
```

---

## 3.2 — Add an Agency Settings page to the frontend

A new page (admin-only) where each client can configure:

* Company name
* Logo upload
* Bank account details
* UPI ID
* Custom terms & conditions for receipts

This is what makes the system white-labelable.

---

# Phase 4 — Code Organization Cleanup

## 4.1 — Move PDF/receipt generation out of the route file

Create:

```text
backend/src/services/pdfService.ts
```

### Move these functions:

* `generateItineraryPDF(itineraryId, userId)`
* `generateReceiptPDF(bookingId, paymentId, userId)`

### Route files become thin

```ts
router.get('/:bookingId/client-payments/:paymentId/receipt', authenticate, async (req, res) => {
  const buffer = await generateReceiptPDF(req.params.bookingId, req.params.paymentId, req.user!.id)

  res.setHeader('Content-Type', 'application/pdf')
  res.end(buffer, 'binary')
})
```

---

## 4.2 — Centralize utility functions

Create:

```text
backend/src/utils/formatters.ts
```

Move:

* `formatIndian(n)`
* `numberToWords(n)`
* `displayDate(dateStr)`

These are currently duplicated across route files.

---

## 4.3 — Add a validation layer

Install `zod` and define schemas for each request body.

Example:

```ts
const ClientPaymentSchema = z.object({
  clientName: z.string().min(1),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentType: z.enum(['Advance', 'Final', 'Refund', 'Other']),
  amount: z.number().positive(),
  paymentMode: z.enum(['UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque']),
  referenceUtr: z.string().optional(),
  packageName: z.string().optional(),
  remarks: z.string().optional(),
})
```

Replace all manual checks like:

```ts
if (!clientName || !paymentDate ...)
```

with:

```ts
schema.parse(req.body)
```

wrapped in a `validateRequest` middleware.

One schema update applies validation everywhere.

---

# Phase 5 — Frontend Hardening

## 5.1 — Move JWT to httpOnly cookie

Currently `localStorage` is used, which is readable by any JavaScript (XSS risk).

### The fix

* Backend:

  * set the token as a `httpOnly; Secure; SameSite=Strict` cookie on login

* Frontend:

  * remove `Authorization` header
  * cookie is sent automatically

* Add CSRF protection

  * `csurf`
  * or double-submit cookie pattern

---

## 5.2 — Add a refresh token

The current `24h` access token with no refresh means users get logged out mid-day.

### Add

* Short-lived access token (`15 min`)
* Long-lived refresh token (`7 days`) in `httpOnly` cookie
* `POST /api/auth/refresh` endpoint that issues a new access token

---

## 5.3 — Centralize API error handling on the frontend

Currently every service call has its own:

```ts
error.response?.data?.error || 'fallback'
```

pattern.

Add a single Axios response interceptor in a shared file that handles:

* `401` → redirect to login
* `403` → show permission error
* `500` → generic toast

centrally.

---

# Execution Order

| Priority    | Phase                                | Effort   | Risk if Skipped                               |
| ----------- | ------------------------------------ | -------- | --------------------------------------------- |
| 🔴 Critical | Phase 1: Security fixes              | 1–2 days | Any user can see all other users' data        |
| 🔴 Critical | Phase 2.1–2.3: Org table + JWT       | 2–3 days | Can't support multiple clients safely         |
| 🟡 High     | Phase 3: Move hardcoded config to DB | 1 day    | Can't use for any other client                |
| 🟡 High     | Phase 4: Code reorganization         | 2 days   | Maintenance pain accumulates                  |
| 🟢 Normal   | Phase 5: Frontend hardening          | 2 days   | Acceptable for internal use, risky for public |
| 🟢 Normal   | Phase 2.4–2.5: Role-based scoping    | 1 day    | Only matters once you have multi-user orgs    |

---

# Summary

The single most impactful change is:

* Phase 1.1
* Phase 1.2

(ownership checks and per-user dashboard)

This is a security bug, not just a design concern. It should be fixed before showing the system to any client.

The second most impactful change is:

* Phase 3

(extract bank details and company name from the code)

Without this, you physically cannot deploy the system for a second client.

Everything in Phase 2 is what makes the system scale to many clients without running separate databases. It's a bigger migration, but the schema is already almost there — you just need the `organizations` table and one FK column on `users`, `itineraries`, and `vendors`.
