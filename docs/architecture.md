# StitchFlow Architecture

**Last Verified:** 2026-11-27  
**Source of Truth:** [package.json](file:///c:/Users/Kathik/Downloads/StitchFlow-main/package.json), [app.json](file:///c:/Users/Kathik/Downloads/StitchFlow-main/app.json), [app/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/app), and [src/](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src).

StitchFlow is an Android-first, mobile-only production monitoring and rework-aware bottleneck optimization application designed specifically for garment manufacturing environments.

## 1. High-Level Architectural Principles

- **Mobile-Only Industrial Design**: Built strictly for mobile handheld usage on the factory floor (portrait orientation, minimum 44 × 44 pt touch targets, no desktop grids or sidebars).
- **Separation of Concerns**: Feature-first structure with centralized design system tokens (`src/design-system/tokens/`), typed repositories (`src/services/repositories/`), and Zustand + TanStack Query state management.
- **Dual-Mode Operation**: Supports **Live Mode** (`EXPO_PUBLIC_DEMO_MODE=false`, backed by NestJS + Supabase + Upstash Redis) and **Demo Mode** (`EXPO_PUBLIC_DEMO_MODE=true`, backed by `useDemoStore` and `src/fixtures/`).
- **Multilingual Support (i18n)**: Runtime localization via `react-i18next` across English (`en`), Tamil (`ta`), and Hindi (`hi`).
- **Strict Role-Based Access Control (RBAC)**: Supports 7 distinct factory roles from a single unified codebase with server-enforced guards and client-side permission checks.

---

## 2. Directory Structure

```text
StitchFlow-main/
├── app/                            # Expo Router v3 file-based navigation
│   ├── _layout.tsx                 # Root layout (Theme, Auth, QueryClient, Gestures)
│   ├── index.tsx                   # Auth & startup router redirect
│   ├── (auth)/                     # Authentication & onboarding stack
│   │   ├── _layout.tsx
│   │   ├── language-selection.tsx  # Language selection
│   │   ├── login.tsx               # Live email/password + 7-role demo switcher
│   │   ├── register.tsx            # Roster-matched employee registration
│   │   └── forgot-password.tsx     # Password recovery
│   └── (app)/                      # Authenticated application shell
│       ├── _layout.tsx             # Auth guard
│       ├── (tabs)/                 # Main 5-tab bottom navigator
│       ├── approvals/              # Draft job approval queue
│       ├── bundles/                # Bundle hang-tag detail & reprint
│       ├── cartons/                # Carton creation & label/seal preview
│       ├── inspections/            # Inline, endline, measurement, photo, reinspection
│       ├── jobs/                   # Job list, create, detail & route setup
│       ├── management/             # User roster/approvals & tag print queue
│       ├── masters/                # Buyers, styles, lines, locations, stages
│       ├── md/                     # MD factory/[id] (6-tab), line/[id], bottlenecks, sam-efficiency
│       ├── operations/             # Cutting, sewing, kaja, ironing, stock movements, issues
│       ├── packing/                # Store handover & packing history
│       ├── planning/               # SAM entry & workforce planning
│       └── store/                  # GRN, transfers, locations, stock-count, dispatch
│
├── src/
│   ├── core/                       # Types (`src/core/types/`), permissions (`src/core/permissions/`)
│   ├── design-system/              # Industrial Royal Blue tokens (`light.ts`, `dark.ts`), shared & dashboard components
│   ├── features/operations/        # `useLiveDashboardData.ts` unified role dashboard hook
│   ├── fixtures/                   # Demo datasets with reconciled QC equations
│   ├── hooks/                      # Shared React hooks
│   ├── i18n/                       # `en.json`, `ta.json`, `hi.json`
│   ├── roles/                      # 7 role dashboard components
│   ├── services/
│   │   ├── adapters/               # `hidScannerAdapter.ts`
│   │   ├── api/                    # `apiClient.ts`, `useFactoryUpdates.ts`
│   │   ├── offline/                # `offlineQueueService.ts` (AsyncStorage queue)
│   │   ├── printer/                # `thermalPrinterService.ts` (ZPL/TSPL bridge & share)
│   │   └── repositories/           # `bundleRepository`, `inventoryRepository`, `jobRepository`, `masterRepository`, `qcRepository`
│   ├── store/                      # `authStore`, `themeStore`, `languageStore`, `demoStore`
│   └── utils/                      # Formatting & barcode utilities
│
├── backend/                        # NestJS REST API (`/api/v1/`)
├── supabase/migrations/            # 22 SQL migrations (`202611260001` – `202611260022`)
├── docs/                           # System documentation
├── AGENTS.md                       # Engineering & documentation guidelines
├── eas.json                        # EAS Build profiles (development, preview, production)
├── app.json                        # Expo SDK 58 configuration
└── package.json
```

---

## 3. State Management

- **`useAuthStore`**: Stores active `User`, JWT session, demo mode flag, and role metadata.
- **`useThemeStore`**: Controls `light` vs `dark` themes, applying Industrial Royal Blue tokens and persisting via `AsyncStorage`.
- **`useLanguageStore`**: Manages `i18next` locale (`en`, `ta`, `hi`) with persistent storage.
- **`useDemoStore`**: Maintains reactive in-memory state for demo mode (`EXPO_PUBLIC_DEMO_MODE=true`).

---

## 4. Universal Scanner & Offline Integration

- **Camera & Manual Input ([app/(app)/(tabs)/scan.tsx](file:///c:/Users/Kathik/Downloads/StitchFlow-main/app/(app)/(tabs)/scan.tsx))**: Uses `expo-camera` (ML Kit Android) supporting 13 native symbologies (`qr`, `code128` / GS1-128, `code39`, `code93`, `itf14`, `ean13`, `ean8`, `upc_a`, `upc_e`, `codabar`, `datamatrix`, `pdf417`, `aztec`) with torch toggle, 1D/2D reticle mode, and manual barcode lookup (`POST /api/v1/barcodes/resolve`).
- **Centralized Barcode & GS1 Processor ([barcodeProcessor.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/services/barcode/barcodeProcessor.ts))**: Preserves raw payloads & leading zeros, parses GS1 Application Identifiers (`00`, `01`, `10`, `11`, `17`, `21`, `37`), validates Mod-10 check digits, and extracts AIM symbology prefixes.
- **HID Keyboard-Wedge Adapter ([hidScannerAdapter.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/services/adapters/hidScannerAdapter.ts))**: Captures USB OTG / Bluetooth HID scanner input terminated by Enter or Tab (supporting external-decoder-only symbologies such as Code-11, MSI, Pharmacode, Flattermarken, Standard/Industrial 2 of 5, GS1 DataBar, Micro QR, and MicroPDF417).
- **Offline Queue ([offlineQueueService.ts](file:///c:/Users/Kathik/Downloads/StitchFlow-main/src/services/offline/offlineQueueService.ts))**: Queues `cutting` and `stage` events in `AsyncStorage` when offline and replays them to `POST /api/v1/sync/production`.
