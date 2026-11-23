# Screens Catalogue

All planned screens for StitchFlow v1.0.

## Auth Screens
1. Language Selection — `/auth/language-selection`
2. Login — `/auth/login`
3. Register — `/auth/register`
4. Forgot Password — `/auth/forgot-password`

## MD Screens
1. Executive Dashboard — `/(app)/(tabs)/` (MD)
2. Multi-Factory Comparison — `/(app)/(tabs)/work` (MD)
3. Factory Detail — planned
4. Orders Overview — planned
5. Production Performance — planned
6. SAM Efficiency — planned
7. Bottleneck Analytics — planned
8. Quality Overview — planned
9. Inventory Overview — planned
10. Dispatch Overview — planned
11. Job Closure Overview — planned
12. Critical Alerts — `/(app)/(tabs)/` (alerts section)
13. Executive Reports — `/(app)/(tabs)/reports`
14. Profile and Settings — `/(app)/(tabs)/settings`

## Factory Manager Screens
1. FM Dashboard — `/(app)/(tabs)/` (FM)
2. Orders and Jobs — `/(app)/(tabs)/work` (FM)
3. Create Job — planned
4. Job Details — `/(app)/jobs/[id]`
5. Job Control — `/(app)/jobs/[id]` (hold/resume/close)
6. Master Management — planned
7. Buyer Master — planned
8. Style/Dress Master — planned
9. Line Master — planned
10. Stage Configuration — planned
11. Storage Location Master — planned
12. Production Planning — planned
13. SAM Entry and Import — planned
14. Workforce and Line Strength — planned
15. User and Role Management — planned
16. Tag Print/Reprint Management — planned
17. Inventory Overview — planned
18. Quality Overview — planned
19. Approvals — planned
20. Reports and Alerts — `/(app)/(tabs)/reports`
21. Settings — `/(app)/(tabs)/settings`

## Supervisor Screens
1. Production Dashboard — `/(app)/(tabs)/` (Supervisor)
2. My Lines and Shifts — `/(app)/(tabs)/work` (Supervisor)
3. Jobs and Bundles — `/(app)/(tabs)/work`
4. Work Assignment — `/(app)/operations/work-assignment`
5. Tailor Mapping — `/(app)/operations/tailor-mapping`
6. Planning Strength — planned
7. SAM Monitoring — `/(app)/operations/sam-monitor`
8. Universal Job/Barcode Search — `/(app)/(tabs)/scan`
9. Scanned Pieces History — `/(app)/(tabs)/scan` (history section)
10. Stage vs Quantity — `/(app)/jobs/[id]` (stage summary)
11. Stage Summary Matrix — `/(app)/(tabs)/reports` (table)
12. Individual Job Status — `/(app)/jobs/[id]`
13. Manual Cutting Entry — `/(app)/operations/cutting-entry`
14. Manual Production Entry — `/(app)/operations/completed-entry`
15. Inline QC Status — `/(app)/(tabs)/` (bottleneck section)
16. Rework Coordination — `/(app)/(tabs)/` (rework section)
17. Bottleneck and Delay Alerts — `/(app)/(tabs)/` (alerts)
18. Tag Reprint Requests — planned
19. Shift Summary — `/(app)/(tabs)/` (shift card)
20. PDF/Excel Reports — `/(app)/(tabs)/reports` (disabled in demo)
21. Settings — `/(app)/(tabs)/settings`

## Operator Screens
1. Operator Dashboard — `/(app)/(tabs)/` (Operator)
2. Assigned Worklist — `/(app)/(tabs)/work`
3. Universal Scanner — `/(app)/(tabs)/scan`
4. Scanned Bundle Details — `/(app)/bundles/[id]`
5. Start / Pause / Resume Work — via scan flow
6. Cutting Entry — `/(app)/operations/cutting-entry`
7. Sewing Out Entry — `/(app)/operations/sewing-entry`
8. Production Entry — `/(app)/operations/completed-entry`
9. Kaja/Button Entry — `/(app)/operations/kaja-entry`
10. Ironing Entry — `/(app)/operations/ironing-entry`
11. Completed Quantity Entry — scan → quantity stepper (✅)
12. Rework Tasks — `/(app)/(tabs)/` (rework section)
13. Report Issue — `/(app)/operations/report-issue`
14. My Output — `/(app)/(tabs)/` (output card)
15. Scan History — `/(app)/(tabs)/scan`
16. Shift Summary — `/(app)/(tabs)/`
17. Settings — `/(app)/(tabs)/settings`

## QC Inspector Screens
1. QC Dashboard — `/(app)/(tabs)/` (QC)
2. Pending Inspection Queue — `/(app)/(tabs)/work`
3. Inspection Details — `/(app)/inspections/[id]` ✅
4. Optional Identity Scanner — via scan tab
5. Inline QC — planned form
6. Endline QC — planned form
7. Measurement Check — planned
8. Defect Entry — `/(app)/inspections/[id]` (defect chips) ✅
9. Photo Evidence — planned
10. QC Decision — `/(app)/inspections/[id]` ✅
11. Hold/Reject — `/(app)/inspections/[id]` (stepper)
12. Rework Management — `/(app)/(tabs)/` (rework section)
13. Reinspection — planned
14. Quality Release — `/(app)/inspections/[id]` (release flow) ✅
15. QC Analytics — `/(app)/(tabs)/reports`
16. Inspection History — planned
17. Reports — `/(app)/(tabs)/reports`
18. Settings — `/(app)/(tabs)/settings`

## Store / Dispatch Screens
1. Dashboard — `/(app)/(tabs)/` (Store)
2. Universal Scanner — `/(app)/(tabs)/scan`
3. Input In — `/(app)/operations/input-in`
4. Input Out — `/(app)/operations/input-out`
5. Output In — `/(app)/operations/output-in`
6. Output Out — `/(app)/operations/output-out`
7. Goods Receipt — planned
8. Issue to Production — planned
9. Receive from Production — planned
10. Storage Locations — planned
11. Rack Management — planned
12. Inventory Overview — `/(app)/(tabs)/work` (stock list)
13. Physical Stock Count — planned
14. Inter-Factory Transfer — planned
15. Transfer Receiving — planned
16. Discrepancy Entry — planned
17. Finished Goods Store — `/(app)/(tabs)/` (cartons)
18. Dispatch / Shipment — planned
19. Movement History — planned
20. Reports — `/(app)/(tabs)/reports`
21. Settings — `/(app)/(tabs)/settings`

## Packing Staff Screens
1. Packing Dashboard — `/(app)/(tabs)/` (Packing)
2. Assigned Packing Worklist — `/(app)/(tabs)/work`
3. Universal Scanner — `/(app)/(tabs)/scan`
4. Bundle Details — `/(app)/bundles/[id]`
5. QC Release Verification — `/(app)/(tabs)/` (release note) ✅
6. Packing Quantity Entry — scan → confirm flow ✅
7. Garment Size/Color Verification — GarmentTicketCard ✅
8. Carton Creation — planned form
9. Carton Barcode Label — `/(app)/cartons/[id]` ✅
10. Carton Verification — `/(app)/cartons/[id]` ✅
11. Packing Summary — `/(app)/(tabs)/` (stats)
12. Report Issue — `/(app)/operations/report-issue`
13. Store Handover — planned
14. Packing History — planned
15. Settings — `/(app)/(tabs)/settings`
