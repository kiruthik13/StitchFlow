# StitchFlow — Frontend-to-Backend Integration Matrix

> **Phase 0 Audit**: Mapped directly from `app/`, `src/roles/`, `src/features/operations/`, `src/store/`, `src/core/`, and `src/services/repositories/`.

---

## 1. Screen-to-API Integration Matrix

| Screen / Route | Component / Module | Current Data Source | TypeScript Interface | Target DB Tables | Target API Endpoint (`/api/v1/...`) | Required Permissions | Validation Rules | Integration Status |
|---|---|---|---|---|---|---|---|---|
| `/(auth)/login` | `LoginScreen` | `useAuthStore.demoLogin`, `DEMO_USERS` | `User`, `UserRole` | `auth.users`, `profiles`, `user_assignments` | `POST /auth/login`, `GET /auth/me` | Public (`@Public()`) | Valid email, password >= 8 chars, active account check | 🟡 Mocked (Phase 1 Ready) |
| `/(auth)/register` | `RegisterScreen` | Local form state | `UserRole` | `profiles`, `user_assignments`, `audit_logs` | `POST /auth/register` | Public (creates `pending` account) | Org-scoped `employeeId` uniqueness, no privileged role self-assign | 🟡 Mocked (Phase 1 Ready) |
| `/(auth)/forgot-password` | `ForgotPasswordScreen` | Local alert | — | `auth.users` | `POST /auth/forgot-password` | Public | Valid email format | 🟡 Mocked |
| `/(app)/(tabs)/index` | `MDDashboard`, `FMDashboard`, `SupervisorDashboard`, `OperatorDashboard`, `QCDashboard`, `StoreDashboard`, `PackingDashboard` | `useDemoStore`, `mockData.ts` (`TODAY_SHIFT`, `FACTORIES`, `ALERTS`, `STOCK_ITEMS`, `CARTONS`, `QC_INSPECTIONS`, `REWORK_TASKS`) | `Job`, `Bundle`, `ShiftSummary`, `Alert`, `Factory`, `QCInspection`, `Carton`, `StockItem` | `jobs`, `bundles`, `production_events`, `qc_inspections`, `stock_balances`, `cartons`, `bottleneck_alerts` | `GET /analytics/dashboard` (role-scoped) | Authenticated + role scope | Tenant & factory isolation via JWT + RLS | 🟡 Mocked |
| `/(app)/(tabs)/work` | `FMWork`, `SupervisorWork`, `OperatorWork`, `QCWork`, `StoreWork`, `PackingWork`, `MDWork` | `useDemoStore` | `Job`, `Bundle`, `StockItem`, `QCInspection` | `jobs`, `bundles`, `stock_balances`, `qc_inspections` | `GET /jobs`, `GET /bundles`, `GET /quality/inspections`, `GET /inventory/items` | Role-scoped read | Factory/line isolation | 🟡 Mocked |
| `/(app)/(tabs)/scan` | `ScanTabScreen`, `useScanInput`, `hidScannerAdapter` | `useDemoStore.addScan`, `submitProductionQty`, `getBundleByCode` | `ScanResult`, `Bundle` | `barcodes`, `bundles`, `production_events`, `sync_events` | `POST /barcodes/resolve`, `POST /production/events` | `CAN_SCAN_BARCODE` | Idempotency key, stage transition check, qty <= bundle qty | 🟡 Mocked |
| `/(app)/(tabs)/reports` | `ReportsTabScreen` | `TODAY_SHIFT`, static `STAGE_MATRIX` | `ShiftSummary`, `ProductionStage` | `production_events`, `qc_inspections`, `cartons` | `GET /reports/summary`, `GET /reports/export` | `CAN_VIEW_EXECUTIVE_REPORTS` / role scope | Date range, permitted factory filter | 🟡 Mocked |
| `/(app)/jobs/index`, `create`, `[id]` | `JobsIndex`, `CreateJob`, `JobDetail` | `useDemoStore.jobs`, `addJob`, `updateJobStatus` | `Job`, `JobStatus` | `jobs`, `job_items`, `bundles`, `production_stages` | `GET /jobs`, `POST /jobs`, `PATCH /jobs/:id/status` | `CAN_MANAGE_JOBS`, `CAN_CLOSE_JOB` | Order qty > 0, valid buyer/style/line, close reconciliation | 🟡 Mocked |
| `/(app)/bundles/[id]` | `BundleDetailScreen` | `useDemoStore.bundles` | `Bundle` | `bundles`, `production_events`, `tag_print_logs` | `GET /bundles/:id`, `POST /bundles/:id/reprint` | `CAN_SCAN_BARCODE` | Reprint audit log required | 🟡 Mocked |
| `/(app)/operations/[slug]` | `CuttingEntryView`, `SewingEntryView`, `KajaIroningEntryView`, `StockMovementView`, `ReportIssueView`, `SamMonitorView`, `TailorMappingView`, `WorkAssignmentView` | `useDemoStore`, `mockData.ts` | `Bundle`, `ProductionStage`, `StockMovementType` | `production_events`, `production_issues`, `stock_movements`, `work_assignments`, `tailor_mappings` | `POST /production/events`, `POST /production/cutting`, `POST /inventory/movements`, `POST /production/issues` | Stage-specific responsibility | Cutting recorded by Line Operator for team; Output In/Out != Input In/Out | 🟡 Mocked |
| `/(app)/inspections/*` | `inline`, `endline`, `measurement`, `photo-evidence`, `reinspection`, `[id]` | `useDemoStore.qcInspections` | `QCInspection`, `QCDefect` | `qc_inspections`, `inspection_defects`, `measurement_entries`, `rework_jobs`, `qc_releases` | `POST /quality/inspections`, `POST /quality/releases`, `POST /rework/:id/reinspect` | `CAN_PERFORM_QC`, `CAN_RELEASE_QC` | `inspected = passed + rework + rejected + hold`; release <= passed | 🟡 Mocked |
| `/(app)/store/*` | `goods-receipt`, `inter-factory-transfer`, `locations`, `stock-count`, `dispatch` | `STOCK_ITEMS`, `CARTONS` | `StockItem`, `StockMovementType` | `stock_movements`, `stock_balances`, `transfer_orders`, `dispatch_orders`, `gate_passes` | `POST /inventory/receipts`, `POST /transfers`, `POST /dispatch` | `CAN_MANAGE_INVENTORY`, `CAN_DISPATCH` | No negative stock, dual sender/receiver confirmation | 🟡 Mocked |
| `/(app)/cartons/*`, `/(app)/packing/*` | `create`, `[id]`, `handover`, `history` | `useDemoStore.cartons`, `createCarton`, `sealCarton` | `Carton` | `cartons`, `carton_items`, `packing_events` | `POST /cartons`, `POST /cartons/:id/seal`, `POST /packing/handover` | `CAN_CREATE_CARTON` | Packed qty <= QC-released qty; no duplicate piece allocation | 🟡 Mocked |
| `/(app)/planning/*` | `sam-entry`, `workforce` | Local state, `STYLES` | `Style` | `sam_entries`, `planning_strength` | `PUT /planning/sam`, `PUT /planning/workforce` | `CAN_VIEW_FINANCIAL_SAM` / FM / Supervisor | Non-zero denominators, valid SAM > 0 | 🟡 Mocked |
| `/(app)/md/*` | `factory-[id]`, `bottlenecks`, `sam-efficiency` | `FACTORIES`, `ALERTS` | `Factory`, `Alert` | `bottleneck_alerts`, `simulation_runs`, `factories` | `GET /bottlenecks`, `POST /simulations/what-if`, `GET /factories/:id/metrics` | `CAN_VIEW_ALL_FACTORIES`, `CAN_VIEW_EXECUTIVE_REPORTS` | Explainable deterministic engine; simulations never mutate live DB | 🟡 Mocked |
| `/(app)/masters/index`, `/(app)/management/*`, `/(app)/approvals/index` | `MastersHub`, `UsersManagement`, `TagReprints`, `Approvals` | `mockData.ts` | `Buyer`, `Style`, `Line`, `User` | `buyers`, `garment_styles`, `production_lines`, `storage_locations`, `profiles`, `job_approvals`, `tag_print_logs` | `GET/POST/PATCH /masters/*`, `PATCH /users/:id/approve`, `POST /approvals/:id/decide` | `CAN_MANAGE_JOBS`, `canManageUsers`, `canManageMasters` | Soft-delete/deactivate only if referenced by transactions | 🟡 Mocked |

---

## 2. Permission Conflicts Identified (Phase 0 Finding)

| Permission / Role | `src/core/permissions/index.ts` | `docs/permissions.md` | Resolution Required |
|---|---|---|---|
| **Factory Manager — `CAN_SCAN_BARCODE`** | `canScan: true` | `❌` | Keep `canScan: true` for FM inspection/lookup or restrict to read-only scan lookup? Needs explicit confirmation before restricting FM. |
| **Factory Manager — `CAN_DISPATCH`** | `canDispatch: false` | `✅` | `src/core/permissions/index.ts` restricts dispatch to `store-dispatch`. Backend enforces `store-dispatch` (or FM if approved). |
| **Supervisor — `CAN_ASSIGN_WORK` / `canApproveRework`** | `canApproveRework: true` | `CAN_ASSIGN_WORK: ✅` | Align backend guard permissions (`CAN_ASSIGN_WORK`, `CAN_APPROVE_REWORK`) while keeping `CAN_RELEASE_QC` strictly `qc-inspector` only. |

## Phase 0 source cross-check and Phase 1 rollout

The main matrix groups related routes. The route-level audit in frontend-route-inventory.md lists the actual app route files and their direct dependencies on fixtures, demo state, and repository or API code. Indirect imports via role dashboards and operation components still need to be migrated per module.

| Current contract | Request | Success response | Actual status |
| --- | --- | --- | --- |
| POST /auth/register | organizationId, factoryId, employeeId, name, email, password, optional phone and designation | Pending employee ID and status | Mobile request wired. Server now requires a pre-enrolled roster match and creates a pending Operator profile. Live mail delivery and approval flow require integration verification. |
| POST /auth/login and GET /auth/me | Email/password, followed by bearer access token | Session and server-verified profile | Mobile request wired. Verified email and active profile required. |
| POST /auth/refresh and POST /auth/logout | Refresh token or bearer token respectively | Refreshed tokens or logout result | Mobile request wired. Live session revocation requires verification. |
| GET /jobs and GET /jobs/:id | Factory ID with optional cursor, or job UUID | Job projections | Backend implemented. Job UI retains demo data. |
| POST /jobs and PATCH /jobs/:id/status | Factory, buyer, style, line, dates, quantity, colors and sizes, or allowed target status | Saved job | Backend implemented for draft, activation, hold, resume and draft cancellation. Approval and closing workflows remain pending. |
| GET/POST /masters/buyers and /masters/styles | Factory ID, optional cursor, or factory ID with code and name | Master record or page | Backend implemented. UI integration remains pending. |

Factory Managers have barcode lookup and dispatch monitoring and approval. QC decisions remain with QC Inspectors, and physical dispatch stays with Store / Dispatch. The confirmed cutting flow records line output under the authorized Line Operator. Store receiving is a separate transaction. The ironing and Kaja responsibility rules still need explicit factory configuration before those operations can be enabled.

## Live job screen integration

| Screen | Real-session behavior | Current limits |
| --- | --- | --- |
| Job List | Uses scoped paged GET /jobs and supports pull-to-refresh. | Search and status filters operate on loaded records. |
| Job Detail | Uses GET /jobs/:id and confirmed cutting quantities. Management hold/resume calls PATCH /jobs/:id/status. | Packing, QC, and stage demo controls are available only in demo sessions on this screen. |
| Create Job | Loads active buyers, styles and lines from the employee's primary factory and creates a draft via POST /jobs. | Primary factory only. Per-size and per-color quantities are pending. |
| Approvals | Loads scoped drafts and records approve/reject decisions. Rejection requires a reason. | Primary factory and first page only. |

Other existing screens still need the real-session integration described in the main matrix. Editorial layouts, assets, themes and navigation conventions were retained. The connected screens temporarily omit unavailable production metrics and actions in real sessions.

## Online workflow increment

The scanner, Output In/Out operations and carton dispatch screen now read and mutate live endpoints in real sessions. The scanner covers configured whole-bundle stages and authorized quantity inspection, rework, reinspection, release and packing actions. Store and dispatch currently list up to 100 records for the employee's primary factory. Raw material GRN, full physical shipment manifests, other specialist QC forms, and offline recording remain pending. Private Realtime plus focused polling covers connected factory screens; live channel, mobile and database verification are still pending.

## Connected screens in the current rollout

Job Detail now includes route setup, bundle allocation, queue observations, draft rejection allowance, and reconciled close. Job Create can specify size/color quantities as comma-delimited rows. Cut-stock movement screens show unresolved discrepancies and sender/manager return actions. Real-session Masters supports Buyer, Style and Location creation/editing plus line lookup. A manager can create measurement points from Style Master. Authorized QC staff can enter measurements and capture evidence through the scanner after bundle lookup. The private photo view also supports the assigned Factory Manager.

Current lists keep their factory and page limits. Remaining specialist masters, shipment manifests, raw-material workflows and unsupported demo screens remain out of this rollout. Mobile quality photo capture targets native Expo camera and requires device verification.

## Inventory, dashboard and reports screens

Real sessions use Store routes for raw receipts and issues, physical count and approval, inter-factory transfers, and manifested dispatch. The scanner can confirm part of an available later-stage quantity. Each role dashboard retains its existing header and uses scoped API metrics in real sessions. Reports show paged job records and can share up to 1,000 rows of server-generated CSV.

Store forms currently operate on the employee's primary factory and bounded catalog and record lists. APIs enforce role and factory constraints independently of the UI. The mobile SQLite dependency is unavailable in this workspace.
