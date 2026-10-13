import { existsSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export const renderPdfPage = (pdfPath: string, directory: string, page: number): string => {
  const outputPrefix = join(directory, 'page');
  execFileSync('pdftocairo', [
    '-jpeg', '-singlefile', '-r', '150', '-f', String(page), '-l', String(page),
    '-jpegopt', 'quality=95', pdfPath, outputPrefix,
  ], { stdio: 'pipe' });
  const generatedFile = `${outputPrefix}.jpg`;
  if (!existsSync(generatedFile)) {
    throw new Error(`Generated file not found for page ${page}`);
  }
  const targetFile = join(directory, `page-${String(page).padStart(4, '0')}.jpg`);
  renameSync(generatedFile, targetFile);
  return targetFile;
};
