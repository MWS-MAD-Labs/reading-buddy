#!/usr/bin/env tsx

/**
 * Migration Script: Text-Based Reader Migration
 * 
 * Extracts text from all books and saves to MinIO, then deletes old images.
 * 
 * Usage:
 *   npm run migrate:text-reader -- --dryRun        # Preview changes
 *   npm run migrate:text-reader -- --execute       # Run migration
 *   npm run migrate:text-reader -- --bookId=123    # Migrate single book
 */

// Load environment variables FIRST
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

// Use dynamic imports to ensure env is loaded before modules that use it
async function main() {
    // Dynamic imports after env is loaded
    const { query, pool } = await import("@/lib/db");
    const { extractTextFromPDF } = await import("@/lib/pdf-extractor");
    const { saveTextToStorage, deleteBookImages } = await import("@/lib/text-storage");
    type BookTextJSON = Awaited<ReturnType<typeof import("@/lib/text-storage")>>["BookTextJSON"];

    interface BookRecord {
        id: number;
        title: string;
        author: string | null;
        pdf_url: string;
        page_images_count: number | null;
        page_images_prefix: string | null;
        file_format: string | null;
        text_json_url: string | null;
        text_extraction_status: string | null;
    }

    interface MigrationStats {
        total: number;
        extracted: number;
        skipped: number;
        failed: number;
        imagesDeleted: number;
    }

    const parseArgs = () => {
        const args = process.argv.slice(2);
        const result = {
            dryRun: args.includes("--dryRun"),
            execute: args.includes("--execute"),
            bookId: null as number | null,
        };

        for (const arg of args) {
            if (arg.startsWith("--bookId=")) {
                result.bookId = parseInt(arg.split("=")[1], 10);
            }
        }

        if (!result.dryRun && !result.execute) {
            console.log(`
Text-Based Reader Migration Script

Usage:
  npx tsx scripts/migrate-to-text-reader.ts --dryRun      Preview changes without executing
  npx tsx scripts/migrate-to-text-reader.ts --execute     Run the migration
  npx tsx scripts/migrate-to-text-reader.ts --bookId=123  Migrate a single book

Options:
  --dryRun     Show what would be done without making changes
  --execute    Actually perform the migration
  --bookId=N   Process only the specified book ID
`);
            process.exit(0);
        }

        return result;
    };

    async function migrateBook(
        book: BookRecord,
        dryRun: boolean
    ): Promise<{ success: boolean; imagesDeleted: number; error?: string }> {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`📚 Book: "${book.title}" (ID: ${book.id})`);
        console.log(`   Format: ${book.file_format || "pdf"}`);
        console.log(`   Current images: ${book.page_images_count || 0}`);
        console.log(`   Text status: ${book.text_extraction_status || "pending"}`);
        console.log(`${"=".repeat(60)}`);

        // Skip if already migrated
        if (book.text_json_url && book.text_extraction_status === "completed") {
            console.log(`⏭️  Skipping - already migrated`);
            return { success: true, imagesDeleted: 0 };
        }

        if (!book.pdf_url) {
            console.log(`❌ Skipping - no PDF URL`);
            return { success: false, imagesDeleted: 0, error: "No PDF URL" };
        }

        if (dryRun) {
            console.log(`🔍 DRY RUN: Would extract text and save to MinIO`);
            if (book.page_images_count && book.page_images_count > 0) {
                console.log(`🔍 DRY RUN: Would delete ${book.page_images_count} images`);
            }
            return { success: true, imagesDeleted: book.page_images_count || 0 };
        }

        try {
            // Step 1: Mark as processing
            await query(
                `UPDATE books SET text_extraction_status = 'processing' WHERE id = $1`,
                [book.id]
            );

            // Step 2: Extract text
            console.log(`\n📄 Extracting text from PDF...`);
            const startTime = Date.now();
            const textContent = await extractTextFromPDF(book.pdf_url);
            const extractDuration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log(`   ✓ Extracted ${textContent.totalPages} pages, ${textContent.totalWords} words in ${extractDuration}s`);

            // Check if we got meaningful content
            if (textContent.totalWords < 50) {
                throw new Error(
                    `Only ${textContent.totalWords} words extracted - likely a scanned/image PDF`
                );
            }

            // Step 3: Build JSON and save to MinIO
            console.log(`\n☁️  Saving to MinIO bucket...`);
            const bookTextJson = {
                bookId: book.id,
                format: (book.file_format as "pdf" | "epub") || "pdf",
                extractedAt: new Date().toISOString(),
                totalPages: textContent.totalPages,
                totalWords: textContent.totalWords,
                pages: textContent.pages,
                metadata: {
                    title: book.title,
                    author: book.author || undefined,
                    extractionMethod: textContent.extractionMethod,
                },
            };

            const textJsonUrl = await saveTextToStorage(book.id, bookTextJson as Parameters<typeof saveTextToStorage>[1]);
            console.log(`   ✓ Saved to: ${textJsonUrl}`);

            // Step 4: Update database
            console.log(`\n📝 Updating database...`);
            await query(
                `UPDATE books SET 
          text_json_url = $1,
          text_extraction_status = 'completed',
          text_extracted_at = NOW(),
          text_extraction_method = $2
         WHERE id = $3`,
                [textJsonUrl, textContent.extractionMethod, book.id]
            );
            console.log(`   ✓ Database updated`);

            // Step 5: Delete old images
            let imagesDeleted = 0;
            if (book.page_images_count && book.page_images_count > 0) {
                console.log(`\n🗑️  Deleting old images...`);
                imagesDeleted = await deleteBookImages(book.id);
                console.log(`   ✓ Deleted ${imagesDeleted} images`);

                // Clear image columns in database
                await query(
                    `UPDATE books SET 
            page_images_prefix = NULL,
            page_images_count = NULL,
            page_images_rendered_at = NULL
           WHERE id = $1`,
                    [book.id]
                );
            }

            console.log(`\n✅ Successfully migrated "${book.title}"`);
            return { success: true, imagesDeleted };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`\n❌ Failed to migrate book ${book.id}: ${errorMessage}`);

            // Mark as failed in database
            await query(
                `UPDATE books SET 
          text_extraction_status = 'failed',
          text_extraction_error = $1
         WHERE id = $2`,
                [errorMessage, book.id]
            );

            return { success: false, imagesDeleted: 0, error: errorMessage };
        }
    }

    const { dryRun, execute, bookId } = parseArgs();

    console.log(`\n${"═".repeat(70)}`);
    console.log(`  📖 TEXT-BASED READER MIGRATION`);
    console.log(`  ${dryRun ? "🔍 DRY RUN MODE" : "🚀 EXECUTION MODE"}`);
    console.log(`${"═".repeat(70)}\n`);

    // Build query
    let sql = `SELECT 
    id, title, author, pdf_url, page_images_count, page_images_prefix, 
    file_format, text_json_url, text_extraction_status
   FROM books`;
    const params: (number | string)[] = [];

    if (bookId) {
        sql += ` WHERE id = $1`;
        params.push(bookId);
    }
    sql += ` ORDER BY id ASC`;

    try {
        const result = await query<BookRecord>(sql, params);
        const books = result.rows;

        if (!books || books.length === 0) {
            console.log("No books found to migrate.");
            await pool.end();
            process.exit(0);
        }

        console.log(`Found ${books.length} book(s) to process\n`);

        const stats: MigrationStats = {
            total: books.length,
            extracted: 0,
            skipped: 0,
            failed: 0,
            imagesDeleted: 0,
        };

        for (const book of books) {
            const migrationResult = await migrateBook(book, dryRun);

            if (migrationResult.success) {
                if (migrationResult.imagesDeleted === 0 && book.text_json_url) {
                    stats.skipped++;
                } else {
                    stats.extracted++;
                }
                stats.imagesDeleted += migrationResult.imagesDeleted;
            } else {
                stats.failed++;
            }
        }

        // Print summary
        console.log(`\n${"═".repeat(70)}`);
        console.log(`  📊 MIGRATION SUMMARY ${dryRun ? "(DRY RUN)" : ""}`);
        console.log(`${"═".repeat(70)}`);
        console.log(`  Total books:      ${stats.total}`);
        console.log(`  ✅ Extracted:     ${stats.extracted}`);
        console.log(`  ⏭️  Skipped:       ${stats.skipped}`);
        console.log(`  ❌ Failed:        ${stats.failed}`);
        console.log(`  🗑️  Images deleted: ${stats.imagesDeleted}`);
        console.log(`${"═".repeat(70)}\n`);

        if (dryRun) {
            console.log("💡 Run with --execute to perform the actual migration.\n");
        }

        await pool.end();
        process.exit(stats.failed > 0 ? 1 : 0);
    } catch (error) {
        console.error("Failed to fetch books:", error);
        await pool.end();
        process.exit(1);
    }
}

main().catch(async (error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
});
