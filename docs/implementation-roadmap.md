# StitchFlow — Backend Implementation Roadmap

**Status Legend**:
- **Live Verified**: Executed and verified against live infrastructure.
- **Locally Verified**: Compiled and passed automated unit/security tests locally.
- **Implemented**: Code written; awaiting live infrastructure or integration run.
- **Pending**: Scheduled for upcoming phase.
- **Blocked**: Waiting on external credentials or explicit approval.

| Phase | Scope | Status | Verification Evidence |
|---|---|---|---|
| **Phase 0** | Repository audit, integration matrix, schema, API contracts, security model | **Locally Verified** | Audited all `app/` & `src/` modules; documented FM permission conflict |
| **Phase 1** | NestJS foundation, Swagger, Health, Supabase Auth, RBAC, Org/Factory hierarchy, Redis cache/rate-limit, Audit logs, SQL migrations | **Locally Verified** | `nest build` (exit 0), `jest` unit tests pass, frontend `ts-check` (0 errors) |
| **Phase 1.5** | FM permission resolution, SQL RLS hardening, `.env` setup, real frontend Auth integration, Redis live check, Org bootstrap script, Review ZIP | **Live Verified (Redis)** / **Blocked (DB Pooler & Service Role Key)** | Upstash Redis `PING -> PONG` & cache/rate-limit verified; PostgreSQL pooler `DATABASE_URL` (IPv4) & `SUPABASE_SERVICE_ROLE_KEY` required for live DB integration suite |
| **Phase 2** | Master data (`buyers`, `styles`, `lines`, `locations`, `cutting_masters`, `contacts`, `ranks`, `tailor_mappings`, `configurations`), Jobs, Approvals, Bundles, Barcodes, ZPL/TSPL Tag Print, Employee Roster | **Locally Verified** | SQL migrations `0002`, `0004`, `0018`; NestJS endpoints & Jest tests pass |
| **Phase 3** | Universal QR/Barcode resolution, HID & Camera validation, Production events, Cutting entry, Issues, Work assignments | **Locally Verified** | SQL migrations `0005`, `0007`, `0019`; operator screens wired; Jest tests pass |
| **Phase 4** | Independent QC inspections, Inline/Intermediate QC audits, Rework lifecycle, Reinspection, QC release | **Locally Verified** | SQL migrations `0007`, `0012`, `0020`; inspection screens wired; Jest tests pass |
| **Phase 5** | Inventory ledger, Output In/Out & Input In/Out, Cartons, Partial loss recovery, Dispatch & PDF Gate-Pass | **Locally Verified** | SQL migrations `0006`, `0010`, `0013`–`0017`, `0021`; Jest tests pass |
| **Phase 6** | Persisted SAM & Workforce planning, Rework-aware Bottleneck Detection, Calendar Delivery Prediction, What-If Simulation | **Locally Verified** | SQL migration `0022`; planning/MD screens wired; Jest tests pass |
| **Phase 7** | Frontend `Api*Repository` classes, TanStack Query, AsyncStorage durable offline queue + `/sync/production` replay, Supabase Realtime | **Locally Verified** | All 5 `Api*Repository` classes + `OfflineSyncBanner`; `tsc --noEmit` 0 errors |
| **Phase 8** | Full `AppModule` E2E OpenAPI smoke tests, migration runner (`migrate:up`), live E2E checker (`verify:e2e`), deployment guide | **Locally Verified (Code)** / **Pending (Live DB & Device)** | 17 Jest suites pass; live Supabase/Redis & physical Android/printer tests await environment credentials |
| **Phase 9** | Digital Garment Passport, Smart Task Inbox, Production Exception Center, Smart WIP Aging, Shift Handover Intelligence | **Locally Verified** | `workflow-intelligence.service.ts`, 5 Expo Router screens, `phases-9-11-intelligence.spec.ts` |
| **Phase 10** | Employee Skill Matrix, Intelligent Line Balancing, Rework Cost Intelligence, Defect Heatmap, Production Replay | **Locally Verified** | `phase10-intelligence.service.ts`, 5 Expo Router screens, `phases-9-11-intelligence.spec.ts` |
| **Phase 11** | Smart Bundle Split & Merge, Machine Maintenance Intelligence, Fabric Lot Traceability, Smart Carton Optimization, Production Daily Digest | **Locally Verified** | `phase11-optimization.service.ts`, 5 Expo Router screens, `22 suites / 115 tests` pass |

## Current local rollout

Phase 1 enrollment, JWT claim checks and current authorization reads are implemented locally. Review and apply the enrollment and scope migration only in an approved environment. Phase 2 includes buyer, style and job foundation endpoints. Approvals, bundles and other masters remain pending. Live authentication, database migration verification, device benchmarking, realtime and offline sync are pending.

Phase 2 now also includes backend endpoints for draft decisions, bundle allocation, barcode identity lookup and audited tag reprint requests. Phase 3 has a local Cutting Entry API for authorized Line Operators and confirmed cutting totals. Other master screens, frontend integration, printer support, store receiving and later stages remain pending.

## Current implementation increment

Cut-stock locations and two-party Output In/Out handovers are implemented through local APIs. The current what-if calculation covers cutting capacity. Existing Job List, Job Detail, Create Job and Approvals screens now use the API in real sessions, including paged refresh, hold/resume, draft creation and decisions. The current authenticated view omits unwired mock QC, stage and packing details. Scanner, store screens, other role dashboards, reports, realtime and offline sync remain unintegrated.

The current increment adds explicit production route setup, whole-bundle stage records, terminal quality and rework, carton packing, Store receipt and separate dispatch approval/execution. Online scanner roles, cut-stock operations and dispatch now use API data on the connected paths. The workflow still requires actual factory routing/employee configuration, database and device verification, remaining specialist screens and production variants. SQLite install was denied in the current workspace. Private Supabase factory Broadcast is implemented locally with foreground polling fallback for two Store views. Live verification remains pending.

The current rollout adds scoped route and variant allocation UI, reconciled job closing, two-party return verification, queue evidence, measurements and private photo evidence, and live Buyer/Style/Location screens. These paths are implemented locally and await isolated database and mobile verification. SQLite offline replay remains blocked by dependency availability in this workspace, and company-specific master fields and later-stage rules still require factory input.

Raw inventory, physical counts, inter-factory transfer, partial stage output, multi-carton shipment manifests, role dashboards and CSV reports are implemented locally. The production replay API is implemented. The phone's durable queue remains blocked because Expo SQLite is unavailable in the local cache and network installation and permission escalation were denied. Live migration, Realtime and mobile devices still require verification.
