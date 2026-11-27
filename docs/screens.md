# Screens Catalogue — StitchFlow

**Last Verified:** 2026-11-27  
**Source of Truth:** [app/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/app) and [src/roles/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/roles)

Complete catalog of implemented mobile screens, navigation flows, role access, and hardware/pending notes.

---

## 1. Authentication & Onboarding
1. **Language Selection** (`/(auth)/language-selection`) — Sets `en`, `ta`, or `hi` locale in `useLanguageStore`.
2. **Login & Demo Role Selector** (`/(auth)/login`) — Live email/password auth (`POST /auth/login`); in Demo Mode (`EXPO_PUBLIC_DEMO_MODE=true`), exposes 7-role one-tap switcher.
3. **Registration** (`/(auth)/register`) — Roster-matched self-registration creating a `pending` account (`POST /auth/register`).
4. **Password Reset** (`/(auth)/forgot-password`) — Triggers Supabase password recovery email (`POST /auth/forgot-password`).

---

## 2. Managing Director (MD) Screens
- **Executive Dashboard** (`/(app)/(tabs)/`) — Factory selector, date-range filter, executive KPIs, stage pipeline, factory comparison, high-risk orders.
- **Multi-Factory Comparison** (`/(app)/(tabs)/work`) — Factory list with search, capacity, efficiency, active orders; tapping any factory card navigates to `/(app)/md/factory/[id]`.
- **Factory Detail Drilldown** (`/(app)/md/factory/[id]`) — 6-tab factory dashboard (**Overview · Units · Lines · Orders · Workforce · Store**); tapping a line navigates to `/(app)/md/line/[id]`. *(Legacy `factory-[id]` redirects here.)*
- **Production Line Detail** (`/(app)/md/line/[id]`) — Line capacity, active jobs, occupancy, and output metrics.
- **Bottleneck Analytics & What-If** (`/(app)/md/bottlenecks`) — Rework-aware bottleneck detection and cutting capacity simulation.
- **SAM Efficiency Benchmarks** (`/(app)/md/sam-efficiency`) — Cross-factory SAM efficiency comparison.
- **Executive Reports** (`/(app)/(tabs)/reports`) — Paged job records with CSV/PDF/XLS export.

---

## 3. Factory Manager (FM) Screens
- **FM Dashboard** (`/(app)/(tabs)/`) — Factory-scoped shift progress, active work orders, pending approvals alert, quick operations.
- **Orders & Jobs** (`/(app)/(tabs)/work`, `/(app)/jobs/`, `/(app)/jobs/create`, `/(app)/jobs/[id]`) — Create draft jobs (with size/color items), view details, configure production routes (`POST /jobs/:id/route`), hold/resume, set draft close policy, and execute reconciled job close (`POST /jobs/:id/close`).
- **Draft Approvals** (`/(app)/approvals/`) — Approve or reject draft jobs with audit reason.
- **Masters Hub** (`/(app)/masters/`) — Manage Buyers, Styles (with measurement specs), Lines, Stages, and Storage Locations *(location deactivation toggle pending)*.
- **SAM & Workforce Planning** (`/(app)/planning/sam-entry`, `/(app)/planning/workforce`).
- **User & Role Management** (`/(app)/management/users`) — Provision employee roster, approve pending users, suspend/activate accounts.
- **Tag Print & Reprint Queue** (`/(app)/management/tags`) — View print queue and dispatch ZPL/TSPL payloads *(physical thermal printer verification pending)*.

---

## 4. Supervisor Screens
- **Supervisor Dashboard** (`/(app)/(tabs)/`) — Shift KPIs, bottleneck banner, line bundles.
- **Lines & Bundles WIP** (`/(app)/(tabs)/work`).
- **Operations** (`/(app)/operations/work-assignment`, `tailor-mapping`, `sam-monitor`, `cutting-entry`).
- **Universal Scanner** (`/(app)/(tabs)/scan`) & **Reports** (`/(app)/(tabs)/reports`).

---

## 5. Operator Screens
- **Operator Dashboard** (`/(app)/(tabs)/`) — Personal output target vs actual, current bundle ticket, station entry shortcuts.
- **Assigned Worklist** (`/(app)/(tabs)/work`) & **Bundle Detail** (`/(app)/bundles/[id]`).
- **Universal Scanner** (`/(app)/(tabs)/scan`) — Camera barcode/QR scan, manual entry, HID wedge input *(physical scanner verification pending)*, offline `AsyncStorage` queue fallback.
- **Station Entries** (`/(app)/operations/cutting-entry`, `sewing-entry`, `kaja-entry`, `ironing-entry`, `report-issue`).

---

## 6. QC Inspector Screens
- **QC Dashboard** (`/(app)/(tabs)/`) — Inspection queue, reconciled quality summary (`Inspected = Passed + Rework + Rejected`), rework queue.
- **Bundle Inspection & Release** (`/(app)/inspections/[id]`) — Record pass/rework/reject/hold and release passed pieces only.
- **Inline Roving Audit** (`/(app)/inspections/inline`) & **Endline 100% Inspection** (`/(app)/inspections/endline`).
- **Measurement Spec Check** (`/(app)/inspections/measurement`) — Millimeter POM tolerance check.
- **Defect Photo Evidence** (`/(app)/inspections/photo-evidence`) — Private photo upload *(physical camera/device verification pending)*.
- **Reinspection & Secondary Release** (`/(app)/inspections/reinspection`).

---

## 7. Store / Dispatch Screens
- **Store Dashboard** (`/(app)/(tabs)/`) — Stock alerts, cut-stock handovers, cartons ready for dispatch.
- **Raw Material & Stock Operations** (`/(app)/store/goods-receipt`, `inter-factory-transfer`, `locations`, `stock-count`).
- **Operational Handovers** (`/(app)/operations/input-in`, `input-out`, `output-in`, `output-out`).
- **Order Dispatch & Manifests** (`/(app)/store/dispatch`) — Receive cartons, create shipment manifests, FM approve, Store execute with gate-pass reference.

---

## 8. Packing Staff Screens
- **Packing Dashboard** (`/(app)/(tabs)/`) — QC-released pieces available to pack, carton progress.
- **Bundle Hang-Tag Ticket** (`/(app)/bundles/[id]`).
- **Create Export Carton** (`/(app)/cartons/create`) — Strictly bounded by QC-released unpacked quantity.
- **Carton Label & Seal** (`/(app)/cartons/[id]`).
- **Store Handover & History** (`/(app)/packing/handover`, `/(app)/packing/history`).
