/**
 * StitchFlow Specialized 1D Industrial Barcode Decoder Engine
 *
 * Handles 1D symbologies NOT supported by Google ML Kit / Expo Camera:
 * - Code-11 (with Mod-11 C/K checksum)
 * - MSI / MSI Plessey (with Mod-10 checksum)
 * - Pharmacode One-Track & Two-Track
 * - Standard 2 of 5 / Industrial 2 of 5 (distinct from Interleaved 2 of 5)
 * - Flattermarken (4-position bar marks)
 *
 * Includes grayscale conversion, Otsu adaptive thresholding, blur variance check,
 * and multi-scanline run-length extraction.
 */

export type SpecializedSymbology =
  | 'CODE_11'
  | 'MSI'
  | 'PHARMACODE_1T'
  | 'PHARMACODE_2T'
  | 'INDUSTRIAL_2_OF_5'
  | 'FLATTERMARKEN';

export interface SpecializedDecodeResult {
  decoded: boolean;
  symbology?: SpecializedSymbology;
  value?: string;
  checksumValid?: boolean;
  orientation?: 'forward' | 'reverse';
  decoder: 'stitchflow-1d-cv';
  blurScore?: number;
  reason?: string;
}

export interface RunLength {
  isBar: boolean;
  length: number;
}

/** Convert RGBA pixel buffer to 8-bit grayscale luma array */
export function rgbaToGrayscale(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
  }
  return gray;
}

/** Otsu adaptive threshold for variable factory lighting */
export function computeOtsuThreshold(samples: Uint8Array): number {
  const hist = new Int32Array(256);
  for (let i = 0; i < samples.length; i++) hist[samples[i]]++;
  const total = samples.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let firstMaxT = 128;
  let lastMaxT = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      firstMaxT = t;
      lastMaxT = t;
    } else if (between === maxVar) {
      lastMaxT = t;
    }
  }
  return Math.round((firstMaxT + lastMaxT) / 2);
}

/** Estimate edge sharpness along a scanline (higher = sharper) */
export function scanlineSharpness(line: Uint8Array): number {
  if (line.length < 2) return 0;
  let totalDiff = 0;
  for (let i = 1; i < line.length; i++) {
    totalDiff += Math.abs(line[i] - line[i - 1]);
  }
  return totalDiff / (line.length - 1);
}

/** Extract dark/light run-lengths from a 1D grayscale scanline */
export function extractRunLengths(line: Uint8Array): RunLength[] {
  const threshold = computeOtsuThreshold(line);
  const runs: RunLength[] = [];
  let currentBar = line[0] < threshold;
  let len = 1;
  for (let i = 1; i < line.length; i++) {
    const isBar = line[i] < threshold;
    if (isBar === currentBar) {
      len++;
    } else {
      runs.push({ isBar: currentBar, length: len });
      currentBar = isBar;
      len = 1;
    }
  }
  runs.push({ isBar: currentBar, length: len });
  return runs;
}

function trimQuietZones(runs: RunLength[]): RunLength[] {
  let start = 0;
  let end = runs.length - 1;
  while (start <= end && !runs[start].isBar) start++;
  while (end >= start && !runs[end].isBar) end--;
  return runs.slice(start, end + 1);
}

// ============================================================================
// 1. CODE-11 DECODER
// ============================================================================
// Widths in modules (narrow=0, wide=1) for 5 elements: B S B S B
const CODE11_PATTERNS: Record<string, string> = {
  '0': '00001',
  '1': '10001',
  '2': '01001',
  '3': '11000',
  '4': '00101',
  '5': '10100',
  '6': '01100',
  '7': '00011',
  '8': '10010',
  '9': '10000',
  '-': '00100',
  '*': '00110', // Start/Stop
};

const CODE11_REVERSE = new Map(Object.entries(CODE11_PATTERNS).map(([k, v]) => [v, k]));

function code11CharValue(ch: string): number {
  return ch === '-' ? 10 : Number(ch);
}

export function verifyCode11Checksum(payloadWithChecks: string): { valid: boolean; data: string } {
  if (payloadWithChecks.length < 2) return { valid: false, data: payloadWithChecks };
  const data = payloadWithChecks.slice(0, -1);
  const checkC = payloadWithChecks[payloadWithChecks.length - 1];
  let sum = 0;
  for (let i = data.length - 1, w = 1; i >= 0; i--, w = w === 10 ? 1 : w + 1) {
    sum += code11CharValue(data[i]) * w;
  }
  const expected = sum % 11 === 10 ? '-' : String(sum % 11);
  return { valid: expected === checkC, data };
}

export function decodeCode11Runs(rawRuns: RunLength[]): SpecializedDecodeResult | null {
  const runs = trimQuietZones(rawRuns);
  if (runs.length < 17) return null; // Start(5)+space(1)+min1char(5)+space(1)+Stop(5)

  const avg = runs.reduce((s, r) => s + r.length, 0) / runs.length;
  const bits = runs.map((r) => (r.length > avg * 1.35 ? '1' : '0'));

  const decodeForward = (seq: string[]): SpecializedDecodeResult | null => {
    if ((seq.length + 1) % 6 !== 0) return null;
    const chars: string[] = [];
    for (let i = 0; i < seq.length; i += 6) {
      const pattern = seq.slice(i, i + 5).join('');
      const ch = CODE11_REVERSE.get(pattern);
      if (!ch) return null;
      chars.push(ch);
    }
    if (chars[0] !== '*' || chars[chars.length - 1] !== '*' || chars.length < 3) return null;
    const inner = chars.slice(1, -1).join('');
    const check = verifyCode11Checksum(inner);
    if (!check.valid) return null;
    return {
      decoded: true,
      symbology: 'CODE_11',
      value: check.data,
      checksumValid: true,
      decoder: 'stitchflow-1d-cv',
    };
  };

  const fwd = decodeForward(bits);
  if (fwd) return { ...fwd, orientation: 'forward' };
  const rev = decodeForward([...bits].reverse());
  if (rev) return { ...rev, orientation: 'reverse' };
  return null;
}

// ============================================================================
// 2. MSI / MSI PLESSEY DECODER
// ============================================================================
export function verifyMsiMod10(digits: string): { valid: boolean; data: string } {
  if (!/^\d{2,}$/.test(digits)) return { valid: false, data: digits };
  const data = digits.slice(0, -1);
  const check = Number(digits[digits.length - 1]);

  // Standard MSI Mod-10 (right-to-left odd digits)
  let oddStr = '';
  let evenSum = 0;
  for (let i = data.length - 1, pos = 0; i >= 0; i--, pos++) {
    if (pos % 2 === 0) oddStr = data[i] + oddStr;
    else evenSum += Number(data[i]);
  }
  const doubled = String(Number(oddStr || '0') * 2);
  let oddSum = 0;
  for (const ch of doubled) oddSum += Number(ch);
  const expectedRtl = (10 - ((oddSum + evenSum) % 10)) % 10;
  if (expectedRtl === check) return { valid: true, data };

  // Luhn-style MSI Mod-10 (e.g. BWIPP default)
  let luhnSum = 0;
  for (let i = data.length - 1, pos = 0; i >= 0; i--, pos++) {
    let n = Number(data[i]);
    if (pos % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    luhnSum += n;
  }
  const expectedLuhn = (10 - (luhnSum % 10)) % 10;
  return { valid: expectedLuhn === check, data };
}

export function decodeMsiRuns(rawRuns: RunLength[]): SpecializedDecodeResult | null {
  const runs = trimQuietZones(rawRuns);
  // Start (2 runs: 1 bar, 1 space) + N*8 runs (4 bits * 2 runs) + Stop (3 runs: B S B)
  if (runs.length < 13 || (runs.length - 5) % 8 !== 0) return null;

  const minLen = Math.min(...runs.map((r) => r.length));
  const maxLen = Math.max(...runs.map((r) => r.length));
  if (maxLen < minLen * 1.4) return null;
  const threshold = (minLen + maxLen) / 2;
  const isWide = (r: RunLength) => r.length > threshold;

  // Start: wide bar, narrow space
  if (!isWide(runs[0]) || isWide(runs[1])) return null;
  // Stop: narrow bar, wide space, narrow bar
  const n = runs.length;
  if (isWide(runs[n - 3]) || !isWide(runs[n - 2]) || isWide(runs[n - 1])) return null;

  let digits = '';
  for (let i = 2; i < n - 3; i += 8) {
    let val = 0;
    for (let bit = 0; bit < 4; bit++) {
      const bar = runs[i + bit * 2];
      const space = runs[i + bit * 2 + 1];
      if (!bar.isBar || space.isBar) return null;
      const bWide = isWide(bar);
      const sWide = isWide(space);
      if (bWide === sWide) return null; // Must be complementary
      val = (val << 1) | (bWide ? 1 : 0);
    }
    if (val > 9) return null;
    digits += String(val);
  }

  const check = verifyMsiMod10(digits);
  if (!check.valid) return null;
  return {
    decoded: true,
    symbology: 'MSI',
    value: check.data,
    checksumValid: true,
    orientation: 'forward',
    decoder: 'stitchflow-1d-cv',
  };
}

// ============================================================================
// 3. PHARMACODE ONE-TRACK & TWO-TRACK DECODERS
// ============================================================================
export function decodePharmacode1TrackRuns(rawRuns: RunLength[]): SpecializedDecodeResult | null {
  const runs = trimQuietZones(rawRuns);
  const bars = runs.filter((r) => r.isBar);
  if (bars.length < 2 || bars.length > 16) return null;

  const minBar = Math.min(...bars.map((b) => b.length));
  const maxBar = Math.max(...bars.map((b) => b.length));
  const threshold = maxBar > minBar * 1.6 ? (minBar + maxBar) / 2 : minBar * 1.6;

  let value = 0;
  for (let i = 0; i < bars.length; i++) {
    const power = bars.length - 1 - i;
    const isWide = bars[i].length > threshold;
    value += (isWide ? 2 : 1) * Math.pow(2, power);
  }
  if (value < 3 || value > 131070) return null;

  return {
    decoded: true,
    symbology: 'PHARMACODE_1T',
    value: String(value),
    orientation: 'forward',
    decoder: 'stitchflow-1d-cv',
  };
}

/**
 * Pharmacode Two-Track takes upper and lower scanline presence per bar position:
 * 1 = bottom only, 2 = top only, 3 = full height (both).
 */
export function decodePharmacode2TrackTracks(
  topBars: boolean[],
  bottomBars: boolean[],
): SpecializedDecodeResult | null {
  if (topBars.length !== bottomBars.length || topBars.length < 1 || topBars.length > 10) {
    return null;
  }
  let value = 0;
  for (let i = 0; i < topBars.length; i++) {
    const t = topBars[i];
    const b = bottomBars[i];
    if (!t && !b) return null;
    const digit = t && b ? 3 : b ? 1 : 2;
    const power = topBars.length - 1 - i;
    value += digit * Math.pow(3, power);
  }
  if (value < 4 || value > 64570080) return null;
  return {
    decoded: true,
    symbology: 'PHARMACODE_2T',
    value: String(value),
    orientation: 'forward',
    decoder: 'stitchflow-1d-cv',
  };
}

/**
 * 2D ROI extractor for Pharmacode Two-Track from grayscale image buffer.
 */
export function decodePharmacode2TrackFromGrayscale(
  gray: Uint8Array,
  width: number,
  height: number,
): SpecializedDecodeResult | null {
  if (width < 20 || height < 20) return null;
  const threshold = computeOtsuThreshold(gray);
  const topY = Math.floor(height * 0.25);
  const botY = Math.floor(height * 0.75);
  const topRow = gray.subarray(topY * width, (topY + 1) * width);
  const botRow = gray.subarray(botY * width, (botY + 1) * width);

  const activeCol = new Array<boolean>(width);
  for (let x = 0; x < width; x++) {
    activeCol[x] = topRow[x] < threshold || botRow[x] < threshold;
  }

  const topBars: boolean[] = [];
  const bottomBars: boolean[] = [];
  let x = 0;
  while (x < width) {
    if (!activeCol[x]) {
      x++;
      continue;
    }
    const start = x;
    while (x < width && activeCol[x]) x++;
    const span = x - start;
    if (span < 2) continue;
    let topDark = 0;
    let botDark = 0;
    for (let k = start; k < x; k++) {
      if (topRow[k] < threshold) topDark++;
      if (botRow[k] < threshold) botDark++;
    }
    topBars.push(topDark > span * 0.4);
    bottomBars.push(botDark > span * 0.4);
  }

  return decodePharmacode2TrackTracks(topBars, bottomBars);
}

// ============================================================================
// 4. INDUSTRIAL 2 OF 5 / STANDARD 2 OF 5 DECODER
// ============================================================================
const IND25_DIGITS: Record<string, string> = {
  '00110': '0',
  '10001': '1',
  '01001': '2',
  '11000': '3',
  '00101': '4',
  '10100': '5',
  '01100': '6',
  '00011': '7',
  '10010': '8',
  '01010': '9',
};

export function decodeIndustrial2Of5Runs(rawRuns: RunLength[]): SpecializedDecodeResult | null {
  const runs = trimQuietZones(rawRuns);
  const bars = runs.filter((r) => r.isBar);
  // Start (3 bars: 110) + N*5 bars + Stop (3 bars: 101)
  if (bars.length < 11 || (bars.length - 6) % 5 !== 0) return null;

  const avg = bars.reduce((s, b) => s + b.length, 0) / bars.length;
  const bits = bars.map((b) => (b.length > avg * 1.35 ? '1' : '0'));

  const start = bits.slice(0, 3).join('');
  const stop = bits.slice(-3).join('');
  if (start !== '110' || stop !== '101') return null;

  let out = '';
  for (let i = 3; i < bits.length - 3; i += 5) {
    const d = IND25_DIGITS[bits.slice(i, i + 5).join('')];
    if (!d) return null;
    out += d;
  }

  return {
    decoded: true,
    symbology: 'INDUSTRIAL_2_OF_5',
    value: out,
    orientation: 'forward',
    decoder: 'stitchflow-1d-cv',
  };
}

// ============================================================================
// 5. FLATTERMARKEN DECODER (4-position bar mark digits 0-9)
// ============================================================================
const FLATTERMARKEN_MAP: Record<string, string> = {
  '1000': '1',
  '0100': '2',
  '0010': '3',
  '0001': '4',
  '1100': '5',
  '1010': '6',
  '1001': '7',
  '0110': '8',
  '0101': '9',
  '0011': '0',
};

export function decodeFlattermarkenPositions(cells: boolean[]): SpecializedDecodeResult | null {
  if (cells.length < 4 || cells.length % 4 !== 0) return null;
  let out = '';
  for (let i = 0; i < cells.length; i += 4) {
    const key = cells.slice(i, i + 4).map((c) => (c ? '1' : '0')).join('');
    const digit = FLATTERMARKEN_MAP[key];
    if (!digit) return null;
    out += digit;
  }
  return {
    decoded: true,
    symbology: 'FLATTERMARKEN',
    value: out,
    orientation: 'forward',
    decoder: 'stitchflow-1d-cv',
  };
}

/**
 * Unified scanline runner across grayscale image buffer (tries multiple horizontal rows).
 */
export function decodeSpecializedFromGrayscale(
  gray: Uint8Array,
  width: number,
  height: number,
  options?: { allowPharmacode?: boolean },
): SpecializedDecodeResult {
  const rowFractions = [0.5, 0.4, 0.6, 0.3, 0.7];
  let bestBlur = 0;

  for (const frac of rowFractions) {
    const y = Math.min(height - 1, Math.max(0, Math.floor(height * frac)));
    const line = gray.subarray(y * width, (y + 1) * width);
    const blur = scanlineSharpness(line);
    if (blur > bestBlur) bestBlur = blur;
    if (blur < 2.5) continue;

    const runs = extractRunLengths(line);
    const match =
      decodeCode11Runs(runs) ??
      decodeMsiRuns(runs) ??
      decodeIndustrial2Of5Runs(runs) ??
      (options?.allowPharmacode ? decodePharmacode1TrackRuns(runs) : null);

    if (match) {
      return { ...match, blurScore: Math.round(blur * 10) / 10 };
    }
  }

  return {
    decoded: false,
    decoder: 'stitchflow-1d-cv',
    blurScore: Math.round(bestBlur * 10) / 10,
    reason: bestBlur < 2.5 ? 'Image too blurry — hold steady in good light' : 'No supported 1D specialized barcode detected',
  };
}
