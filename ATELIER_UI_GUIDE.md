# StitchFlow — Atelier Industrial Design System

> Comprehensive mobile product design system for StitchFlow.  
> **Strict Scope**: Presentation layer only — zero changes to business logic, stores, services, permissions, routes, APIs, or QC equations (`200 = 180 + 15 + 5`).

---

## 1. Visual Philosophy

**Swiss editorial typography × precision industrial control systems × contemporary garment brand identity.**

- **Mobile-Only Industrial Ergonomics**: No desktop sidebars or web grids. Minimum touch target `48 × 48dp`.
- **Surface Restraint**: Never wrap every section in identical rounded white cards. Mix:
  - **Emphasis Surfaces (`AppCard variant="forest"`)** for primary hero metrics.
  - **Structured Lists (`AppCard padding={0}` + `ProductionLineRow embedded`)** with hairline dividers.
  - **Garment Hang-Tag Tickets (`JobTicketCard`, `GarmentTicketCard`)** with dashed seam dividers and technical IDs.
  - **Differentiated Semantic Tiles** (tinted success/warning surfaces vs neutral surfaces).

---

## 2. Industrial Spectrum Color Tokens (Never Hardcode Hex Values)

Always import `useThemeStore()` (`tokens`, `mode`) from `src/store/themeStore.ts`:

| Role | Light Theme | Dark Theme | Usage |
|---|---|---|---|
| **Canvas** | `tokens.background` (`#F1F2F3`) | `tokens.background` (`#11161E`) | Screen background |
| **Surface** | `tokens.surface` (`#FFFFFF`) | `tokens.surface` (`#1C2430`) | Cards, lists, inputs |
| **Secondary Surface** | `tokens.surfaceSecondary` (`#E8EBEF`) | `tokens.surfaceSecondary` (`#263140`) | Nested strips, inactive tracks |
| **Corporate Blue** | `tokens.brand` (`#4469B1`) / `#284578` | `tokens.brand` (`#7899D8`) / `#284578` | Primary branding, hero cards, scanner button, active controls |
| **Production Green** | `tokens.success` (`#1CA64A`) | `tokens.success` (`#1CA64A`) | Completed output, QC passed, positive indicators |
| **Industrial Red** | `tokens.danger` (`#EC3327`) | `tokens.danger` (`#EC3327`) | Critical bottlenecks, rejected qty, errors |
| **Amber Yellow** | `tokens.warning` (`#FBB315`) | `tokens.warning` (`#FBB315`) | Pending QC, rework, delayed lines, warnings |
| **Neutral Gray / Silver** | `#626D7B` / `#A9A9A9` / `#BCBCBC` | `#A9A9A9` / `#364354` | Secondary info, dividers, borders |

---

## 3. Typography Rules (`AppText.tsx`)

- **KPI & Display Numerals**: Clean sans-serif (`variant="kpi"`, `display`, `h1`–`h3`) with `fontVariant: ['tabular-nums']`, `letterSpacing: 0`, and `includeFontPadding: false`.
- **Technical Identifiers Only**: Reserve `mono` / `variant="code"` / `variant="codeSmall"` strictly for IDs (`JOB-1001`, `BND-00521`, `CTN-001`).
- **Line Height Rule**: Start at `lineHeight >= 1.25 × fontSize` on large numerals, validated against actual Android font metrics.
- **No Fixed-Height Text Wrappers**: Never set `height` or `maxHeight` on containers holding dynamic or multilingual text.

---

## 4. Motion & Haptics (`src/design-system/tokens/motion.ts`)

- Use `PressableScale` (`src/design-system/components/PressableScale.tsx`) for tactile UI-thread press feedback (`scaleTo: 0.97–0.985`, `100ms`) and `expo-haptics`.
- Always respect OS reduced-motion settings via `useReducedMotion()`.
- Standard timings:
  - `press`: `100ms` (80–120ms)
  - `selection`: `160ms` (150–180ms)
  - `expansion`: `220ms` (200–250ms)
  - `transition`: `260ms` (220–300ms)
  - `chartReveal`: `420ms` (350–500ms)

---

## 5. Design System Architecture

```text
src/design-system/
│
├── tokens/
│   ├── light.ts        (Warm Ivory palette)
│   ├── dark.ts         (Matte Forest Obsidian palette)
│   ├── typography.ts   (Scale, weights, line heights)
│   ├── spacing.ts      (4dp spacing foundation)
│   ├── radii.ts        (Corner radius tokens)
│   ├── shadows.ts      (Subtle platform elevations)
│   └── motion.ts       (Reanimated timings & springs)
│
├── components/         (Shared primitives, metrics, charts, tickets, branding, feedback)
│   ├── AppText.tsx, AppButton.tsx, AppCard.tsx, AppInput.tsx, PressableScale.tsx
│   ├── ProductionOutputCard.tsx, ShiftProgressCard.tsx, MetricCard.tsx
│   ├── ProductionLineRow.tsx, QCGateCard.tsx, QuickOperationsGrid.tsx
│   ├── JobTicketCard.tsx, GarmentTicketCard.tsx, BarcodeResultCard.tsx
│   └── branding/, feedback/, splash/
│
└── layouts/
    ├── ScreenLayout.tsx        (Base safe-area screen wrapper)
    ├── DashboardLayout.tsx     (Role dashboard scroll + header + bottom clearance)
    ├── FormLayout.tsx          (KeyboardAvoidingView + scroll form wrapper)
    └── StickyActionLayout.tsx  (Scroll body + safe-area sticky footer CTA)
```

---

## 6. Responsive Layout Architecture

- **4dp Spacing Foundation**: All margins, paddings, and gaps derive from `spacing` (`4dp` grid).
- **Screen Horizontal Padding**: `16–20dp` (`spacing[4]`–`spacing[5]`).
- **Section Spacing**: `20–24dp` (`spacing[5]`–`spacing[6]`).
- **Component Spacing**: `8–12dp` (`spacing[2]`–`spacing[3]`).
- **Hero Surface Padding**: `20dp` (`spacing[5]`).
- **Equal-Height Row Cards**: Use `flex: 1` and `alignSelf: 'stretch'` on sibling cards in the same row.
- **Baseline Alignment**: Align numeric values and measurement units with `alignItems: 'baseline'`.
- **Viewport & Font Scaling**: Support `320dp–430dp` Android viewports and OS accessibility font scaling without clipping.

---

## 7. Role-Specific Art Direction

| Role | Identity | Primary Focus |
|---|---|---|
| **MD** | Executive Intelligence | Deep Forest group efficiency & packed summary, factory comparison, bottleneck & SAM analytics |
| **Factory Manager** | Production Command Center | Deep Forest SVG ring output hero, differentiated 4-tile Floor Health, embedded line performance list, work orders |
| **Supervisor** | Floor Control Cockpit | Shift progress hero, prominent bottleneck alert banner, line KPIs, bundle WIP |
| **Operator** | Scan-First Workstation | High-contrast forest output strip, garment hang-tag ticket, station actions, sticky bottom scan bar |
| **QC Inspector** | Quality Laboratory | Deep Forest inspection queue hero, segmented quality distribution bar (`200 = 180 + 15 + 5`), specialized forms |
| **Store / Dispatch** | Logistics Workspace | Low-stock alert banners, Deep Forest movement summary strip (Input/Output In & Out), FG cartons |
| **Packing Staff** | Fulfilment Workspace | Deep Forest packed vs QC-released (`180 pcs`) safeguard strip, carton tickets, handover actions |

---

## 8. Data Visualization Standards

- **Supported Visualizations**: Animated SVG circular completion indicators (`ProductionOutputCard`), segmented QC distribution bars (`QCGateCard`), segmented shift tracks (`ShiftProgressCard`), and proportional stage/line progress bars (`ProductionLineRow`, `jobs/[id]`).
- **Strict Data Integrity**: Never fabricate historical time-series data or alter formulas. Always pair important charts with accessible labels (`accessibilityLabel`).

---

## 9. Component State Architecture

Every interactive component supports existing states cleanly using semantic tokens:
- **Default / Pressed / Focused / Selected**: `PressableScale` + `tokens.borderStrong` / `tokens.brand` / `tokens.signatureLime`.
- **Disabled / Loading**: `opacity: 0.45` + `ActivityIndicator` (`AppButton`).
- **Success / Error / Offline**: Semantic `tokens.success`, `tokens.danger`, `tokens.warning` + existing demo/offline notices (no fake connectivity states).

---

## 10. Loading Experience

- **App Startup**: `AnimatedBrandSplash` with the approved StitchFlow logo.
- **Short Operations**: `BrandLoadingIndicator` for lightweight stitch-inspired feedback.
- **Lists & Dashboards**: Content-aware `LoadingState` skeletons respecting `useReducedMotion()`, with zero artificial delays.

---

## 11. Navigation Architecture

- Preserve all 7 role permissions and `expo-router` destinations.
- Central floating scanner button in `(tabs)/_layout.tsx` with haptic feedback and bottom-inset clearance (`paddingBottom: insets.bottom + 100` on scan-action screens).
- Translated tab labels (`en`, `ta`, `hi`) remain readable with minimum `48dp` effective touch targets.

---

## 12. Typography & Regional Script Safety

- Treat `lineHeight` ratios (`1.25–1.35×`) as starting points; validate actual Android rendering for **English**, **Tamil (`Noto Sans Tamil`)**, and **Hindi (`Noto Sans Devanagari`)**.
- Use `includeFontPadding: false` on large numeric display text where vertical clipping occurs, and verify decimals, percentages, and units (`14.5 SAM`, `0.8%`, `267 / 320 pcs`).

---

## 13. Professional Screen Composition

Every screen must have one clear primary visual focus, intentional hierarchy, restrained semantic color, balanced whitespace, and clear primary/secondary actions. Avoid repetitive white cards, excessive shadows, emojis, neon glows, and decorative-only animations.

---

## 14. Visual Regression Verification

Before final sign-off, inspect actual Android screenshots across:
- All 7 role dashboards, Auth/Onboarding, Work Orders, Bundle Details, SAM Plan, Scanner, Reports, and Settings
- English, Tamil, and Hindi
- Light (Warm Ivory) and Dark (Matte Obsidian) themes
- `320dp`–`430dp` viewports

> **Note**: Compilation success (`ts-check` + `expo export`) is necessary but never sufficient alone as proof of visual quality.

---

## 15. Functional Preservation & Execution

- Keep `src/store/*`, `src/services/*`, `src/utils/*`, `src/core/*`, `src/fixtures/*`, and `src/i18n/*` unchanged during UI work.
- Request explicit approval before any functional modification.
- Mandatory verification commands after edits:
  ```powershell
---

## 16. Official Brand Identity & "From Stitch to Intelligence" Motion

### Authoritative Assets
- `assets/branding/stitchflow-logo.png` / `stitchflow-logo-dark.png` — Full horizontal logo (`StitchFlow™` + `PRODUCTION INTELLIGENCE`) used in Authentication & Onboarding (`login.tsx`).
- `assets/branding/stitchflow-symbol.png` — Standalone S-ribbon, ascending Red/Amber/Green bars, and upward blue growth arrow used in compact headers (`BrandHeader.tsx`, `StitchFlowSymbol.tsx`).
- `assets/icons/app-icon.png` — `1024×1024` opaque white launcher icon.
- `assets/icons/adaptive-icon-foreground.png`, `adaptive-icon-background.png`, `monochrome-icon.png` — Android adaptive & themed icon layers configured in `app.json`.
- `assets/splash/splash-icon.png` / `splash-icon-dark.png` — Native Android splash symbols (`#FFFFFF` light / `#11161E` dark).

### "From Stitch to Intelligence" Startup Choreography (`AnimatedBrandSplash.tsx`)
1. **0–400ms**: Theme-matched canvas reveal (`#FFFFFF` / `#11161E`, zero flash from native splash).
2. **400–900ms**: Blue S-shaped garment ribbon formation.
3. **900–1200ms**: White dashed stitching & silver ribbon folds reveal.
4. **1200–1600ms**: Red, Amber, and Green production bars grow sequentially bottom-to-top.
5. **1600–1900ms**: Upward Corporate Blue growth arrow animates along its path.
6. **1900–2200ms**: `StitchFlow™` wordmark & `PRODUCTION INTELLIGENCE` tagline reveal (no colored bars underneath).
7. **2200–2400ms**: Smooth fade transition when initialization is ready, with static fallback when OS reduced motion is enabled.

