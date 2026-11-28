# StitchFlow

**Intelligent Garment Production Monitoring System**

A mobile-first, role-based production intelligence platform built for the garment manufacturing industry. StitchFlow tracks every piece of fabric — from cutting room to dispatch — across multiple factories, production units, and shifts, with real-time dashboards for seven distinct operational roles.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Design System](#design-system)
- [Role-Based Access](#role-based-access)
- [Features by Module](#features-by-module)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Multilingual Support](#multilingual-support)
- [Demo Mode vs Live Mode](#demo-mode-vs-live-mode)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Implementation Roadmap](#implementation-roadmap)
- [Engineering Guidelines (AGENTS.md)](#engineering-guidelines)

---

## Overview

StitchFlow is a **mobile-only** React Native + Expo application designed for garment manufacturing shop floors. It replaces paper-based tracking with a digitised, real-time production intelligence layer.

| Attribute | Value |
|-----------|-------|
| App Name | StitchFlow |
| Bundle ID | `com.stitchflow.app` |
| Version | 1.0.0 |
| Orientation | Portrait |
| Platform | Android (primary), iOS |
| EAS Project ID | `2df35e37-7a91-4844-b66a-cc9549f80838` |
| Production API | `https://stitchflow-backend-production-e577ff0c.up.railway.app/api/v1` |
| Repository | `https://github.com/kiruthik13/StitchFlow` |

### Key Capabilities

- **Multi-factory hierarchy**: Organization → Factories → Production Units → Departments → Lines → Supervisors → Operators
- **End-to-end production tracking**: Cutting → Sewing → Kaja Button → Ironing → QC → Packing → Dispatch
- **Real-time WebSocket sync**: Live cross-stage TanStack Query invalidation and bottleneck monitoring across all 7 roles
- **4-input, 3-tier hybrid barcode scanning**: Camera (ML Kit Tier 1 + native ZXing-C++ Tier 2 + grayscale CV Tier 3), Hardware HID/USB/Bluetooth, Manual Entry, and Offline Outbox replay
- **Role-scoped exports & reporting**: PDF and Excel data export, structured industrial carton shipping labels, and readable executive Share Job reports
- **Offline-aware** with async queue replay (`/sync/production`)
- **Three languages**: English, Tamil, Hindi
- **Light and Dark mode** with automatic system detection

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               StitchFlow Mobile App                  │
│        React Native 0.88 + Expo SDK 58               │
│    Expo Router v3  │  TanStack Query  │  Zustand      │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / JWT
┌─────────────────────▼───────────────────────────────┐
│            NestJS Backend (Railway)                   │
│   Auth  │  RBAC  │  Factories  │  Jobs  │  Workflow   │
│   QC    │  Inventory  │  Planning  │  Audit Logs      │
└──────────────┬───────────────────┬──────────────────┘
               │                   │
┌──────────────▼──────┐  ┌─────────▼──────────────────┐
│  Supabase (Postgres) │  │  Upstash Redis             │
│  Row-Level Security  │  │  Cache + Rate Limiting     │
│  Auth + RLS Policies │  │  Session Tokens            │
└─────────────────────┘  └────────────────────────────┘
```

### Frontend Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.88.1 |
| SDK | Expo 58 (New Architecture enabled) |
| Navigation | Expo Router v3 (file-based, typed routes) |
| State — Server | TanStack Query v5 |
| State — UI | Zustand v5 |
| Localisation | react-i18next + expo-localization |
| Icons | Lucide React Native + @expo/vector-icons |
| Animations | React Native Reanimated 4 + Worklets |
| Camera | expo-camera (barcode + QR) |
| Gestures | react-native-gesture-handler |
| SVG | react-native-svg |
| TypeScript | v6.0 strict |

### Backend Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 10 |
| Language | TypeScript 5.7 |
| Database | PostgreSQL via Supabase + `pg` driver |
| Cache / Rate-Limit | Upstash Redis via `ioredis` |
| Auth | Supabase Auth + JWT, RBAC Guards |
| API Docs | Swagger / OpenAPI (`@nestjs/swagger`) |
| Security | Helmet, UUID validation, DTO class-validator |
| Hosting | Railway (auto-deploy from `main` branch) |
| Testing | Jest 29, 20 suites, 100 tests |

---

## Project Structure

```
StitchFlow-main/
├── app/                          # Expo Router file-based routes
│   ├── (auth)/                   # Unauthenticated screens
│   │   ├── index.tsx             # Splash / redirect
│   │   ├── login.tsx             # Role-aware login
│   │   └── language-selection.tsx
│   └── (app)/                    # Authenticated screens (JWT required)
│       ├── (tabs)/               # Bottom tab navigator
│       │   ├── _layout.tsx       # Tab config with scanner FAB
│       │   ├── index.tsx         # Role-dispatched dashboard
│       │   ├── jobs.tsx          # Job list
│       │   ├── scan.tsx          # Universal barcode scanner
│       │   └── settings.tsx      # Profile / theme / language
│       ├── approvals/            # Job approval workflow
│       ├── bundles/              # Bundle management
│       ├── cartons/              # Carton packing
│       ├── inspections/          # QC inspection screens
│       ├── jobs/                 # Job detail + create
│       ├── management/           # Admin master data
│       ├── masters/              # Buyers, styles, locations
│       ├── md/                   # Managing Director screens
│       │   ├── factory/[id].tsx  # 6-tab factory dashboard
│       │   ├── line/[id].tsx     # Production line detail
│       │   └── factories.tsx     # Factory listing
│       ├── operations/           # Cutting, sewing, production events
│       ├── packing/              # Packing staff screens
│       ├── planning/             # SAM, workforce, what-if
│       └── store/                # Inventory & dispatch
│
├── src/
│   ├── core/
│   │   ├── types/index.ts        # Shared TypeScript interfaces
│   │   └── constants/            # API base URL, timeouts
│   ├── design-system/
│   │   ├── tokens/
│   │   │   ├── light.ts          # Light mode design tokens
│   │   │   └── dark.ts           # Dark mode design tokens
│   │   ├── components/
│   │   │   ├── dashboard/        # Shared dashboard components
│   │   │   │   ├── DashboardCards.tsx
│   │   │   │   ├── DashboardCharts.tsx
│   │   │   │   ├── DashboardHeader.tsx
│   │   │   │   └── index.ts
│   │   │   ├── branding/         # BrandHeader, Logo
│   │   │   ├── common/           # AppButton, StatusBadge, EmptyState …
│   │   │   └── LanguageSwitcher.tsx
│   │   └── layouts/              # Screen layout wrappers
│   ├── features/
│   │   └── operations/
│   │       └── useLiveDashboardData.ts  # Unified TanStack Query hook (all roles)
│   ├── fixtures/                 # Demo mock data
│   ├── hooks/                    # useThemeStore, useDemoStore, useAuthStore …
│   ├── i18n/
│   │   ├── en.json               # English translations
│   │   ├── ta.json               # Tamil translations
│   │   └── hi.json               # Hindi translations
│   ├── roles/                    # Role dashboard components
│   │   ├── MDDashboard.tsx
│   │   ├── FMDashboard.tsx
│   │   ├── SupervisorDashboard.tsx
│   │   ├── OperatorDashboard.tsx
│   │   ├── QCDashboard.tsx
│   │   ├── StoreDashboard.tsx
│   │   └── PackingDashboard.tsx
│   ├── services/
│   │   ├── barcode/              # 3-tier hybrid decoder & GS1/payload processor
│   │   ├── notifications/        # Real-time notification handlers
│   │   ├── offline/              # Durable AsyncStorage outbox replay
│   │   ├── printer/              # ZPL/TSPL tag & label printing
│   │   └── repositories/
│   │       ├── masterRepository.ts    # Factories, buyers, styles, lines
│   │       ├── jobRepository.ts       # Jobs, bundles
│   │       ├── workflowRepository.ts  # Production events, QC, dispatch
│   │       ├── inventoryRepository.ts # Inventory ledger
│   │       └── planningRepository.ts  # SAM, planning
│   ├── store/
│   │   ├── authStore.ts          # JWT, user profile, role
│   │   ├── themeStore.ts         # Light/Dark mode
│   │   ├── languageStore.ts      # Active locale
│   │   └── demoStore.ts          # Mutable demo-mode state
│   └── utils/                    # formatDate, formatQty, barcodeUtils …
│
├── android-native/               # Custom Android native module (ZXing-C++ bridge)
├── plugins/                      # Expo config plugin for native barcode decoder
│
├── backend/
│   ├── src/
│   │   ├── common/
│   │   │   ├── guards/           # JwtAuthGuard, RolesGuard, FactoryScopeGuard
│   │   │   ├── decorators/       # @Roles(), @CurrentUser()
│   │   │   └── dto/              # Shared DTOs with class-validator
│   │   ├── config/               # Env validation, Redis config
│   │   ├── database/
│   │   │   └── migrations/       # 0001–0022 SQL migration files
│   │   └── modules/
│   │       ├── auth/             # Login, JWT issue, Supabase verify
│   │       ├── audit/            # Audit log entries
│   │       ├── factories/        # Factory CRUD + hierarchy + lines
│   │       ├── health/           # /health endpoint
│   │       ├── inventory/        # Ledger, cartons, dispatch
│   │       ├── jobs/             # Jobs, approvals, bundles, barcodes
│   │       ├── notifications/    # Role-scoped notifications & WebSocket sync
│   │       ├── organizations/    # Org bootstrap, buyers, styles
│   │       ├── planning/         # SAM, workforce, what-if
│   │       ├── redis/            # Cache service, rate-limit guard
│   │       ├── users/            # User management, roles
│   │       └── workflow/         # Cutting, production, QC, packing, rework
│   └── test/                     # Jest spec files (20 suites)
│
├── docs/
│   └── implementation-roadmap.md # Phase-by-phase delivery status
├── assets/
│   ├── icons/                    # App icon, adaptive icon
│   └── splash/                   # Splash screen (light + dark)
├── AGENTS.md                     # Engineering guidelines for AI agents
├── app.json                      # Expo configuration
└── package.json
```

---

## Design System

### Theme Tokens

All colours, spacing, typography and radii are defined as design tokens — **never** inline hex values.

```
src/design-system/tokens/
├── light.ts    # Light mode — white backgrounds, royal blue brand
└── dark.ts     # Dark mode — dark slate backgrounds, same brand hue
```

| Token Group | Examples |
|------------|---------|
| `tokens.brand` | Primary royal blue `#4469B1` |
| `tokens.brandButton` | CTA button background |
| `tokens.brandButtonText` | CTA button label |
| `tokens.surface` | Card / sheet background |
| `tokens.surfaceAlt` | Secondary surface |
| `tokens.text` | Primary text |
| `tokens.textSecondary` | Muted / caption text |
| `tokens.border` | Divider and card border |
| `tokens.success` / `tokens.warning` / `tokens.error` | Semantic status colours |

### Shared Dashboard Components

Located at `src/design-system/components/dashboard/`:

| Component | Purpose |
|-----------|---------|
| `PremiumKPICard` | Large metric card with icon, label, value, trend |
| `CompactMetricCard` | Small inline metric tile |
| `ProductionProgressCard` | Target vs actual with progress bar |
| `PriorityActionCard` | Actionable alert card with urgency colour |
| `DashboardQuickAction` | Icon grid shortcut button |
| `FactorySelector` | Horizontal factory picker chip list |
| `ShiftIndicator` | Current shift pill (Morning / Evening / Night) |
| `SyncStatusIndicator` | Live / Offline / Syncing pill |
| `DashboardSkeleton` | Animated placeholder during data fetch |
| `StagePipeline` | Horizontal pipeline: Cutting → Sewing → QC → Packing |
| `QualitySummaryCard` | Inspected / Passed / Rework / Rejected breakdown |
| `ProductionTrendChart` | SVG bar chart of daily output |
| `WorkOrderPreview` | Compact job card in MD overview |
| `ActivityTimeline` | Chronological audit event list |

### Typography

Editorial, premium feel inspired by Linear and Stripe:
- **Headers**: Bold, tight tracking
- **KPI values**: Large numeral, medium weight
- **Labels**: Uppercase small-caps where appropriate
- **Body**: Regular weight, comfortable line-height

### Touch Targets

All interactive elements maintain a **minimum 44 × 44 pt** touch area per AGENTS.md rules and Apple HIG / Material guidelines.

---

## Role-Based Access

StitchFlow enforces a seven-role RBAC model at both the backend (NestJS `RolesGuard`) and frontend (route-level auth checks).

| Role | Key | Dashboard Focus |
|------|-----|----------------|
| Managing Director | `md` | Executive intelligence — factory comparison, high-risk orders, planning |
| Factory Manager | `factory-manager` | Factory-scoped production overview, line performance |
| Supervisor | `supervisor` | Shift dashboard, operator assignments, QC summary |
| Operator | `operator` | Personal production target, bundle scanning, cutting entry |
| QC Inspector | `qc-inspector` | Inspection queue, pass/rework/reject decisions |
| Store & Dispatch | `store-dispatch` | Inventory ledger, carton receive, dispatch with gate-pass |
| Packing Staff | `packing-staff` | Carton packing, bundle verification, packing progress |

### Role Hierarchy & Scope

```
Organization
└── Managing Director          ← sees all factories
    └── Factory Manager        ← scoped to assigned factory (FactoryScopeGuard)
        └── Supervisor         ← scoped to assigned production unit / shift
            ├── Operator       ← scoped to assigned line
            ├── QC Inspector   ← scoped to QC stage
            ├── Store Dispatch ← scoped to store / dispatch
            └── Packing Staff  ← scoped to packing floor
```

> **Note**: Factory Managers attempting to access another factory's data receive HTTP 403 from `FactoryScopeGuard`.

---

## Features by Module

### Managing Director Dashboard
- Executive KPI summary (total/active orders, SAM efficiency, risk index)
- Real-time bottleneck analysis (stage, rework, and pace bottlenecks computed from live production data)
- Factory selector + date-range filter
- Stage-wise production pipeline visualization (cutting, sewing, QC, packing, dispatched pieces)
- Factory performance comparison (efficiency %, output vs target)
- Rework and loss summary
- High-risk production orders with ETA warning
- 6-tab factory drilldown: **Overview · Units · Lines · Orders · Workforce · Store**
- Production line detail with live occupancy and output
- Role-scoped PDF/Excel export and executive Share Job summary

### Factory Manager Dashboard
- Factory-scoped production overview
- Unit and line performance cards
- Active work orders with stage progress
- Operator attendance and shift coverage
- Critical alerts and threshold breaches

### Supervisor Dashboard
- Shift-level KPIs (output, efficiency, attendance)
- Work assignment and tailor-to-operation mapping
- Live SAM monitor
- Tag reprints (ZPL/TSPL) and barcode scanning
- Machine stoppage reporting and inline QC summary

### Operator Dashboard
- Personal production target vs actual
- Current bundle and operation
- Stage entries: Cutting entry, Sewing out, Kaja button, and Ironing entry
- Enhanced Report Machine stoppage mechanism
- Barcode / QR scanner integration for bundle tracking

### QC Inspector Dashboard
- Inspection queue with route readiness & pending-stage verification before inspection/release
- Pass / Rework / Reject decision entry
- QC equation enforced: `Inspected = Passed + Rework + Rejected` (released never exceeds passed)
- Reinspection and release flow for rework batches
- Deduplicated inline and intermediate QC audits
- Real-time Expo Camera evidence capture and upload

### Store & Dispatch Dashboard
- Raw material inventory ledger
- Output receipt from production floor
- Carton management, manifest filtering, and dispatch approval
- Structured industrial record cards and PDF gate-pass generation
- Partial loss recovery and return flows

### Packing Staff Dashboard
- Carton creation with accurate remaining packable quantity validation
- Structured industrial shipping carton labels
- Bundle barcode verification and packing progress per job
- Shipment manifest preparation

### Hybrid Barcode Scanning Architecture
- **4 Input Channels**: Live Camera, Hardware HID/USB/Bluetooth scanners, Manual Entry, and Offline Outbox replay
- **3 Decoding Tiers** (`app/(app)/(tabs)/scan.tsx`, `src/services/barcode/`, `android-native/StitchFlowBarcodeModule.kt`):
  - **Tier 1 (ML Kit / Expo Camera)**: Standard 1D/2D (`QR_CODE`, `DATA_MATRIX`, `AZTEC`, `PDF417`, `CODE_128`, `CODE_39`, `CODE_93`, `ITF`, `EAN_13`, `EAN_8`, `UPC_A`, `UPC_E`, `CODABAR`)
  - **Tier 2 (Native ZXing-C++)**: `MICRO_QR_CODE`, `DATA_BAR`, `DATA_BAR_EXPANDED`, plus EXIF rotation and 1D/2D fallback
  - **Tier 3 (Grayscale CV Decoder)**: `CODE_11`, `MSI`, `INDUSTRIAL_2_OF_5`, `PHARMACODE_1T`, `PHARMACODE_2T`, and `FLATTERMARKEN` with Otsu thresholding, contrast-range gating, and concurrency lock (`inFlight`)
- **Strict Pattern Decoding**: Zero OCR or text recognition; preserves leading zeros, case sensitivity, raw payloads, and GS1 `\x1d` separators

---

## Environment Variables

### Frontend (`.env`)

| Variable | Required | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | ✅ | Backend API base URL |
| `EXPO_PUBLIC_DEMO_MODE` | ✅ | `true` = mock data, `false` = live API |

**Production values:**
```
EXPO_PUBLIC_API_BASE_URL=https://stitchflow-backend-production-e577ff0c.up.railway.app/api/v1
EXPO_PUBLIC_DEMO_MODE=false
```

### Backend (Railway Environment Variables)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (IPv4 pooler) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side auth |
| `JWT_SECRET` | JWT signing secret |
| `REDIS_URL` | Upstash Redis connection string |
| `PORT` | Server port (Railway sets this automatically) |
| `NODE_ENV` | `production` |

> **Security**: Never commit credentials to version control. All secrets are stored in Railway's encrypted environment variables panel.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`
- Android Studio or physical Android device

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/kiruthik13/StitchFlow.git
cd StitchFlow-main

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your API URL and demo mode setting

# Start the development server
npm start
# or for Android directly
npm run android
```

### Backend Setup (Local)

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Fill in DATABASE_URL, SUPABASE_*, JWT_SECRET, REDIS_URL

# Run database migrations
npm run build
npm run migrate:up

# Start development server
npm run start:dev

# Run tests
npm test
```

### TypeScript Validation

```bash
# Frontend (root)
npm run ts-check

# Backend
cd backend && npx tsc --noEmit
```

---

## API Reference

Base URL: `https://stitchflow-backend-production-e577ff0c.up.railway.app/api/v1`

> Full OpenAPI/Swagger docs available at `/api/docs` when the backend is running.

### Core Endpoints

| Method | Path | Role(s) | Description |
|--------|------|---------|-------------|
| `GET` | `/health` | Public | Health check |
| `POST` | `/auth/login` | Public | Login, returns JWT |
| `GET` | `/auth/me` | All | Current user profile |
| `GET` | `/factories` | MD, FM | List factories with live metrics |
| `GET` | `/factories/:id` | MD, FM | Factory detail |
| `GET` | `/factories/:id/hierarchy` | MD | Full org hierarchy for a factory |
| `GET` | `/factories/:id/lines/:lineId` | MD, FM | Production line detail |
| `GET` | `/jobs` | MD, FM, Supervisor | Paginated job list |
| `POST` | `/jobs` | MD, FM | Create production job |
| `GET` | `/jobs/:id` | All | Job detail |
| `PATCH` | `/jobs/:id/approve` | MD, FM | Approve job |
| `GET` | `/jobs/:id/bundles` | All | Bundles for a job |
| `GET` | `/barcodes/:code` | All | Universal barcode / QR resolution |
| `POST` | `/workflow/cutting` | Operator | Submit cutting entry |
| `POST` | `/workflow/production` | Operator | Submit production event |
| `POST` | `/inspections` | QC | Create QC inspection |
| `PATCH` | `/inspections/:id` | QC | Update inspection result |
| `GET` | `/inventory` | Store | Inventory ledger |
| `POST` | `/inventory/cartons` | Store, Packing | Create carton |
| `POST` | `/inventory/dispatch` | Store | Dispatch approval |
| `GET` | `/planning/sam` | MD, FM, Supervisor | SAM and workforce data |
| `GET` | `/planning/what-if` | MD | What-if simulation |
| `GET` | `/users` | MD | User management |
| `GET` | `/audit` | MD | Audit log entries |

### Authentication

All protected routes require:
```
Authorization: Bearer <JWT>
```

JWT is issued on successful `/auth/login` and contains `userId`, `role`, `orgId`, and optionally `factoryId`.

---

## Database Schema

### Key Tables (Supabase / PostgreSQL)

| Table | Description |
|-------|-------------|
| `organizations` | Top-level tenant (garment company) |
| `factories` | Physical factory sites under an org |
| `production_units` | Units (floors) within a factory |
| `departments` | Cutting, Sewing, QC, Packing departments |
| `production_lines` | Individual sewing / cutting lines |
| `users` | All users with `role` and `factory_id` FK |
| `buyers` | Buyer / customer master |
| `styles` | Garment style catalogue |
| `jobs` | Production work orders (`job_code`, `status`, dates, quantities) |
| `bundles` | Individual fabric bundles tied to a job and line |
| `barcodes` | Barcode / QR code registry for bundles and cartons |
| `production_events` | Timestamped operator stage events |
| `qc_inspections` | QC inspection records per bundle/batch |
| `rework_records` | Rework lifecycle tracking |
| `inventory_transactions` | Double-entry inventory ledger |
| `cartons` | Packing cartons with bundle manifests |
| `dispatch_records` | Dispatch approvals and gate-pass references |
| `planning_sam` | SAM and workforce capacity data |
| `audit_logs` | Immutable audit trail for all mutations |

### QC Quantity Equation

> This constraint is enforced in business logic and never violated:
>
> **Inspected = Passed + Rework + Rejected**
>
> Example: 200 = 180 + 15 + 5
>
> The released quantity **never** exceeds the passed quantity (180).

### Database Migrations

Sequential SQL migrations in `backend/src/database/migrations/`:

| Migration | Scope |
|-----------|-------|
| `0001` | Foundation schema (orgs, factories, users) |
| `0002` | Buyers, styles, locations master data |
| `0003` | Jobs, job approvals |
| `0004` | Contacts, cutting masters, rank, tailor mappings |
| `0005` | Production lines, departments |
| `0006` | Inventory ledger |
| `0007` | QC inspections, rework |
| `0008–0011` | Bundle management, barcodes, production events |
| `0012` | Reinspection and release |
| `0013–0017` | Cartons, partial loss, dispatch, gate-pass |
| `0018` | Employee roster and shift configuration |
| `0019` | Cutting entry, issues |
| `0020` | Inline / intermediate QC audit |
| `0021` | Store receipt, two-party handover |
| `0022` | SAM, workforce planning, what-if simulation |

---

## Multilingual Support

StitchFlow ships with three locales out of the box:

| Code | Language |
|------|---------|
| `en` | English (default) |
| `ta` | Tamil |
| `hi` | Hindi |

All user-facing text must use `useTranslation()`:

```tsx
const { t } = useTranslation();
// ✅ Correct
<Text>{t('dashboard.activeOrders')}</Text>

// ❌ Wrong — never hardcode UI strings
<Text>Active Orders</Text>
```

**Never localise**: barcodes, job IDs (`JOB-1001`), bundle IDs (`BND-00521`), or numeric values.

Translation files are located at `src/i18n/{en,ta,hi}.json`.

---

## Demo Mode vs Live Mode

| Mode | `EXPO_PUBLIC_DEMO_MODE` | Data Source |
|------|------------------------|-------------|
| Demo | `true` | Local fixtures in `src/fixtures/` via `useDemoStore` |
| Live | `false` | Live Railway API + Supabase + Redis |

### Demo Factories

| ID | Name | Efficiency |
|----|------|-----------|
| `factory-a` | Factory A | 82% |
| `factory-b` | Factory B | 68% |

The demo badge in `BrandHeader` is only visible when `isDemoMode === true`.

Mutable demo actions (approvals, status changes) use `useDemoStore` and are reset on app restart. They never write to the backend database.

---

## Running Tests

### Frontend TypeScript Check

```bash
# From project root
npm run ts-check
# Expected: 0 errors
```

### Backend Unit Tests

```bash
cd backend
npm test
# Expected: 20 suites, 100 tests PASS
```

### Backend Test Coverage

```bash
cd backend
npm run test:cov
```

### Live E2E Verification

```bash
cd backend
npm run build
node dist/scripts/verify-live-e2e.js
# Runs live smoke checks against Railway + Supabase
```

---

## Deployment

### Frontend — EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build Android preview APK
eas build --platform android --profile preview

# Build Android production AAB
eas build --platform android --profile production
```

EAS configuration is in `eas.json`. The production profile uses:
- `EXPO_PUBLIC_API_BASE_URL` → Railway production endpoint
- `EXPO_PUBLIC_DEMO_MODE=false`

### Backend — Railway

The backend auto-deploys on every push to the `main` branch of the GitHub repository.

| Setting | Value |
|---------|-------|
| Service | `stitchflow-backend` |
| Domain | `stitchflow-backend-production-e577ff0c.up.railway.app` |
| Start Command | `node dist/main` |
| Build Command | `npm run build` |
| Health Endpoint | `GET /api/v1/health` |

**Do not create a new Railway service or Supabase project.** The existing production infrastructure must be preserved.

### Deployment Checklist

- [ ] `npm run ts-check` → 0 errors
- [ ] `cd backend && npm test` → 100/100 pass
- [ ] No secrets in staged files (`git diff --staged`)
- [ ] `git push origin main`
- [ ] Railway build completes (check Railway dashboard)
- [ ] `GET /api/v1/health` returns `{ "status": "ok" }`
- [ ] All 7 role logins succeed against Railway endpoint
- [ ] Key CRUD operations verified against live Supabase

---

## Implementation Roadmap

Sourced from [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md).

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 0** | Repository audit, integration matrix, schema, API contracts, security model | ✅ Locally Verified |
| **Phase 1** | NestJS foundation, Swagger, Health, Supabase Auth, RBAC, Org/Factory hierarchy, Redis cache/rate-limit, Audit logs, SQL migrations | ✅ Locally Verified |
| **Phase 1.5** | FM permission resolution, SQL RLS hardening, `.env` setup, real frontend Auth integration, Redis live check, Org bootstrap | ✅ Live Verified (Redis) |
| **Phase 2** | Master data (buyers, styles, lines, locations), Jobs, Approvals, Bundles, Barcodes, ZPL/TSPL Tag Print, Employee Roster | ✅ Locally Verified |
| **Phase 3** | Universal QR/Barcode resolution, HID & Camera validation, Production events, Cutting entry, Issues, Work assignments | ✅ Locally Verified |
| **Phase 4** | Independent QC inspections, Inline/Intermediate QC audits, Rework lifecycle, Reinspection, QC release | ✅ Locally Verified |
| **Phase 5** | Inventory ledger, Output In/Out & Input In/Out, Cartons, Partial loss recovery, Dispatch & PDF Gate-Pass | ✅ Locally Verified |
| **Phase 6** | Persisted SAM & Workforce planning, Rework-aware Bottleneck Detection, Calendar Delivery Prediction, What-If Simulation | ✅ Locally Verified |
| **Phase 7** | Frontend `Api*Repository` classes, TanStack Query, AsyncStorage durable offline queue + `/sync/production` replay, Supabase Realtime | ✅ Locally Verified |
| **Phase 8** | Full AppModule E2E OpenAPI smoke tests, migration runner, live E2E checker, deployment guide | 🔄 Locally Verified — Live DB & Device pending |

**Status Legend**:
- ✅ **Live Verified** — Executed and verified against live infrastructure
- ✅ **Locally Verified** — Compiled and passed automated unit/security tests locally
- 🔄 **Implemented** — Code written; awaiting live infrastructure or integration run
- ⏳ **Pending** — Scheduled for upcoming phase
- 🚫 **Blocked** — Waiting on external credentials or explicit approval

---

## Engineering Guidelines

From [`AGENTS.md`](AGENTS.md) — rules applied to all development (human and AI):

### 1. Mobile-Only Industrial Design
- **Do NOT** convert screens to web dashboards.
- **Do NOT** add desktop grids or sidebar navigation.
- Respect touch targets — **minimum 44 × 44 pt** on all interactive elements.

### 2. Design Tokens Over Hardcoded Colors
- **Never** write inline hex colors (e.g. `#FFFFFF` or `#2A3592`).
- Always import and use `tokens` from `useThemeStore()` or spacing/radii from `src/design-system/tokens/`.

```tsx
// ✅ Correct
const { tokens } = useThemeStore();
<View style={{ backgroundColor: tokens.surface }} />

// ❌ Wrong
<View style={{ backgroundColor: '#FFFFFF' }} />
```

### 3. Multilingual Rigor
- All user-facing copy **MUST** be localised via `useTranslation()` from `react-i18next`.
- **Never** localise barcodes, IDs (`JOB-1001`, `BND-00521`), or numeric values.

### 4. Logically Consistent Mock Data
- Maintain the standard QC equation: `Inspected (200) = Passed (180) + Rework (15) + Rejected (5)`.
- **Never** release more than the passed quantity (180).
- Use `useDemoStore` for mutable user actions during demo flows.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Follow all rules in `AGENTS.md`.
3. Run `npm run ts-check` (frontend) and `npm test` (backend) before committing.
4. Never commit secrets or credentials.
5. Write all UI strings with `useTranslation()`.
6. Use design tokens — no inline hex values.
7. Open a Pull Request targeting `main`.

---

## License

Private repository — StitchFlow is proprietary software.  
© 2024 StitchFlow. All rights reserved.
