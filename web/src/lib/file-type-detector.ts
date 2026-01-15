/**
 * File Type Detection Utility
 * Detects and validates e-book file formats
 */

export type SupportedEbookFormat = "pdf" | "epub" | "mobi" | "azw" | "azw3";

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
  // MOBI/AZW files use PalmDB format with "BOOKMOBI" signature at offset 60
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
 * Read bytes at a specific offset in a file
 */
async function readBytesAtOffset(
  file: File,
  offset: number,
  byteCount: number,
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const blob = file.slice(offset, offset + byteCount);

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
function matchesMagicNumber(
  bytes: number[],
  pattern: readonly number[],
): boolean {
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
 * Verify MOBI/AZW by checking for PalmDB header and MOBI signature
 * MOBI files have "BOOKMOBI" or "TEXTMOBI" at offset 60
 */
async function verifyMobiStructure(
  file: File,
): Promise<{ isValid: boolean; format: "mobi" | "azw" | "azw3" | null }> {
  try {
    // Read the PalmDB name (first 32 bytes) and type/creator signature at offset 60
    const headerBytes = await readBytesAtOffset(file, 60, 8);

    // Convert bytes to string
    const signature = String.fromCharCode(...headerBytes);

    // Check for MOBI signatures
    if (signature.startsWith("BOOKMOBI") || signature.startsWith("TEXTMOBI")) {


      // AZW3 typically has MOBI version 8, but we'll treat all as compatible
      // The file extension will help us distinguish
      const extension = file.name.split(".").pop()?.toLowerCase() || "";

      if (extension === "azw3") {
        return { isValid: true, format: "azw3" };
      } else if (extension === "azw") {
        return { isValid: true, format: "azw" };
      } else {
        return { isValid: true, format: "mobi" };
      }
    }

    return { isValid: false, format: null };
  } catch (error) {
    console.error("Error verifying MOBI structure:", error);
    return { isValid: false, format: null };
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

  // Check for MOBI/AZW/AZW3 based on file extension and structure
  if (extension === "mobi" || extension === "azw" || extension === "azw3") {
    const mobiVerification = await verifyMobiStructure(file);

    if (mobiVerification.isValid && mobiVerification.format) {
      return {
        format: mobiVerification.format,
        mimeType: "application/x-mobipocket-ebook",
        extension: mobiVerification.format,
        isValid: true,
      };
    }

    return {
      format: extension as "mobi" | "azw" | "azw3",
      mimeType: "application/octet-stream",
      extension,
      isValid: false,
      error: `File has .${extension} extension but is not a valid Kindle format`,
    };
  }

  // Unknown format
  return {
    format: "pdf", // Default fallback
    mimeType: file.type || "application/octet-stream",
    extension,
    isValid: false,
    error: `Unsupported file format. Only PDF, EPUB, MOBI, AZW, and AZW3 files are supported.`,
  };
}

/**
 * Validate e-book file (format and size)
 */
export async function validateEbookFile(file: File): Promise<ValidationResult> {
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
  return ".pdf,.epub,.mobi,.azw,.azw3,application/pdf,application/epub+zip,application/x-mobipocket-ebook";
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
    case "mobi":
      return "MOBI";
    case "azw":
      return "AZW";
    case "azw3":
      return "AZW3";
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
    case "mobi":
      return "bg-orange-100 text-orange-800";
    case "azw":
      return "bg-amber-100 text-amber-800";
    case "azw3":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
