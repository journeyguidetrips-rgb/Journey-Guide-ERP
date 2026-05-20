## Validation Report: Journey Guide ERP Restructure

### What's Completed ✅

All phases from the plan were substantially implemented:

| Phase | Item | Status |
|---|---|---|
| 1.1 | Ownership checks on all booking/payment endpoints | ✅ Done via `ownershipCheck` + `itineraryScopeCondition` helpers |
| 1.2 | Per-user/org dashboard | ✅ `get_dashboard_summary(userId, orgId, isAdmin)` |
| 1.3 | Payment query paramIndex bug fix | ✅ paramIndex starts at 2 |
| 1.4 | Rate limiting | ✅ authLimiter (10/15min) + apiLimiter (200/min) |
| 1.5 | Protected uploads | ✅ `/api/files/:filename` with `authenticate` |
| 2.x | Multi-tenancy (orgs, JWT org_id, admin/staff scoping) | ✅ Full implementation |
| 3.1 | Receipt reads from `organization_profiles` | ✅ Done in `pdfService.ts` |
| 3.2 | Agency Settings page | ✅ `frontend/src/pages/Settings.tsx` |
| 4.1 | PDF extraction to `pdfService.ts` | ✅ Done |
| 4.2 | Utility functions centralized | ✅ `utils/formatters.ts` |
| 4.3 | Zod validation middleware | ✅ `validateRequest` + schemas |
| 5.1 | httpOnly cookie JWT | ✅ Done, fallback to Bearer for Postman |
| 5.2 | Refresh token (15min/7day) | ✅ Done |
| 5.3 | Centralized Axios interceptors (401/403/500) | ✅ `frontend/src/services/api.ts` |

---

### Bugs & Gaps Found ❌

#### 1. **Phase 1.6 — Not Done: No proper logger**
`console.log` is still used throughout — `index.ts`, `itineraries.ts`, `authService.ts`, etc. The plan called for `pino` or `winston` with `LOG_LEVEL=error` in production. This is the only full phase item that was skipped.

#### 2. **Critical — Missing migration: `organizations` and `organization_profiles` tables never created**
`add_vendors.sql` creates `vendors`/`vendor_contacts` only. `phase2_multi_tenancy.sql` **inserts into** `organizations` and `organization_profiles` but never **creates** them. The `ALTER TABLE` statements from the plan (adding `org_id` FK columns to `users`, `itineraries`, `vendors`) are also absent. The migrations will fail on a fresh database.

#### 3. **Critical — `registerUser` doesn't assign `org_id`**
`authService.ts:109` — the INSERT into `users` omits `org_id`. New users get `null`, which means their JWT payload has `org_id: undefined`, breaking the admin org-scoping. Fix: the register endpoint needs to accept an `org_id` or default to a specific org.

#### 4. **Bug — `generateReceiptPDF` ignores admin/org scope**
`pdfService.ts:46–52` uses `i.user_id = $2` (staff-only check) instead of the role-aware `itineraryScopeCondition`. An admin user cannot generate a receipt for a booking created by their staff — they'll get "Booking not found".

#### 5. **Bug — `settings.ts` transaction is unsafe**
`settings.ts:51–85` calls `pool.query('BEGIN')` / `pool.query('COMMIT')` directly on the pool. The pool can dispatch each query to a different connection, so `BEGIN` and `COMMIT` may not wrap the same transaction. It must use a dedicated `pool.connect()` client, like every other transactional service does.

#### 6. **Itinerary HTML title is hardcoded**
`itineraries.ts:156` — `.replace('{{title}}', 'Journey Guide')`. The company name should come from `organization_profiles`, just like the receipt does.

---

### Design Pattern Suggestions for ERP Architecture

The code is already clean (thin routes → services → DB), but ERP systems have additional requirements. Here's what would make this production-grade:

#### 1. **Custom Error Classes (Domain Errors)**

Currently every service throws `new Error('Booking not found')` and every route catches it generically. Define error types:

```ts
// src/errors/domainErrors.ts
export class NotFoundError extends Error {
  constructor(entity: string) { super(`${entity} not found`); this.name = 'NotFoundError'; }
}
export class ForbiddenError extends Error { ... }
export class ValidationError extends Error { ... }
```

Then in routes, map error types to HTTP status codes in the error middleware — instead of every route handler deciding `400 vs 404`.

#### 2. **Repository Pattern (separate SQL from business logic)**

Currently services contain both business logic and raw SQL. For a growing ERP, split these:

```
services/bookingService.ts       ← business rules only
repositories/bookingRepository.ts ← all SQL queries
```

This makes testing business logic possible without a database.

#### 3. **Audit Log Table**

ERP systems need a tamper-evident record of who did what. Add:

```sql
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  org_id     INTEGER,
  user_id    INTEGER,
  entity     VARCHAR(50),   -- 'booking', 'payment', etc.
  entity_id  TEXT,
  action     VARCHAR(20),   -- 'CREATE', 'UPDATE', 'DELETE'
  diff       JSONB,         -- what changed
  created_at TIMESTAMP DEFAULT NOW()
);
```

Wrap mutations in a service layer that always writes an audit row inside the same transaction.

#### 4. **Structured Error Responses (RFC 7807 Problem Details)**

Standardize all API errors to a single shape:

```json
{ "type": "not_found", "title": "Booking Not Found", "status": 404, "detail": "..." }
```

This gives the frontend a machine-readable `type` field to drive UI decisions rather than parsing error strings.

#### 5. **Environment-aware Logging (replace all `console.log`)**

Install `pino` (fast, structured, JSON output) and replace all `console.log`/`console.error` with:

```ts
import pino from 'pino';
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
// logger.info({ bookingId }, 'Payment recorded')
// logger.error({ err }, 'DB query failed')
```

This unblocks Phase 1.6 and gives you searchable JSON logs in production.

---

### Priority Order for the Remaining Work

| Priority | Item | Risk |
|---|---|---|
| 🔴 Critical | Write the missing `CREATE TABLE organizations/organization_profiles` + `ALTER TABLE` migration | Fresh deployments will fail |
| 🔴 Critical | Fix `registerUser` to assign `org_id` | New users can't be scoped |
| 🔴 High | Fix `settings.ts` transaction (use pool client) | Data corruption risk under load |
| 🟡 High | Fix `generateReceiptPDF` to respect admin scope | Admin receipt generation broken |
| 🟡 High | Add proper logger (Phase 1.6) | Production logs unusable |
| 🟢 Normal | Custom error classes + error middleware | Code quality |
| 🟢 Normal | Audit log table | ERP compliance |
| 🟢 Normal | Pull org name into itinerary HTML | White-label completeness |