# [CLAUDE.md](http://CLAUDE.md)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Journey Guide ERP is a travel agency management system. It manages itineraries, bookings, client/vendor payments, watermarking flyers, and airport placard generation. It is multi-tenant: every user belongs to an `organization`, and data is scoped accordingly.

---

## Development Commands

### Backend (run from `backend/`)

```bash
npm run dev       # Start dev server with hot reload (ts-node-dev) on port 5000
npm run build     # Compile TypeScript to dist/
npm run start     # Run compiled output
npm run lint      # ESLint on src/**/*.ts
npm run format    # Prettier on src/**/*.ts
```

### Frontend (run from `frontend/`)

```bash
npm run dev       # Start Vite dev server on port 3000
npm run build     # tsc + vite build
npm run preview   # Preview production build
npm run lint      # ESLint on src/**/*.{ts,tsx}
npm run format    # Prettier on src/**/*.{ts,tsx}
```

### Docker (run from root)

```bash
docker-compose up -d        # Start all services (db, backend, frontend)
docker-compose down         # Stop all services
docker-compose logs backend # View backend logs
```

---

## Environment Setup

**Backend** (`backend/.env`):

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/travel_erp
JWT_SECRET=your-secret-key-here
FILE_UPLOAD_DIR=./uploads
LOG_DIR=./logs
ALLOWED_ORIGINS=http://localhost:3000
```

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:5000/api
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`, so during development the frontend makes relative `/api/...` calls without needing `VITE_API_URL`.

The database supports both local PostgreSQL and Neon (cloud). SSL is auto-detected: if `DATABASE_URL` contains `sslmode`, SSL is enabled with `rejectUnauthorized: false`.

---

## Database Migrations

Migrations live in `backend/migrations/` and must be applied in order on a fresh database:

1. `travel_erp.sql` — base schema (tables: users, roles, permissions, itineraries, bookings, client_payments, vendor_payments)
2. `phase0_organizations.sql` — organizations + organization_profiles tables; adds `org_id` FK to users, itineraries, vendors
3. `phase1_security.sql` — updates `get_dashboard_summary()` to scope by `user_id`
4. `add_vendors.sql` — vendors table
5. `phase2_multi_tenancy.sql` — assigns existing data to a default org; updates `get_dashboard_summary(p_user_id, p_org_id, p_is_admin)` for org-level scoping
6. `phase3_agency_settings.sql` — adds `company_name` and `logo_data` columns to `organization_profiles`
7. **New:** `itinerary_contents.sql` — adds `itinerary_contents` table for storing large `.md` files separately.

All migration files use `IF NOT EXISTS` / `ON CONFLICT` guards and are safe to re-apply.

---

## Architecture

### Data Flow

```
Frontend (React/Zustand) --> Vite proxy --> Express API --> PostgreSQL
                                      |
                                      v
                              itineraries (metadata)
                                      |
                                      v
                          itinerary_contents (.md files)
```

### Authentication & Security

**Token model**: Login issues two tokens via `Set-Cookie`:

- `access_token` — httpOnly cookie, 15-minute JWT containing `{ id, email, role_id, org_id, permissions[] }`
- `refresh_token` — httpOnly cookie, 7-day JWT containing `{ userId }`

The frontend `api.ts` Axios instance sends `withCredentials: true` on every request. On a 401 it attempts `POST /api/auth/refresh` (silent refresh), then retries the original request. On repeated failure it hard-redirects to `/login`.

**CSRF**: Double-submit cookie pattern. The server sets a readable `csrf_token` cookie on login. All non-`/api/auth` mutating requests (POST/PUT/DELETE/PATCH) must echo it as the `X-CSRF-Token` header. The `api.ts` interceptor does this automatically.

**Rate limiting**: 200 requests/minute per IP applied to all `/api` routes via `express-rate-limit`.

**Auth strategy**: Pluggable via `setAuthStrategy(new JwtStrategy())` in `index.ts`. To swap auth mechanisms (e.g. OAuth), implement `AuthStrategy` from `backend/src/auth/strategy.ts` and pass it to `setAuthStrategy`.

**File serving**: Uploaded files are served at `/api/files/:filename` — this route requires authentication and strips path-traversal attempts.

### Request Context

Services access the authenticated user via `AsyncLocalStorage`, not `req.user`. The `authenticate` middleware calls `runWithContext(ctx, next)` once per request. Services call `getContext()` to retrieve `{ userId, email, roleId, orgId, permissions }`.

```typescript
import { getContext } from '../context/requestContext';
const { userId, orgId } = getContext();
```

Never pass user identity as function parameters — always use `getContext()`.

---

### Backend Structure (`backend/src/`)

- `index.ts` — Express app: CORS, cookie-parser, CSRF middleware, rate limiter, route mounting
- `auth/strategy.ts` — `AuthStrategy` interface; `auth/jwtStrategy.ts` — cookie/header JWT resolution
- `context/requestContext.ts` — `AsyncLocalStorage` store: `runWithContext`, `getContext`
- `database/connection.ts` — PostgreSQL pool singleton
- `middleware/authMiddleware.ts` — `authenticate` (resolves strategy + sets context), `authorize(perms[])`, `isAdmin` (role_id === 1)
- `middleware/validateRequest.ts` — Zod schema validation middleware
- `schemas/` — Zod request schemas (`bookingSchemas.ts`, `itinerarySchemas.ts`)
- `routes/` — Thin handlers delegating to services: `auth`, `itineraries`, `bookings`, `vendors`, `settings`
- `services/` — All DB queries and business logic: `authService`, `itineraryService`, `bookingService`, `vendorService`, `pdfService`, `**itineraryContentService**`
- `templates/` — HTML templates rendered by Puppeteer for PDF generation

---

### Frontend Structure (`frontend/src/`)

- `services/api.ts` — Single shared Axios instance with CSRF interceptor and 401 refresh/retry logic; all other services import from here
- `stores/userStore.ts` — Zustand auth store; `loadFromStorage()` hydrates by calling `GET /api/auth/me` on app mount (no localStorage)
- `App.tsx` — Root routing: shows only `/login` when unauthenticated; authenticated users get Sidebar + Navbar with permission-gated routes
- `pages/` — `Dashboard`, `Finance`, `Itineraries`, `Vendors`, `Settings`, `Watermark`, `Placards`, `Logs`
- `components/finance/` — Tab components for Finance page: `DashboardTab`, `BookingsTab`, `PaymentsTab`, `BookingDetailsModal`, `PaymentDetailModal`, `ClientPaymentModal`, `VendorPaymentModal`
- `components/itineraries/` — `ItineraryCard`, `EditorModal`, `UploadModal`, `ConvertModal`, `FilterBar`
- `components/shared/` — `VendorAutocomplete`, `StatusBadge`
- `hooks/useFinance.ts`, `hooks/useItineraries.ts` — Data fetching with pagination via `pageRef`/`hasMoreRef`/`fetchLock` refs to prevent double-fetches
- `services/` — Axios wrappers (no business logic): `bookingService`, `itineraryService`, `vendorService`, `settingsService`, `**itineraryContentService**`
- `types/` — Shared TypeScript interfaces: `finance.ts`, `itinerary.ts`, `booking.ts`, `vendor.ts`
- `utils/formatters.ts` — Currency, date, and display formatting

---

## Database Schema

### Core Tables

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
- `**itinerary_contents**` — Stores large `.md` files separately from metadata to optimize performance.
  - Columns:
    - `id` (UUID, primary key)
    - `itinerary_id` (UUID, foreign key to `itineraries.id` with `ON DELETE CASCADE`)
    - `content_type` (VARCHAR: `'source_md'` or `'edited_md'`)
    - `content` (TEXT: The `.md` file content)
    - `created_at` (TIMESTAMPTZ)
    - `updated_at` (TIMESTAMPTZ)
  - Indexes: `idx_itinerary_contents_itinerary_id`, `idx_itinerary_contents_content_type`

#### **Booking Management**

- `**bookings**` — Converted bookings with dual payment tracking.
  - Key Columns:
    - `booking_id` (TEXT, format: JG-0001, JG-0002, etc.)
    - `itinerary_id` (UUID, foreign key to `itineraries.id`)
    - `client_name`, `vendor_name`, `package_name`
    - `travel_date`, `guests`, `phone`, `whatsapp`, `notes`
    - **Financial**: `selling_price`, `vendor_cost`, `received_from_client`, `paid_to_vendor`
    - `client_status` — Payment status tracking
    - `created_by` (UUID), `created_at`, `updated_at`
  - Foreign Key: `itinerary_id` (itineraries) ON DELETE CASCADE

#### **Payment Management**

- `**client_payments**` — Track all payments received from clients.
- `**vendor_payments**` — Track all payments made to vendors.

---

## Key Domain Concepts

**Itinerary lifecycle**: `Draft` → `Published` → `Converted` (when converted to a booking). Revert removes the booking and associated payments, setting status back to `Published`.

**Content Storage**:

- `.md` files are stored in `itinerary_contents` (not in `itineraries`).
- HTML is generated **at runtime** (not stored) when users download PDFs.

**Booking payments**: `bookings` table caches running totals (`received_from_client`, `paid_to_vendor`), but these are always recomputed from `client_payments` / `vendor_payments` aggregate sums on read. Always trust the aggregated calculation.

**Dashboard**: Powered by the PostgreSQL function `get_dashboard_summary(p_user_id, p_org_id, p_is_admin)`. Admins see all org bookings; staff see only their own. **Now includes `total_itineraries` to count all itineraries, including those not converted to bookings.**

**Multi-tenancy**: `users`, `itineraries`, and `vendors` all carry `org_id`. Services must always filter by `orgId` from `getContext()` to prevent cross-org data leakage.

**Permissions**: String array in the JWT payload and in `RequestContext`. Backend: `authorize(['permission_name'])` middleware. Frontend: `useUserStore.hasPermission()` / `hasAnyPermission()` via `ProtectedRoute`.

**Settings** (`/api/settings`): Admin-only. Reads/writes `organizations.name` and `organization_profiles` (bank details, UPI, address, logo as base64 data URI).

**PDF generation**: `pdfService.ts` uses Puppeteer to render `backend/templates/itinerary.html`. The `marked` library converts Markdown content to HTML before template injection. **No HTML is stored in the database; conversion happens at runtime.**

---

## Content Management

### Saving `.md` Files

- Insert into `itinerary_contents` with `content_type = 'source_md'` or `'edited_md'`.
- Update `itineraries.source_md_id` or `itineraries.edited_md_id` with the new `content_id`.

### Fetching `.md` Files

- Join `itineraries` with `itinerary_contents` to fetch content only when needed (lazy loading).

---

## Recent Changes

### May 2026

- **Database Optimization**:
  - Separated large `.md` content into a new `itinerary_contents` table.
  - Removed `source_content`, `content`, and `html_content` columns from `itineraries`.
  - Added `source_md_id` and `edited_md_id` to `itineraries` as references to `itinerary_contents`.
- **PDF Generation**:
  - Switched to **runtime conversion** of `.md` → HTML → PDF.
  - Removed stored HTML from the database (optimizes storage and performance).
  - Uses `marked` for `.md` → HTML and `puppeteer` for HTML → PDF.
- **Dashboard Updates**:
  - Updated `get_dashboard_summary` to include `total_itineraries` (counts all itineraries, including non-converted ones).
  - Uses `LEFT JOIN` to include itineraries without bookings.