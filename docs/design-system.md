# StitchFlow Design System

## 1. Visual Philosophy: Tactile Industrial UI

StitchFlow is designed specifically for garment manufacturing environments: fast-paced, dusty, variable-lighting environments where workers operate with thumbs on handheld devices.

### Explicitly Excluded
- Neon glows and high-saturation highlights
- Glassmorphism and backdrop blurs
- Multi-color decorative gradients
- Oversized rounded cards with excessive padding
- Fanciful decorative animations

### Design Tenets
- **1px Hairline Borders**: Precise separation of data blocks.
- **Physical Garment Inspiration**: Cards modeled after garment hang-tags with punch notches and tear lines.
- **Compact Industrial Typography**: Monospaced numbers for quantities, job codes, barcodes, and KPIs to ensure tabular alignment.
- **Bottom-Thumb Usability**: Primary CTA buttons and scanner actions anchored to the bottom safe area.

---

## 2. Color Themes

### Daylight Stone (Default Light Theme)
- `background`: `#F4F3EF` (warm industrial off-white)
- `surface`: `#FFFFFF`
- `surfaceSecondary`: `#ECEAE4`
- `border`: `rgba(17,19,24,0.09)`
- `borderStrong`: `rgba(17,19,24,0.18)`
- `textPrimary`: `#111318`
- `textSecondary`: `#5C6270`
- `brand`: `#2A3592` (deep industrial indigo)
- `brandLight`: `#EEF0FB`
- `success`: `#15803D`
- `warning`: `#B45309`
- `danger`: `#B91C1C`

### Matte Obsidian (Dark Theme)
- `background`: `#111215` (deep industrial black)
- `surface`: `#1A1C21`
- `surfaceSecondary`: `#22252C`
- `border`: `rgba(255,255,255,0.08)`
- `borderStrong`: `rgba(255,255,255,0.16)`
- `textPrimary`: `#F3F4F6`
- `textSecondary`: `#9CA3AF`
- `brand`: `#5B6BE6`
- `brandLight`: `#1E234A`
- `success`: `#22C55E`
- `warning`: `#F59E0B`
- `danger`: `#EF4444`

---

## 3. Signature Components

1. **`Editorial Shift Card` (`ShiftProgressCard.tsx`)**:
   - Prominent progress percentage display
   - Real-time pace metric (e.g., `142 pcs/hr`)
   - Segmented 8px multi-color progress bar
   - Three-column breakdown: Passed, Pending, Rejected

2. **`Garment Hang-Tag Ticket Card` (`GarmentTicketCard.tsx`)**:
   - Styled as a physical garment factory hang-tag
   - Punch-hole side notches and dashed tear lines
   - Monospaced Job ID, Bundle ID, and Lot details
   - Size chips (S, M, L, XL) and quick packing CTA

3. **`Quick Operations Grid` (`QuickOperationsGrid.tsx`)**:
   - 2x2 grid layout designed for thick gloved fingers
   - Clean 1.75px line icons from `lucide-react-native`
   - High-contrast touch feedback

4. **`Bottom Scan CTA` (`BottomScanAction.tsx`)**:
   - Fixed above bottom navigation safe area
   - Single-tap thumb reach for routine scanning workflows
