# StitchFlow — Deployment & Verification Guide

## 1. Development and Local Verification

Use the existing Expo project and its lockfile. Run `npm ci` in the project root and `backend/` as needed.

```bash
# Root (Frontend)
npm run ts-check

# Backend
cd backend
npm run build
npm test -- --runInBand
```

## 2. Environment Configuration

Set backend configuration in a private `.env` using `backend/.env.example` as the reference:
- `DATABASE_URL` (IPv4 PostgreSQL / Supabase pooler connection string)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL` (Upstash / Redis connection string)

Set mobile configuration in root `.env`:
- `EXPO_PUBLIC_API_BASE_URL` (Android emulator `http://10.0.2.2:3000/api/v1` or LAN IP for physical devices)
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_DEMO_MODE=false` for live API mode (`true` for isolated demo mode)

## 3. Database Migrations (`202611260001` – `202611260022`)

Apply all migrations in filename order against an isolated PostgreSQL/Supabase environment, then run the essential roles/permissions seed (`supabase/essential-seed.sql`):

```bash
cd backend
npm run build
node --env-file=.env dist/scripts/migrate-up.js
```

Run live infrastructure verification (PostgreSQL migrations, Redis `PING -> PONG`, Supabase Auth Admin):

```bash
node --env-file=.env dist/scripts/verify-live-e2e.js
```

## 4. Employee Enrollment & Private Realtime

1. An authorized Factory Manager or MD provisions each employee in **Users -> Employee Roster** (`POST /users/roster`) or directly in `employee_enrollment`.
2. Ensure Supabase Auth email confirmation is enabled and verified before activating accounts (`PATCH /users/:id/approval`).
3. Verify Realtime private topic RLS policies (`realtime.messages`) restrict factory broadcast invalidation to `md`, `factory-manager`, and `store-dispatch` identities scoped to that factory.

## 5. Android Build & Physical Hardware Checklist

Use `eas.json` profiles for Android builds:
- Internal APK: `npx eas build --platform android --profile preview`
- Production AAB: `npx eas build --platform android --profile production`

Physical device verification checklist:
1. **Camera & Torch**: Open Scanner tab, grant camera permission, scan QR + Code-128 bundle tags in low light with torch toggled.
2. **HID Keyboard-Wedge Scanner**: Connect USB/Bluetooth HID scanner configured with Enter (`\r`/`\n`) suffix; verify `HID` indicator transitions to `READY` and resolves bundle without manual tap.
3. **Thermal Tag Printer**: In `Tag Print & Reprint`, configure ZPL/TSPL format and optional Print Bridge URL (or Android Share sheet to Zebra PrintConnect / RawBT / TSC Print) and verify physical hang-tag barcode scannability.
4. **Offline Queue Replay**: Disable Wi-Fi/mobile data, submit a cutting or stage entry (queued in `AsyncStorage`), restore connectivity, and verify `POST /production/replay` confirms the queued event.
