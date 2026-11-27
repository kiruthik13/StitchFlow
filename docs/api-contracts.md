# StitchFlow — REST API Contracts (`/api/v1/`)

**Last Verified:** 2026-11-27  
**Source of Truth:** [backend/src/modules/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/backend/src/modules)

All endpoints return structured JSON and stable `errorCode` keys for frontend `i18n` translation (`en`, `ta`, `hi`). Interactive Swagger/OpenAPI docs are served at `/api/docs`.

## Error Response Contract

```json
{
  "statusCode": 403,
  "errorCode": "ERR_FORBIDDEN_CROSS_FACTORY",
  "message": "Access denied for requested factory scope",
  "timestamp": "2026-11-27T11:00:00.000Z",
  "path": "/api/v1/factories/fac-2/hierarchy"
}
```

## 1. Health, Auth, Users & Audit

| Method | Path | Auth / Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/health` | `@Public()` | Database & Redis readiness probe |
| `POST` | `/api/v1/auth/login` | `@Public()` (Rate-limited) | Supabase Auth email/password login + active profile check |
| `POST` | `/api/v1/auth/register` | `@Public()` (Rate-limited) | Roster-matched employee registration (`account_status = 'pending'`) |
| `POST` | `/api/v1/auth/refresh` | `@Public()` | Refresh access token via Supabase Auth |
| `POST` | `/api/v1/auth/forgot-password` | `@Public()` | Trigger Supabase password recovery email |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke session & clear cached profile |
| `GET` | `/api/v1/auth/me` | Authenticated | Return current profile, assignments, and server-verified permissions |
| `GET` | `/api/v1/users` | `CAN_MANAGE_USERS` | List organization/factory-scoped employees |
| `GET/POST/PATCH` | `/api/v1/users/roster`, `/roster/:employeeId` | `CAN_MANAGE_USERS` | Provision and update pre-enrolled employee roster entries |
| `PATCH` | `/api/v1/users/:id/approval` | `CAN_MANAGE_USERS` | Approve/reject pending employee & assign role/factory/line |
| `PATCH` | `/api/v1/users/:id/status` | `CAN_MANAGE_USERS` | Activate/suspend account |
| `GET` | `/api/v1/audit` | `CAN_VIEW_EXECUTIVE_REPORTS` / Supervisor | Searchable append-only activity log |

## 2. Organization & Multi-Factory Hierarchy

| Method | Path | Auth / Scope | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/organizations/current` | Authenticated | Current organization summary |
| `GET` | `/api/v1/factories` | Authenticated (`FactoryScopeGuard`) | List authorized factories with live metrics (all for MD, assigned for FM/staff) |
| `GET` | `/api/v1/factories/:id/hierarchy` | Authenticated (`FactoryScopeGuard`) | Units, departments, production lines, work orders, workforce, and store summary |
| `GET` | `/api/v1/factories/:id/lines/:lineId` | Authenticated (`FactoryScopeGuard`) | Line capacity, occupancy, active jobs, and output details |

## 3. Jobs, Approvals, Bundles, Barcodes & Masters

| Method | Path | Behavior |
|---|---|---|
| `GET / POST` | `/api/v1/jobs` | List scoped jobs or create draft job (optional `items` with size, color, qty) |
| `GET` | `/api/v1/jobs/:id` | Job detail with confirmed cutting and route summary |
| `PATCH` | `/api/v1/jobs/:id/status` | Hold, resume, or cancel active/draft job |
| `PATCH` | `/api/v1/jobs/:id/close-policy` | Set draft `maxRejectedQuantity` allowance & audit reason |
| `POST` | `/api/v1/jobs/:id/close` | Reconciled job close (enforces order, cutting, inventory, stage, QC, packing, dispatch balance) |
| `GET / POST` | `/api/v1/approvals`, `/approvals/:id/decide` | Paged draft job approvals (`approved` / `rejected` with reason) |
| `GET / POST` | `/api/v1/jobs/:id/bundle-allocation`, `/jobs/:id/bundles` | Remaining per-variant allocation and idempotent bundle creation |
| `GET` | `/api/v1/bundles`, `/bundles/:id` | Scoped bundle list and detail |
| `GET` | `/api/v1/bundles/print-queue`, `/bundles/:id/tag-payload` | Tag print queue and ZPL/TSPL payload generation |
| `POST / GET` | `/api/v1/bundles/:id/reprint`, `/bundles/:id/print-logs` | Audited tag reprint request and print log history |
| `POST` | `/api/v1/barcodes/resolve` | Read-only universal barcode lookup |
| `GET / POST / PATCH` | `/api/v1/masters/:kind`, `/masters/:kind/:id` | Buyers, styles, lines, and specialized masters (`cutting-masters`, `contacts`, `ranks`, `tailor-mappings`, `configs`) |
| `GET / POST / PATCH` | `/api/v1/masters/locations`, `/masters/locations/:id` | Storage locations (code/name edit; deactivation toggle pending) |
| `POST` | `/api/v1/masters/styles/:id/measurement-specs` | Configure POM millimeter limits by style and size |

## 4. Production, Offline Sync, Quality & Evidence

| Method | Path | Behavior |
|---|---|---|
| `GET / POST` | `/api/v1/jobs/:id/route-assignments`, `/jobs/:id/route` | Eligible factory assignments and one-time job route setup |
| `POST` | `/api/v1/production/cutting` | Idempotent cutting output entry for assigned Line Operator |
| `GET / POST` | `/api/v1/production/bundles/:id/route`, `/production/stages/complete` | Caller-scoped route steps and partial/whole-bundle stage completion |
| `GET / POST / PATCH` | `/api/v1/production/issues`, `/issues/:id/resolve`, `/work-assignments` | Machine/production issues and work assignments |
| `POST` | `/api/v1/sync/production` | Replay up to 25 offline cutting/stage events (`confirmed` / `conflict` / `rejected` / `retry`) |
| `GET / POST` | `/api/v1/quality/bundles/:id`, `/quality/inspections` | QC inspection (`inspected = passed + rejected + rework + held`) |
| `GET / POST` | `/api/v1/quality/inline-audits`, `/quality/bundles` | Inline roving audits and QC bundle queue |
| `POST` | `/api/v1/rework/complete`, `/quality/reinspections`, `/quality/releases` | Rework completion, reinspection reallocation, and QC release (`<= passed`) |
| `GET / POST` | `/api/v1/quality/bundles/:id/evidence`, `/measurements`, `/photos`, `/photos/:photoId` | Millimeter measurements and private photo evidence (60s signed URLs) |

## 5. Inventory, Packing, Dispatch, Planning & Reports

| Method | Path | Behavior |
|---|---|---|
| `GET / POST` | `/api/v1/inventory/cut-stock/handovers`, `/output-in`, `/output-out`, `/handovers/:id/decide` | Cut-stock handovers, reservations, and receiver confirmation |
| `POST` | `/api/v1/inventory/cut-stock/handovers/:id/verify-return`, `/approve-return` | Full physical return verification and manager approval |
| `GET / POST` | `/api/v1/inventory/raw/*` | Materials, ledger stock, receipts, issues, inter-factory transfers, discrepancies, returns, physical counts & approvals |
| `GET / POST` | `/api/v1/packing/cartons`, `/cartons` | Carton allocation bounded by QC-released unpacked quantity |
| `GET / POST` | `/api/v1/dispatch/cartons`, `/cartons/:id/{receive,approve,execute}` | Single-carton Store receipt, FM approval, Store execution |
| `GET / POST` | `/api/v1/dispatch/manifests`, `/manifests/:id/{approve,execute,gate-pass,gate-pass.pdf}` | Multi-carton shipment manifests and PDF/JSON gate-pass |
| `GET / PUT` | `/api/v1/planning/{sam,workforce,bottlenecks,delivery-predictions}` | SAM, workforce, rework-aware bottlenecks, delivery predictions |
| `GET / POST` | `/api/v1/analytics/dashboard`, `/analytics/jobs/:id/queues`, `/simulations/what-if` | Role dashboard aggregates, queue clearance, what-if capacity estimate |
| `GET` | `/api/v1/reports/jobs`, `/reports/jobs/export`, `/reports/jobs.pdf`, `/reports/jobs.xls` | Paged job reports and CSV/PDF/XLS exports |
