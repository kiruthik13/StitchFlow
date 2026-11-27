export interface Gs1ParsedData {
  isGs1: boolean;
  ais: Record<string, string>;
  sscc?: string;
  gtin?: string;
  batchLot?: string;
  productionDate?: string;
  expirationDate?: string;
  serialNumber?: string;
  count?: string;
}

const GS_CHAR = '\x1d';
const FIXED_AI_LENGTHS: Record<string, number> = {
  '00': 18,
  '01': 14,
  '11': 6,
  '17': 6,
};

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

export function extractLookupCandidates(rawBarcode: string): {
  cleaned: string;
  candidates: string[];
  gs1?: Gs1ParsedData;
} {
  let cleaned = rawBarcode.replace(/[\r\n\t]+$/g, '').trim();
  if (/^\][A-Za-z][0-9]/.test(cleaned)) {
    cleaned = cleaned.slice(3);
  }
  const gs1 = parseGs1Payload(rawBarcode);
  const candidates = new Set<string>([cleaned]);

  if (/^BND-/i.test(cleaned)) {
    candidates.add('BND-' + cleaned.slice(4).toLowerCase());
    candidates.add('BND-' + cleaned.slice(4).toUpperCase());
  }
  if (gs1?.serialNumber) candidates.add(gs1.serialNumber);
  if (gs1?.sscc) candidates.add(gs1.sscc);
  if (gs1?.batchLot) candidates.add(gs1.batchLot);

  return {
    cleaned,
    candidates: Array.from(candidates).filter(Boolean),
    gs1,
  };
}
