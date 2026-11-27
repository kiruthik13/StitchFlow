# StitchFlow — Deployment & Verification Guide

**Last Verified:** 2026-11-27  
**Source of Truth:** [eas.json](file:///c:/Users/Kathik/Downloads/StitchFlow-main/eas.json), [.env.example](file:///c:/Users/Kathik/Downloads/StitchFlow-main/.env.example), [backend/.env.example](file:///c:/Users/Kathik/Downloads/StitchFlow-main/backend/.env.example), [backend/package.json](file:///c:/Users/Kathik/Downloads/StitchFlow-main/backend/package.json)

---

## 1. Local Build & Test Commands

```bash
# Root (Frontend)
npm ci
npm run ts-check

# Backend
cd backend
npm ci
npm run build
npm test -- --runInBand
```

---

## 2. Environment Variables (No Secrets Committed)

### Backend (`backend/.env` / Railway Variables)
- `PORT` (default `3000`, set by Railway)
- `NODE_ENV` (`development` | `production`)
- `DATABASE_URL` (IPv4 Supabase PostgreSQL pooler connection string)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL` (Upstash Redis connection string)
- `CORS_ORIGINS`

### Frontend (`.env` / `eas.json` profiles)
- `EXPO_PUBLIC_API_BASE_URL` (Production: `https://stitchflow-backend-production-e577ff0c.up.railway.app/api/v1`)
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_DEMO_MODE` (`false` for live API, `true` for isolated demo mode)

---

## 3. Production Hosting (Railway + Supabase + Upstash)

- **Backend Host**: Railway auto-deploys from the GitHub `main` branch (`npm run build` → `npm run start:prod`).
- **Existing Production API**: `https://stitchflow-backend-production-e577ff0c.up.railway.app/api/v1`
- **Health Check**: `GET /api/v1/health` (verifies database & Redis readiness).
- **Infrastructure Constraint**: Preserve the existing Railway service, public domain, Supabase project, and Upstash Redis instance. Never create duplicate services or commit secrets.

### Database Migrations (`202611260001` – `202611260022`)
Only apply migrations to remote environments after explicit approval:
```bash
cd backend
npm run build
node --env-file=.env dist/scripts/migrate-up.js
node --env-file=.env dist/scripts/verify-live-e2e.js
```

### Rollback Procedure
1. **Backend**: In the Railway dashboard, redeploy the previous known-good deployment commit, or `git revert <commit>` on `main` and push.
2. **Database**: Forward-fix migrations are preferred; never run destructive resets on production Supabase.

---

## 4. Android Build (EAS)

Configured in [eas.json](file:///c:/Users/Kathik/Downloads/StitchFlow-main/eas.json) (both `preview` and `production` set `EXPO_PUBLIC_DEMO_MODE=false` and point to the Railway API):
- **Internal Preview APK**: `npx eas build --platform android --profile preview`
- **Production AAB**: `npx eas build --platform android --profile production`

### Physical Device Verification Checklist (Pending Execution)
1. **Camera & Torch**: Open Scanner tab, grant camera permission, scan QR + Code-128 bundle tags in low light with torch toggled.
2. **HID Keyboard-Wedge Scanner**: Connect USB/Bluetooth HID scanner configured with Enter (`\r`/`\n`) suffix; verify `HID` indicator transitions to `READY` and resolves bundle without manual tap.
3. **Thermal Tag Printer**: In `Tag Print & Reprint`, configure ZPL/TSPL format and optional Print Bridge URL (or Android Share sheet to Zebra PrintConnect / RawBT / TSC Print) and verify physical hang-tag barcode scannability.
4. **Offline Queue Replay**: Disable Wi-Fi/mobile data, submit a cutting or stage entry (queued in `AsyncStorage`), restore connectivity, and verify `POST /api/v1/sync/production` confirms the queued event.
