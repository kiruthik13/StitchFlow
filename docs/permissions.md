# Role-Based Permissions Matrix

**Last Verified:** 2026-11-27  
**Source of Truth:** [src/core/permissions/index.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/core/permissions/index.ts) and backend `@RequirePermissions()` guards.

StitchFlow enforces strict operational separation between management, production, quality, warehouse, and packing staff.

| Permission Key (Frontend / Backend) | MD | Factory Manager | Supervisor | Operator | QC Inspector | Store / Dispatch | Packing Staff |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`canLookupBarcode` / `CAN_LOOKUP_BARCODE`** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`canScan` / `CAN_SCAN_PRODUCTION`** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`canViewMD` / `CAN_VIEW_ALL_FACTORIES`** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`canCreateJob` / `canEditJob` / `CAN_MANAGE_JOBS`** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`canCloseJob` / `CAN_CLOSE_JOB`** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`canManageUsers` / `CAN_MANAGE_USERS`** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`canManageMasters` / `CAN_MANAGE_MASTERS`** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`canApproveRework`** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **`canDoQC` / `CAN_PERFORM_QC`** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **`canReleasePieces` / `CAN_RELEASE_QC`** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **`canManageInventory` / `CAN_MANAGE_INVENTORY`** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **`canMonitorDispatch` / `CAN_MONITOR_DISPATCH`** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **`canApproveDispatch` / `CAN_APPROVE_DISPATCH`** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`canExecuteDispatch` / `CAN_EXECUTE_DISPATCH`** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **`canPack` / `CAN_CREATE_CARTON`** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **`canViewReports` / `CAN_VIEW_EXECUTIVE_REPORTS`** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |

---

## Operational & Quality Separation Safeguards

1. **Factory Manager Separation of Duties**:
   - Factory Manager has `canLookupBarcode: true`, `canMonitorDispatch: true`, and `canApproveDispatch: true`, **but `canScan: false`, `canScanProduction: false`, and `canExecuteDispatch: false`**.
   - Store / Dispatch Staff execute physical dispatch transactions (`canExecuteDispatch: true`).
   - `FactoryScopeGuard` blocks Factory Managers from accessing another factory's endpoints (HTTP 403).

2. **Independent QC Release**:
   - Factory Managers and Supervisors can view QC metrics, but **cannot perform or release QC inspections** (`canDoQC: false`, `canReleasePieces: false`).
   - Only the **QC Inspector** role has `canDoQC: true` and `canReleasePieces: true`.

3. **Packing Bounded by QC Release**:
   - Packing staff (`canPack: true`) can only allocate quantities that have a recorded `QC Passed` / `Released` status.
