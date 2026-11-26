# StitchFlow — REST API Contracts (`/api/v1/`)

All endpoints return structured JSON and stable `errorCode` keys for frontend `i18n` translation (`en`, `ta`, `hi`).

## Error Response Contract

```json
{
  "statusCode": 403,
  "errorCode": "ERR_FORBIDDEN_CROSS_FACTORY",
  "message": "Access denied for requested factory scope",
  "timestamp": "2026-11-26T06:30:00.000Z",
  "path": "/api/v1/factories/fac-2/lines"
}
```

## Phase 1 Endpoints (Implemented)

| Method | Path | Auth / Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Database & Redis readiness status |
| `POST` | `/api/v1/auth/login` | Public (Rate-limited) | Supabase Auth email/password login + active profile check |
| `POST` | `/api/v1/auth/register` | Public (Rate-limited) | Controlled employee registration (`account_status = 'pending'`) |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh access token via Supabase Auth |
| `POST` | `/api/v1/auth/forgot-password` | Public | Trigger Supabase password recovery email |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke session & clear cached profile |
| `GET` | `/api/v1/auth/me` | Authenticated | Return current profile, assignments, and server-verified permissions |
| `GET` | `/api/v1/users` | `CAN_MANAGE_USERS` | List organization/factory-scoped employees |
| `PATCH` | `/api/v1/users/:id/approval` | `CAN_MANAGE_USERS` | Approve/reject pending employee & assign role/factory/line |
| `PATCH` | `/api/v1/users/:id/status` | `CAN_MANAGE_USERS` | Activate/suspend account & invalidate Redis permission cache |
| `GET` | `/api/v1/organizations/current` | Authenticated | Get organization summary |
| `GET` | `/api/v1/factories` | Authenticated (Scoped) | List authorized factories (all for MD, assigned for others) |
| `GET` | `/api/v1/factories/:id/hierarchy` | Authenticated (Scoped) | Units, departments, and lines for a permitted factory |
| `GET` | `/api/v1/audit` | `CAN_VIEW_EXECUTIVE_REPORTS` / Supervisor | Searchable append-only activity log |

## Auth rollout extension

Registration returns ERR_ENROLLMENT_REQUIRED when the organization, factory, employee ID and normalized email do not match an active roster entry. Login and authenticated routes require verified email. Refresh rejects profiles without active access. POST /auth/logout revokes the current Supabase session and can return ERR_LOGOUT_FAILED when revocation is unavailable.

## Phase 2 and Phase 3 local API extension

| Route | Request | Behavior |
| --- | --- | --- |
| GET /approvals | factoryId, optional after | Paged draft job decisions awaiting a scoped Factory Manager. |
| POST /approvals/:id/decide | decision approved or rejected, optional reason required for rejection | Persists decision and activates or cancels the job atomically. The route ID is the pending job ID. |
| POST /jobs/:id/bundles | requestId, color, size, quantity | Allocates part of an approved active order. A matching retry returns the original bundle. |
| GET /bundles; GET /bundles/:id | factoryId and optional cursor for list, bundle UUID for detail | Returns assigned and scoped bundle identity and allocated quantity. |
| POST /barcodes/resolve | barcode | Looks up a generated BND code without changing production state. |
| POST /bundles/:id/reprint | requestId, reason | Records an audited request and returns the same barcode. |
| GET /bundles/:id/print-logs | bundle UUID | Returns the most recent audited reprint requests. |
| POST /production/cutting | bundleId, requestId, quantity | Records confirmed cutting output for an active, assigned Line Operator. |

The workflow requires the job approval and bundle migration and the cutting output migration. Supervisors read jobs and bundles for their assigned lines. Operators currently read jobs enabled by explicit cutting assignments. Subsequent operation assignments, handset integration and physical printer connectivity remain pending.

## Cut-stock and planning extension

| Route | Request | Behavior |
| --- | --- | --- |
| GET/POST /masters/locations | Factory and optional cursor, or factory, code and name | Lists scoped locations and lets a manager create a location. |
| POST /inventory/output-in | bundleId, locationId, requestId, quantity | Authorized Line Operator proposes a handover from confirmed cutting output. |
| POST /inventory/output-out | Same fields plus destinationLineId | Store Staff reserve and propose an issue against confirmed location stock. |
| GET /inventory/cut-stock/handovers | factoryId, optional after | Lists handovers in the caller's factory and authority scope. |
| POST /inventory/cut-stock/handovers/:id/decide | status, actualQuantity, optional reason | Distinct authorized receiver confirms a matching quantity or records a discrepancy with a reason. |
| POST /simulations/what-if | jobId, availableShifts, baseline and proposed capacity inputs | Compares cutting throughput and shortfall against confirmed backlog. Uses explicit staffing, shift, break, downtime, SAM, efficiency and machine availability inputs. Does not write operational data. |

The cutting scenario is an estimate using the caller's available-shift assumptions. It does not compute a shift calendar, downstream readiness, rework-aware bottlenecks or delivery risk.

## Routed production, quality and dispatch extension

| Route | Request and effect |
| --- | --- |
| GET /jobs/:id/route-assignments | Lists eligible active job-factory assignments for a manager to configure. |
| POST /jobs/:id/route | Ordered steps (stageCode, lineId, role, assignmentIds), duties (assignmentId and duty), optional cuttingAssignmentIds. Saves once per job. |
| GET /production/bundles/:id/route | Returns caller-scoped steps and server-generated confirmation request IDs. |
| POST /production/stages/complete | bundleId, stepId and requestId. Records confirmed whole-bundle stage output after predecessor and receipt checks. |
| GET /quality/bundles/:id | Returns authorized duty, current quantities, readiness and a request ID. |
| POST /quality/inspections | bundleId, requestId, passed, rejected, rework and held. |
| POST /rework/complete | bundleId, requestId, quantity. Requires an assigned rework operator. |
| POST /quality/reinspections | Inspection fields plus fromRework and fromHold. Selected inputs must match outcomes. |
| POST /quality/releases | bundleId, requestId, quantity. Requires an independent QC Inspector. |
| POST /cartons | bundleId, requestId and quantity. Reserves capacity against remaining QC release. |
| GET /dispatch/cartons | Factory/cursor scoped carton list. |
| POST /dispatch/cartons/:id/receive, /approve, /execute | Store receipt, Factory Manager approval, then Store / Dispatch physical confirmation. |

Request IDs protect retries within the corresponding event type. Server-side scope and quantity checks are still applied. This migration requires isolated database verification and separate live approval.

## Job close, variants, recovery and quality evidence

| Route | Request and effect |
| --- | --- |
| GET /jobs/:id/route | Returns saved steps and the draft closing-allowance summary. |
| PATCH /jobs/:id/close-policy | Requires Factory Manager close permission. Saves maxRejectedQuantity and an audit reason while the job is a draft. Default is zero rejected pieces. |
| POST /jobs/:id/close | Closes an active job after order, cutting, inventory, stage, QC, packing and dispatch reconciliation. Returns ERR_JOB_UNRECONCILED or ERR_JOB_REJECTION_LIMIT for these business failures. |
| POST /jobs | Optionally accepts items with size, color and quantity. Unique variants must add exactly to the order quantity when provided. |
| GET /jobs/:id/bundle-allocation | Returns scoped recent bundle IDs/barcodes, remaining total, and per-variant remainder when configured. |
| POST /inventory/cut-stock/handovers/:id/verify-return | Original sender verifies that the full quantity is back at the source and provides a reason. |
| POST /inventory/cut-stock/handovers/:id/approve-return | A separate Factory Manager approves the verified return, releasing the reservation. Partial stock recovery is deliberately unsupported. |
| GET /analytics/jobs/:id/queues | Returns scoped queue sizes and observed throughput, including rework and reinspection. Clearance estimates use a rolling seven calendar days, and are null when there is pending work without throughput evidence. |
| POST /masters/styles/:id/measurement-specs | Factory Manager configures size, measurement point and inclusive millimeter limits. |
| GET /quality/bundles/:id/evidence | Returns scoped specification and history lists and a request ID. |
| POST /quality/bundles/:id/measurements | Assigned QC records specId, measuredMm and requestId. |
| POST /quality/bundles/:id/photos | Assigned QC posts a request ID and one JPEG/PNG photo in multipart form, limited to 5 MiB. |
| GET /quality/bundles/:id/photos/:photoId | Authorized viewer receives a signed URL that expires after 60 seconds. |
| PATCH /masters/{buyers,styles,locations}/:id | Manager edits master code and name. Buyer/style activity can be toggled. Location deactivation is still pending. |

## Partial production, raw inventory and shipment rollout

| Route | Request and effect |
| --- | --- |
| GET /production/bundles/:id/route | Returns cumulative completed and currently available quantities per visible step. |
| POST /production/stages/complete | Confirms an explicit partial quantity with a stable requestId. Requests without quantity retain the previous whole-bundle default. |
| GET/POST /inventory/raw/materials | Factory-scoped catalog and authorized creation with a unit of piece, millimeter or gram. |
| GET /inventory/raw/stock | Factory stock totals derived from the append-only ledger. |
| POST /inventory/raw/receipts and /issues | Posts an exact integer quantity at an active assigned location, with a PO or issue reference. |
| GET /inventory/raw/destinations and /transfers | Lists allowed destinations and scoped sent/incoming transfers. |
| POST /inventory/raw/transfers and /transfers/:id/receive | Sender debits source stock. A different employee in the destination factory confirms the exact quantity before destination stock is credited. |
| GET/POST /inventory/raw/counts and POST /inventory/raw/counts/:id/approve | Store staff submit physical counts. Manager approval adjusts only when the book balance still matches the original snapshot. |
| GET/POST /dispatch/manifests | Lists, or creates from received, unclaimed cartons in the same factory with carrier, vehicle, seal and destination. |
| POST /dispatch/manifests/:id/approve and /execute | Separate Manager approval and Store execution. Execution generates a manifest gate-pass reference and writes carton-level dispatch. |
| GET /analytics/dashboard | Aggregates scoped job and factory metrics from confirmed records. |
| GET /reports/jobs and /reports/jobs/export | Scope-filtered paged records and CSV text. Optional target-date range. Spreadsheet formula-like cells are escaped. |
| POST /sync/production | Accepts up to 25 cutting/stage events for the authenticated employee. Replays through existing transactions and returns confirmed/conflict/rejected/retry per event. |

The production sync API does not provide the mobile SQLite queue. It is ready for later integration when the device dependency is available. Event records store the supplied client time separately from the authoritative server timestamp.

Raw transfer discrepancy endpoints: POST /inventory/raw/transfers/:id/discrepancies records observedQuantity and a reason from the distinct destination receiver. POST /inventory/raw/transfers/:id/return requires the original sender to confirm the exact full returned quantity at the source. This credits the original source once and does not create destination stock.
