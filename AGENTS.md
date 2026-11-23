# AGENTS.md — StitchFlow Engineering Guidelines

This repository hosts **StitchFlow**, a mobile-only React Native + Expo application built for garment manufacturing production tracking.

## Guiding Principles for AI Agents

1. **Mobile-Only Industrial Design**:
   - Do NOT convert screens to web dashboards.
   - Do NOT add desktop grids or sidebar navigation.
   - Respect touch targets (minimum 44x44pt) and thumb accessibility.

2. **Design Tokens Over Hardcoded Colors**:
   - Never write inline hex colors (e.g. `#FFFFFF` or `#2A3592`).
   - Always import and use `tokens` from `useThemeStore()` or spacing/radii from `src/design-system/tokens/`.

3. **Multilingual Rigor**:
   - All user-facing copy MUST be localized via `useTranslation()` from `react-i18next`.
   - Never localize barcodes, IDs (`JOB-1001`, `BND-00521`), or numeric values.

4. **Logically Consistent Mock Data**:
   - Maintain the standard QC equation: `Inspected (200) = Passed (180) + Rework (15) + Rejected (5)`.
   - Never release more than the passed quantity (180).
   - Use `useDemoStore` for mutable user actions during demo flows.
