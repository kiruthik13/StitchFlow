# StitchFlow — Production Workflow

**Last Verified:** 2026-11-27  
**Source of Truth:** `backend/src/modules/jobs/`, `backend/src/modules/workflow/`, `backend/src/modules/inventory/`, and `app/(app)/`.

---

## 1. End-to-End Garment Lifecycle

```text
1. Draft Job Creation (FM)
   └── Optional per-size/color items + draft rejection allowance
2. Draft Approval (FM, separate decision)
   └── Activates job → enables bundle allocation & route setup
3. Production Route Setup (FM, one-time per job)
   └── Ordered stages (line + role + assignees) + independent QC, rework & packing duties
4. Bundle Allocation & Tag Print (FM / Sup)
   └── Allocates job quantity into bundles with unique BND barcodes & ZPL/TSPL tags
5. Cutting Output (Assigned Line Operator)
   └── Idempotent cutting entry (bounded by bundle qty; no automatic store stock created)
6. Cut-Stock Handover: Output In & Output Out (Operator ↔ Store ↔ Receiving Line)
   └── Output In: Operator submits cut pieces to Storage Location; Store confirms receipt
   └── Output Out: Store reserves stock & issues to first route line; Line confirms receipt
7. Routed Production Stages (Operator / Supervisor)
   └── Partial or whole-bundle step completion (capped by prior step confirmed output)
   └── Machine/production issue reporting (`POST /production/issues`)
8. Quality Inspection, Rework & Release (Independent QC Inspector + Rework Operator)
   └── Enforces: Inspected = Passed + Rework + Rejected + Held
   └── Rework completion (`POST /rework/complete`) & Reinspection (`POST /quality/reinspections`)
   └── Optional millimeter POM measurements & private photo evidence
   └── QC Release (`POST /quality/releases`) strictly capped by Passed quantity
9. Packing & Carton Allocation (Packing Staff)
   └── Allocates unpacked QC-released pieces into export cartons
10. Store Receipt, Shipment Manifest & Dispatch (Store + FM)
   └── Store receives cartons → groups into Shipment Manifest → FM approves → Store executes dispatch + gate-pass PDF
11. Reconciled Job Close (FM)
   └── Verifies order, cutting, inventory, stage, QC, packing, dispatch & rejection allowance
```

---

## 2. Core Business Rules Enforced

1. **QC Equation**: `Inspected = Passed + Rework + Rejected + Held` (e.g., `200 = 180 + 15 + 5 + 0`). Initial release is strictly `<= Passed` (never 200 when 180 passed). Reinspection reallocates existing rework/held pieces without inflating the inspected total.
2. **Separation of Duties**:
   - Factory Managers cannot perform routine production scans (`canScan: false`) or execute physical dispatch (`canExecuteDispatch: false`).
   - Only independent QC Inspectors can perform/release QC inspections.
   - Cut-stock handovers, raw-material transfers, and shipment manifests require distinct sender/receiver or creator/approver/executor actors.
3. **Idempotency & Concurrency**: Cutting, stage completion, bundle allocation, quality events, and carton creation use client-generated `requestId` UUIDs and row-level database locks (`FOR UPDATE`).
4. **Offline Replay**: Offline `cutting` and `stage` events queued in `AsyncStorage` replay through `POST /api/v1/sync/production`, preserving `occurredAt` separately from server timestamps.

---

## 3. Implemented Workflows vs Proposed Enhancements

| Area | Implemented Behavior | Proposed / Not Implemented |
|---|---|---|
| **Offline Queue** | `AsyncStorage` queue (`offlineQueueService.ts`) + `/sync/production` | `expo-sqlite` durable SQLite queue |
| **Job Route Editing** | Saved once per active job (`POST /jobs/:id/route`) | Post-save route modification |
| **Raw Transfer Discrepancy** | Full physical return to source (`POST /transfers/:id/return`) | Partial loss recovery workflow |
| **Dispatch & Gate-Pass** | Manifest gate-pass JSON & PDF (`GET /dispatch/manifests/:id/gate-pass.pdf`) | External freight carrier API integration |
| **Storage Locations** | Create & edit code/name (`PATCH /masters/locations/:id`) | Location deactivation toggle |
| **QC Photo Storage** | Private bucket + 60s signed URLs (`POST/GET /quality/bundles/:id/photos`) | Automated cleanup of unreferenced photos on SQL rollback |
