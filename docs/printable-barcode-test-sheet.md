# StitchFlow — Printable Barcode Camera Verification Sheet

Print this sheet at 100% scale (no fit-to-page) and test each symbology with the StitchFlow mobile camera scanner on a representative **4 GB RAM Android device** (minimum benchmark) plus 6 GB / 8 GB / 12 GB devices.

| # | Symbology | Expected Value | Camera Support Tier | Checksum / Notes | Actual Decoded | Exact Match (Y/N) | Latency (ms) | Device / Android / Lighting |
|---|---|---|---|---|---|---|---|---|
| 1 | Code-128 | `BND-00521` | Tier 1 (ML Kit) | Standard StitchFlow bundle | | | | |
| 2 | GS1-128 | `(01)01234567890128(10)LOT42(21)SER0099` | Tier 1 (ML Kit + GS1) | FNC1 / AI parsed | | | | |
| 3 | Code-39 | `JOB-1001` | Tier 1 (ML Kit) | Alphanumeric | | | | |
| 4 | Code-39 Full ASCII | `Job/1001-A+B` | Tier 1 (ML Kit) | Full ASCII | | | | |
| 5 | Code-93 | `CTN-00042` | Tier 1 (ML Kit) | Compact 1D | | | | |
| 6 | ITF / ITF-14 | `00012345678905` | Tier 1 (ML Kit) | Leading zeros + Mod-10 | | | | |
| 7 | EAN-13 | `8901234567892` | Tier 1 (ML Kit) | Mod-10 check digit | | | | |
| 8 | EAN-8 | `96385074` | Tier 1 (ML Kit) | Mod-10 check digit | | | | |
| 9 | UPC-A | `012345678905` | Tier 1 (ML Kit) | Leading zero + Mod-10 | | | | |
| 10 | UPC-E | `01234565` | Tier 1 (ML Kit) | Compressed UPC | | | | |
| 11 | Codabar | `A12345B` | Tier 1 (ML Kit) | Start/Stop A-D | | | | |
| 12 | QR Code | `BND-00521` | Tier 1 (ML Kit) | 2D Matrix | | | | |
| 13 | GS1 QR Code | `(00)001234567890123455(21)00042` | Tier 1 (ML Kit + GS1) | SSCC + Serial | | | | |
| 14 | Data Matrix | `BND-00522` | Tier 1 (ML Kit) | High-density 2D | | | | |
| 15 | GS1 DataMatrix | `(01)01234567890128(17)271127` | Tier 1 (ML Kit + GS1) | GTIN + Exp Date | | | | |
| 16 | PDF417 | `JOB-1001|LOT42|QTY200` | Tier 1 (ML Kit) | Stacked 2D | | | | |
| 17 | Aztec Code | `LOC-RACK-A1` | Tier 1 (ML Kit) | 2D Matrix | | | | |
| 18 | Code-11 | `12` (with C check `4`) | Tier 3 (StitchFlow 1D CV) | Mod-11 checksum | | | | |
| 19 | MSI / MSI Plessey | `12` (with Mod-10 `5`) | Tier 3 (StitchFlow 1D CV) | Mod-10 checksum | | | | |
| 20 | Pharmacode 1-Track | `12` | Tier 3 (StitchFlow 1D CV) | Binary bar weights | | | | |
| 21 | Pharmacode 2-Track | `32` | Tier 3 (StitchFlow 1D CV) | Base-3 upper/lower | | | | |
| 22 | Industrial / Std 2 of 5 | `12` | Tier 3 (StitchFlow 1D CV) | Discrete 5-bar | | | | |
| 23 | Flattermarken | `105` | Tier 3 (StitchFlow 1D CV) | 4-pos bar mark | | | | |
| 24 | Micro QR | `MQR-42` | Tier 2 (ZXing EAS plugin) | Requires EAS native build | | | | |
| 25 | MicroPDF417 | `MPDF-100` | Tier 2 (ZXing EAS plugin) | Requires EAS native build | | | | |
| 26 | GS1 DataBar | `(01)01234567890128` | Tier 2 (ZXing EAS plugin) | Requires EAS native build | | | | |
