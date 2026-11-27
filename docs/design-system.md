# StitchFlow Design System

**Last Verified:** 2026-11-27  
**Source of Truth:** [src/design-system/tokens/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/design-system/tokens) and [src/design-system/components/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/design-system/components)

---

## 1. Visual Philosophy: Industrial Royal Blue UI

StitchFlow is designed specifically for garment manufacturing shop floors: fast-paced, variable-lighting environments where operators, supervisors, QC inspectors, and managers operate with thumbs on handheld mobile devices.

### Explicitly Excluded
- Neon glows and high-saturation decorative highlights
- Glassmorphism and backdrop blurs
- Multi-color decorative gradients
- Desktop grids or sidebar navigation
- Hardcoded inline hex colors (all colors must come from `useThemeStore().tokens`)

### Design Tenets
- **1px Hairline Borders**: Crisp separation of KPIs, lists, and action blocks (`tokens.border`).
- **Physical Garment Inspiration**: Hang-tag cards (`GarmentTicketCard`) with punch notches and dashed tear lines.
- **Compact Industrial Typography**: Monospaced numerals (`typography.fontFamily.mono`) for quantities, job codes, barcodes, and KPIs.
- **Bottom-Thumb Ergonomics**: Primary CTA buttons and the universal scanner FAB anchored to the bottom safe area; **minimum 44 × 44 pt** touch targets across all interactive elements.

---

## 2. Color Themes (Verified from Source)

### Light Theme — Industrial Royal Blue ([light.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/design-system/tokens/light.ts))
| Token | Value | Usage |
|---|---|---|
| `background` | `#F4F6F9` | Screen canvas |
| `surface` | `#FFFFFF` | Cards, sheets, modals |
| `surfaceSecondary` | `#EDF1F7` | Nested containers, chips |
| `surfaceElevated` | `#EDF1F7` | Elevated surfaces |
| `border` | `#DCE1E8` | Hairline card & list borders |
| `borderStrong` | `#BCBCBC` | Focused inputs, strong dividers |
| `textPrimary` | `#182233` | Headings, primary copy |
| `textSecondary` | `#596579` | Captions, metadata |
| `textDisabled` | `#A9A9A9` | Disabled labels |
| `textInverse` | `#FFFFFF` | Text on brand/dark surfaces |
| `brand` | `#4469B1` | Primary Royal Blue brand accent |
| `brandButton` | `#4469B1` | Primary CTA fill |
| `brandButtonText` | `#FFFFFF` | Primary CTA label |
| `brandLight` | `#EAF0FA` | Soft brand tint / active pill fill |
| `brandDark` | `#284578` | Deep royal blue |
| `primaryDeep` | `#284578` | Deep accent |
| `success` / `successText` / `successLight` | `#1CA64A` / `#147D38` / `#E9F7EE` | Passed QC, active status |
| `warning` / `warningText` / `warningLight` | `#FBB315` / `#9A6500` / `#FFF7E0` | Rework, pending approvals |
| `danger` / `dangerText` / `dangerLight` | `#EC3327` / `#C41E14` / `#FDECEC` | Rejected, critical alerts |
| `info` / `infoLight` | `#4469B1` / `#EAF0FA` | Informational banners |

### Dark Theme — Matte Slate ([dark.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/design-system/tokens/dark.ts))
| Token | Value | Usage |
|---|---|---|
| `background` | `#10151E` | Screen canvas |
| `surface` | `#19212D` | Cards, sheets |
| `surfaceSecondary` | `#222D3B` | Nested containers |
| `surfaceElevated` | `#222D3B` | Elevated surfaces |
| `border` | `#303A49` | Hairline borders |
| `borderStrong` | `#4C5D73` | Strong dividers |
| `textPrimary` | `#F0F3F8` | Primary copy |
| `textSecondary` | `#BCBCBC` | Captions, metadata |
| `textDisabled` | `#A9A9A9` | Disabled labels |
| `textInverse` | `#10151E` | Text on light/inverse surfaces |
| `brand` | `#87A5E0` | Soft royal blue for dark mode |
| `brandButton` | `#4469B1` | Primary CTA fill |
| `brandButtonText` | `#FFFFFF` | Primary CTA label |
| `brandLight` | `#202F49` | Soft brand tint |
| `brandDark` | `#284578` | Deep royal blue |
| `success` / `successText` / `successLight` | `#1CA64A` / `#48CF78` / `#142E21` | Passed QC, active status |
| `warning` / `warningText` / `warningLight` | `#FBB315` / `#FBB315` / `#352B16` | Rework, pending approvals |
| `danger` / `dangerText` / `dangerLight` | `#EC3327` / `#FF746B` / `#361E20` | Rejected, critical alerts |
| `info` / `infoLight` | `#87A5E0` / `#202F49` | Informational banners |
| `overlay` | `rgba(10, 14, 20, 0.78)` | Modal backdrop |

---

## 3. Typography, Spacing & Radii

### Typography ([typography.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/design-system/tokens/typography.ts))
- **Sans**: System (`sans-serif` / `sans-serif-medium` / `sans-serif-bold` on Android; `System` on iOS)
- **Monospace**: `monospace` (Android) / `Courier` & `Courier-Bold` (iOS)
- **Font Scale**: `xs: 11`, `sm: 12`, `base: 14`, `md: 15`, `lg: 16`, `xl: 18`, `2xl: 20`, `3xl: 24`, `4xl: 28`, `5xl: 36`, `6xl: 42`
- **Line Heights**: `tight: 1.15`, `snug: 1.3`, `normal: 1.45`, `relaxed: 1.6`
- **Letter Spacing**: `tight: -0.5`, `normal: 0`, `wide: 0.4`, `wider: 0.8`, `widest: 1.5`

### Spacing ([spacing.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/design-system/tokens/spacing.ts))
4/8-point scale: `0, 2 (0.5), 4 (1), 6 (1.5), 8 (2), 10 (2.5), 12 (3), 14 (3.5), 16 (4), 18 (4.5), 20 (5), 24 (6), 28 (7), 32 (8), 36 (9), 40 (10), 48 (12), 56 (14), 64 (16), 80 (20), 96 (24)`.

### Radii ([radii.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/design-system/tokens/radii.ts))
`none: 0`, `xs: 2`, `sm: 4`, `md: 6`, `lg: 10`, `xl: 12` (buttons), `card: 14` (standard cards), `2xl: 16`, `hero: 18` (hero cards), `3xl: 20`, `full: 9999` (pills/avatars).

---

## 4. Shared & Dashboard Components

### Core UI Primitives ([src/design-system/components/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/design-system/components))
`AppButton`, `AppCard`, `AppHeader`, `AppInput`, `AppText`, `BarcodeResultCard`, `BottomScanAction`, `ConfirmSheet`, `DataRow`, `EmptyState`, `FilterBar`, `GarmentTicketCard`, `JobTicketCard`, `LanguageSwitcher`, `LoadingSkeleton`, `LoadingState`, `MetricCard`, `PressableScale`, `ProductionLineRow`, `ProductionOutputCard`, `ProductionStageStepper`, `QCGateCard`, `QuantityStepper`, `QuickOperationsGrid`, `ScannerActionCard`, `SearchField`, `SectionHeader`, `ShiftProgressCard`, `StatusBadge`, `ThemeSelector`.

### Branding & Feedback
- `branding/`: `BrandHeader` (demo badge gated by `isDemoMode`), `BrandMark`, `StitchFlowAnimatedLogo`, `StitchFlowLogo`, `StitchFlowSymbol`, `StitchFlowWordmark`
- `feedback/`: `BrandLoadingIndicator`, `ScreenLoader`
- `splash/`: `AnimatedBrandSplash`

### Dashboard Component Architecture ([src/design-system/components/dashboard/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/design-system/components/dashboard))
- `DashboardCards.tsx`: `PremiumKPICard`, `CompactMetricCard`, `ProductionProgressCard`, `PriorityActionCard`, `DashboardQuickAction`, `FactorySelector`, `ShiftIndicator`, `SyncStatusIndicator`, `DashboardSkeleton`
- `DashboardCharts.tsx`: `StagePipeline`, `QualitySummaryCard`, `ProductionTrendChart`, `WorkOrderPreview`, `ActivityTimeline`
- `DashboardHeader.tsx`: Role-aware header wrapping `BrandHeader`

---

## 5. Seven Role-Based Dashboard Layouts (`src/roles/`)

All 7 dashboards consume [useLiveDashboardData.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/features/operations/useLiveDashboardData.ts) in live mode and `useDemoStore` / `fixtures` in demo mode:

1. **Managing Director (`MDDashboard.tsx`)**: Executive header, factory selector, date-range filter, total/active/high-risk orders, stage pipeline, factory comparison cards, rework/rejection summary, packing/dispatch overview, quick actions.
2. **Factory Manager (`FMDashboard.tsx`)**: Factory-scoped shift progress, active work orders, line efficiency cards, pending approvals alert, quick operations.
3. **Supervisor (`SupervisorDashboard.tsx`)**: Shift KPIs, line bundles WIP, operator assignment summary, inline QC status, bottleneck alerts.
4. **Operator (`OperatorDashboard.tsx`)**: Personal output vs target, active bundle hang-tag ticket, station entry shortcuts (cutting, sewing, kaja, ironing), scan CTA.
5. **QC Inspector (`QCDashboard.tsx`)**: Pending inspection queue, `QualitySummaryCard` (Inspected = Passed + Rework + Rejected), rework queue, quick audit shortcuts.
6. **Store & Dispatch (`StoreDashboard.tsx`)**: Raw inventory alerts, cut-stock handovers, finished goods cartons ready, dispatch manifest summary.
7. **Packing Staff (`PackingDashboard.tsx`)**: QC-released quantities available to pack, carton creation progress, handover slip shortcuts.

---

## 6. Navigation, Localization & Accessibility

- **Navigation Styling ([app/(app)/(tabs)/_layout.tsx](file:///c:/Users/Kathik/Downloads/StitchFlow-main/app/(app)/(tabs)/_layout.tsx))**: 5-tab mobile bottom bar (Home, Work, Scanner FAB, Reports, Settings); Scanner FAB uses `tokens.brandButton` and `tokens.brandButtonText`.
- **Localization**: All user-facing UI strings use `useTranslation()` (`en`, `ta`, `hi` in `src/i18n/`). Barcodes, IDs (`JOB-1001`, `BND-00521`), and raw numbers are never localized.
- **Responsive Mobile Design**: Portrait-only (`orientation: "portrait"` in `app.json`), single-column / compact 2-column mobile layouts supporting narrow 360dp handhelds up to rugged factory tablets.
- **Accessibility**: Minimum `44 × 44 pt` touch targets on all buttons, list items, and quick-action tiles; semantic status text paired with status colors (`StatusBadge`).
