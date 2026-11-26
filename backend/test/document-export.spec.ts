import { buildExcelXml, buildPdfBuffer } from '../src/common/utilities/document-export';

describe('Document export utilities (PDF & Excel)', () => {
  it('builds a valid PDF 1.4 binary buffer with escaped text', () => {
    const pdf = buildPdfBuffer('StitchFlow Gate Pass (Test)', ['Line 1: JOB-1001', 'Line 2: Qty 50']);
    const text = pdf.toString('utf8');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('StitchFlow Gate Pass \\(Test\\)');
    expect(text).toContain('xref');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('builds a valid SpreadsheetML Excel XML workbook', () => {
    const xml = buildExcelXml('Jobs & Output', ['Job Code', 'Qty'], [['JOB-1001', 250]]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('Worksheet ss:Name="Jobs &amp; Output"');
    expect(xml).toContain('<Data ss:Type="String">JOB-1001</Data>');
    expect(xml).toContain('<Data ss:Type="Number">250</Data>');
  });
});
