/**
 * Text Storage Service
 * Saves and retrieves book text JSON from MinIO bucket
 */

import { getMinioClient, getMinioBucketName } from "@/lib/minio";
import { buildPublicObjectUrl } from "@/lib/minioUtils";

export interface PageTextContent {
    pageNumber: number;
    text: string;
    wordCount: number;
}

export interface BookTextJSON {
    bookId: number;
    format: "pdf" | "epub";
    extractedAt: string;
    totalPages: number;
    totalWords: number;
    pages: PageTextContent[];
    metadata: {
        title?: string;
        author?: string;
        extractionMethod: "pdf-text" | "epub-native" | "ocr";
    };
}

const TEXT_BUCKET_PREFIX = "book-text";

/**
 * Get the MinIO object key for a book's text JSON
 */
export function getTextObjectKey(bookId: number): string {
    return `${TEXT_BUCKET_PREFIX}/${bookId}/pages.json`;
}

/**
 * Save book text content to MinIO as JSON
 */
export async function saveTextToStorage(
    bookId: number,
    content: BookTextJSON
): Promise<string> {
    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();
    const objectKey = getTextObjectKey(bookId);

    const jsonBuffer = Buffer.from(JSON.stringify(content, null, 2), "utf-8");

    await minioClient.putObject(bucketName, objectKey, jsonBuffer, jsonBuffer.length, {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=31536000, immutable",
    });

    return buildPublicObjectUrl(objectKey);
}

/**
 * Get book text content from MinIO
 */
export async function getTextFromStorage(
    bookId: number
): Promise<BookTextJSON | null> {
    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();
    const objectKey = getTextObjectKey(bookId);

    try {
        const chunks: Buffer[] = [];
        const stream = await minioClient.getObject(bucketName, objectKey);

        await new Promise<void>((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on("end", () => resolve());
            stream.on("error", reject);
        });

        const jsonBuffer = Buffer.concat(chunks);
        return JSON.parse(jsonBuffer.toString("utf-8")) as BookTextJSON;
    } catch (error) {
        // Check if it's a "not found" error
        if (
            error instanceof Error &&
            (error.message.includes("NoSuchKey") ||
                error.message.includes("The specified key does not exist"))
        ) {
            return null;
        }
        throw error;
    }
}

/**
 * Check if book text exists in storage
 */
export async function textExistsInStorage(bookId: number): Promise<boolean> {
    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();
    const objectKey = getTextObjectKey(bookId);

    try {
        await minioClient.statObject(bucketName, objectKey);
        return true;
    } catch {
        return false;
    }
}

/**
 * Delete book text from storage
 */
export async function deleteTextFromStorage(bookId: number): Promise<void> {
    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();
    const objectKey = getTextObjectKey(bookId);

    await minioClient.removeObject(bucketName, objectKey);
}

/**
 * Delete all rendered images for a book
 */
export async function deleteBookImages(bookId: number): Promise<number> {
    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();
    const imagePrefix = `book-pages/${bookId}/`;

    let deletedCount = 0;

    // List all objects with the book's image prefix
    const objectsStream = minioClient.listObjects(bucketName, imagePrefix, true);

    const objectsToDelete: string[] = [];

    await new Promise<void>((resolve, reject) => {
        objectsStream.on("data", (obj) => {
            if (obj.name) {
                objectsToDelete.push(obj.name);
            }
        });
        objectsStream.on("end", () => resolve());
        objectsStream.on("error", reject);
    });

    // Delete each object
    for (const objectName of objectsToDelete) {
        await minioClient.removeObject(bucketName, objectName);
        deletedCount++;
    }

    return deletedCount;
}
