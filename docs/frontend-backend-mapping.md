# StitchFlow — Frontend-to-Backend Integration Matrix

**Last Verified:** 2026-11-27  
**Source of Truth:** `app/`, `src/roles/`, `src/features/operations/useLiveDashboardData.ts`, `src/services/`, and `backend/src/modules/`.

---

## 1. Screen-to-API Integration Matrix

| Screen / Route | Service / Repository | API Endpoint (`/api/v1/...`) | Method | Auth & Factory Scope | Demo Status | Live Status |
|---|---|---|---|---|---|---|
| `/(auth)/login` | `authStore` + `apiClient` | `/auth/login`, `/auth/me` | `POST`, `GET` | Public login; JWT active profile check | Verified | Verified |
| `/(auth)/register` | `apiClient` | `/auth/register` | `POST` | Public; requires `employee_enrollment` match | Verified | Implemented |
| `/(auth)/forgot-password` | `apiClient` | `/auth/forgot-password` | `POST` | Public | Verified | Implemented |
| `/(app)/(tabs)/index` (7 Dashboards) | `useLiveDashboardData` | `/analytics/dashboard`, `/factories`, `/jobs` | `GET` | JWT + Role & Factory scope | Verified | Verified |
| `/(app)/(tabs)/work` | `jobRepository`, `qcRepository`, `inventoryRepository` | `/jobs`, `/bundles`, `/quality/bundles`, `/inventory/raw/stock` | `GET` | JWT + Factory/Line scope | Verified | Implemented |
| `/(app)/(tabs)/scan` | `apiClient`, `offlineQueueService`, `hidScannerAdapter` | `/barcodes/resolve`, `/production/cutting`, `/production/stages/complete`, `/sync/production` | `POST` | JWT + `CAN_SCAN_PRODUCTION` (FM lookup-only) | Verified | Implemented (HW pending) |
| `/(app)/(tabs)/reports` | `apiClient` | `/reports/jobs`, `/reports/jobs/export`, `/reports/jobs.pdf`, `/reports/jobs.xls` | `GET` | JWT + `CAN_VIEW_EXECUTIVE_REPORTS` / Role scope | Verified | Implemented |
| `/(app)/md/factory/[id]` | `masterRepository`, `apiClient` | `/factories/:id/hierarchy`, `/jobs` | `GET` | JWT + `MD` (`FactoryScopeGuard`) | Verified | Verified |
| `/(app)/md/line/[id]` | `apiClient` | `/factories/:id/lines/:lineId` | `GET` | JWT + `MD` / scoped `FM` | Verified | Verified |
| `/(app)/md/bottlenecks`, `sam-efficiency` | `apiClient` | `/planning/bottlenecks`, `/planning/sam`, `/simulations/what-if` | `GET`, `POST` | JWT + `MD` | Verified | Implemented |
| `/(app)/jobs/index`, `create`, `[id]` | `jobRepository`, `apiClient` | `/jobs`, `/jobs/:id`, `/jobs/:id/status`, `/jobs/:id/route`, `/jobs/:id/close-policy`, `/jobs/:id/close` | `GET`, `POST`, `PATCH` | JWT + `CAN_MANAGE_JOBS`, `CAN_CLOSE_JOB` | Verified | Implemented |
| `/(app)/approvals/index` | `apiClient` | `/approvals`, `/approvals/:id/decide` | `GET`, `POST` | JWT + `FM` (`CAN_MANAGE_JOBS`) | Verified | Implemented |
| `/(app)/bundles/[id]` | `bundleRepository`, `apiClient` | `/bundles/:id`, `/bundles/:id/reprint`, `/bundles/:id/print-logs` | `GET`, `POST` | JWT + Factory scope | Verified | Implemented |
| `/(app)/operations/[slug]` | `apiClient` | `/production/cutting`, `/production/stages/complete`, `/production/issues`, `/production/work-assignments`, `/inventory/output-in`, `/inventory/output-out` | `GET`, `POST`, `PATCH` | JWT + Stage/Line assignment | Verified | Implemented |
| `/(app)/inspections/*` | `qcRepository`, `apiClient` | `/quality/bundles/:id`, `/quality/inspections`, `/quality/inline-audits`, `/quality/reinspections`, `/quality/releases`, `/quality/bundles/:id/measurements`, `/quality/bundles/:id/photos` | `GET`, `POST` | JWT + `CAN_PERFORM_QC`, `CAN_RELEASE_QC` | Verified | Implemented |
| `/(app)/cartons/*`, `/(app)/packing/*` | `apiClient` | `/cartons`, `/packing/cartons` | `GET`, `POST` | JWT + `CAN_CREATE_CARTON` | Verified | Implemented |
| `/(app)/store/*` | `inventoryRepository`, `apiClient` | `/inventory/raw/*`, `/masters/locations`, `/dispatch/cartons`, `/dispatch/manifests/*` | `GET`, `POST`, `PATCH` | JWT + `CAN_MANAGE_INVENTORY`, `CAN_APPROVE_DISPATCH`, `CAN_EXECUTE_DISPATCH` | Verified | Implemented |
| `/(app)/planning/*` | `apiClient` | `/planning/sam`, `/planning/workforce` | `GET`, `PUT` | JWT + `FM` / `Supervisor` | Verified | Implemented |
| `/(app)/masters/index` | `masterRepository`, `apiClient` | `/masters/buyers`, `/masters/styles`, `/masters/lines`, `/masters/locations`, `/masters/styles/:id/measurement-specs` | `GET`, `POST`, `PATCH` | JWT + `CAN_MANAGE_MASTERS` | Verified | Implemented |
| `/(app)/management/users`, `tags` | `apiClient`, `thermalPrinterService` | `/users`, `/users/roster`, `/users/:id/approval`, `/users/:id/status`, `/bundles/print-queue`, `/bundles/:id/tag-payload` | `GET`, `POST`, `PATCH` | JWT + `CAN_MANAGE_USERS` | Verified | Implemented |

---

## 2. Historical Permission Conflict Resolution Log

During Phase 0, three potential permission mismatches were flagged between `src/core/permissions/index.ts` and `docs/permissions.md`. **All three have been resolved in the codebase:**

1. **Factory Manager — `CAN_SCAN_BARCODE`**: Resolved. In [src/core/permissions/index.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/core/permissions/index.ts), FM has `canLookupBarcode: true` (read-only lookup) and `canScan: false` / `canScanProduction: false`.
2. **Factory Manager — `CAN_DISPATCH`**: Resolved. FM has `canMonitorDispatch: true`, `canApproveDispatch: true`, `canExecuteDispatch: false`, and `canDispatch: false`. Store / Dispatch executes physical dispatch (`canExecuteDispatch: true`).
3. **Supervisor — `CAN_ASSIGN_WORK` / `canApproveRework`**: Resolved. Supervisors have `canApproveRework: true` while `canDoQC` and `canReleasePieces` remain strictly `qc-inspector` only.
