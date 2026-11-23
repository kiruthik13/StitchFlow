# StitchFlow Architecture

StitchFlow is an Android-first, mobile-only production monitoring and rework-aware bottleneck optimization application designed specifically for garment manufacturing environments.

## 1. High-Level Architectural Principles

- **Mobile-First & Tactile**: Built strictly for mobile handheld usage on the factory floor (narrow 360dp devices up to modern tablets/rugged scanners).
- **Separation of Concerns**: Feature-first structure with centralized core configurations, typed design system tokens, and unified state stores.
- **Backend-Agnostic UI**: All data access is mediated through typed TypeScript interfaces, Zustand state stores, and TanStack Query query clients, allowing seamless transition to NestJS REST APIs and Supabase PostgreSQL in the next phase.
- **Multilingual Support (i18n)**: Instant runtime switching between English (`en`), Tamil (`ta`), and Hindi (`hi`) across all UI strings, alerts, and instructions.
- **Strict Role-Based Access Control (RBAC)**: Supports 7 distinct factory roles from a single unified codebase with dynamic navigation and permission gates.

---

## 2. Directory Structure

```text
StitchFlow/
|-- app/                            # Expo Router file-based navigation
|   |-- _layout.tsx                 # Root layout (Theme, Auth, QueryClient, Gestures)
|   |-- index.tsx                   # Auth & startup router redirect
|   |-- (auth)/                     # Authentication & onboarding stack
|   |   |-- _layout.tsx
|   |   |-- language-selection.tsx  # First-launch language selection
|   |   |-- login.tsx               # Login screen + 7-role demo picker
|   |   |-- register.tsx            # Factory user registration
|   |   |-- forgot-password.tsx     # Password recovery
|   |-- (app)/                      # Authenticated application shell
|       |-- _layout.tsx             # Auth guard
|       |-- (tabs)/                 # Main bottom tabs
|       |   |-- _layout.tsx         # Role-aware tab bar
|       |   |-- index.tsx           # Dispatches to 7 role dashboards
|       |   |-- work.tsx            # Role-specific daily worklists
|       |   |-- scan.tsx            # Universal camera & manual barcode scanner
|       |   |-- reports.tsx         # Stage matrix, QC, & efficiency metrics
|       |   |-- settings.tsx        # Profile, language, theme, and notifications
|       |-- jobs/                   # Job master list & detail screens
|       |-- bundles/                # Garment hang-tag bundle detail screen
|       |-- inspections/            # Multi-tier QC inspection & defect logging
|       |-- cartons/                # Carton packaging & shipping label preview
|       |-- operations/             # Operation step completion screens
|
|-- src/
|   |-- core/                       # Core configurations, types & permission matrix
|   |   |-- types/                  # Typed interfaces for jobs, bundles, users, etc.
|   |   |-- permissions/            # RBAC permissions matrix for all 7 roles
|   |-- design-system/              # Centralized tactile dual-theme industrial design system
|   |   |-- tokens/                 # Light (Daylight Stone), Dark (Matte Obsidian), typography, spacing, radii
|   |   |-- components/             # 19 reusable tactile industrial UI components
|   |-- store/                      # Zustand state stores (auth, theme, language, demo mutations)
|   |-- fixtures/                   # Realistic factory mock datasets with verified QC math
|   |-- i18n/                       # i18next configuration & JSON translation dictionaries
|
|-- assets/                         # Splash screens, app icons, and fonts
|-- docs/                           # System documentation
|-- package.json
|-- tsconfig.json
```

---

## 3. State Management

- **`useAuthStore`**: Stores active `User`, authentication status, demo mode flag, and demo role switcher.
- **`useThemeStore`**: Controls `light` (Daylight Stone) vs `dark` (Matte Obsidian) themes, applying tokens instantly and persisting selection in `@react-native-async-storage/async-storage`.
- **`useLanguageStore`**: Manages i18n language selection (`en`, `ta`, `hi`) with persistent storage.
- **`useDemoStore`**: Maintains in-memory reactive state for bundles, jobs, cartons, inspections, and recent scans to support full interactive offline testing.

---

## 4. Universal Scanner Integration

The scanner module (`app/(app)/(tabs)/scan.tsx`) provides:
1. Native camera scanning using `expo-camera` supporting QR, Code 128, Code 39, EAN-13, ITF, etc.
2. Torch control and manual input fallback for factory environments with low light or degraded barcodes.
3. Interactive demo scan shortcut (e.g., `BND-00521`) to demonstrate end-to-end scanning, stage resolution, quantity verification, and stage progression without requiring physical barcodes.
4. Scan history log with timestamps and status indicators.
