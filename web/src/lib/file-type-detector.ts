/**
 * File Type Detection Utility
 * Detects and validates e-book file formats
 */

export type SupportedEbookFormat = "pdf" | "epub";

export interface FileTypeInfo {
  format: SupportedEbookFormat;
  mimeType: string;
  extension: string;
  isValid: boolean;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  format?: SupportedEbookFormat;
  error?: string;
  fileSize?: number;
}

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Magic numbers for file type detection
const MAGIC_NUMBERS = {
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  EPUB: [0x50, 0x4b, 0x03, 0x04], // PK (ZIP signature, EPUB is a ZIP file)
} as const;

/**
 * Read the first few bytes of a file to detect magic number
 */
async function readMagicNumber(
  file: File,
  byteCount: number = 4,
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const blob = file.slice(0, byteCount);

    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      resolve(Array.from(bytes));
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Check if bytes match a magic number pattern
 */
function matchesMagicNumber(bytes: number[], pattern: readonly number[]): boolean {
  if (bytes.length < pattern.length) return false;
  return pattern.every((byte, index) => bytes[index] === byte);
}

/**
 * Verify EPUB by checking for mimetype file inside the ZIP
 */
async function verifyEpubStructure(file: File): Promise<boolean> {
  try {
    const JSZip = (await import("jszip")).default;
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // EPUB files must contain a 'mimetype' file with specific content
    const mimetypeFile = zip.file("mimetype");
    if (!mimetypeFile) return false;

    const mimetypeContent = await mimetypeFile.async("string");
    return mimetypeContent.trim() === "application/epub+zip";
  } catch (error) {
    console.error("Error verifying EPUB structure:", error);
    return false;
  }
}

/**
 * Detect file type from magic numbers and structure
 */
export async function detectFileType(file: File): Promise<FileTypeInfo> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  // Read magic number
  const magicBytes = await readMagicNumber(file);

  // Check for PDF
  if (matchesMagicNumber(magicBytes, MAGIC_NUMBERS.PDF)) {
    return {
      format: "pdf",
      mimeType: "application/pdf",
      extension: "pdf",
      isValid: true,
    };
  }

  // Check for EPUB (ZIP signature)
  if (matchesMagicNumber(magicBytes, MAGIC_NUMBERS.EPUB)) {
    // Verify it's actually an EPUB by checking structure
    const isEpub = await verifyEpubStructure(file);

    if (isEpub) {
      return {
        format: "epub",
        mimeType: "application/epub+zip",
        extension: "epub",
        isValid: true,
      };
    }

    return {
      format: "epub",
      mimeType: "application/zip",
      extension,
      isValid: false,
      error: "File has ZIP signature but is not a valid EPUB",
    };
  }

  // Unknown format
  return {
    format: "pdf", // Default fallback
    mimeType: file.type || "application/octet-stream",
    extension,
    isValid: false,
    error: `Unsupported file format. Only PDF and EPUB files are supported.`,
  };
}

/**
 * Validate e-book file (format and size)
 */
export async function validateEbookFile(
  file: File,
): Promise<ValidationResult> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      fileSize: file.size,
    };
  }

  // Detect file type
  const fileTypeInfo = await detectFileType(file);

  if (!fileTypeInfo.isValid) {
    return {
      valid: false,
      error: fileTypeInfo.error || "Invalid file format",
      fileSize: file.size,
    };
  }

  return {
    valid: true,
    format: fileTypeInfo.format,
    fileSize: file.size,
  };
}

/**
 * Get accepted MIME types for file input
 */
export function getAcceptedMimeTypes(): string {
  return ".pdf,.epub,application/pdf,application/epub+zip";
}

/**
 * Get human-readable format name
 */
export function getFormatName(format: SupportedEbookFormat): string {
  switch (format) {
    case "pdf":
      return "PDF";
    case "epub":
      return "EPUB";
    default:
      return format.toUpperCase();
  }
}

/**
 * Get format badge color for UI
 */
export function getFormatColor(format: SupportedEbookFormat): string {
  switch (format) {
    case "pdf":
      return "bg-red-100 text-red-800";
    case "epub":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
