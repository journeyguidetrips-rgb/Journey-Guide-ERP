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

All migration files use `IF NOT EXISTS` / `ON CONFLICT` guards and are safe to re-apply.

---

## Architecture

### Data Flow

```
Frontend (React/Zustand) --> Vite proxy --> Express API --> PostgreSQL
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
- `services/` — All DB queries and business logic: `authService`, `itineraryService`, `bookingService`, `vendorService`, `pdfService`
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
- `services/` — Axios wrappers (no business logic): `bookingService`, `itineraryService`, `vendorService`, `settingsService`
- `types/` — Shared TypeScript interfaces: `finance.ts`, `itinerary.ts`, `booking.ts`, `vendor.ts`
- `utils/formatters.ts` — Currency, date, and display formatting

---

## Key Domain Concepts

**Itinerary lifecycle**: `Draft` → `Published` → `Converted` (when converted to a booking). Revert removes the booking and associated payments, setting status back to `Published`.

**Booking payments**: `bookings` table caches running totals (`received_from_client`, `paid_to_vendor`), but these are always recomputed from `client_payments` / `vendor_payments` aggregate sums on read. Always trust the aggregated calculation.

**Dashboard**: Powered by the PostgreSQL function `get_dashboard_summary(p_user_id, p_org_id, p_is_admin)`. Admins see all org bookings; staff see only their own. **Now includes `total_itineraries` to count all itineraries, including those not converted to bookings.**

**Multi-tenancy**: `users`, `itineraries`, and `vendors` all carry `org_id`. Services must always filter by `orgId` from `getContext()` to prevent cross-org data leakage.

**Permissions**: String array in the JWT payload and in `RequestContext`. Backend: `authorize(['permission_name'])` middleware. Frontend: `useUserStore.hasPermission()` / `hasAnyPermission()` via `ProtectedRoute`.

**Settings** (`/api/settings`): Admin-only. Reads/writes `organizations.name` and `organization_profiles` (bank details, UPI, address, logo as base64 data URI).

**PDF generation**: `pdfService.ts` uses Puppeteer to render `backend/templates/itinerary.html`. The `marked` library converts Markdown content to HTML before template injection.

---

## Recent Changes

### May 2026

- Updated `get_dashboard_summary` to include `total_itineraries` (counts all itineraries, including those not converted to bookings).
- Changed `INNER JOIN` to `LEFT JOIN` for `bookings` in the function to ensure all itineraries are counted.