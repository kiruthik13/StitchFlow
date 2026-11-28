export type ScannerInputSource =
  | 'camera'
  | 'bluetooth_hid'
  | 'usb_hid'
  | 'hid'
  | 'manual';

export type KnownSymbology =
  | 'CODE_128'
  | 'GS1_128'
  | 'CODE_39'
  | 'CODE_93'
  | 'CODE_11'
  | 'MSI'
  | 'ITF'
  | 'ITF_14'
  | 'INDUSTRIAL_2_OF_5'
  | 'PHARMACODE_1T'
  | 'PHARMACODE_2T'
  | 'FLATTERMARKEN'
  | 'EAN_13'
  | 'EAN_8'
  | 'UPC_A'
  | 'UPC_E'
  | 'CODABAR'
  | 'GS1_DATABAR'
  | 'QR_CODE'
  | 'MICRO_QR'
  | 'GS1_QR'
  | 'DATA_MATRIX'
  | 'GS1_DATA_MATRIX'
  | 'PDF417'
  | 'AZTEC'
  | 'ZXING_EXTENDED'
  | 'UNKNOWN_HID'
  | 'MANUAL';

export interface Gs1ParsedData {
  isGs1: boolean;
  ais: Record<string, string>;
  sscc?: string; // AI 00
  gtin?: string; // AI 01
  batchLot?: string; // AI 10
  productionDate?: string; // AI 11
  expirationDate?: string; // AI 17
  serialNumber?: string; // AI 21
  count?: string; // AI 37
}

export interface ProcessedBarcode {
  valid: boolean;
  rawValue: string;
  normalizedValue: string;
  symbology: KnownSymbology;
  inputSource: ScannerInputSource;
  timestamp: string;
  gs1?: Gs1ParsedData;
  checksumValid?: boolean;
  reason?: string;
}

const GS_CHAR = '\x1d';

const AIM_PREFIX_MAP: Record<string, KnownSymbology> = {
  ']C0': 'CODE_128',
  ']C1': 'GS1_128',
  ']A0': 'CODE_39',
  ']G0': 'CODE_93',
  ']I0': 'ITF',
  ']I1': 'ITF_14',
  ']E0': 'EAN_13',
  ']E4': 'EAN_8',
  ']F0': 'CODABAR',
  ']Q1': 'QR_CODE',
  ']Q3': 'GS1_QR',
  ']d1': 'DATA_MATRIX',
  ']d2': 'GS1_DATA_MATRIX',
  ']L0': 'PDF417',
  ']z0': 'AZTEC',
};

const EXPO_TYPE_MAP: Record<string, KnownSymbology> = {
  qr: 'QR_CODE',
  QR_CODE: 'QR_CODE',
  MICRO_QR_CODE: 'MICRO_QR',
  MICRO_QR: 'MICRO_QR',
  code128: 'CODE_128',
  CODE_128: 'CODE_128',
  code39: 'CODE_39',
  CODE_39: 'CODE_39',
  code93: 'CODE_93',
  CODE_93: 'CODE_93',
  CODE_11: 'CODE_11',
  MSI: 'MSI',
  itf14: 'ITF_14',
  ITF: 'ITF',
  ITF_14: 'ITF_14',
  INDUSTRIAL_2_OF_5: 'INDUSTRIAL_2_OF_5',
  PHARMACODE_1T: 'PHARMACODE_1T',
  PHARMACODE_2T: 'PHARMACODE_2T',
  FLATTERMARKEN: 'FLATTERMARKEN',
  ean13: 'EAN_13',
  EAN_13: 'EAN_13',
  ean8: 'EAN_8',
  EAN_8: 'EAN_8',
  upc_a: 'UPC_A',
  UPC_A: 'UPC_A',
  upc_e: 'UPC_E',
  UPC_E: 'UPC_E',
  codabar: 'CODABAR',
  CODABAR: 'CODABAR',
  DATA_BAR: 'GS1_DATABAR',
  DATA_BAR_EXPANDED: 'GS1_DATABAR',
  GS1_DATABAR: 'GS1_DATABAR',
  datamatrix: 'DATA_MATRIX',
  DATA_MATRIX: 'DATA_MATRIX',
  pdf417: 'PDF417',
  PDF_417: 'PDF417',
  aztec: 'AZTEC',
  AZTEC: 'AZTEC',
  ZXING_EXTENDED: 'ZXING_EXTENDED',
};

/**
 * Standard GS1 Mod-10 check digit validation for EAN-8, EAN-13, UPC-A, ITF-14, GTIN-14, SSCC-18.
 * Preserves leading zeros by operating strictly on character digits.
 */
export function verifyMod10CheckDigit(digits: string): boolean {
  if (!/^\d{8,18}$/.test(digits)) return false;
  const body = digits.slice(0, -1);
  const check = Number(digits[digits.length - 1]);
  let sum = 0;
  for (let i = body.length - 1, pos = 0; i >= 0; i--, pos++) {
    const n = Number(body[i]);
    sum += pos % 2 === 0 ? n * 3 : n;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === check;
}

const FIXED_AI_LENGTHS: Record<string, number> = {
  '00': 18,
  '01': 14,
  '11': 6,
  '17': 6,
};

/**
 * Parses GS1-128, GS1 DataMatrix, GS1 QR, and parenthesized GS1 payloads.
 */
export function parseGs1Payload(raw: string): Gs1ParsedData | undefined {
  let cleaned = raw.trim();
  for (const prefix of [']C1', ']d2', ']Q3']) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }
  if (cleaned.startsWith(GS_CHAR)) {
    cleaned = cleaned.slice(1);
  }

  const ais: Record<string, string> = {};

  // Format 1: Human-readable parenthesized GS1 e.g. (01)12345678901231(10)LOT42(21)SER1
  if (/^\(\d{2,4}\)/.test(cleaned)) {
    const regex = /\((\d{2,4})\)([^()]+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cleaned)) !== null) {
      ais[match[1]] = match[2].replace(/\x1d/g, '').trim();
    }
  } else if (
    raw.startsWith(']C1') ||
    raw.startsWith(']d2') ||
    raw.startsWith(']Q3') ||
    cleaned.includes(GS_CHAR) ||
    /^(00\d{18}|01\d{14})/.test(cleaned)
  ) {
    // Format 2: Raw GS1 element string with fixed-length AIs & <GS> (\x1d) separators
    let idx = 0;
    while (idx + 2 <= cleaned.length) {
      if (cleaned[idx] === GS_CHAR) {
        idx++;
        continue;
      }
      const ai = cleaned.slice(idx, idx + 2);
      if (!/^\d{2}$/.test(ai)) break;
      idx += 2;
      const fixedLen = FIXED_AI_LENGTHS[ai];
      if (fixedLen) {
        if (idx + fixedLen > cleaned.length) break;
        ais[ai] = cleaned.slice(idx, idx + fixedLen);
        idx += fixedLen;
      } else {
        const gsPos = cleaned.indexOf(GS_CHAR, idx);
        const end = gsPos === -1 ? cleaned.length : gsPos;
        ais[ai] = cleaned.slice(idx, end);
        idx = gsPos === -1 ? cleaned.length : gsPos + 1;
      }
    }
  }

  if (Object.keys(ais).length === 0) return undefined;

  return {
    isGs1: true,
    ais,
    sscc: ais['00'],
    gtin: ais['01'],
    batchLot: ais['10'],
    productionDate: ais['11'],
    expirationDate: ais['17'],
    serialNumber: ais['21'],
    count: ais['37'],
  };
}

export function processBarcodePayload(
  rawInput: string,
  options?: {
    expoType?: string;
    inputSource?: ScannerInputSource;
    prefixStrip?: string;
    suffixStrip?: string;
  },
): ProcessedBarcode {
  const timestamp = new Date().toISOString();
  const inputSource: ScannerInputSource = options?.inputSource ?? 'manual';

  if (typeof rawInput !== 'string') {
    return {
      valid: false,
      rawValue: '',
      normalizedValue: '',
      symbology: inputSource === 'manual' ? 'MANUAL' : 'UNKNOWN_HID',
      inputSource,
      timestamp,
      reason: 'Empty barcode',
    };
  }

  let working = rawInput.replace(/[\r\n\t]+$/g, '').trim();
  if (options?.prefixStrip && working.startsWith(options.prefixStrip)) {
    working = working.slice(options.prefixStrip.length);
  }
  if (options?.suffixStrip && working.endsWith(options.suffixStrip)) {
    working = working.slice(0, -options.suffixStrip.length);
  }

  if (!working || working.length > 512) {
    return {
      valid: false,
      rawValue: rawInput,
      normalizedValue: '',
      symbology: inputSource === 'manual' ? 'MANUAL' : 'UNKNOWN_HID',
      inputSource,
      timestamp,
      reason: working ? 'Barcode exceeds 512 characters' : 'Empty barcode',
    };
  }

  // Reject unsafe non-printable control characters (allow GS1 \x1d)
  if (/[\x00-\x1c\x1e-\x1f\x7f]/.test(working)) {
    return {
      valid: false,
      rawValue: rawInput,
      normalizedValue: '',
      symbology: inputSource === 'manual' ? 'MANUAL' : 'UNKNOWN_HID',
      inputSource,
      timestamp,
      reason: 'Unsupported control characters in barcode',
    };
  }

  let symbology: KnownSymbology =
    options?.expoType && EXPO_TYPE_MAP[options.expoType]
      ? EXPO_TYPE_MAP[options.expoType]
      : inputSource === 'manual'
        ? 'MANUAL'
        : 'UNKNOWN_HID';

  const aimPrefix = working.slice(0, 3);
  if (AIM_PREFIX_MAP[aimPrefix]) {
    symbology = AIM_PREFIX_MAP[aimPrefix];
    working = working.slice(3);
  }

  const gs1 = parseGs1Payload(rawInput.trim());
  if (gs1) {
    if (symbology === 'CODE_128') symbology = 'GS1_128';
    else if (symbology === 'DATA_MATRIX') symbology = 'GS1_DATA_MATRIX';
    else if (symbology === 'QR_CODE') symbology = 'GS1_QR';
  }

  // Validate check digits for numeric retail/logistic symbologies when known
  let checksumValid: boolean | undefined;
  if (symbology === 'EAN_13' || symbology === 'EAN_8' || symbology === 'UPC_A' || symbology === 'ITF_14') {
    checksumValid = verifyMod10CheckDigit(working);
    if (!checksumValid) {
      return {
        valid: false,
        rawValue: rawInput,
        normalizedValue: working,
        symbology,
        inputSource,
        timestamp,
        checksumValid: false,
        reason: `Invalid ${symbology} check digit`,
      };
    }
  }

  // Preserve leading zeros & Full ASCII case; only normalize StitchFlow BND-/CTN-/JOB- prefixes
  const normalizedValue = /^(BND|CTN|JOB)-/i.test(working)
    ? working.slice(0, 4).toUpperCase() + working.slice(4)
    : working;

  return {
    valid: true,
    rawValue: rawInput,
    normalizedValue,
    symbology,
    inputSource,
    timestamp,
    gs1,
    checksumValid,
  };
}

export function formatBarcodeShareReport(
  processed: ProcessedBarcode,
  context?: {
    bundle?: {
      bundleCode: string;
      jobCode: string;
      color: string;
      size: string;
      quantity: number;
    } | null;
    unregistered?: boolean;
    operatorName?: string;
    factoryName?: string;
  },
): { title: string; message: string } {
  const scannedAt = new Date(processed.timestamp).toLocaleString();
  const lines: string[] = [
    'StitchFlow — Barcode Scan Report',
    '──────────────────────────',
    `Barcode   : ${processed.rawValue}`,
    `Symbology : ${processed.symbology}`,
    `Source    : ${processed.inputSource.toUpperCase()}`,
    `Scanned   : ${scannedAt}`,
  ];

  if (processed.checksumValid !== undefined) {
    lines.push(`Checksum  : ${processed.checksumValid ? 'Valid' : 'Invalid'}`);
  }

  if (processed.gs1?.ais) {
    lines.push('GS1 Data  :');
    for (const [ai, val] of Object.entries(processed.gs1.ais)) {
      lines.push(`  • AI (${ai}): ${val}`);
    }
  }

  if (context?.bundle) {
    const b = context.bundle;
    lines.push(
      'Status    : Registered Production Bundle',
      `Job Order : ${b.jobCode}`,
      `Bundle ID : ${b.bundleCode}`,
      `Details   : ${b.color} · Size ${b.size} · ${b.quantity} pcs`,
    );
  } else if (context?.unregistered) {
    lines.push('Status    : Decoded (Not registered in StitchFlow)');
  }

  if (context?.factoryName) {
    lines.push(`Factory   : ${context.factoryName}`);
  }
  if (context?.operatorName) {
    lines.push(`Scanned By: ${context.operatorName}`);
  }

  return {
    title: `StitchFlow Scan · ${processed.normalizedValue}`,
    message: lines.join('\n'),
  };
}
