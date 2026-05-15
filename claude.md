# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Journey Guide ERP is a travel agency management system. It manages itineraries, bookings, client/vendor payments, watermarking flyers, and airport placard generation.

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

## Environment Setup

**Backend** (`backend/.env`):
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/travel_erp
JWT_SECRET=your-secret-key-here
FILE_UPLOAD_DIR=./uploads
LOG_DIR=./logs
ALLOWED_ORIGINS=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:5000/api
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`, so during development the frontend makes relative `/api/...` calls without needing `VITE_API_URL`.

The database supports both local PostgreSQL and Neon (cloud). SSL is auto-detected: if `DATABASE_URL` contains `sslmode`, SSL is enabled with `rejectUnauthorized: false`.

## Architecture

### Data Flow

```
Frontend (React/Zustand) --> Vite proxy --> Express API --> PostgreSQL
```

Authentication: JWT tokens stored in `localStorage`. The `useUserStore` (Zustand) loads the token on app init and sets it as the default Axios `Authorization` header. All protected API routes use the `authenticate` middleware which validates the JWT and attaches `req.user` (id, email, role_id, permissions[]).

### Backend Structure (`backend/src/`)

- `index.ts` — Express app setup, CORS, middleware registration, route mounting
- `database/connection.ts` — PostgreSQL pool (singleton, exits process on connection failure)
- `routes/` — Thin route handlers; delegate all logic to services
  - `auth.ts` — Login/register
  - `itineraries.ts` — Itinerary CRUD + PDF generation via Puppeteer
  - `bookings.ts` — Booking CRUD, payment recording, dashboard summary
- `services/` — Business logic and all DB queries
  - `authService.ts` — bcrypt password hashing, JWT sign/verify
  - `itineraryService.ts` — Itinerary CRUD with paginated, filtered queries
  - `bookingService.ts` — Booking lifecycle, client/vendor payment recording, dashboard aggregation
- `middleware/authMiddleware.ts` — `authenticate` (JWT check), `authorize` (permission check), `isAdmin` (role_id === 1)
- `templates/` — HTML templates for Puppeteer PDF generation (itinerary, receipt)

### Frontend Structure (`frontend/src/`)

- `App.tsx` — Root routing: unauthenticated users see only `/login`; authenticated users get Sidebar + Navbar layout with permission-gated routes
- `stores/userStore.ts` — Single Zustand store for auth state; exposes `hasPermission`, `hasRole`, `hasAnyPermission` helpers used by `ProtectedRoute`
- `pages/` — One file per top-level route: `Dashboard`, `Finance`, `Itineraries`, `Watermark`, `Placards`, `Logs`
- `components/finance/` — Tab components consumed by `Finance` page: `DashboardTab`, `BookingsTab`, `PaymentsTab`, `BookingDetailsModal`, `ClientPaymentModal`, `VendorPaymentModal`
- `components/itineraries/` — `ItineraryCard`, `EditorModal` (markdown editor), `UploadModal`, `ConvertModal` (itinerary → booking), `FilterBar`
- `hooks/useFinance.ts` — All finance data fetching logic with pagination via `pageRef`/`hasMoreRef`/`fetchLock` refs to prevent double-fetches
- `hooks/useItineraries.ts` — Itinerary list fetching with same pagination pattern
- `services/` — Axios call wrappers (no business logic); one file per domain (`bookingService.ts`, `itineraryService.ts`)
- `types/` — Shared TypeScript interfaces (`finance.ts`, `itinerary.ts`, `booking.ts`)
- `utils/formatters.ts` — Currency, date, and display formatting utilities

### Key Domain Concepts

**Itinerary lifecycle**: `Draft` → `Published` → `Converted` (when converted to a booking). Revert removes the booking and associated payments, setting status back to `Published`.

**Booking payments**: `bookings` table stores running totals (`received_from_client`, `paid_to_vendor`), but these are always recomputed from `client_payments` / `vendor_payments` aggregate sums on read (the stored columns are updated as a cache for performance). Always trust the aggregated calculation, not the stored column directly.

**Dashboard**: Powered by a PostgreSQL function `get_dashboard_summary()` called from `bookingService.getDashboardSummary()`.

**Permissions**: Stored as a string array on the JWT payload and in `req.user.permissions`. Frontend `ProtectedRoute` uses `useUserStore.hasPermission()` / `hasAnyPermission()`. Backend uses `authorize(requiredPermissions[])` middleware.

**PDF generation**: Backend uses Puppeteer to render `backend/templates/itinerary.html` to PDF. The `marked` library converts Markdown content to HTML before injection.
