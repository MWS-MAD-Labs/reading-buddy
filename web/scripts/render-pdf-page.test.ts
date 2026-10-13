// @vitest-environment node
import { test, expect } from 'vitest';
import { mkdtempSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderPdfPage } from './render-pdf-page';

// Minimal two-page PDF; no external fixture or application data is required.
function makePdf(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Resources << >> >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Resources << >> >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

test.skipIf(spawnSync('pdftocairo', ['-v']).error?.['code'] === 'ENOENT')('renders pages from a PDF as four-digit numbered JPEG files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'reading-buddy-render-test-'));
  try {
    const pdf = join(dir, 'book.pdf');
    writeFileSync(pdf, makePdf());
    const first = renderPdfPage(pdf, dir, 1);
    const second = renderPdfPage(pdf, dir, 2);
    expect(first).toBe(join(dir, 'page-0001.jpg'));
    expect(second).toBe(join(dir, 'page-0002.jpg'));
    expect(existsSync(first)).toBe(true);
    expect(existsSync(second)).toBe(true);
    expect(readdirSync(dir).sort()).toEqual(['book.pdf', 'page-0001.jpg', 'page-0002.jpg']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
