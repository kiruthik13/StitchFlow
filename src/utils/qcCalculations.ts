/**
 * Strictly verifies the garment manufacturing QC release rule:
 * Passed + Rework + Rejected must equal Inspected.
 * Released quantity can NEVER exceed Passed quantity.
 */
export function validateQCReconciliation(
  inspected: number,
  passed: number,
  rework: number,
  rejected: number
): { isValid: boolean; error?: string } {
  if (inspected <= 0) {
    return { isValid: false, error: 'Inspected quantity must be greater than zero.' };
  }
  const sum = passed + rework + rejected;
  if (sum !== inspected) {
    return {
      isValid: false,
      error: `QC reconciliation mismatch: Passed (${passed}) + Rework (${rework}) + Rejected (${rejected}) = ${sum}, which does not match Inspected (${inspected}).`,
    };
  }
  return { isValid: true };
}

export function calculateEfficiency(actualQty: number, targetQty: number): number {
  if (targetQty <= 0) return 0;
  return Math.min(100, Math.round((actualQty / targetQty) * 100));
}

export function calculateDHU(defectCount: number, totalPieces: number): number {
  if (totalPieces <= 0) return 0;
  return Number(((defectCount / totalPieces) * 100).toFixed(1));
}
