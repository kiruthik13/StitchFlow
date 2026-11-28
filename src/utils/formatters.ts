/**
 * Shared formatting utilities for consistent, readable industrial data display
 * across all StitchFlow roles, modules, and shareable documents.
 */

export function formatDateTime(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return date.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}

export function formatDateOnly(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatQuantity(
  value: number | string | null | undefined,
  unit = 'pcs',
  fallback = '0',
): string {
  const num = Number(value);
  if (value === null || value === undefined || Number.isNaN(num)) {
    return unit ? `${fallback} ${unit}` : fallback;
  }
  const formatted = num.toLocaleString();
  return unit ? `${formatted} ${unit}` : formatted;
}

export function shortCode(value: string | null | undefined, length = 8): string {
  if (!value) return '—';
  const trimmed = value.trim();
  if (trimmed.length <= length) return trimmed.toUpperCase();
  return trimmed.slice(0, length).toUpperCase();
}
