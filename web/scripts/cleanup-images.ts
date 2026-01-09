#!/usr/bin/env tsx

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
    const { query, pool } = await import("@/lib/db");
    const { getMinioClient, getMinioBucketName } = await import("@/lib/minio");

    console.log("🚀 Starting thorough orphaned image cleanup...");

    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();

    try {
        // Get all books that are completed
        const result = await query(`
      SELECT id, title FROM books WHERE text_extraction_status = 'completed'
    `);

        const books = result.rows;
        console.log(`Checking ${books.length} books for orphaned images...\n`);

        let totalDeleted = 0;

        for (const book of books) {
            // Check both potential prefixes to be safe
            const prefixes = [`book-pages/${book.id}/`, `book-images/${book.id}/`];

            for (const prefix of prefixes) {
                const objectsToDelete: string[] = [];
                const objectsStream = minioClient.listObjects(bucketName, prefix, true);

                await new Promise<void>((resolve, reject) => {
                    objectsStream.on("data", (obj) => {
                        if (obj.name) objectsToDelete.push(obj.name);
                    });
                    objectsStream.on("end", () => resolve());
                    objectsStream.on("error", reject);
                });

                if (objectsToDelete.length > 0) {
                    console.log(`🧹 Found ${objectsToDelete.length} orphaned objects for "${book.title}" (ID: ${book.id}) with prefix "${prefix}"`);
                    for (const obj of objectsToDelete) {
                        await minioClient.removeObject(bucketName, obj);
                        totalDeleted++;
                    }
                }
            }
        }

        console.log(`\n✅ Cleanup complete! Total objects deleted: ${totalDeleted}`);
        await pool.end();
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
    }
}

main();
