# Frontend Route Inventory

**Last Verified:** 2026-11-27  
**Source of Truth:** [app/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/app)

All routes use Expo Router v3 file-based routing (`typedRoutes: true` in `app.json`).

---

## 1. Auth & Root Routes

| Route Path | Source File | Authorized Roles | Purpose | Params | API / Data Dependencies | Demo Status | Live Status | Nav Verified |
|---|---|---|---|---|---|---|---|---|
| `/` | `app/index.tsx` | Public | Startup auth/language redirect | — | `useAuthStore` | Verified | Verified | Yes |
| `/(auth)/language-selection` | `app/(auth)/language-selection.tsx` | Public | Select `en` / `ta` / `hi` | — | `useLanguageStore` | Verified | Verified | Yes |
| `/(auth)/login` | `app/(auth)/login.tsx` | Public | Email/password login + 7-role demo picker | — | `POST /auth/login`, `GET /auth/me`, `useAuthStore` | Verified | Verified | Yes |
| `/(auth)/register` | `app/(auth)/register.tsx` | Public | Roster-matched employee registration | — | `POST /auth/register` | Verified | Implemented | Yes |
| `/(auth)/forgot-password` | `app/(auth)/forgot-password.tsx` | Public | Password recovery email | — | `POST /auth/forgot-password` | Verified | Implemented | Yes |

---

## 2. Main Tab Routes (`app/(app)/(tabs)/`)

| Route Path | Source File | Authorized Roles | Purpose | Params | API / Data Dependencies | Demo Status | Live Status |
|---|---|---|---|---|---|---|---|
| `/(app)/(tabs)` | `app/(app)/(tabs)/index.tsx` | All 7 roles | Dispatches to role-specific dashboard | — | `useLiveDashboardData`, `useDemoStore` | Verified | Verified |
| `/(app)/(tabs)/work` | `app/(app)/(tabs)/work.tsx` | All 7 roles | Role-specific daily worklist | — | `jobRepository`, `qcRepository`, `inventoryRepository`, `useDemoStore` | Verified | Implemented |
| `/(app)/(tabs)/scan` | `app/(app)/(tabs)/scan.tsx` | All except MD (FM lookup-only) | Universal camera, manual & HID scanner | — | `POST /barcodes/resolve`, `POST /production/*`, `offlineQueueService` | Verified | Implemented (HW pending) |
| `/(app)/(tabs)/reports` | `app/(app)/(tabs)/reports.tsx` | MD, FM, Sup, QC, Store | Paged job reports & CSV/PDF/XLS export | — | `GET /reports/jobs`, `GET /reports/jobs/export` | Verified | Implemented |
| `/(app)/(tabs)/settings` | `app/(app)/(tabs)/settings.tsx` | All 7 roles | Profile, theme, language, logout | — | `POST /auth/logout`, `useThemeStore`, `useLanguageStore` | Verified | Verified |

---

## 3. Managing Director Routes (`app/(app)/md/`)

| Route Path | Source File | Authorized Roles | Purpose | Params | API / Data Dependencies | Demo Status | Live Status |
|---|---|---|---|---|---|---|---|
| `/(app)/md/factory/[id]` | `app/(app)/md/factory/[id].tsx` | MD | **Canonical** 6-tab Factory Dashboard (Overview, Units, Lines, Orders, Workforce, Store) | `id` | `GET /factories/:id/hierarchy`, `GET /jobs`, `useDemoStore` | Verified | Verified |
| `/(app)/md/line/[id]` | `app/(app)/md/line/[id].tsx` | MD, FM | Production Line detail (occupancy, active jobs, output) | `id`, `factoryId` | `GET /factories/:factoryId/lines/:id`, `useDemoStore` | Verified | Verified |
| `/(app)/md/factory-[id]` | `app/(app)/md/factory-[id].tsx` | MD | **Legacy redirect** to `/(app)/md/factory/[id]` | `id` | Redirect only | Verified | Verified |
| `/(app)/md/bottlenecks` | `app/(app)/md/bottlenecks.tsx` | MD | Rework-aware bottleneck analytics & rebalancing | — | `GET /planning/bottlenecks`, `POST /simulations/what-if` | Verified | Implemented |
| `/(app)/md/sam-efficiency` | `app/(app)/md/sam-efficiency.tsx` | MD | SAM efficiency comparative benchmarks | — | `GET /planning/sam`, `GET /analytics/dashboard` | Verified | Implemented |

---

## 4. Jobs, Approvals & Bundles

| Route Path | Source File | Authorized Roles | Purpose | Params | API / Data Dependencies | Demo Status | Live Status |
|---|---|---|---|---|---|---|---|
| `/(app)/jobs` | `app/(app)/jobs/index.tsx` | MD, FM, Sup | Scoped job list with status filter | — | `GET /jobs` (`jobRepository`), `useDemoStore` | Verified | Implemented |
| `/(app)/jobs/create` | `app/(app)/jobs/create.tsx` | FM | Create draft production job + size/color items | — | `POST /jobs`, `GET /masters/*`, `useDemoStore` | Verified | Implemented |
| `/(app)/jobs/[id]` | `app/(app)/jobs/[id].tsx` | MD, FM, Sup | Job detail, hold/resume, route setup, close | `id` | `GET /jobs/:id`, `PATCH /jobs/:id/status`, `POST /jobs/:id/route`, `POST /jobs/:id/close` | Verified | Implemented |
| `/(app)/approvals` | `app/(app)/approvals/index.tsx` | FM | Approve or reject draft jobs | — | `GET /approvals`, `POST /approvals/:id/decide` | Verified | Implemented |
| `/(app)/bundles/[id]` | `app/(app)/bundles/[id].tsx` | FM, Sup, Op, QC, Pack | Hang-tag bundle detail & reprint request | `id` | `GET /bundles/:id`, `POST /bundles/:id/reprint`, `useDemoStore` | Verified | Implemented |

---

## 5. Operations, QC, Packing, Store & Planning

| Route Path | Source File | Authorized Roles | Purpose | Params | API / Data Dependencies | Demo Status | Live Status |
|---|---|---|---|---|---|---|---|
| `/(app)/operations/[slug]` | `app/(app)/operations/[slug].tsx` | Sup, Op, Store | `cutting-entry`, `sewing-entry`, `kaja-entry`, `ironing-entry`, `input-in`, `input-out`, `output-in`, `output-out`, `report-issue`, `work-assignment`, `tailor-mapping`, `sam-monitor` | `slug` | `POST /production/cutting`, `POST /production/stages/complete`, `POST /production/issues`, `POST /inventory/output-*`, `useDemoStore` | Verified | Implemented |
| `/(app)/inspections/[id]` | `app/(app)/inspections/[id].tsx` | QC Inspector | Bundle QC inspection & release | `id` | `GET /quality/bundles/:id`, `POST /quality/inspections`, `POST /quality/releases` | Verified | Implemented |
| `/(app)/inspections/inline` | `app/(app)/inspections/inline.tsx` | QC Inspector | Inline roving audit | — | `GET/POST /quality/inline-audits` | Verified | Implemented |
| `/(app)/inspections/endline` | `app/(app)/inspections/endline.tsx` | QC Inspector | Endline 100% QC inspection | — | `POST /quality/inspections`, `useDemoStore` | Verified | Implemented |
| `/(app)/inspections/measurement` | `app/(app)/inspections/measurement.tsx` | QC Inspector | POM millimeter tolerance check | — | `GET /quality/bundles/:id/evidence`, `POST /quality/bundles/:id/measurements` | Verified | Implemented |
| `/(app)/inspections/photo-evidence` | `app/(app)/inspections/photo-evidence.tsx` | QC Inspector | Capture defect photo evidence | — | `POST /quality/bundles/:id/photos` | Verified | Implemented (HW pending) |
| `/(app)/inspections/reinspection` | `app/(app)/inspections/reinspection.tsx` | QC Inspector | Reinspection & secondary release | — | `POST /quality/reinspections` | Verified | Implemented |
| `/(app)/cartons/create` | `app/(app)/cartons/create.tsx` | Packing Staff | Create export carton bounded by QC release | — | `POST /cartons`, `useDemoStore` | Verified | Implemented |
| `/(app)/cartons/[id]` | `app/(app)/cartons/[id].tsx` | Packing, Store | Carton barcode label & seal | `id` | `GET /packing/cartons`, `useDemoStore` | Verified | Implemented |
| `/(app)/packing/handover` | `app/(app)/packing/handover.tsx` | Packing Staff | Handover slip to FG store | — | `GET /packing/cartons`, `useDemoStore` | Verified | Implemented |
| `/(app)/packing/history` | `app/(app)/packing/history.tsx` | Packing Staff | Packing audit history | — | `GET /packing/cartons` | Verified | Implemented |
| `/(app)/store/goods-receipt` | `app/(app)/store/goods-receipt.tsx` | Store / Dispatch | Raw material receipt (GRN) | — | `POST /inventory/raw/receipts` | Verified | Implemented |
| `/(app)/store/inter-factory-transfer` | `app/(app)/store/inter-factory-transfer.tsx` | Store / Dispatch | Inter-factory stock transfer & receive | — | `GET/POST /inventory/raw/transfers`, `POST /transfers/:id/receive` | Verified | Implemented |
| `/(app)/store/locations` | `app/(app)/store/locations.tsx` | Store / Dispatch | Storage locations & racks | — | `GET/POST /masters/locations` | Verified | Implemented |
| `/(app)/store/stock-count` | `app/(app)/store/stock-count.tsx` | Store / Dispatch | Physical stock count & adjustment | — | `GET/POST /inventory/raw/counts`, `POST /counts/:id/approve` | Verified | Implemented |
| `/(app)/store/dispatch` | `app/(app)/store/dispatch.tsx` | Store / Dispatch, FM | Carton receipt, manifest & dispatch | — | `GET /dispatch/cartons`, `GET/POST /dispatch/manifests`, `POST /manifests/:id/approve`, `/execute` | Verified | Implemented |
| `/(app)/planning/sam-entry` | `app/(app)/planning/sam-entry.tsx` | FM | SAM planning & entry | — | `GET/PUT /planning/sam` | Verified | Implemented |
| `/(app)/planning/workforce` | `app/(app)/planning/workforce.tsx` | FM | Workforce & line strength | — | `GET/PUT /planning/workforce` | Verified | Implemented |
| `/(app)/masters` | `app/(app)/masters/index.tsx` | FM | Buyers, styles, lines, locations, stages | — | `GET/POST/PATCH /masters/*` | Verified | Implemented |
| `/(app)/management/users` | `app/(app)/management/users.tsx` | MD, FM | Employee roster, pending approvals, status | — | `GET/POST /users/roster`, `PATCH /users/:id/approval`, `/status` | Verified | Implemented |
| `/(app)/management/tags` | `app/(app)/management/tags.tsx` | FM, Sup | Tag print queue & ZPL/TSPL reprint | — | `GET /bundles/print-queue`, `GET /bundles/:id/tag-payload`, `POST /bundles/:id/reprint` | Verified | Implemented (HW pending) |
