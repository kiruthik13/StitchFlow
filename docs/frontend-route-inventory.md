# Frontend route inventory

Direct references from each Expo route file. See the integration matrix for feature contracts and indirect dependencies.

| Route file | Direct references |
| --- | --- |
| `app/_layout.tsx` | Auth store |
| `app/(app)/_layout.tsx` | Auth store |
| `app/(app)/(tabs)/_layout.tsx` | Auth store |
| `app/(app)/(tabs)/index.tsx` | Auth store |
| `app/(app)/(tabs)/reports.tsx` | Fixtures, Auth store |
| `app/(app)/(tabs)/scan.tsx` | Demo store, Fixtures, Auth store |
| `app/(app)/(tabs)/settings.tsx` | Auth store |
| `app/(app)/(tabs)/work.tsx` | Auth store |
| `app/(app)/approvals/_layout.tsx` | No direct data reference detected |
| `app/(app)/approvals/index.tsx` | No direct data reference detected |
| `app/(app)/bundles/_layout.tsx` | No direct data reference detected |
| `app/(app)/bundles/[id].tsx` | Demo store, Auth store |
| `app/(app)/cartons/_layout.tsx` | No direct data reference detected |
| `app/(app)/cartons/[id].tsx` | Demo store |
| `app/(app)/cartons/create.tsx` | Demo store, Fixtures |
| `app/(app)/inspections/_layout.tsx` | No direct data reference detected |
| `app/(app)/inspections/[id].tsx` | Demo store |
| `app/(app)/inspections/endline.tsx` | Demo store |
| `app/(app)/inspections/inline.tsx` | No direct data reference detected |
| `app/(app)/inspections/measurement.tsx` | No direct data reference detected |
| `app/(app)/inspections/photo-evidence.tsx` | No direct data reference detected |
| `app/(app)/inspections/reinspection.tsx` | No direct data reference detected |
| `app/(app)/jobs/_layout.tsx` | No direct data reference detected |
| `app/(app)/jobs/[id].tsx` | Demo store, Fixtures, Auth store |
| `app/(app)/jobs/create.tsx` | Demo store, Fixtures |
| `app/(app)/jobs/index.tsx` | Demo store |
| `app/(app)/management/_layout.tsx` | No direct data reference detected |
| `app/(app)/management/tags.tsx` | No direct data reference detected |
| `app/(app)/management/users.tsx` | No direct data reference detected |
| `app/(app)/masters/_layout.tsx` | No direct data reference detected |
| `app/(app)/masters/index.tsx` | Fixtures |
| `app/(app)/md/_layout.tsx` | No direct data reference detected |
| `app/(app)/md/bottlenecks.tsx` | No direct data reference detected |
| `app/(app)/md/factory-[id].tsx` | Fixtures |
| `app/(app)/md/sam-efficiency.tsx` | No direct data reference detected |
| `app/(app)/operations/_layout.tsx` | No direct data reference detected |
| `app/(app)/operations/[slug].tsx` | No direct data reference detected |
| `app/(app)/packing/_layout.tsx` | No direct data reference detected |
| `app/(app)/packing/handover.tsx` | Demo store |
| `app/(app)/packing/history.tsx` | No direct data reference detected |
| `app/(app)/planning/_layout.tsx` | No direct data reference detected |
| `app/(app)/planning/sam-entry.tsx` | Fixtures |
| `app/(app)/planning/workforce.tsx` | No direct data reference detected |
| `app/(app)/store/_layout.tsx` | No direct data reference detected |
| `app/(app)/store/dispatch.tsx` | Fixtures |
| `app/(app)/store/goods-receipt.tsx` | No direct data reference detected |
| `app/(app)/store/inter-factory-transfer.tsx` | No direct data reference detected |
| `app/(app)/store/locations.tsx` | No direct data reference detected |
| `app/(app)/store/stock-count.tsx` | No direct data reference detected |
| `app/(auth)/_layout.tsx` | No direct data reference detected |
| `app/(auth)/forgot-password.tsx` | Auth store |
| `app/(auth)/language-selection.tsx` | No direct data reference detected |
| `app/(auth)/login.tsx` | Auth store |
| `app/(auth)/register.tsx` | Auth store |
| `app/index.tsx` | Auth store |
