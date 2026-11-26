# Role-Based Permissions Matrix

StitchFlow enforces strict operational separation between management, production, quality, warehouse, and packing staff.

| Permission Key | MD | Factory Manager | Supervisor | Operator | QC Inspector | Store / Dispatch | Packing Staff |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CAN_LOOKUP_BARCODE** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **CAN_SCAN_PRODUCTION** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **CAN_VIEW_ALL_FACTORIES** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CAN_MANAGE_JOBS** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CAN_CLOSE_JOB** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CAN_ASSIGN_WORK** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CAN_ENTER_PRODUCTION** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CAN_PERFORM_QC** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **CAN_RELEASE_QC** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **CAN_MANAGE_INVENTORY** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **CAN_MONITOR_DISPATCH** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **CAN_APPROVE_DISPATCH** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CAN_EXECUTE_DISPATCH** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **CAN_CREATE_CARTON** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **CAN_VIEW_EXECUTIVE_REPORTS** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **CAN_VIEW_FINANCIAL_SAM** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Operational & Quality Separation Safeguards

1. **Factory Manager Separation of Duties**:
   - Factory Manager can view barcode and bundle details (`CAN_LOOKUP_BARCODE`) and monitor/approve dispatch (`CAN_MONITOR_DISPATCH`, `CAN_APPROVE_DISPATCH`), **but cannot perform routine production scan transactions (`CAN_SCAN_PRODUCTION`) or execute physical dispatch (`CAN_EXECUTE_DISPATCH`)**.
   - Store / Dispatch Staff execute physical dispatch transactions (`CAN_EXECUTE_DISPATCH`).

2. **Independent QC Release**:
   - Factory Managers and Supervisors can view QC metrics, but **cannot approve, alter, or release QC inspections**.
   - Only the **QC Inspector** role has `CAN_RELEASE_QC` permissions.

3. **Packing Bounded by QC Release**:
   - Packing staff can only pack quantities that have a recorded `QC Passed` / `Released` status.
