# Screens Catalogue — StitchFlow

Complete catalog of all implemented mobile screens in StitchFlow.

## 1. Authentication & Onboarding
1. Language Selection — `/(auth)/language-selection`
2. Demo Login & Role Selector — `/(auth)/login`
3. Registration Demo — `/(auth)/register`
4. Password Reset — `/(auth)/forgot-password`

## 2. Managing Director (MD) Screens
1. Executive Dashboard — `/(app)/(tabs)/` (Role: MD)
2. Multi-Factory Comparison — `/(app)/(tabs)/work` (Role: MD)
3. Factory Detail Drilldown — `/(app)/md/factory-[id]`
4. Bottleneck Analytics & Optimization — `/(app)/md/bottlenecks`
5. SAM Efficiency Comparative Graphs — `/(app)/md/sam-efficiency`
6. Critical Alerts Stream — `/(app)/(tabs)/`
7. Executive Reports — `/(app)/(tabs)/reports`
8. Profile & Settings — `/(app)/(tabs)/settings`

## 3. Factory Manager (FM) Screens
1. FM Dashboard — `/(app)/(tabs)/` (Role: FM)
2. Orders & Jobs Management — `/(app)/(tabs)/work`
3. Create Production Job — `/(app)/jobs/create`
4. Job Detail & Production Overview — `/(app)/jobs/[id]`
5. Job Control (Hold, Resume, Close) — `/(app)/jobs/[id]`
6. Masters Management Hub — `/(app)/masters/`
7. Buyer Master — `/(app)/masters/` (Buyers Tab)
8. Style / Dress Master — `/(app)/masters/` (Styles Tab)
9. Line Master — `/(app)/masters/` (Lines Tab)
10. Stage Configuration — `/(app)/masters/` (Stages Tab)
11. Storage Location Master — `/(app)/masters/` (Locations Tab)
12. SAM Planning & Entry — `/(app)/planning/sam-entry`
13. Workforce & Line Strength — `/(app)/planning/workforce`
14. User & Role Management — `/(app)/management/users`
15. Tag Print & Reprint Queue — `/(app)/management/tags`
16. Factory Authorizations & Approvals — `/(app)/approvals/`
17. Reports & Stage Matrix — `/(app)/(tabs)/reports`
18. Settings — `/(app)/(tabs)/settings`

## 4. Supervisor Screens
1. Production Dashboard — `/(app)/(tabs)/` (Role: Supervisor)
2. Lines & Bundles WIP — `/(app)/(tabs)/work`
3. Work Assignment — `/(app)/operations/work-assignment`
4. Tailor Mapping — `/(app)/operations/tailor-mapping`
5. SAM Monitoring — `/(app)/operations/sam-monitor`
6. Universal Barcode / QR Search — `/(app)/(tabs)/scan`
7. Scanned History — `/(app)/(tabs)/scan`
8. Stage vs Quantity Status — `/(app)/jobs/[id]`
9. Stage Summary Matrix — `/(app)/(tabs)/reports`
10. Manual Cutting Entry — `/(app)/operations/cutting-entry`
11. Manual Production Entry — `/(app)/operations/completed-entry`
12. Tag Reprint Request — `/(app)/management/tags`
13. Shift Summary Card — `/(app)/(tabs)/`
14. Production Reports — `/(app)/(tabs)/reports`
15. Settings — `/(app)/(tabs)/settings`

## 5. Operator Screens
1. Operator Dashboard — `/(app)/(tabs)/` (Role: Operator)
2. Assigned Worklist — `/(app)/(tabs)/work`
3. Universal Scanner — `/(app)/(tabs)/scan`
4. Scanned Bundle Details — `/(app)/bundles/[id]`
5. Hang-Tag Ticket Inspection — `/(app)/bundles/[id]`
6. Cutting Entry — `/(app)/operations/cutting-entry`
7. Sewing Out Entry — `/(app)/operations/sewing-entry`
8. Kaja / Button Entry — `/(app)/operations/kaja-entry`
9. Ironing & Trimming Entry — `/(app)/operations/ironing-entry`
10. Completed Quantity Stepper — `/(app)/(tabs)/scan`
11. Rework Tasks — `/(app)/(tabs)/`
12. Report Machine Issue — `/(app)/operations/report-issue`
13. Shift Output Tracker — `/(app)/(tabs)/`
14. Scan History — `/(app)/(tabs)/scan`
15. Settings — `/(app)/(tabs)/settings`

## 6. QC Inspector Screens
1. QC Dashboard — `/(app)/(tabs)/` (Role: QC)
2. Pending Inspection Queue — `/(app)/(tabs)/work`
3. Bundle Inspection Detail — `/(app)/inspections/[id]`
4. Inline QC Roving Audit — `/(app)/inspections/inline`
5. Endline 100% Inspection — `/(app)/inspections/endline`
6. Measurement Spec Sheet Check — `/(app)/inspections/measurement`
7. Defect Photo Evidence — `/(app)/inspections/photo-evidence`
8. QC Reinspection & Secondary Release — `/(app)/inspections/reinspection`
9. Quality Release Authorization — `/(app)/inspections/[id]`
10. Rework Management — `/(app)/(tabs)/`
11. QC Analytics & DHU Summary — `/(app)/(tabs)/reports`
12. Settings — `/(app)/(tabs)/settings`

## 7. Store / Dispatch Screens
1. Store Dashboard — `/(app)/(tabs)/` (Role: Store)
2. Stock Items & Movements — `/(app)/(tabs)/work`
3. Raw Material Goods Inward (Input In) — `/(app)/operations/input-in`
4. Issue to Production (Input Out) — `/(app)/operations/input-out`
5. Receive Output in Store (Output In) — `/(app)/operations/output-in`
6. Finished Goods Freight (Output Out) — `/(app)/operations/output-out`
7. Goods Receipt Note (GRN) — `/(app)/store/goods-receipt`
8. Inter-Factory Stock Transfer — `/(app)/store/inter-factory-transfer`
9. Storage Locations & Racks — `/(app)/store/locations`
10. Physical Stock Count & Audit — `/(app)/store/stock-count`
11. Finished Goods Store Cartons — `/(app)/(tabs)/`
12. Order Dispatch & Freight Manifest — `/(app)/store/dispatch`
13. Universal Barcode Scanner — `/(app)/(tabs)/scan`
14. Reports — `/(app)/(tabs)/reports`
15. Settings — `/(app)/(tabs)/settings`

## 8. Packing Staff Screens
1. Packing Dashboard — `/(app)/(tabs)/` (Role: Packing)
2. Assigned Packing Bundles — `/(app)/(tabs)/work`
3. Garment Hang-Tag Ticket — `/(app)/bundles/[id]`
4. QC Release Verification — `/(app)/(tabs)/`
5. Create Export Carton — `/(app)/cartons/create`
6. Carton Barcode Label & Seal Action — `/(app)/cartons/[id]`
7. Store Handover Slip — `/(app)/packing/handover`
8. Packing Audit History — `/(app)/packing/history`
9. Universal Barcode Scanner — `/(app)/(tabs)/scan`
10. Settings — `/(app)/(tabs)/settings`
