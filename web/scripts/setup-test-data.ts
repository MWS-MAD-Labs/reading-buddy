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
      INSERT INTO profiles (id, role, full_name, level, xp)
      VALUES ($1, 'STUDENT', $2, 1, 0)
      ON CONFLICT (id) DO NOTHING
    `, [userId, testName]);

        console.log(`✅ Profile ensured for user`);

        // 3. Ensure we have at least one test book
        const bookResult = await pool.query(`
      SELECT id, title, file_format FROM books LIMIT 2
    `);

        if (bookResult.rows.length === 0) {
            console.log("⚠️ No books found in database. Please add some books first or run migrations.");
            // We could ideally insert a dummy book here if needed, but for now we expect some data
        } else {
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
        }

        console.log("✨ Test data setup complete!");
        await pool.end();
    } catch (error) {
        console.error("❌ Error setting up test data:", error);
        process.exit(1);
    }
}

main().catch(console.error);
