# StitchFlow — Backend Architecture

**Last Verified:** 2026-11-27  
**Source of Truth:** [backend/src/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/backend/src)

---

## 1. System Overview

StitchFlow's backend is a modular NestJS REST API (`/api/v1/`) deployed on Railway, backed by Supabase PostgreSQL + Auth + Storage + Realtime and Upstash Redis:

- **API Layer**: NestJS 10 (TypeScript 5.7, REST `/api/v1/`, Swagger/OpenAPI `@nestjs/swagger`, `class-validator` DTOs, `helmet`).
- **Database & Auth**: Supabase PostgreSQL (`pg` pool + `@supabase/supabase-js`) + Supabase Auth (JWT) + Row Level Security (RLS) + private Supabase Storage (`stitchflow-qc-evidence`) + Supabase Realtime private factory broadcast.
- **Caching & Rate Limiting**: Redis via `ioredis` (tenant-scoped cache and login/API rate limiting with graceful fallback to PostgreSQL if Redis is unavailable).
- **Mobile Offline Queue (Implemented vs Proposed)**:
  - **Implemented**: `AsyncStorage`-backed durable queue ([offlineQueueService.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/services/offline/offlineQueueService.ts)) that stores `cutting` and `stage` events locally and replays them via `POST /api/v1/sync/production`.
  - **Proposed / Not Implemented**: `expo-sqlite` SQLite offline queue (blocked by workspace dependency availability; see [pending-implementation.md](file:///c:/Users/Kathik/Downloads/StitchFlow-main/docs/pending-implementation.md)).

```text
[Expo React Native App]
   ├── TanStack React Query + Api*Repository (Online)
   ├── AsyncStorage Offline Queue (Offline -> POST /api/v1/sync/production)
   └── Supabase Auth Session (JWT) + Private Realtime Subscriptions
          │
          ▼ HTTPS + Bearer JWT
[NestJS Backend (/api/v1/) on Railway]
   ├── JwtAuthGuard (Supabase JWT verification + active profile check)
   ├── PermissionsGuard + FactoryScopeGuard (RBAC + Org/Factory/Unit/Line isolation)
   ├── Redis Cache / Rate Limiter (Graceful degradation on outage)
   ├── Domain Modules (Auth, Users, Orgs, Factories, Jobs, Workflow, Inventory, Planning, Audit, Health)
   └── Append-only audit_logs (transactional writes)
          │
          ▼ Parameterized SQL / Supabase
[Supabase PostgreSQL + RLS + Storage + Realtime]
```

---

## 2. Backend Module Layout (`backend/src/`)

| Path | Responsibility |
|---|---|
| `config/` | Environment validation (`PORT`, `SUPABASE_*`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`) |
| `database/` | PostgreSQL pool (`pg`), Supabase client wrapper, transactional query runner |
| `common/guards/` | `JwtAuthGuard`, `PermissionsGuard`, `FactoryScopeGuard` (checks `baseUrl \|\| originalUrl \|\| path` for `/factories` routes) |
| `common/decorators/` | `@CurrentUser()`, `@RequirePermissions()`, `@Public()` |
| `common/filters/` | Global HTTP exception filter with structured `errorCode` payloads |
| `modules/health/` | `GET /api/v1/health` (DB & Redis readiness probe) |
| `modules/redis/` | Redis cache & rate-limit service with graceful degradation |
| `modules/auth/` | Login, controlled roster-matched registration (`pending`), refresh, password reset, logout, `/auth/me` |
| `modules/users/` | Employee roster CRUD (`/users/roster`), approval/rejection, status updates, permission cache invalidation |
| `modules/organizations/` | `GET /organizations/current` |
| `modules/factories/` | `GET /factories`, `GET /factories/:id/hierarchy`, `GET /factories/:id/lines/:lineId` |
| `modules/jobs/` | Jobs CRUD, close policy & reconciliation, approvals, bundle allocation, barcode resolution, tag print payloads/reprints, cutting output, specialized masters (`cutting-masters`, `contacts`, `ranks`, `tailor-mappings`, `configs`) |
| `modules/workflow/` | Job route setup, production floor (issues, work assignments, stage completion), offline sync replay (`POST /sync/production`), quality inspections/rework/reinspection/releases, inline QC, quality measurements & photo evidence, packing cartons, dispatch cartons & shipment manifests (including gate-pass PDF) |
| `modules/inventory/` | Storage locations, cut-stock handovers (`output-in`, `output-out`, discrepancies, returns), raw-material catalog, stock ledger, receipts/issues, inter-factory transfers, physical counts & adjustments |
| `modules/planning/` | What-if cutting scenario (`POST /simulations/what-if`), SAM & workforce planning, bottleneck detection, delivery predictions, job queue analytics, dashboard summary (`GET /analytics/dashboard`), job reports (JSON, CSV, PDF, XLS) |
| `modules/audit/` | Append-only `audit_logs` query endpoint (`GET /audit`) |
