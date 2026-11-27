# StitchFlow — Pending Implementation Register

**Last Verified:** 2026-11-27  
**Source of Truth:** Cross-check of all 19 `docs/` files against `app/`, `src/`, `backend/src/`, and `package.json`.

---

## 1. Mandatory Production-Readiness Items

| ID | Feature / Task | Priority | Business Impact | Technical Dependencies | Affected Roles | Existing Partial Implementation | Recommended Approach | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|
| **PEND-01** | **Physical Android APK Device & Hardware Verification** | **P0 (Mandatory)** | Camera scanning, HID scanners, thermal printing, and offline replay are untested on physical floor devices | EAS preview APK, Android device, USB/BT HID scanner, Zebra/TSC thermal printer | Operator, QC, Store, Packing, FM | `scan.tsx`, `hidScannerAdapter.ts`, `thermalPrinterService.ts`, `offlineQueueService.ts` | Execute all 4 steps of Physical Device Checklist in [deployment-guide.md](file:///c:/Users/Kathik/Downloads/StitchFlow-main/docs/deployment-guide.md) | Camera/torch, HID `\r`/`\n`, thermal tag print, and airplane-mode sync all pass on Android |
| **PEND-02** | **Expo SQLite Durable Offline Queue** | **P1 (High)** | `AsyncStorage` works for small queues but lacks transactional SQLite durability for heavy offline shifts | `expo-sqlite` compatible with Expo SDK 58 + native EAS rebuild | Operator, Supervisor | `offlineQueueService.ts` (`AsyncStorage`) + `POST /sync/production` | Install `expo-sqlite` and swap storage backend in `offlineQueueService.ts` | Queued events survive app force-close & replay deterministically |

---

## 2. Optional / Post-Launch Enhancements

| ID | Feature / Task | Priority | Business Impact | Technical Dependencies | Affected Roles | Existing Partial Implementation | Recommended Approach | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|
| **PEND-03** | **ESLint Configuration & Backend Lint Script** | **P2** | Automated lint enforcement in CI | ESLint v8/v9 flat config, `@typescript-eslint` | Developers | `package.json` has `"lint": "eslint . --ext .ts,.tsx"` without config | Add `.eslintrc.cjs` / `eslint.config.js` and `backend/package.json` lint script | `npm run lint` passes with 0 errors |
| **PEND-04** | **Storage Location Deactivation Toggle** | **P2** | Decommission obsolete racks/locations cleanly | `PATCH /masters/locations/:id` DTO + SQL update | FM, Store | `PATCH /masters/locations/:id` edits `code` and `name` | Add `isActive` boolean to DTO, SQL update, and Masters UI | Inactive locations hidden from new handover selection |
| **PEND-05** | **Post-Save Job Route Editing** | **P2** | Allow route adjustments after initial save if steps haven't started | Route versioning + active bundle event guard | FM | `POST /jobs/:id/route` saves once per job | Add guarded `PATCH /jobs/:id/route` for unstarted steps | Unstarted steps update cleanly; completed steps remain immutable |
| **PEND-06** | **Partial Transfer Loss Recovery** | **P3** | Handle partial transit shrinkage without manual stock count | Transfer discrepancy policy + FM approval | Store, FM | Full return via `POST /inventory/raw/transfers/:id/return` | Add partial-loss write-off endpoint requiring FM approval | Transit balance reconciles with audited loss record |
| **PEND-07** | **External Freight Carrier Integration** | **P3** | Automated AWB / tracking sync with logistics carriers | Carrier API credentials & webhook | Store, MD | Manifest + gate-pass PDF (`shipments.ts`) | Add optional carrier adapter behind dispatch execution | Tracking number & carrier status synced to manifest |
| **PEND-08** | **Orphaned QC Photo Storage Cleanup** | **P3** | Prevent unreferenced files in `stitchflow-qc-evidence` bucket on DB rollback | Supabase Storage admin delete | QC (Infra) | `quality-evidence.ts` uploads photo before SQL insert | Wrap SQL transaction failure in `catch` to delete uploaded object | Failed DB insert leaves 0 orphaned Storage objects |
