# Production workflow

## Cutting output implemented locally

An authorized Factory Manager approves a draft job. Bundle creation allocates part of the order quantity and provides a stable barcode. Barcode resolution reads bundle identity. It does not record output.

POST /api/v1/production/cutting accepts a bundleId, a client-generated requestId and a confirmed quantity. The employee must be an active Operator assigned to that specific job and to the factory, unit, department and line through cutting_assignments and user_assignments. The production line must include Cutting. Assignment records currently require authorized provisioning. The transaction checks the active job, locks the job and bundle, and limits total cutting output to the bundle quantity. A retry with the same actor, request ID and payload returns the original event. The recording employee and producing line are stored separately. The job API derives cutting quantity from confirmed events.

Store receipt, subsequent operation routing, scanner screen integration and offline synchronization are pending. Factory-specific sequence and responsibility rules still need configuration and verification before those operations can run. No inventory receipt is created by cutting entry.

## Cutting store handover

For Output In the operator explicitly submits confirmed cutting output to an active storage location in the job factory. Store Staff, as a distinct user, confirm the actual count. Output Out reserves confirmed stock from that location and requests receipt by an assigned destination Line Operator. Cross-factory issues are outside this API. Settled receipts and issues serve as the cut-stock ledger. Pending issues reserve stock. Recorded discrepancies retain their reservation pending reconciliation. Discrepancy resolution and corrections, configurable Input In and Input Out, other material types, inter-factory transfers and mobile store binding are outstanding.

## Configurable post-cut route, quality, packing and dispatch

A Factory Manager can configure a job with POST /api/v1/jobs/:id/route. The request lists ordered steps with stageCode, lineId, role (operator or supervisor), and active assignmentIds for each step. It also accepts assigned duties (qc, rework or packing) and optional cuttingAssignmentIds. GET /api/v1/jobs/:id/route-assignments lists eligible assignments in the job factory. The API checks organization, factory, parent unit and department, line, employee role and active status. It accepts one route per job. Real factory stage order and duty assignments must be supplied before operations can proceed.

The scanner resolves a barcode without changing the database. A receiving line must accept the full bundle via Output Out before the first configured step can complete. Assigned users explicitly confirm each step in order. This increment records whole-bundle stage completion. Partial post-cut stage quantities, transfer reconciliation between later lines and intermediate quality checkpoints are pending.

After the last configured step, an assigned independent QC Inspector records inspection outcomes. Rework operators record completed rework, and QC can reinspect completed rework or held pieces. Reinspection reallocates existing pieces and preserves the original inspected count. QC may release only passed pieces. Packing may allocate only released, unpacked quantities. The carton is for one bundle. Store receipt is required before a Factory Manager approves dispatch. Store / Dispatch Staff execute it separately and receive a generated gate-pass reference. Multi-carton shipment manifests and logistics metadata are pending.

The scanner supports live camera and the existing keyboard input path, including wedge scanners that send Enter to the focused input. Output In and Output Out use the existing operation routes; dispatch uses the existing store route. Device behavior and scanner hardware have not been verified. Store lists refresh every 20 seconds when focused in the foreground. A private Supabase factory broadcast now also invalidates scoped queries and refetches after reconnect. Foreground polling remains available for the two Store views. Live channel verification and durable SQLite offline replay are pending.

## Reconciliation rules for job closing

The Factory Manager can set a rejected-piece allowance, with an audit reason, before draft approval. The default allowance is zero. The job closes only when the allocated total matches the order, every bundle reconciles through confirmed cutting, Store receipt and issue, production, QC and finished-goods dispatch, and final rejected pieces are within policy. The check locks the job against in-flight workflow writes. A second request for a closed job returns its current state.

Rejected cut-stock handovers keep their reservations until the original sender confirms the full quantity is physically back at source and a separate Factory Manager approves. The original rejected handover remains unchanged. After approval, the quantity is available to propose again. Partial losses and exception adjustments remain outside this release.

Factory Managers can configure routes and role assignments from Job Detail. Each new route requires a cutting assignee and independent personnel for QC, rework and packing before the route is saved. Route changes after saving are outside this release.

Measurement and photo evidence supplement assigned QC inspection. Measurements are evaluated against the selected size and style point, and never change quality quantities automatically. Server-only storage and short-lived signed URLs protect the photo bucket. If Storage completes and the SQL transaction fails, an unreferenced object may require cleanup. The retry path is deterministic for the same photo.

## Production and inventory reconciliation

Partial later-stage output is limited by quantity received at the first route step or output at the immediately preceding configured step, less quantity already recorded here. QC still requires the full terminal route quantity. Physical send/receive at each later production line is not implied by a stage event.

Raw-material movements use configured exact base units and immutable ledger rows. Transfer creation subtracts source stock and leaves it in transit. A different employee must confirm the exact quantity at the destination before it is credited. A receiver can record a mismatch. The original source sender can confirm the full physical return, which credits source stock and leaves the destination untouched. Partial loss adjustments still require a separately approved workflow. A manager can approve a physical stock adjustment only if the original book balance still matches.

A shipment groups multiple received cartons in one factory. Store Staff create and execute it after a separate Factory Manager approval. Carton reservations prevent individual or duplicate shipment dispatch. Execution records individual carton dispatch for job closing and a manifest gate-pass reference. Carrier integration and physical gate-pass printing remain outside the implementation.
