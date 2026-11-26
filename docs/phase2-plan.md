# StitchFlow — Phase 2 Implementation Plan (Masters, Jobs, Approvals, Bundles & Barcodes)

> **Status**: Partial local implementation. Live rollout requires migration review, verification and explicit approval.

---

## 1. Frontend-to-Backend Mapping

| Module | Existing Frontend Screens | TypeScript Interfaces | Database Tables (Migration `0002`) | NestJS Endpoints (`/api/v1/...`) |
|---|---|---|---|---|
| **Buyer Master** | `app/(app)/masters/index.tsx` | `Buyer` | `buyers` | `GET/POST/PATCH /masters/buyers` |
| **Config Master** | `app/(app)/masters/index.tsx` | — | `configurations` | `GET/PUT /masters/configs` |
| **Storage Location** | `app/(app)/masters/index.tsx`, `app/(app)/store/locations.tsx` | `StockItem.locationId` | `storage_locations` | `GET/POST/PATCH /masters/locations` |
| **Cutting Master** | `app/(app)/masters/index.tsx` | — | `cutting_masters` | `GET/POST/PATCH /masters/cutting-masters` |
| **Line Master** | `app/(app)/masters/index.tsx` | `Line` | `production_lines` (Phase 1) | `GET/POST/PATCH /masters/lines` |
| **Contact Master** | `app/(app)/masters/index.tsx` | — | `contacts` | `GET/POST/PATCH /masters/contacts` |
| **Dress Master & Style Images** | `app/(app)/masters/index.tsx`, `app/(app)/jobs/create.tsx` | `Style` | `garment_styles`, `style_images`, `sizes`, `colors` | `GET/POST/PATCH /masters/styles`, `POST /masters/styles/:id/images` |
| **Rank Master** | `app/(app)/masters/index.tsx` | — | `ranks` | `GET/POST/PATCH /masters/ranks` |
| **Tailor Mapping** | `app/(app)/operations/tailor-mapping.tsx` | — | `tailor_mappings` | `GET/POST/PATCH /masters/tailor-mappings` |
| **Job Management** | `app/(app)/jobs/index.tsx`, `create.tsx`, `[id].tsx` | `Job`, `JobStatus` | `jobs`, `job_items` | `GET/POST /jobs`, `GET /jobs/:id`, `PATCH /jobs/:id/status` |
| **Job Approvals** | `app/(app)/approvals/index.tsx` | `JobStatus` | `job_approvals` | `GET /approvals`, `POST /approvals/:id/decide` |
| **Bundle & Barcode Generation** | `app/(app)/bundles/[id].tsx`, `app/(app)/(tabs)/scan.tsx` | `Bundle`, `BundleStatus` | `bundles`, `barcodes` | `GET /bundles`, `POST /jobs/:id/bundles`, `GET /bundles/:id`, `POST /barcodes/resolve` |
| **Tag Print / Reprint** | `app/(app)/management/tags.tsx` | `Bundle` | `tag_print_logs` | `POST /bundles/:id/reprint`, `GET /bundles/:id/print-logs` |

## 2. Key Rules Enforced in Phase 2
- **Soft Deactivation Only**: Master records referenced by `jobs` or `bundles` cannot be hard-deleted (`ON DELETE RESTRICT` + `is_active = false`).
- **Job Closing Reconciliation**: `PATCH /jobs/:id/status` (`closed`) validates that production, QC, rework, packing, and dispatch balances are reconciled.
- **Tag Reprint Audit**: Reprinting preserves the original `bundle_code` / `barcode_value` and appends an immutable `tag_print_logs` + `audit_logs` entry.
- **Redis Caching**: Master lists (`buyers`, `styles`, `locations`, `lines`) cached in Redis with tenant-scoped keys and invalidated on mutation.

## Phase 2 foundation

The local repository includes a review migration for factory-scoped buyers, garment styles and jobs. The NestJS API exposes buyer and style listing and creation, job listing, detail, creation, and guarded draft activation, hold, resumption and cancellation. Factory scope is checked in SQL. Writes and audit entries share one transaction. Lists accept a factoryId and an optional after record ID and return up to 100 rows.

Other masters, line management, physical tag printing and downstream reconciliation remain pending. The existing frontend screens and repositories still use their previous data paths. The job API now derives cutting quantity from confirmed events. Other production counters remain unwired. The migration requires database verification and explicit approval before use against the live Supabase project.

## Approval, bundle identity and tag request rollout

The approval queue lists scoped draft jobs. A Factory Manager with CAN_MANAGE_JOBS approves a draft or rejects it with a reason. Approval activates the job and records the decision in the same transaction as its audit entry. The generic status API supports hold and resume and cannot activate a draft.

Bundle creation takes a client-generated request UUID, job size, color and quantity. It locks the parent job and rejects allocations exceeding the remaining job quantity. Matching retries return the same bundle and barcode. The barcode resolver is read-only and accepts generated bundle identities. Tag reprint requests keep the original barcode and append an audited print request. Physical printing remains pending.

This API validates the overall job quantity. Quantity balances per size and color still need order-item allocations. Approval, bundle and barcode screens retain demo data paths. Other masters, full production stage enforcement and subsequent phases remain pending. The new SQL migration requires isolated database verification before live approval.
