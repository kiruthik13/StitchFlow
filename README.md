# StitchFlow

**Intelligent Garment Production Monitoring and Rework-Aware Bottleneck Optimization System**

A premium, Android-first React Native + Expo mobile application for the garment manufacturing industry.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm / pnpm
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android emulator) or Expo Go app

### Installation

```bash
cd StitchFlow
npm install
```

### Run on Android

```bash
# Start Expo dev server
npx expo start

# Then press 'a' for Android emulator
# Or scan QR code with Expo Go app on device
```

### Run on Android device (physical)
```bash
npx expo start --android
```

---

## 🎭 Demo Mode

This is a **frontend-only** build. No backend server is required.

1. Launch the app
2. Select your language (English / தமிழ் / हिन्दी)
3. Tap **"🎭 Demo Login"** on the login screen
4. Choose a role to explore

### Available Demo Roles:
| Role | Description |
|------|-------------|
| Managing Director | Executive analytics, multi-factory view |
| Factory Manager | Job creation, master management, approvals |
| Supervisor | Production planning, line management, KPIs |
| **Operator** | Scan-to-work workflow (most interactive) |
| QC Inspector | Inspection queue, defect entry, QC release |
| Store / Dispatch | Stock movements, inventory, dispatch |
| Packing Staff | Bundle packing, carton creation |

---

## 📱 Key Interactive Features

### Scanner Flow (Operator)
1. Go to **Scan** tab
2. Tap any demo bundle code chip (e.g., `BND-00521`)
3. See bundle details resolved from mock data
4. Enter quantity using the stepper
5. Confirm → see success state

### QC Inspection Flow
1. Login as **QC Inspector**
2. Go to **Work** tab → see pending queue
3. Or go to **Scan** tab → scan `BND-00521`
4. Tap **Start Inspection** → go to inspection detail
5. Set passed/rework/rejected quantities
6. Record QC decision → release passed pieces only

### Packing Flow
1. Login as **Packing Staff**
2. View assigned bundles in **Work** tab
3. See GarmentTicketCard with size selector
4. Scan bundle → verify QC release → pack
5. Navigate to carton detail → seal carton

### Theme Switching
- Go to **Settings** → **Appearance**
- Switch between Daylight Stone (light) and Matte Obsidian (dark)
- Changes apply instantly

### Language Switching
- Available on login screen, dashboard header, and Settings
- Supports English, Tamil (தமிழ்), Hindi (हिन्दी)

---

## 🏗️ Architecture

```
StitchFlow/
├── app/                     # Expo Router file-based routes
│   ├── _layout.tsx          # Root layout (providers)
│   ├── index.tsx            # Entry redirect
│   ├── (auth)/              # Auth screens
│   └── (app)/               # Authenticated app
│       ├── (tabs)/          # Bottom navigation tabs
│       ├── jobs/            # Job detail screens
│       ├── bundles/         # Bundle detail screens
│       ├── inspections/     # QC inspection screens
│       ├── cartons/         # Carton detail screens
│       └── operations/      # Operation screens
│
└── src/
    ├── core/                # Types, permissions
    ├── design-system/       # Tokens + UI components
    ├── features/            # Feature modules
    ├── fixtures/            # Mock data (typed)
    ├── i18n/                # Translations
    ├── store/               # Zustand stores
    └── roles/               # Role-specific logic
```

---

## 🎨 Design System

### Light Theme: Daylight Stone
- Background: `#F4F3EF`
- Surface: `#FFFFFF`
- Brand: `#2A3592`

### Dark Theme: Matte Obsidian  
- Background: `#111215`
- Surface: `#1A1C21`
- Brand: `#5B6BE6`

### Typography
- **UI Text**: Inter (Regular, Medium, SemiBold, Bold)
- **Code/KPIs**: JetBrains Mono (Regular, Bold)
- **i18n**: System font fallbacks for Tamil/Hindi

---

## 🔌 Future Backend Integration

This frontend is designed to connect to a **NestJS REST API + Supabase PostgreSQL** backend:

1. Replace mock services in `src/services/mock/` with real API calls
2. Remove demo fixtures from `src/fixtures/`
3. Configure API base URL in `src/core/config/`
4. Replace `demoLogin()` in `authStore.ts` with real JWT auth

No UI rewrites needed — all state management and types are API-ready.

---

## 📋 Implemented Screens

See [docs/implementation-status.md](docs/implementation-status.md) for the full status.

---

## ⚠️ Known Demo Limitations

- No actual camera barcode scanning (Expo Camera configured but needs device testing)
- PDF/Excel export disabled (requires server)
- Changes not persisted between sessions (Zustand in-memory)
- Authentication is local demo only
