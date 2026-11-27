# Known Limitations

**Last Verified:** 2026-11-27  
**Source of Truth:** Codebase audit (`app/`, `src/`, `backend/src/`) and [testing-report.md](file:///c:/Users/Kathik/Downloads/StitchFlow-main/docs/testing-report.md).

---

## 1. Active Unresolved Limitations

| ID | Description | Impact | Affected Roles | Severity | Current Workaround | Dependencies | Recommended Resolution | Verification Criteria |
|---|---|---|---|---|---|---|---|---|
| **LIM-01** | **Expo SQLite offline queue not installed** | Offline queue uses `AsyncStorage` instead of relational SQLite; less resilient for very large queues | Operator, Supervisor | **Medium** | `offlineQueueService.ts` persists up to batch-replayed `cutting`/`stage` events in `AsyncStorage` | `expo-sqlite` compatible with Expo SDK 58 + native EAS build | Install `expo-sqlite` and migrate `offlineQueueService.ts` storage adapter | Airplane-mode queueing survives app kill & replays to `POST /sync/production` |
| **LIM-02** | **Physical Android & peripheral hardware untested** | Camera/torch low-light scan, USB/BT HID wedge scanner, and ZPL/TSPL thermal printing are unverified on real devices | Operator, QC, Store, Packing, FM | **High** | Verified via TypeScript, Jest, and manual/demo UI flows | Physical Android device, HID scanner, Zebra/TSC printer | Execute physical device checklist in [deployment-guide.md](file:///c:/Users/Kathik/Downloads/StitchFlow-main/docs/deployment-guide.md) | All 4 hardware checklist items pass on preview APK |
| **LIM-03** | **Missing ESLint configuration** | `npm run lint` cannot enforce style/hook lint rules; backend has no `lint` script | Developers | **Low** | `npm run ts-check` enforces strict TypeScript | `.eslintrc` / ESLint flat config | Add root ESLint config and backend lint script | `npm run lint` exits 0 |
| **LIM-04** | **Storage location deactivation pending** | Managers can create and rename locations, but cannot deactivate obsolete locations via API/UI | Factory Manager, Store | **Low** | Rename/avoid selecting unused locations | `PATCH /masters/locations/:id` DTO & SQL update | Add `isActive` toggle to `locations` endpoint and Masters UI | Inactive locations excluded from new handover dropdowns |
| **LIM-05** | **Post-save job route editing unsupported** | Once a job's production route is saved, stages/assignees cannot be modified | Factory Manager | **Medium** | Cancel/hold draft before route save, or verify route carefully before saving | Route versioning & active bundle guard | Add guarded route amendment endpoint for unstarted steps | Amended route updates pending steps without corrupting completed events |
| **LIM-06** | **Partial transfer loss & carrier API outside scope** | Raw transfer discrepancies require full physical return; dispatch has no live freight carrier API | Store / Dispatch, FM | **Low** | Record full return (`POST /transfers/:id/return`) or manual stock count adjustment | Carrier credentials & partial-loss approval policy | Add partial-loss adjustment workflow & optional carrier webhook | Partial loss updates transit balance with FM approval |
| **LIM-07** | **Orphaned QC photo cleanup on SQL rollback** | If Supabase Storage upload succeeds and the DB transaction fails, the unreferenced file remains in the bucket | QC Inspector (Storage) | **Low** | Retry path is deterministic; periodic bucket sweep | Background cleanup job | Add try/catch storage delete on SQL error or scheduled orphan sweep | Failed DB write removes uploaded Storage object |

---

## 2. Resolved Historical Limitations (Archive)

- **Factory card click crash (`md/factory-[id]`)**: Resolved in `e583aab` by creating canonical `app/(app)/md/factory/[id].tsx` and `app/(app)/md/line/[id].tsx` (old route kept as redirect).
- **FM permission conflicts (`canScan`, `canDispatch`)**: Resolved in `src/core/permissions/index.ts` and `FactoryScopeGuard`.
- **Phase 1–6 backend & screen wiring**: All 7 role dashboards, jobs, approvals, bundles, cutting, routed stages, QC, packing, raw inventory, manifests, and reports are now wired to live endpoints when `EXPO_PUBLIC_DEMO_MODE=false`.
