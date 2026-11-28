import { Platform, Share } from 'react-native';
import { UserRole } from '../core/types';
import { BUNDLES, CARTONS, JOBS, TODAY_SHIFT } from '../fixtures/mockData';
import { apiRequest, getApiBaseUrl, getStoredSession } from '../services/api/apiClient';
import { useAuthStore } from '../store/authStore';

export interface RoleExportPayload {
  role: string;
  employeeId: string;
  userName: string;
  title: string;
  sheetName: string;
  generatedAt: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  summaryText: string;
  excelXml: string;
  csv: string;
}

const getBaseUrl = () => getApiBaseUrl();

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildDemoExcelXml(
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): string {
  const safeSheet = escapeXml(sheetName.slice(0, 31) || 'Report');
  const renderRow = (cells: Array<string | number>) =>
    `<Row>${cells
      .map((cell) => {
        const isNum = typeof cell === 'number' && Number.isFinite(cell);
        return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(String(cell))}</Data></Cell>`;
      })
      .join('')}</Row>`;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    `<Worksheet ss:Name="${safeSheet}"><Table>`,
    renderRow(headers),
    ...rows.map(renderRow),
    '</Table></Worksheet></Workbook>',
  ].join('\n');
}

function buildDemoRoleExport(role: UserRole, userName: string, employeeId: string): RoleExportPayload {
  const generatedAt = new Date().toISOString();
  let title = 'StitchFlow — Role Data Export';
  let sheetName = 'Role Report';
  let headers: string[] = [];
  let rows: Array<Array<string | number>> = [];

  if (role === 'operator') {
    title = 'StitchFlow — Operator Production Output';
    sheetName = 'Operator Output';
    headers = ['Bundle Code', 'Job Code', 'Style', 'Size', 'Color', 'Completed Qty', 'Target Qty', 'Status'];
    rows = BUNDLES.map((b) => [b.bundleCode, b.jobCode, b.styleName, b.size, b.color, b.completedQty, b.quantity, b.status]);
  } else if (role === 'supervisor') {
    title = 'StitchFlow — Supervisor Line Bundles & WIP';
    sheetName = 'Line Bundles WIP';
    headers = ['Bundle Code', 'Job Code', 'Line', 'Size', 'Color', 'Qty', 'Completed', 'Rework', 'Status'];
    rows = BUNDLES.map((b) => [b.bundleCode, b.jobCode, b.lineName, b.size, b.color, b.quantity, b.completedQty, b.reworkQty, b.status]);
  } else if (role === 'qc-inspector') {
    title = 'StitchFlow — QC Inspection & Release Ledger';
    sheetName = 'QC Ledger';
    headers = ['Bundle Code', 'Job Code', 'Qty', 'Completed', 'Rework', 'Rejected', 'Status'];
    rows = BUNDLES.map((b) => [b.bundleCode, b.jobCode, b.quantity, b.completedQty, b.reworkQty, b.rejectedQty, b.status]);
  } else if (role === 'store-dispatch') {
    title = 'StitchFlow — Store & Dispatch Cartons';
    sheetName = 'Dispatch Cartons';
    headers = ['Carton Code', 'Job Code', 'Style', 'Size', 'Color', 'Quantity', 'Status'];
    rows = CARTONS.map((c) => [c.cartonCode, c.jobCode, c.styleName, c.size, c.color, c.quantity, c.status]);
  } else if (role === 'packing-staff') {
    title = 'StitchFlow — Packing Cartons & Handover';
    sheetName = 'Packing Cartons';
    headers = ['Carton Code', 'Job Code', 'Style', 'Size', 'Color', 'Quantity', 'Packed By', 'Status'];
    rows = CARTONS.map((c) => [c.cartonCode, c.jobCode, c.styleName, c.size, c.color, c.quantity, c.packedBy, c.status]);
  } else {
    title = role === 'md'
      ? 'StitchFlow — Managing Director Executive Report'
      : 'StitchFlow — Factory Manager Operations Report';
    sheetName = role === 'md' ? 'MD Executive' : 'Factory Jobs';
    headers = ['Job Code', 'Style', 'Buyer', 'Order Qty', 'Cut', 'Stitched', 'Packed', 'Rework', 'Rejected', 'Status'];
    rows = JOBS.map((j) => [
      j.jobCode, j.styleName, j.buyerName, j.orderQuantity, j.cuttingQty, j.sewingOutQty,
      j.packingQty, j.reworkQty, j.rejectedQty, j.status,
    ]);
  }

  const excelXml = buildDemoExcelXml(sheetName, headers, rows);
  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\r\n');
  const summaryLines = [
    title,
    `Role      : ${role.toUpperCase()}`,
    `Employee  : ${userName} (${employeeId})`,
    `Shift     : ${TODAY_SHIFT.shiftType} (${TODAY_SHIFT.date})`,
    `Generated : ${generatedAt}`,
    `Records   : ${rows.length}`,
    '',
    ...rows.map((r, idx) => `${idx + 1}. ${headers.map((h, i) => `${h}: ${r[i] ?? '-'}`).join(' | ')}`),
  ];

  return {
    role,
    employeeId,
    userName,
    title,
    sheetName,
    generatedAt,
    headers,
    rows,
    summaryText: summaryLines.join('\n'),
    excelXml,
    csv,
  };
}

function triggerWebDownload(filename: string, content: BlobPart, mimeType: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports the current user's role-scoped data as PDF or Excel.
 * Uses binary download on web and structured Share sheet on mobile.
 */
export async function exportRoleReport(
  format: 'pdf' | 'excel',
  factoryId?: string,
): Promise<RoleExportPayload> {
  const { user, isDemoMode } = useAuthStore.getState();
  const role: UserRole = user?.role ?? 'operator';
  const userName = user?.name ?? 'Employee';
  const employeeId = user?.employeeId ?? 'EMP';

  if (isDemoMode) {
    const payload = buildDemoRoleExport(role, userName, employeeId);
    if (Platform.OS === 'web') {
      if (format === 'excel') {
        triggerWebDownload(`stitchflow-${role}-demo.xls`, payload.excelXml, 'application/vnd.ms-excel');
      } else {
        triggerWebDownload(`stitchflow-${role}-demo.txt`, payload.summaryText, 'text/plain;charset=utf-8');
      }
      return payload;
    }

    await Share.share({
      title: `${payload.title} (${format.toUpperCase()})`,
      message: format === 'excel' ? payload.csv : payload.summaryText,
    });
    return payload;
  }

  const suffix = factoryId ? `?factoryId=${encodeURIComponent(factoryId)}` : '';
  if (Platform.OS === 'web') {
    const session = await getStoredSession();
    const token = session?.accessToken;
    const endpoint = format === 'pdf' ? `/reports/role-export.pdf${suffix}` : `/reports/role-export.xls${suffix}`;
    const res = await fetch(`${getBaseUrl()}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Export failed (${res.status})`);
    }
    const blob = await res.blob();
    triggerWebDownload(
      `stitchflow-${role}-report.${format === 'pdf' ? 'pdf' : 'xls'}`,
      blob,
      format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel',
    );
  }

  const payload = await apiRequest<RoleExportPayload>(`/reports/role-export${suffix}`);
  if (Platform.OS !== 'web') {
    await Share.share({
      title: `${payload.title} (${format.toUpperCase()})`,
      message: format === 'excel' ? payload.csv : payload.summaryText,
    });
  }
  return payload;
}
