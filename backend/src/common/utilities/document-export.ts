function escapePdfText(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds a valid single-page PDF 1.4 binary buffer with Helvetica typography.
 */
export function buildPdfBuffer(title: string, lines: string[]): Buffer {
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
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += obj;
  }

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'utf8');
}

/**
 * Builds an Excel-compatible SpreadsheetML 2003 XML workbook.
 */
export function buildExcelXml(
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
