# StitchFlow — Sample Users & Login Guide

## 1. Demo Mode (Quick One-Tap Role Switcher)

When `EXPO_PUBLIC_DEMO_MODE=true` is set in root `.env`, the Login screen displays quick role buttons that sign in locally without passwords (isolated from the live database):

| Role | Employee ID | Name | Factory / Line |
|---|---|---|---|
| `md` (Managing Director) | `EMP-0001` | Aravind Krishnamurthy | StitchFlow HQ |
| `factory-manager` | `EMP-0010` | Priya Subramaniam | Factory A |
| `supervisor` | `EMP-0021` | Rajan Muthukumar | Factory A · Line 1 |
| `operator` | `EMP-0045` | Kavitha Devi | Factory A · Line 1 |
| `qc-inspector` | `EMP-0062` | Senthil Kumar | Factory A |
| `store-dispatch` | `EMP-0071` | Murugan Pandian | Factory A |
| `packing-staff` | `EMP-0083` | Lakshmi Narayanan | Factory A · Line 1 |

---

## 2. Live Database Seeded Roster (`EXPO_PUBLIC_DEMO_MODE=false`)

The following 7 employee slots are pre-enrolled in `public.employee_enrollment` via `supabase/seed.sql` for:
- **Organization**: `ORG-STITCH-DEMO` (`11111111-1111-1111-1111-111111111111`)
- **Factory**: `FAC-TPR-1` — Tirupur Unit 1 (`22222222-2222-2222-2222-222222222201`)

| Intended Role | Employee ID | Enrolled Email |
|---|---|---|
| Managing Director (`md`) | `EMP-MD01` | `md@stitchflow.dev` |
| Factory Manager (`factory-manager`) | `EMP-FM01` | `fm@stitchflow.dev` |
| Supervisor (`supervisor`) | `EMP-SUP01` | `supervisor@stitchflow.dev` |
| Operator (`operator`) | `EMP-OP01` | `operator@stitchflow.dev` |
| QC Inspector (`qc-inspector`) | `EMP-QC01` | `qc@stitchflow.dev` |
| Store / Dispatch (`store-dispatch`) | `EMP-STR01` | `store@stitchflow.dev` |
| Packing Staff (`packing-staff`) | `EMP-PCK01` | `packing@stitchflow.dev` |

### How to Activate a Live Account
1. Open the app **Register** screen (`/(auth)/register`) and submit the matching **Employee ID**, **Name**, **Enrolled Email**, and your chosen **Password** (min 8 chars).
2. Confirm the verification email sent by Supabase Auth.
3. Approve & assign the role/line via an authorized MD/Factory Manager (`PATCH /api/v1/users/:id/approval`, or **Users → Registered Users** in the app).
4. Sign in on the **Login** screen (`/(auth)/login`) with your email and password.
