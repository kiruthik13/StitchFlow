export function formatQuantity(val: number): string {
  return new Intl.NumberFormat('en-IN').format(val);
}

export function formatPercentage(val: number): string {
  return `${Math.round(val)}%`;
}

export function formatPace(pace: number): string {
  return `${Math.round(pace)} pcs/hr`;
}

export function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

export function formatTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoDate;
  }
}
