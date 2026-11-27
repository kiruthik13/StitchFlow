# StitchFlow — Testing & Verification Report

**Test Execution Date:** 2026-11-27  
**Git Commit:** `7b78455` (code unchanged since `e583aab` / `a8d1991`)  
**Environment:** Windows (local workstation), Node.js, TypeScript 6.0 (frontend), NestJS 10 / Jest 29 (backend)

---

## 1. Executed Automated Checks (2026-11-27)

| Check | Command | Result | Details |
|---|---|---|---|
| **Frontend TypeScript** | `npm run ts-check` (`tsc --noEmit`) | **PASSED** (exit 0) | 0 type errors across `app/` and `src/` |
| **Backend Build** | `cd backend && npm run build` (`nest build`) | **PASSED** (exit 0) | Clean NestJS compilation |
| **Backend Unit & Security Suites** | `cd backend && npm test -- --runInBand` | **PASSED** (exit 0) | **17/17 suites passed, 79/79 tests passed** in `39.409 s` |

### Executed Backend Jest Suites (17 Suites / 79 Tests)
1. `test/phase1-security.spec.ts` — Auth guards, RBAC, `FactoryScopeGuard`
2. `test/e2e-app-smoke.spec.ts` — Full `AppModule` OpenAPI route smoke check
3. `test/phase2-completion.spec.ts` — Draft approvals, bundles, barcodes, tag reprints
4. `test/quality-evidence.spec.ts` — POM measurements & private photo evidence
5. `test/phase3-completion.spec.ts` — Production issues & work assignments
6. `test/stock-shipment-report.spec.ts` — Raw stock, shipments, reports
7. `test/cutting-output.spec.ts` — Idempotent cutting output bounds
8. `test/job-closing-and-recovery.spec.ts` — Job close reconciliation & discrepancy returns
9. `test/phase4-completion.spec.ts` — Inline QC audits & quality queues
10. `test/phase5-completion.spec.ts` — Partial loss & gate-pass flows
11. `test/phase6-completion.spec.ts` — SAM, workforce, bottlenecks, delivery prediction
12. `test/cutting-scenario.spec.ts` — What-if cutting capacity simulation
13. `test/cut-stock.spec.ts` — Cut-stock Output In/Out handovers
14. `test/jobs.spec.ts` — Job creation, status transitions, factory scope
15. `test/routed-workflow.spec.ts` — Route setup, stage completion, QC, packing, dispatch
16. `test/employee-enrollment.spec.ts` — Pre-enrolled roster registration & approval
17. `test/document-export.spec.ts` — CSV/PDF/XLS export & formula escaping

> **Test Scope Note**: Backend Jest suites use mocked database/Supabase/Redis dependencies to verify business rules, authorization, quantity bounds, and error codes deterministically without mutating live production data.

---

## 2. Earlier Live API Verification (Commit `e583aab`)

- **Multi-Factory E2E API Checks**: **6/6 checks passed** against the backend (MD factory list, two factory hierarchies, line detail, FM cross-factory 403 block, malformed UUID 400 rejection).

---

## 3. Unexecuted & Pending Verification

| Test / Check | Status | Reason |
|---|---|---|
| **ESLint (`npm run lint`)** | **NOT EXECUTED** | No ESLint configuration file in root; no `lint` script in `backend/package.json`. |
| **Physical Android APK Device Test (4/6/8/12 GB RAM)** | **NOT EXECUTED** | Requires physical Android devices (4 GB min benchmark) to measure ARM64 APK size (`< 50 MB` target), runtime RAM (`< 250 MB` target), cold startup (`< 3s` target), and scroll FPS. |
| **Camera & Torch Barcode Scan** | **NOT EXECUTED** | Requires physical device camera + printed QR/Code-128 tags. |
| **USB/Bluetooth HID Wedge Scanner** | **NOT EXECUTED** | Requires physical HID scanner hardware with `\r`/`\n` suffix. |
| **Thermal Tag Printer (ZPL/TSPL)** | **NOT EXECUTED** | Requires physical Zebra/TSC printer or Print Bridge / RawBT target. |
| **Offline Airplane-Mode Replay (Device)** | **NOT EXECUTED** | Requires physical device offline toggle + `AsyncStorage` queue replay test. |
