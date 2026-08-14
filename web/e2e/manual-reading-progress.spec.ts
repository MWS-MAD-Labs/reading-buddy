import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";
import { loginWithCredentials } from "./helpers/auth-helper";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const runProgressSyncE2E = process.env.RUN_PROGRESS_SYNC_E2E === "1";
const testEmail = `progress-sync-${Date.now()}@example.test`;
const testPassword = "ProgressSync123!";
const bookTitle = `Phase 3 Progress Book ${Date.now()}`;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || "5434"),
  database: process.env.DB_NAME || "reading_buddy",
  user: process.env.DB_USER || "reading_buddy",
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

let userId = "";
let profileId = "";
let bookId = 0;
let quizId = 0;

test.describe("Manual reading progress synchronization", () => {
  test.setTimeout(120_000);

  test.skip(
    !runProgressSyncE2E,
    "Set RUN_PROGRESS_SYNC_E2E=1 with a disposable test database to run this scenario.",
  );

  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const userResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, name, password_hash, email_verified)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [testEmail, "Progress Sync Student", passwordHash],
    );
    userId = userResult.rows[0].id;

    const profileResult = await pool.query<{ id: string }>(
      `INSERT INTO profiles (
         user_id,
         email,
         role,
         full_name,
         access_level,
         xp,
         reading_streak,
         longest_streak,
         total_pages_read,
         total_books_completed
       )
       VALUES ($1, $2, 'STUDENT', $3, 'JUNIOR_HIGH', 40, 2, 3, 17, 0)
       RETURNING id`,
      [userId, testEmail, "Progress Sync Student"],
    );
    profileId = profileResult.rows[0].id;

    const bookResult = await pool.query<{ id: number }>(
      `INSERT INTO books (
         title,
         author,
         description,
         page_count,
         pdf_url,
         cover_url,
         file_format,
         page_images_prefix,
         page_images_count
       )
       VALUES ($1, $2, $3, 100, $4, $5, 'pdf', $6, 100)
       RETURNING id`,
      [
        bookTitle,
        "Reading Buddy Tests",
        "A disposable book for the Phase 3 reading progress scenario.",
        "/test-assets/progress-sync.pdf",
        "/test-assets/progress-sync-cover.jpg",
        "/test-assets/progress-sync-pages/",
      ],
    );
    bookId = bookResult.rows[0].id;

    await pool.query(
      `INSERT INTO book_access (book_id, access_level)
       VALUES ($1, 'JUNIOR_HIGH')`,
      [bookId],
    );
    await pool.query(
      `INSERT INTO student_books (
         student_id,
         book_id,
         current_page,
         progress_percent,
         progress_source,
         completed
       )
       VALUES ($1, $2, 20, 20, 'digital_reader', false)`,
      [profileId, bookId],
    );

    const quizResult = await pool.query<{ id: number }>(
      `INSERT INTO quizzes (
         book_id,
         questions,
         quiz_type,
         checkpoint_page
       )
       VALUES ($1, $2::jsonb, 'checkpoint', 35)
       RETURNING id`,
      [
        bookId,
        JSON.stringify({
          title: "Page 35 checkpoint",
          questions: [
            {
              question: "Did the checkpoint open only when selected?",
              options: ["Yes", "No"],
              answerIndex: 0,
            },
          ],
        }),
      ],
    );
    quizId = quizResult.rows[0].id;

    await pool.query(
      `INSERT INTO quiz_checkpoints (
         book_id,
         page_number,
         quiz_id,
         is_required
       )
       VALUES ($1, 35, $2, true)`,
      [bookId, quizId],
    );
  });

  test.afterAll(async () => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (quizId) {
        await client.query("DELETE FROM quiz_attempts WHERE quiz_id = $1", [
          quizId,
        ]);
        await client.query("DELETE FROM quiz_checkpoints WHERE quiz_id = $1", [
          quizId,
        ]);
        await client.query("DELETE FROM quizzes WHERE id = $1", [quizId]);
      }

      if (profileId) {
        await client.query("DELETE FROM journal_entries WHERE student_id = $1", [
          profileId,
        ]);
        await client.query("DELETE FROM student_badges WHERE student_id = $1", [
          profileId,
        ]);
        await client.query("DELETE FROM xp_transactions WHERE student_id = $1", [
          profileId,
        ]);
        await client.query(
          "DELETE FROM reading_progress_events WHERE student_id = $1",
          [profileId],
        );
        await client.query("DELETE FROM student_books WHERE student_id = $1", [
          profileId,
        ]);
        await client.query("DELETE FROM book_journals WHERE student_id = $1", [
          profileId,
        ]);
      }

      if (bookId) {
        await client.query("DELETE FROM book_access WHERE book_id = $1", [bookId]);
      }
      if (profileId) {
        await client.query("DELETE FROM profiles WHERE id = $1", [profileId]);
      }
      if (bookId) {
        await client.query("DELETE FROM books WHERE id = $1", [bookId]);
      }
      if (userId) {
        await client.query("DELETE FROM users WHERE id = $1", [userId]);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  });

  test("updates all views with capped rewards, supports corrections, and completes explicitly", async ({
    page,
  }) => {
    await loginWithCredentials(page, testEmail, testPassword);
    await page.goto("/dashboard/student");

    const bookCard = page.getByRole("heading", { name: bookTitle }).locator("..")
      .locator("..");
    await expect(bookCard.getByText("Current page: 20 of 100")).toBeVisible();

    await bookCard.getByRole("button", { name: "Update page" }).click();
    await page.getByRole("spinbutton", { name: "Page" }).fill("35");
    await page.getByRole("button", { name: "Save progress" }).click();

    await expect(page.getByText(/Your progress was not updated/i)).toBeVisible();
    await expect(page.getByText("Current saved page: 20 of 100")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start quiz" })).toBeVisible();

    const blockedProgress = await pool.query<{
      current_page: number;
      event_count: string;
    }>(
      `SELECT
         sb.current_page,
         (
           SELECT COUNT(*)
           FROM reading_progress_events rpe
           WHERE rpe.student_id = sb.student_id AND rpe.book_id = sb.book_id
         ) AS event_count
       FROM student_books sb
       WHERE sb.student_id = $1 AND sb.book_id = $2`,
      [profileId, bookId],
    );
    expect(blockedProgress.rows[0]).toEqual({
      current_page: 20,
      event_count: "0",
    });

    await page.getByRole("button", { name: "Start quiz" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/student/quiz/${quizId}\\?bookId=${bookId}&page=35`),
    );
    await page.getByRole("button", { name: /Yes/ }).click();
    await page.getByRole("button", { name: /Submit My Answers/ }).click();
    await expect(page.getByText("100%")).toBeVisible();

    const afterQuiz = await pool.query<{ xp: number }>(
      "SELECT xp FROM profiles WHERE id = $1",
      [profileId],
    );
    const xpAfterQuiz = afterQuiz.rows[0].xp;

    await page.goto("/dashboard/student");
    await expect(bookCard.getByText("Current page: 20 of 100")).toBeVisible();
    await bookCard.getByRole("button", { name: "Update page" }).click();
    await page.getByRole("spinbutton", { name: "Page" }).fill("35");
    await page.getByRole("button", { name: "Save progress" }).click();
    await expect(page.getByText(/Progress updated to page 35\./)).toBeVisible();
    await expect(page.getByText(/earned 15 XP for 15 new physical-reading pages/i)).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(bookCard.getByText("Current page: 35 of 100")).toBeVisible();
    await expect(bookCard.getByText("Updated from physical book")).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: bookTitle }),
    ).toBeVisible();
    await expect(page.getByText("Current page: 35 of 100")).toBeVisible();

    await page.goto(`/dashboard/student/read/${bookId}`);
    await expect(page.locator(".reader-page-content")).toBeVisible();
    await expect(page.getByText(/📍 Page 35/).first()).toBeVisible();

    await page.goto(`/dashboard/journal/${bookId}`);
    await expect(page.getByText("Page 35 of 100")).toBeVisible();

    const unchangedActivity = await pool.query<{
      xp: number;
      reading_streak: number;
      total_pages_read: number;
      journal_count: string;
    }>(
      `SELECT
         p.xp,
         p.reading_streak,
         p.total_pages_read,
         (SELECT COUNT(*) FROM journal_entries je WHERE je.student_id = p.id) AS journal_count
       FROM profiles p
       WHERE p.id = $1`,
      [profileId],
    );
    expect(unchangedActivity.rows[0]).toMatchObject({
      xp: xpAfterQuiz + 15,
      reading_streak: 2,
      total_pages_read: 17,
      journal_count: "0",
    });

    const firstEvent = await pool.query<{
      source: string;
      previous_page: number;
      current_page: number;
      rewarded_pages: number;
      xp_awarded: number;
    }>(
      `SELECT source, previous_page, current_page, rewarded_pages, xp_awarded
       FROM reading_progress_events
       WHERE student_id = $1 AND book_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [profileId, bookId],
    );
    expect(firstEvent.rows[0]).toEqual({
      source: "manual_physical",
      previous_page: 20,
      current_page: 35,
      rewarded_pages: 15,
      xp_awarded: 15,
    });

    await page.goto("/dashboard/student");
    await page.getByRole("heading", { name: bookTitle }).locator("..").locator("..")
      .getByRole("button", { name: "Update page" }).click();
    await page.getByRole("spinbutton", { name: "Page" }).fill("30");
    await page.getByRole("button", { name: "Save progress" }).click();
    await expect(
      page.getByText("Your saved progress is page 35. Change it back to page 30?"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Change to page 30" }).click();
    await expect(page.getByText("Progress updated to page 30.")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    const correctedActivity = await pool.query<{
      current_page: number;
      xp: number;
      reading_streak: number;
      total_pages_read: number;
    }>(
      `SELECT sb.current_page, p.xp, p.reading_streak, p.total_pages_read
       FROM student_books sb
       JOIN profiles p ON p.id = sb.student_id
       WHERE sb.student_id = $1 AND sb.book_id = $2`,
      [profileId, bookId],
    );
    expect(correctedActivity.rows[0]).toEqual({
      current_page: 30,
      xp: xpAfterQuiz + 15,
      reading_streak: 2,
      total_pages_read: 17,
    });

    await page.getByRole("heading", { name: bookTitle }).locator("..").locator("..")
      .getByRole("button", { name: "Update page" }).click();
    await page.getByRole("spinbutton", { name: "Page" }).fill("100");
    await page.getByRole("button", { name: "Save progress" }).click();
    await expect(
      page.getByText("You reached the final page. Write a review to finish this book."),
    ).toBeVisible();

    const beforeConfirmation = await pool.query<{ completed: boolean }>(
      `SELECT completed
       FROM student_books
       WHERE student_id = $1 AND book_id = $2`,
      [profileId, bookId],
    );
    expect(beforeConfirmation.rows[0].completed).toBe(false);

    await page.getByRole("button", { name: "Rate 5 stars" }).click();
    await page.getByRole("textbox", { name: "Your review" }).fill(
      "A thoughtful and enjoyable test review.",
    );
    await page.getByRole("button", { name: "Submit review and finish" }).click();
    await expect(
      page.getByText(
        `${bookTitle} is marked as finished and your review was submitted.`,
      ),
    ).toBeVisible();

    const afterConfirmation = await pool.query<{
      completed: boolean;
      completed_at: Date | null;
      finished_entries: string;
      review_count: string;
      review_status: string | null;
    }>(
      `SELECT
         sb.completed,
         sb.completed_at,
         (
           SELECT COUNT(*)
           FROM journal_entries je
           WHERE je.student_id = sb.student_id
             AND je.book_id = sb.book_id
             AND je.entry_type = 'finished_book'
         ) AS finished_entries,
         (
           SELECT COUNT(*)
           FROM book_reviews br
           WHERE br.student_id = sb.student_id
             AND br.book_id = sb.book_id
         ) AS review_count,
         (
           SELECT br.status
           FROM book_reviews br
           WHERE br.student_id = sb.student_id
             AND br.book_id = sb.book_id
         ) AS review_status
       FROM student_books sb
       WHERE sb.student_id = $1 AND sb.book_id = $2`,
      [profileId, bookId],
    );
    expect(afterConfirmation.rows[0].completed).toBe(true);
    expect(afterConfirmation.rows[0].completed_at).not.toBeNull();
    expect(afterConfirmation.rows[0].finished_entries).toBe("1");
    expect(afterConfirmation.rows[0].review_count).toBe("1");
    expect(afterConfirmation.rows[0].review_status).toBe("PENDING");
  });
});
