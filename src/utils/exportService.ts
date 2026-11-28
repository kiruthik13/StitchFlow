import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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

function escapePdfText(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildDemoPdfContent(title: string, lines: string[]): string {
  const safeLines = [title, '', ...lines].slice(0, 48);
  const contentOps: string[] = ['BT', '/F1 11 Tf', '40 760 Td', '14 TL'];
  for (let i = 0; i < safeLines.length; i += 1) {
    const text = escapePdfText(safeLines[i]);
    if (i === 0) {
      contentOps.push(`/F1 14 Tf (${text}) Tj /F1 10 Tf T*`);
    } else {
      contentOps.push(`(${text}) Tj T*`);
    }
  }
  contentOps.push('ET');
  const stream = contentOps.join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }
  const xrefOffset = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return body + xref + trailer;
}

async function shareFileOnDevice(
  fileUri: string,
  mimeType: string,
  dialogTitle: string,
  uti: string,
) {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, { mimeType, dialogTitle, UTI: uti });
    return;
  }
  await Share.share({ title: dialogTitle, url: fileUri });
}

export async function downloadAndShareDocument(
  endpoint: string,
  filename: string,
  mimeType: string,
  uti: string,
  dialogTitle: string,
): Promise<void> {
  const session = await getStoredSession();
  const token = session?.accessToken;

  if (Platform.OS === 'web') {
    const res = await fetch(`${getBaseUrl()}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    triggerWebDownload(filename, blob, mimeType);
    return;
  }

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) throw new Error('Device storage directory unavailable');
  const fileUri = `${baseDir}${filename}`;
  const result = await FileSystem.downloadAsync(`${getBaseUrl()}${endpoint}`, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Export failed (${result.status})`);
  }
  await shareFileOnDevice(result.uri, mimeType, dialogTitle, uti);
}

/**
 * Exports the current user's role-scoped data as a real PDF or Excel file.
 */
export async function exportRoleReport(
  format: 'pdf' | 'excel',
  factoryId?: string,
): Promise<RoleExportPayload> {
  const { user, isDemoMode } = useAuthStore.getState();
  const role: UserRole = user?.role ?? 'operator';
  const userName = user?.name ?? 'Employee';
  const employeeId = user?.employeeId ?? 'EMP';
  const ext = format === 'pdf' ? 'pdf' : 'xls';
  const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel';
  const uti = format === 'pdf' ? 'com.adobe.pdf' : 'com.microsoft.excel.xls';

  if (isDemoMode) {
    const payload = buildDemoRoleExport(role, userName, employeeId);
    const filename = `stitchflow-${role}-demo.${ext}`;
    const fileContent =
      format === 'excel'
        ? payload.excelXml
        : buildDemoPdfContent(payload.title, payload.summaryText.split('\n').slice(1));

    if (Platform.OS === 'web') {
      triggerWebDownload(filename, fileContent, mimeType);
      return payload;
    }

    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!baseDir) throw new Error('Device storage directory unavailable');
    const fileUri = `${baseDir}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, fileContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await shareFileOnDevice(fileUri, mimeType, `${payload.title} (${format.toUpperCase()})`, uti);
    return payload;
  }

  const suffix = factoryId ? `?factoryId=${encodeURIComponent(factoryId)}` : '';
  const endpoint = format === 'pdf' ? `/reports/role-export.pdf${suffix}` : `/reports/role-export.xls${suffix}`;
  const filename = `stitchflow-${role}-report.${ext}`;
  await downloadAndShareDocument(endpoint, filename, mimeType, uti, `StitchFlow ${role.toUpperCase()} Report`);
  return apiRequest<RoleExportPayload>(`/reports/role-export${suffix}`);
}
