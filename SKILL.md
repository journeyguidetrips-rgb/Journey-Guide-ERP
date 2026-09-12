# Journey Guide ERP - Database & API Integration Skill

---

## Overview

This skill covers development, integration, and enhancement work with the **Journey Guide ERP** system — a comprehensive travel management platform built with PostgreSQL, Node.js/TypeScript, and React. The system manages itineraries, bookings, vendor relationships, and payment workflows for travel agencies and tour operators.

**Repository:** Journey-Guide-ERP (claude-restructured branch)

---

## Core Domain: Travel & Payment Management

The Journey Guide ERP handles the complete lifecycle of travel bookings:

1. **Itinerary Management** — Users create and publish travel itineraries.
2. **Booking Conversion** — Itineraries convert to bookings with pricing and vendor assignments.
3. **Vendor Management** — Track vendors, contacts, and vendor-specific pricing.
4. **Payment Tracking** — Dual-ledger system for client and vendor payments.
5. **Financial Reconciliation** — Real-time balance calculations and payment histories.

---

## Database Architecture

---

### Core Tables & Their Responsibilities

#### **Authentication & Multi-Tenancy**

- `**users**` — User accounts with role-based access control (RBAC)
  - Columns: `id`, `org_id`, `role_id`, `email`, `password_hash`, `created_at`
  - Links to: `organizations`, `roles`
- `**organizations**` — Multi-tenant isolation; each organization is independent
  - Columns: `id`, `name`, `created_at`
- `**roles**` — Role definitions (e.g., Admin, Manager, User)
  - Columns: `id`, `name`, `description`
  - Links to: `permissions` (via `role_permissions` junction table)
- `**permissions**` — Granular permission definitions for RBAC
  - Columns: `id`, `name`, `description`
- `**organization_profiles**` — Extended org metadata
  - Columns: `id`, `org_id`, `contact_email`, `phone`, `address`, `city`, `country`

#### **Itinerary Management**

- `**itineraries**` — Travel itineraries created and maintained by users.
  - Key Columns:
    - `id` (UUID)
    - `user_id` (UUID, foreign key to `users.id`)
    - `org_id` (UUID, foreign key to `organizations.id`)
    - `source_md_id` (UUID, foreign key to `itinerary_contents.id`)
    - `edited_md_id` (UUID, foreign key to `itinerary_contents.id`)
    - `status` (VARCHAR: `Draft`, `Published`, `Converted`)
    - `created_at`, `updated_at`
  - **Note**: Large `.md` content is stored in the `itinerary_contents` table.
- `**itinerary_contents**` — Stores large `.md` files separately from metadata.
  - Key Columns:
    - `id` (UUID)
    - `itinerary_id` (UUID, foreign key to `itineraries.id` with `ON DELETE CASCADE`)
    - `content_type` (VARCHAR: `'source_md'` or `'edited_md'`)
    - `content` (TEXT: The `.md` file content)
    - `created_at`, `updated_at` (TIMESTAMPTZ)
  - Indexes: `idx_itinerary_contents_itinerary_id`, `idx_itinerary_contents_content_type`

#### **Booking Management**

- `**bookings**` — Converted bookings with dual payment tracking.
  - Key Columns:
    - `booking_id` (TEXT, format: JG-0001, JG-0002, etc.) — auto-generated via `booking_id_seq`
    - `itinerary_id` (UUID) — link to source itinerary
    - `client_name`, `vendor_name`, `package_name`
    - `travel_date`, `guests`, `phone`, `whatsapp`, `notes`
    - **Financial**: `selling_price`, `vendor_cost`, `received_from_client` (SUM of client payments), `paid_to_vendor` (SUM of vendor payments)
    - `client_status` — Payment status tracking
    - `reminder_date` — Follow-up reminder
    - `created_by` (UUID) — user who created the booking
    - `created_at`, `updated_at`
  - Foreign Key: `itinerary_id` (itineraries) ON DELETE CASCADE
  - Indexes: `idx_bookings_booking_id`, `idx_bookings_client_name`, `idx_bookings_travel_date`, `idx_bookings_reminder_date_balance`

#### **Vendor Management**

- `**vendors**` — Vendor profiles (hotels, tour operators, transport, etc.)
  - Key Columns: `id` (UUID), `org_id`, `user_id` (creator), `name`, `contact_person`, `email`, `phone`, `address`, `city`, `country`, `categories` (TEXT or ARRAY), `created_at`, `updated_at`
  - Foreign Keys: `org_id` (organizations), `user_id` (users) ON DELETE CASCADE
  - Indexes: `idx_vendors_name`, `idx_vendors_user_id`
- `**vendor_contacts**` — Multiple contacts per vendor
  - Key Columns: `id` (UUID), `vendor_id`, `contact_name`, `email`, `phone`, `role`, `created_at`
  - Foreign Key: `vendor_id` (vendors) ON DELETE CASCADE
  - Index: `idx_vendor_contacts_vendor_id`

#### **Payment Management (Dual-Ledger System)**

- `**client_payments**` — Track all payments received from clients
  - Key Columns:
    - `id` (UUID)
    - `booking_id` (TEXT) — links to bookings
    - `client_name`, `payment_date`, `payment_type`
    - `amount`, `payment_mode` (Bank Transfer, Cash, Card, etc.)
    - `reference_utr` — payment reference/UTR
    - `package_name`, `remarks`
    - `created_at`, `updated_at`
  - Foreign Key: `booking_id` (bookings)
  - Indexes: `idx_client_payments_booking`, `idx_client_payments_booking_amount`
  - **Trigger**: `trg_client_payments_sync` — syncs totals back to `bookings.received_from_client`
- `**vendor_payments**` — Track all payments made to vendors
  - Key Columns:
    - `id` (UUID)
    - `booking_id` (TEXT)
    - `client_name`, `vendor_name`, `date_paid`
    - `amount_paid`, `payment_mode`, `reference_utr`, `package_name`, `remarks`
    - `created_at`, `updated_at`
  - Foreign Key: `booking_id` (bookings)
  - Indexes: `idx_vendor_payments_booking`, `idx_vendor_payments_booking_amount`
  - **Trigger**: `trg_vendor_payments_sync` — syncs totals back to `bookings.paid_to_vendor`

---

### Database Functions (PL/pgSQL)

#### **Payment Functions**

1. `**add_client_payment()**`
  - **Signature**: `add_client_payment(booking_id TEXT, client_name TEXT, payment_date DATE, payment_type TEXT, amount NUMERIC, payment_mode TEXT, reference_utr TEXT, package_name TEXT, remarks TEXT)`
  - **Returns**: `payment_id UUID, booking_selling_price NUMERIC, received_from_client NUMERIC, balance_due NUMERIC`
  - **Logic**:
    - Locks booking row for atomicity
    - Inserts payment into `client_payments`
    - Updates `bookings.received_from_client` += amount
    - Returns payment confirmation with updated balance
  - **Error Handling**: Throws `BOOKING_NOT_FOUND` if booking doesn't exist
2. `**add_vendor_payment()**`
  - **Signature**: `add_vendor_payment(booking_id TEXT, client_name TEXT, vendor_name TEXT, date_paid DATE, amount_paid NUMERIC, payment_mode TEXT, reference_utr TEXT, package_name TEXT, remarks TEXT)`
  - **Returns**: `payment_id UUID, vendor_cost NUMERIC, paid_to_vendor NUMERIC, balance_due NUMERIC`
  - **Logic**: Similar to client payment, but tracks vendor payables
  - **Error Handling**: Throws `BOOKING_NOT_FOUND` if booking doesn't exist

#### **Booking Management Functions**

3. `**convert_itinerary_to_booking()**`
  - **Signature**: `convert_itinerary_to_booking(itinerary_id UUID, created_by UUID, selling_price NUMERIC, vendor_cost NUMERIC, phone TEXT, whatsapp TEXT, travel_date DATE, guests INTEGER, notes TEXT)`
  - **Returns**: `booking_id TEXT, itinerary_id UUID, selling_price NUMERIC, vendor_cost NUMERIC, created_at TIMESTAMPTZ`
  - **Logic**:
    - Validates itinerary exists and is in `Published` status
    - Generates atomic booking ID (JG-XXXX format) using `booking_id_seq`
    - Creates booking record with initial balances
    - Updates itinerary status to `Converted`
  - **Error Handling**:
    - `ITINERARY_NOT_FOUND` — if itinerary doesn't exist
    - `ITINERARY_NOT_PUBLISHED` — if status != 'Published'
4. `**get_booking_details()**`
  - **Signature**: `get_booking_details(booking_id VARCHAR) → booking_details_row`
  - **Returns**: Comprehensive booking record with:
    - Basic info: `booking_id`, `client_name`, `vendor_name`, `package_name`, `travel_date`
    - Financial summary: `selling_price`, `received_from_client`, `client_balance_due`, `vendor_cost`, `paid_to_vendor`, `vendor_balance_due`
    - Status: `client_status`
    - Payment histories as JSONB:
      - `client_payments` — array with id, payment_date, payment_type, amount, payment_mode, reference_utr, running_total, remarks
      - `vendor_payments` — array with id, date_paid, vendor_name, amount_paid, payment_mode, reference_utr, running_total, remarks
  - **Logic**:
    - Recalculates totals from payment logs for 100% accuracy
    - Syncs back to bookings table
    - Returns enriched data with JSON payment histories including running totals
  - **Purpose**: Single query to get complete booking financial picture

#### **Dashboard Function**

5. `**get_dashboard_summary(p_user_id, p_org_id, p_is_admin)**`
  - **Signature**: `get_dashboard_summary(p_user_id integer, p_org_id integer, p_is_admin boolean)`
  - **Returns**: Table with:
    - `total_bookings`, `pending_bookings`, `confirmed_bookings`, `completed_bookings`, `cancelled_bookings`
    - `**total_itineraries**`: Total count of itineraries (including those not converted to bookings).
    - `total_selling_price`, `total_received`, `total_vendor_cost`, `total_paid_to_vendor`
    - `client_balance_due`, `vendor_balance_due`, `gross_profit`, `net_profit`, `unrealised_profit`
    - `collection_rate`, `vendor_pay_rate`
  - **Logic**:
    - Uses a `**LEFT JOIN**` between `itineraries` and `bookings` to include all itineraries, even those without bookings.
    - Counts `**total_itineraries**` using `COUNT(DISTINCT i.id)`.
    - Filters by `org_id` or `user_id` based on `p_is_admin`.
  - **Purpose**: Provides a comprehensive summary of bookings and itineraries for the dashboard.

#### **Utility Functions**

6. `**sync_booking_payments()**`
  - **Purpose**: Trigger function (via `trg_client_payments_sync` and `trg_vendor_payments_sync`)
  - **Logic**: Called automatically after INSERT/UPDATE/DELETE on payment tables
  - **Action**: Recalculates and syncs payment totals to bookings table for consistency
  - **Usage**: Ensures bookings table always reflects actual payment state

---

## Common Development Tasks

---

### Database Queries

#### Retrieve Booking Summary

```sql
SELECT * FROM get_booking_details('JG-0001');
```

Returns complete booking with all payment details and running totals.

#### Add Client Payment

```sql
SELECT * FROM add_client_payment(
  'JG-0001',                    -- booking_id
  'John Doe',                   -- client_name
  '2024-05-15'::DATE,          -- payment_date
  'Advance',                    -- payment_type
  50000,                        -- amount
  'Bank Transfer',              -- payment_mode
  'TXN123456',                  -- reference_utr
  'Bali Package',               -- package_name
  'First installment'           -- remarks
);
```

#### Add Vendor Payment

```sql
SELECT * FROM add_vendor_payment(
  'JG-0001',                    -- booking_id
  'John Doe',                   -- client_name
  'Hotel XYZ',                  -- vendor_name
  '2024-05-16'::DATE,          -- date_paid
  30000,                        -- amount_paid
  'Bank Transfer',              -- payment_mode
  'VTX123456',                  -- reference_utr
  'Bali Package',               -- package_name
  'Hotel payment'               -- remarks
);
```

#### Convert Itinerary to Booking

```sql
SELECT * FROM convert_itinerary_to_booking(
  '550e8400-e29b-41d4-a716-446655440000'::UUID,  -- itinerary_id
  '550e8400-e29b-41d4-a716-446655440001'::UUID,  -- created_by (user_id)
  150000,                                          -- selling_price
  100000,                                          -- vendor_cost
  '+91-9876543210',                                -- phone
  '+91-9876543210',                                -- whatsapp
  '2024-06-01'::DATE,                              -- travel_date
  4,                                               -- guests
  'Family trip'                                    -- notes
);
```

#### Fetch Bookings for a Date Range

```sql
SELECT booking_id, client_name, travel_date, selling_price, received_from_client,
       (selling_price - received_from_client) as balance_due
FROM bookings
WHERE travel_date BETWEEN '2024-06-01' AND '2024-06-30'
ORDER BY travel_date;
```

#### Find Unpaid Balances

```sql
SELECT booking_id, client_name, selling_price, received_from_client,
       (selling_price - received_from_client) as client_balance,
       vendor_cost, paid_to_vendor,
       (vendor_cost - paid_to_vendor) as vendor_balance
FROM bookings
WHERE (selling_price - received_from_client) > 0
   OR (vendor_cost - paid_to_vendor) > 0
ORDER BY reminder_date;
```

#### List All Vendors for Organization

```sql
SELECT v.id, v.name, v.contact_person, v.email, v.phone, v.categories,
       (SELECT COUNT(*) FROM vendor_contacts WHERE vendor_id = v.id) as contact_count
FROM vendors v
WHERE v.org_id = '<org-uuid>'
ORDER BY v.name;
```

---

#### Itinerary Management Queries

##### Insert a New Itinerary with `.md` Content

```sql
-- Step 1: Insert itinerary metadata
INSERT INTO itineraries (id, user_id, org_id, status)
VALUES (uuid_generate_v4(), $1, $2, 'Draft')
RETURNING id;

-- Step 2: Insert .md content
INSERT INTO itinerary_contents (id, itinerary_id, content_type, content)
VALUES (uuid_generate_v4(), (SELECT id FROM itineraries WHERE id = $3), 'source_md', $4);
```

##### Fetch Itinerary Metadata (Fast)

```sql
SELECT id, title, status, created_at
FROM itineraries
WHERE org_id = $1;
```

##### Fetch Itinerary with `.md` Content (Lazy Loading)

```sql
SELECT
    i.id, i.title, i.status,
    ic.content AS source_md
FROM itineraries i
LEFT JOIN itinerary_contents ic ON i.source_md_id = ic.id AND ic.content_type = 'source_md'
WHERE i.id = $1;
```

##### Update `.md` Content

```sql
UPDATE itinerary_contents
SET content = $1, updated_at = NOW()
WHERE itinerary_id = $2 AND content_type = 'edited_md'
RETURNING *;
```

##### Delete an Itinerary (Cascades to `itinerary_contents`)

```sql
DELETE FROM itineraries
WHERE id = $1 AND user_id = $2
RETURNING id;
```

---

### API Integration Points

**Common endpoints you'll work with:**

1. **Itinerary Management**
  - `POST /api/itineraries` — Create new itinerary (metadata only)
  - `GET /api/itineraries/:id` — Retrieve single itinerary (metadata only)
  - `PUT /api/itineraries/:id` — Update itinerary metadata
  - `PATCH /api/itineraries/:id/publish` — Publish itinerary (status → Published)
  - `GET /api/itineraries` — List itineraries with filters (status, user_id, org_id)
  - `GET /api/itineraries/:id/md` — Fetch `.md` content for an itinerary
  - `PUT /api/itineraries/:id/md` — Update `.md` content for an itinerary
2. **Booking Management**
  - `POST /api/bookings/convert` — Convert itinerary to booking (calls `convert_itinerary_to_booking()`)
  - `GET /api/bookings/:id` — Retrieve booking details (calls `get_booking_details()`)
  - `GET /api/bookings` — List bookings with filters (date range, client, status)
  - `PUT /api/bookings/:id` — Update booking details (client info, travel date, etc.)
3. **Payment Management**
  - `POST /api/bookings/:id/payments/client` — Add client payment (calls `add_client_payment()`)
  - `POST /api/bookings/:id/payments/vendor` — Add vendor payment (calls `add_vendor_payment()`)
  - `GET /api/bookings/:id/payments` — Get payment history (client + vendor)
  - `DELETE /api/payments/:payment_id` — Remove payment (triggers sync)
4. **Vendor Management**
  - `POST /api/vendors` — Create vendor
  - `GET /api/vendors/:id` — Retrieve vendor
  - `PUT /api/vendors/:id` — Update vendor
  - `POST /api/vendors/:id/contacts` — Add vendor contact
  - `GET /api/vendors` — List vendors with filters
5. **Financial Reports**
  - `GET /api/reports/balance-summary` — Client & vendor balance summary
  - `GET /api/reports/outstanding-payments` — Outstanding balances
  - `GET /api/reports/bookings-by-date` — Bookings grouped by travel date
  - `GET /api/reports/vendor-payables` — Total payables by vendor
6. **PDF Generation**
  - `GET /api/itineraries/:id/pdf` — Download itinerary as PDF (runtime conversion of `.md` → HTML → PDF)

---

## Key Design Patterns

### 1. **Dual-Ledger Payment System**

- Separate `client_payments` and `vendor_payments` tables track inflow and outflow
- `bookings` table maintains denormalized totals (`received_from_client`, `paid_to_vendor`)
- Triggers keep totals in sync after payment modifications
- Advantage: Always get accurate balances and payment histories from single booking record

### 2. **Atomic Booking ID Generation**

- `booking_id_seq` ensures sequential, unique booking IDs (JG-0001, JG-0002, ...)
- Format: `JG-` + LPAD(sequence, 4, '0')
- Generated inside `convert_itinerary_to_booking()` function
- Prevents duplicate IDs even with concurrent conversions

### 3. **Itinerary-to-Booking Conversion**

- Itineraries start as drafts, can be published
- Only published itineraries can convert to bookings
- Status change is atomic: itinerary status → Converted
- Enables templates and multi-booking scenarios from single itinerary

### 4. **Multi-Tenancy via org_id**

- All core tables (users, vendors, itineraries, bookings) include `org_id`
- Database-level isolation; queries should always filter by organization
- Prevents cross-organization data leakage

### 5. **RBAC via role_id + role_permissions**

- Users assigned to roles; roles have permissions
- Use in API middleware to authorize actions
- Permission names: e.g., "create_booking", "edit_vendor", "view_reports"

### 6. **Lazy-Loading Large Content**

- Large `.md` files are stored in a separate table (`itinerary_contents`).
- Metadata (e.g., `title`, `status`) is stored in `itineraries` for fast queries.
- Content is **lazy-loaded** only when needed (e.g., editing or downloading).
- **Benefits**:
  - Faster queries for listing itineraries.
  - Reduced database size.
  - Scalable for large files.

---

## Working with the Code

---

### Setup & Prerequisites

**Backend (Node.js/TypeScript)**

- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`
- Database migrations via [your migration tool, e.g., Flyway, Liquibase, or custom scripts]
- ORM/Query Builder: [Check repo for Prisma, TypeORM, or raw queries]

**Frontend (React)**

- Context/State: [Redux, Zustand, or other]
- API client: [Axios, Fetch, or generated from OpenAPI spec]
- Authentication: JWT tokens from login endpoint

---

### Code Structure (Expected, based on schema)

```bash
src/
├── api/
│   ├── bookings/          -- Booking CRUD and conversion
│   ├── itineraries/       -- Itinerary management
│   │   ├── itineraryService.ts  -- Handles metadata (e.g., status updates)
│   │   └── itineraryContentService.ts  -- Handles `.md` content (e.g., save/fetch from `itinerary_contents`)
│   ├── vendors/           -- Vendor CRUD
│   ├── payments/          -- Client & vendor payment handling
│   ├── reports/           -- Financial reports
│   ├── pdf/               -- PDF generation
│   │   └── pdfService.ts  -- Converts `.md` to HTML to PDF at runtime
│   └── auth/              -- Authentication & RBAC
├── database/
│   ├── functions/         -- PL/pgSQL function definitions
│   ├── migrations/        -- Schema migrations
│   └── seeds/             -- Initial data
├── models/
│   ├── Booking.ts
│   ├── Itinerary.ts
│   ├── Vendor.ts
│   ├── Payment.ts
│   └── User.ts
├── middleware/
│   ├── authMiddleware.ts
│   ├── rbacMiddleware.ts
│   └── errorHandler.ts
└── utils/
    ├── validators.ts
    ├── formatters.ts
    └── errors.ts
```

---

## Common Scenarios

---

### Scenario 1: Creating a Complete Booking Workflow

1. User creates itinerary (POST /api/itineraries)
2. User publishes itinerary (PATCH /api/itineraries/:id/publish)
3. Admin converts to booking with pricing (POST /api/bookings/convert)
4. Client makes first payment (POST /api/bookings/:id/payments/client)
5. Vendor payment triggered (POST /api/bookings/:id/payments/vendor)
6. View balance summary (GET /api/bookings/:id via get_booking_details)

### Scenario 2: Handling Payment Corrections

1. Incorrect payment recorded
2. Delete payment via DELETE /api/payments/:payment_id
3. Trigger automatically recalculates totals via `sync_booking_payments()`
4. Re-add corrected payment
5. Get updated booking via get_booking_details()

### Scenario 3: Vendor Management

1. Create vendor profile (POST /api/vendors)
2. Add multiple contacts (POST /api/vendors/:id/contacts)
3. Assign to bookings during creation
4. Track all payments to vendor
5. Generate vendor payables report (GET /api/reports/vendor-payables)

### Scenario 4: Financial Reporting

1. Query bookings for date range (filters on travel_date)
2. Group by status (received vs outstanding)
3. Calculate totals and balances
4. Generate CSV/PDF reports
5. Export for accounting reconciliation

### Scenario 5: Downloading an Itinerary as PDF

1. User requests PDF download for itinerary `X` (GET /api/itineraries/X/pdf).
2. Backend fetches `.md` content from `itinerary_contents` where `itinerary_id = X` and `content_type = 'edited_md'`.
3. Backend converts `.md` to HTML using `marked`.
4. Backend applies a template (e.g., adds headers, footers, styling).
5. Backend converts HTML to PDF using `puppeteer`.
6. PDF is returned to the user (no HTML stored in DB).

---

## Testing Considerations

---

### Database Testing

- Test `convert_itinerary_to_booking()` with non-Published itinerary (should fail)
- Test concurrent booking conversions (sequence integrity)
- Test payment functions with missing booking (should raise exception)
- Test trigger sync: insert payment → verify booking totals update
- Test lazy-loading of `.md` content: verify metadata queries are fast.

### API Testing

- Validate booking_id format (JG-XXXX)
- Verify multi-tenancy: user from Org A cannot access Org B bookings
- Test RBAC: endpoint returns 403 if user lacks permission
- Test payment validation: amount > 0, date reasonable
- Test PDF generation: verify `.md` → HTML → PDF conversion works.

### Data Integrity

- Verify balance calculations: selling_price = received + balance
- Verify vendor balance: vendor_cost = paid + balance
- Verify running totals in JSONB payment arrays
- Test cascading deletes: delete itinerary → verify `itinerary_contents` rows are also deleted.

---

## Important Notes

---

### Column Naming Consistency

- Payment table uses `amount_paid` (vendor) vs `amount` (client) — be aware of this in queries
- Booking has `received_from_client` but vendor has `paid_to_vendor` — different semantics

### Payment Synchronization

- If you directly insert into `client_payments` or `vendor_payments` bypassing the functions, the trigger will still sync totals
- However, **always use the functions** (`add_client_payment`, `add_vendor_payment`) for consistency and audit trails

### Booking ID Format

- Booking IDs are **not UUIDs** — they're text (JG-0001, etc.)
- Always use TEXT type for `booking_id` in queries and foreign keys
- `itinerary_id` and payment IDs are UUIDs

### Reminders & Follow-ups

- `bookings.reminder_date` is nullable; use for outstanding balance notifications
- Index on reminder_date for efficient queries to find overdue payments

### Status Management

- Itineraries: Draft → Published → Converted
- Bookings: No explicit status in table, but `client_status` field exists for payment status tracking
- Ensure status transitions are validated in API layer

### Content Storage

- `.md` files are stored in `itinerary_contents` (not in `itineraries`).
- Use `source_md_id` and `edited_md_id` in `itineraries` to reference the content.
- HTML is **not stored** in the database; it is generated at runtime for PDF downloads.

---

## Bugs Fixed (May 2026)

The following issues identified in the validation report were resolved:

### 1. Missing migration: `phase0_organizations.sql` (Critical)

`backend/migrations/phase0_organizations.sql` was created. It uses `IF NOT EXISTS` guards so it is safe to re-apply on any database state. Run this **first**, before all other migrations.

- Creates `organizations` table (id, name, slug, is_active, created_at)
- Creates `organization_profiles` table (org_id PK, account_name, account_number, ifsc_code, upi_id, address, phone, email, terms, logo_data, updated_at)
- `ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id`
- `ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS org_id`
- `ALTER TABLE vendors ADD COLUMN IF NOT EXISTS org_id`
- Adds indexes on all three `org_id` columns

### Migration Run Order (fresh database)

1. `phase0_organizations.sql` — creates orgs + adds org_id columns
2. `add_vendors.sql` — creates vendors/vendor_contacts tables
3. `phase1_security.sql` — scoped dashboard function
4. `phase2_multi_tenancy.sql` — seeds default org, updates dashboard function
5. `phase3_agency_settings.sql` — any subsequent settings migrations
6. **New:** `itinerary_contents.sql` — creates `itinerary_contents` table for storing `.md` files.

### 2. `registerUser` now assigns `org_id` (Critical)

`backend/src/services/authService.ts` — `registerUser()` now accepts `orgId: number = 1` as a 6th parameter and includes it in the INSERT. The `POST /api/auth/register` route reads `orgId` from the request body and passes it through.

### 3. `settings.ts` transaction fixed (High)

`backend/src/routes/settings.ts` — The `PUT /api/settings` handler now acquires a dedicated `pool.connect()` client and runs `BEGIN`/`COMMIT`/`ROLLBACK` on that single client. The client is always released in a `finally` block. This prevents the previous bug where `pool.query('BEGIN')` and `pool.query('COMMIT')` could be dispatched to different pool connections.

### 4. `generateReceiptPDF` respects admin/org scope (High)

`backend/src/services/pdfService.ts` — The ownership check now uses a role-aware scope condition (matching the pattern in `bookingService.ts`):

- `roleId === 1` (Admin) → `i.org_id = $2` scoped to the admin's org
- All other roles → `i.user_id = $2` scoped to the user's own itineraries

Admins can now generate receipts for bookings created by any staff member in their org.

### 5. Itinerary HTML title uses org name from DB (Normal)

`backend/src/routes/itineraries.ts` — The `PUT /:id` handler now queries `SELECT name FROM organizations WHERE id = $1` using the current user's `orgId` from context, and uses the result as the `{{title}}` placeholder in the itinerary HTML template. Falls back to `'Journey Guide'` if the org is not found.

---

## Recent Changes

### May 2026

- **Database Optimization**:
  - Added `itinerary_contents` table to store `.md` files separately from metadata.
  - Removed `source_content`, `content`, and `html_content` columns from `itineraries`.
  - Added `source_md_id` and `edited_md_id` to `itineraries` as references to `itinerary_contents`.
- **PDF Generation**:
  - Switched to **runtime conversion** of `.md` → HTML → PDF.
  - Removed stored HTML from the database (optimizes storage and performance).
  - Uses `marked` for `.md` → HTML and `puppeteer` for HTML → PDF.
- **Dashboard Updates**:
  - Updated `get_dashboard_summary` to include `total_itineraries` (counts all itineraries, including non-converted ones).
  - Uses `LEFT JOIN` to include itineraries without bookings.