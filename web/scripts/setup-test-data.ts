#!/usr/bin/env tsx

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import bcrypt from "bcryptjs";

async function main() {
    const { query, pool } = await import("@/lib/db");

    console.log("🚀 Setting up test data for E2E tests...");

    const testEmail = "test-reader@millennia21.id";
    const testPassword = "password123";
    const testName = "Test Reader";

    try {
        // 1. Create test user if not exists
        const hashedPassword = await bcrypt.hash(testPassword, 10);

        // Using a transaction to ensure atomicity
        const userId = await pool.query(`
      INSERT INTO users (email, name, password_hash, email_verified)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = $3, name = $2
      RETURNING id
    `, [testEmail, testName, hashedPassword]).then(res => res.rows[0].id);

        console.log(`✅ Test user ensured: ${testEmail} (ID: ${userId})`);

        // 2. Ensure profile exists
        await pool.query(`
      INSERT INTO profiles (id, user_id, role, full_name, level, xp)
      VALUES ($1, $1, 'STUDENT', $2, 1, 0)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId, testName]);

        console.log(`✅ Profile ensured for user`);

        // 3. Ensure we have at least one test book
        const bookResult = await pool.query(`
      SELECT id, title, file_format FROM books LIMIT 2
    `);

        if (bookResult.rows.length === 0) {
            console.log("⚠️ No books found in database. Inserting a dummy book for testing...");
            const dummyBook = await pool.query(`
                INSERT INTO books (
                    title, 
                    author, 
                    description, 
                    file_format, 
                    pdf_url, 
                    cover_url,
                    page_count,
                    page_images_prefix,
                    page_images_count,
                    text_extraction_status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, title, file_format
            `, [
                "Test Book",
                "Test Author",
                "A book for E2E testing",
                "pdf",
                "http://localhost/test.pdf",
                "http://localhost/cover.jpg",
                10,
                "http://localhost/pages/test-book/",  // page images prefix
                10,  // page images count
                null  // don't set text_extraction_status to avoid text mode errors
            ]);
            bookResult.rows.push(dummyBook.rows[0]);
            console.log(`✅ Dummy book created: "${dummyBook.rows[0].title}"`);
        }

        console.log(`✅ Found ${bookResult.rows.length} book(s) to use for testing.`);

        // Assign books to student if not already assigned
        for (const book of bookResult.rows) {
            await pool.query(`
                INSERT INTO student_books (student_id, book_id, current_page, completed)
                VALUES ($1, $2, 1, false)
                ON CONFLICT (student_id, book_id) DO NOTHING
            `, [userId, book.id]);
            console.log(`✅ Assigned book "${book.title}" to test user.`);
        }

        console.log("✨ Test data setup complete!");
        await pool.end();
    } catch (error) {
        console.error("❌ Error setting up test data:", error);
        process.exit(1);
    }
}

main().catch(console.error);
