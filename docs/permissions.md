# Role-Based Permissions Matrix

StitchFlow enforces strict operational separation between management, production, quality, warehouse, and packing staff.

| Permission Key | MD | Factory Manager | Supervisor | Operator | QC Inspector | Store / Dispatch | Packing Staff |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CAN_SCAN_BARCODE** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **CAN_VIEW_ALL_FACTORIES** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CAN_MANAGE_JOBS** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CAN_CLOSE_JOB** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CAN_ASSIGN_WORK** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CAN_ENTER_PRODUCTION** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CAN_PERFORM_QC** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **CAN_RELEASE_QC** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **CAN_MANAGE_INVENTORY** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **CAN_DISPATCH** | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **CAN_CREATE_CARTON** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **CAN_VIEW_EXECUTIVE_REPORTS** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CAN_VIEW_FINANCIAL_SAM** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Quality Separation Safeguards

1. **Independent QC Release**:
   - Factory Managers and Supervisors can view QC metrics, but **cannot approve, alter, or release QC inspections**.
   - Only the **QC Inspector** role has `CAN_RELEASE_QC` permissions.
   - Initial release quantities are strictly bounded by `passedQuantity`. Defective and rework units cannot be released until successful re-inspection.

2. **Packing Bounded by QC Release**:
   - Packing staff can only pack quantities that have a recorded `QC Passed` or `Released` status.
   - Over-packing beyond released quantities is blocked at the UI stepper and validation layer.
