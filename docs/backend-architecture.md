# StitchFlow — Backend Architecture

## 1. System Overview

StitchFlow's backend extends the existing Expo React Native mobile app into a secure, multi-factory production intelligence platform using:

- **API Layer**: NestJS (TypeScript, REST `/api/v1/`, Swagger/OpenAPI, `class-validator` DTOs)
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth (JWT) + Row Level Security (RLS) + Supabase Storage + Realtime
- **Caching & Rate Limiting**: Redis (master data caching, short-lived profile/permission cache with instant invalidation, login/API rate limiting, graceful fallback to PostgreSQL if Redis is unavailable)
- **Mobile Offline Queue**: Expo SQLite durable queue with client event IDs, idempotency keys, and bounded exponential retry

```text
[Expo React Native App]
   ├── TanStack React Query + Api*Repository (Online)
   ├── Expo SQLite Offline Queue (Offline -> POST /api/v1/sync)
   └── Supabase Auth Session (JWT) + Realtime Subscriptions
          │
          ▼ HTTPS + Bearer JWT
[NestJS Backend (/api/v1/)]
   ├── JwtAuthGuard (Supabase JWT verification + active profile check)
   ├── RbacGuard + FactoryScopeGuard (Permissions + Org/Factory/Unit/Line isolation)
   ├── Redis Cache / Rate Limiter (Graceful degradation on outage)
   ├── Domain Modules (Auth, Users, Orgs, Factories, Masters, Jobs, Production, QC, Inventory, Packing, Intelligence)
   └── AuditInterceptor (Append-only audit_logs)
          │
          ▼ Parameterized SQL / Supabase
[Supabase PostgreSQL + RLS + Storage + Realtime]
```

## 2. Backend Module Layout (`backend/src/`)

- `config/` — Typed environment validation (`PORT`, `SUPABASE_*`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`)
- `database/` — PostgreSQL pool (`pg`) + Supabase client wrapper + transactional query runner
- `common/` — `JwtAuthGuard`, `PermissionsGuard`, `FactoryScopeGuard`, `@CurrentUser()`, `@RequirePermissions()`, `@Public()`, global HTTP exception filter with i18n-friendly `errorCode`s
- `modules/redis/` — Redis cache & rate-limit service with graceful degradation
- `modules/auth/` — Login, controlled employee registration (`pending` state), password reset, token refresh, logout, `/auth/me`
- `modules/users/` — Employee approval, suspension, role assignment, audit-logged permission cache invalidation
- `modules/organizations/` & `modules/factories/` — Multi-factory hierarchy (`Organization -> Factory -> Unit -> Department -> Production Line -> Workstation`)
- `modules/audit/` — Append-only `audit_logs` service & query endpoints for MD/FM/Supervisors
- `modules/health/` — `GET /api/v1/health` (DB & Redis readiness probe)
