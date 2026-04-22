#!/usr/bin/env tsx

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5434"),
    database: process.env.DB_NAME || "reading_buddy",
    user: process.env.DB_USER || "reading_buddy",
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  console.log("🚀 Setting up test data for E2E tests...");

  const testEmail = "test-reader@millennia21.id";
  const testPassword = "password123";
  const testName = "Test Reader";

  try {
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    const userRes = await pool.query(
      `INSERT INTO users (email, name, password_hash, email_verified)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE
       SET password_hash = $3, name = $2
       RETURNING id`,
      [testEmail, testName, hashedPassword],
    );
    const userId = userRes.rows[0].id;
    console.log(`✅ Test user ensured: ${testEmail} (ID: ${userId})`);

    await pool.query(
      `INSERT INTO profiles (id, user_id, role, full_name, level, xp)
       VALUES ($1, $1, 'STUDENT', $2, 1, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, testName],
    );
    console.log("✅ Profile ensured for user");

    const bookResult = await pool.query("SELECT id, title, file_format FROM books LIMIT 2");

    if (bookResult.rows.length === 0) {
      console.log("⚠️ No books found — inserting a dummy book for testing...");
      const dummyRes = await pool.query(
        `INSERT INTO books (title, author, description, file_format, pdf_url, cover_url, page_count, page_images_prefix, page_images_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, title, file_format`,
        [
          "Test Book",
          "Test Author",
          "A book for E2E testing",
          "pdf",
          "http://localhost/test.pdf",
          "/test-cover.jpg",
          10,
          "http://localhost/pages/test-book/",
          10,
        ],
      );
      bookResult.rows.push(dummyRes.rows[0]);
      console.log(`✅ Dummy book created: "${dummyRes.rows[0].title}"`);
    }

    console.log(`✅ Found ${bookResult.rows.length} book(s) for testing`);

    for (const book of bookResult.rows) {
      await pool.query(
        `INSERT INTO book_access (book_id, access_level)
         VALUES ($1, 'JUNIOR_HIGH')
         ON CONFLICT DO NOTHING`,
        [book.id],
      );

      await pool.query(
        `INSERT INTO student_books (student_id, book_id, current_page, completed)
         VALUES ($1, $2, 1, false)
         ON CONFLICT (student_id, book_id) DO NOTHING`,
        [userId, book.id],
      );
      console.log(`✅ Assigned book "${book.title}" to test user`);
    }

    console.log("✨ Test data setup complete!");
  } catch (error) {
    console.error("❌ Error setting up test data:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
