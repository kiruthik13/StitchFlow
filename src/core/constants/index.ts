export const SCANNER_BARCODE_FORMATS = [
  'QR',
  'CODE_128',
  'CODE_39',
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'ITF_14',
  'DATA_MATRIX',
  'PDF_417',
  'AZTEC',
] as const;

export const DEFAULT_QC_EQUATION = {
  INSPECTED: 200,
  PASSED: 180,
  REWORK: 15,
  REJECTED: 5,
};

export const MIN_TOUCH_TARGET_SIZE = 44; // 44x44pt industrial touch target rule
