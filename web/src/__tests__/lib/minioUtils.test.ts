import { describe, it, expect } from 'vitest'
import { buildPublicPrefixUrl, sanitizeFileName } from '@/lib/minioUtils'

describe('buildPublicPrefixUrl', () => {
  it('should build correct URL for given prefix', () => {
    const prefix = 'books/123/pages'
    const url = buildPublicPrefixUrl(prefix)

    expect(url).toBeTruthy()
    expect(url).toContain(prefix)
    expect(url).toMatch(/^https?:\/\//) // Should start with http or https
  })

  it('should handle prefixes with trailing slashes', () => {
    const prefix = 'books/123/pages/'
    const url = buildPublicPrefixUrl(prefix)

    expect(url).toBeTruthy()
    expect(url).toContain('books/123/pages')
  })

  it('should handle empty prefix', () => {
    const prefix = ''
    const url = buildPublicPrefixUrl(prefix)

    expect(url).toBeTruthy()
  })
})

describe('sanitizeFileName', () => {
  it('should remove special characters from filename', () => {
    const dirty = 'my file!@#$%^&*().pdf'
    const clean = sanitizeFileName(dirty)

    expect(clean).toBe('my-file.pdf')
  })

  it('should handle spaces', () => {
    const filename = 'my book title.pdf'
    const result = sanitizeFileName(filename)

    expect(result).toBe('my-book-title.pdf')
  })

  it('should preserve file extension', () => {
    const filename = 'document.PDF'
    const result = sanitizeFileName(filename)

    expect(result).toMatch(/\.pdf$/i)
  })

  it('should handle multiple spaces', () => {
    const filename = 'book    with   spaces.pdf'
    const result = sanitizeFileName(filename)

    expect(result).not.toContain('  ') // No double spaces/dashes
  })

  it('should handle unicode characters', () => {
    const filename = 'book_título_español.pdf'
    const result = sanitizeFileName(filename)

    expect(result).toBeTruthy()
    expect(result).toMatch(/\.pdf$/)
  })

  it('should handle very long filenames', () => {
    const longName = 'a'.repeat(300) + '.pdf'
    const result = sanitizeFileName(longName)

    // Should truncate to reasonable length
    expect(result.length).toBeLessThan(256)
    expect(result).toMatch(/\.pdf$/)
  })
})
