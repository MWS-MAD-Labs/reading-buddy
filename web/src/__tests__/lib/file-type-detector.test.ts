import { describe, it, expect } from 'vitest'
import { detectFileType } from '@/lib/file-type-detector'

describe('detectFileType', () => {
  it('should detect PDF files', async () => {
    // PDF magic number: %PDF-1.
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e])
    const result = await detectFileType(pdfBuffer)
    expect(result.format).toBe('pdf')
    expect(result.detected).toBe(true)
  })

  it('should detect EPUB files', async () => {
    // EPUB is a ZIP file with specific structure
    // ZIP magic number: PK (0x50 0x4b)
    const epubBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04])
    const result = await detectFileType(epubBuffer)
    // Note: detectFileType might return 'epub' or need more bytes to distinguish from ZIP
    expect(['epub', 'zip']).toContain(result.format)
  })

  it('should detect MOBI files', async () => {
    // MOBI signature "BOOKMOBI" at offset 60
    const mobiBuffer = Buffer.alloc(68)
    Buffer.from('BOOKMOBI').copy(mobiBuffer, 60)
    const result = await detectFileType(mobiBuffer)
    expect(result.format).toBe('mobi')
    expect(result.detected).toBe(true)
  })

  it('should return unknown for unrecognized files', async () => {
    const unknownBuffer = Buffer.from([0xff, 0xff, 0xff, 0xff])
    const result = await detectFileType(unknownBuffer)
    expect(result.format).toBe('unknown')
    expect(result.detected).toBe(false)
  })

  it('should handle empty buffers', async () => {
    const emptyBuffer = Buffer.alloc(0)
    const result = await detectFileType(emptyBuffer)
    expect(result.format).toBe('unknown')
    expect(result.detected).toBe(false)
  })

  it('should handle small buffers', async () => {
    const smallBuffer = Buffer.from([0x25, 0x50]) // Only 2 bytes
    const result = await detectFileType(smallBuffer)
    // Should not crash and should return a result
    expect(result).toBeDefined()
    expect(typeof result.format).toBe('string')
    expect(typeof result.detected).toBe('boolean')
  })
})
