"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";

// Types for journal entries
export type JournalEntryType =
    | "note"
    | "reading_session"
    | "achievement"
    | "quote"
    | "question"
    | "started_book"
    | "finished_book";

export interface JournalEntry {
    id: string;
    student_id: string;
    entry_type: JournalEntryType;
    content: string | null;
    book_id: number | null;
    page_number: number | null;
    page_range_start: number | null;
    page_range_end: number | null;
    reading_duration_minutes: number | null;
    metadata: Record<string, unknown>;
    is_private: boolean;
    created_at: string;
    updated_at: string;
    // Joined book data
    book_title?: string;
    book_author?: string;
    book_cover_url?: string;
    // Review data (for finished_book entries)
    review_id?: string | null;
    review_rating?: number | null;
    review_comment?: string | null;
    review_status?: "PENDING" | "APPROVED" | "REJECTED" | null;
    review_rejection_feedback?: string | null;
}

export interface BookJournal {
    id: string;
    student_id: string;
    book_id: number;
    personal_rating: number | null;
    review_text: string | null;
    favorite_quote: string | null;
    favorite_quote_page: number | null;
    reading_goal_pages: number | null;
    notes_count: number;
    created_at: string;
    updated_at: string;
}

// Get all journal entries for the current user
export async function getJournalEntries(options?: {
    bookId?: number;
    entryType?: JournalEntryType;
    limit?: number;
    offset?: number;
}): Promise<{ entries: JournalEntry[]; total: number }> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to view your journal.");
    }

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let whereClause = "WHERE je.student_id = $1";
    const params: (string | number)[] = [user.profileId];
    let paramIndex = 2;

    if (options?.bookId) {
        whereClause += ` AND je.book_id = $${paramIndex}`;
        params.push(options.bookId);
        paramIndex++;
    }

    if (options?.entryType) {
        whereClause += ` AND je.entry_type = $${paramIndex}`;
        params.push(options.entryType);
        paramIndex++;
    }

    // Get total count
    const countResult = await queryWithContext(
        user.userId,
        `SELECT COUNT(*) as total FROM journal_entries je ${whereClause}`,
        params
    );
    const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

    // Get entries with book info and review data for finished_book entries
    params.push(limit, offset);
    const result = await queryWithContext(
        user.userId,
        `SELECT 
      je.*,
      b.title as book_title,
      b.author as book_author,
      b.cover_url as book_cover_url,
      br.id as review_id,
      br.rating as review_rating,
      br.comment as review_comment,
      br.status as review_status,
      br.rejection_feedback as review_rejection_feedback
    FROM journal_entries je
    LEFT JOIN books b ON je.book_id = b.id
    LEFT JOIN book_reviews br ON je.book_id = br.book_id AND je.student_id = br.student_id AND je.entry_type = 'finished_book'
    ${whereClause}
    ORDER BY je.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
    );

    return {
        entries: result.rows as JournalEntry[],
        total,
    };
}

// Create a new journal entry
export async function createJournalEntry(input: {
    entryType: JournalEntryType;
    content?: string;
    bookId?: number;
    pageNumber?: number;
    pageRangeStart?: number;
    pageRangeEnd?: number;
    readingDurationMinutes?: number;
    metadata?: Record<string, unknown>;
    isPrivate?: boolean;
}): Promise<JournalEntry> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to create a journal entry.");
    }

    const result = await queryWithContext(
        user.userId,
        `INSERT INTO journal_entries (
      student_id,
      entry_type,
      content,
      book_id,
      page_number,
      page_range_start,
      page_range_end,
      reading_duration_minutes,
      metadata,
      is_private
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
        [
            user.profileId,
            input.entryType,
            input.content ?? null,
            input.bookId ?? null,
            input.pageNumber ?? null,
            input.pageRangeStart ?? null,
            input.pageRangeEnd ?? null,
            input.readingDurationMinutes ?? null,
            JSON.stringify(input.metadata ?? {}),
            input.isPrivate ?? true,
        ]
    );

    // Update notes count in book_journals if this is a note for a specific book
    if (input.bookId && input.entryType === "note") {
        await queryWithContext(
            user.userId,
            `INSERT INTO book_journals (student_id, book_id, notes_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (student_id, book_id)
       DO UPDATE SET notes_count = book_journals.notes_count + 1, updated_at = NOW()`,
            [user.profileId, input.bookId]
        );
    }

    revalidatePath("/dashboard/journal");
    if (input.bookId) {
        revalidatePath(`/dashboard/journal/${input.bookId}`);
        revalidatePath(`/dashboard/student/read/${input.bookId}`);
    }

    return result.rows[0] as JournalEntry;
}

// Update a journal entry
export async function updateJournalEntry(input: {
    id: string;
    content?: string;
    pageNumber?: number;
    metadata?: Record<string, unknown>;
    isPrivate?: boolean;
}): Promise<JournalEntry> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to update a journal entry.");
    }

    // Build dynamic update query
    const updates: string[] = [];
    const params: (string | number | boolean)[] = [input.id, user.profileId];
    let paramIndex = 3;

    if (input.content !== undefined) {
        updates.push(`content = $${paramIndex}`);
        params.push(input.content);
        paramIndex++;
    }

    if (input.pageNumber !== undefined) {
        updates.push(`page_number = $${paramIndex}`);
        params.push(input.pageNumber);
        paramIndex++;
    }

    if (input.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex}`);
        params.push(JSON.stringify(input.metadata));
        paramIndex++;
    }

    if (input.isPrivate !== undefined) {
        updates.push(`is_private = $${paramIndex}`);
        params.push(input.isPrivate);
        paramIndex++;
    }

    if (updates.length === 0) {
        throw new Error("No fields to update.");
    }

    const result = await queryWithContext(
        user.userId,
        `UPDATE journal_entries 
     SET ${updates.join(", ")}, updated_at = NOW()
     WHERE id = $1 AND student_id = $2
     RETURNING *`,
        params
    );

    if (result.rows.length === 0) {
        throw new Error("Journal entry not found or you don't have permission to edit it.");
    }

    revalidatePath("/dashboard/journal");

    return result.rows[0] as JournalEntry;
}

// Delete a journal entry
export async function deleteJournalEntry(id: string): Promise<void> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to delete a journal entry.");
    }

    // Get the entry first to check if it's a note for a book
    const entryResult = await queryWithContext(
        user.userId,
        `SELECT book_id, entry_type FROM journal_entries WHERE id = $1 AND student_id = $2`,
        [id, user.profileId]
    );

    const entry = entryResult.rows[0];

    const result = await queryWithContext(
        user.userId,
        `DELETE FROM journal_entries WHERE id = $1 AND student_id = $2`,
        [id, user.profileId]
    );

    // Decrement notes count if this was a note for a book
    if (entry?.book_id && entry?.entry_type === "note") {
        await queryWithContext(
            user.userId,
            `UPDATE book_journals 
       SET notes_count = GREATEST(0, notes_count - 1), updated_at = NOW()
       WHERE student_id = $1 AND book_id = $2`,
            [user.profileId, entry.book_id]
        );
    }

    revalidatePath("/dashboard/journal");
}

// Get book journal for a specific book
export async function getBookJournal(bookId: number): Promise<BookJournal | null> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to view book journal.");
    }

    const result = await queryWithContext(
        user.userId,
        `SELECT * FROM book_journals WHERE student_id = $1 AND book_id = $2`,
        [user.profileId, bookId]
    );

    return result.rows[0] as BookJournal | null;
}

// Update book journal (rating, review, etc.)
export async function updateBookJournal(input: {
    bookId: number;
    personalRating?: number;
    reviewText?: string;
    favoriteQuote?: string;
    favoriteQuotePage?: number;
    readingGoalPages?: number;
}): Promise<BookJournal> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to update book journal.");
    }

    const result = await queryWithContext(
        user.userId,
        `INSERT INTO book_journals (
      student_id,
      book_id,
      personal_rating,
      review_text,
      favorite_quote,
      favorite_quote_page,
      reading_goal_pages
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (student_id, book_id)
    DO UPDATE SET
      personal_rating = COALESCE($3, book_journals.personal_rating),
      review_text = COALESCE($4, book_journals.review_text),
      favorite_quote = COALESCE($5, book_journals.favorite_quote),
      favorite_quote_page = COALESCE($6, book_journals.favorite_quote_page),
      reading_goal_pages = COALESCE($7, book_journals.reading_goal_pages),
      updated_at = NOW()
    RETURNING *`,
        [
            user.profileId,
            input.bookId,
            input.personalRating ?? null,
            input.reviewText ?? null,
            input.favoriteQuote ?? null,
            input.favoriteQuotePage ?? null,
            input.readingGoalPages ?? null,
        ]
    );

    revalidatePath("/dashboard/journal");
    revalidatePath(`/dashboard/journal/${input.bookId}`);

    return result.rows[0] as BookJournal;
}

// Get journal stats for a user
export async function getJournalStats(): Promise<{
    totalEntries: number;
    notesCount: number;
    booksWithNotes: number;
    readingSessions: number;
    quotesCount: number;
}> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to view journal stats.");
    }

    const result = await queryWithContext(
        user.userId,
        `SELECT 
      COUNT(*) as total_entries,
      COUNT(*) FILTER (WHERE entry_type = 'note') as notes_count,
      COUNT(DISTINCT book_id) FILTER (WHERE book_id IS NOT NULL) as books_with_notes,
      COUNT(*) FILTER (WHERE entry_type = 'reading_session') as reading_sessions,
      COUNT(*) FILTER (WHERE entry_type = 'quote') as quotes_count
    FROM journal_entries
    WHERE student_id = $1`,
        [user.profileId]
    );

    const stats = result.rows[0];

    return {
        totalEntries: parseInt(stats?.total_entries ?? "0", 10),
        notesCount: parseInt(stats?.notes_count ?? "0", 10),
        booksWithNotes: parseInt(stats?.books_with_notes ?? "0", 10),
        readingSessions: parseInt(stats?.reading_sessions ?? "0", 10),
        quotesCount: parseInt(stats?.quotes_count ?? "0", 10),
    };
}

// Log a reading session (called automatically when reading)
export async function logReadingSession(input: {
    bookId: number;
    pageRangeStart: number;
    pageRangeEnd: number;
    durationMinutes: number;
}): Promise<JournalEntry> {
    return createJournalEntry({
        entryType: "reading_session",
        bookId: input.bookId,
        pageRangeStart: input.pageRangeStart,
        pageRangeEnd: input.pageRangeEnd,
        readingDurationMinutes: input.durationMinutes,
        content: `Read pages ${input.pageRangeStart} to ${input.pageRangeEnd}`,
    });
}

// Create a quick note from the book reader
export async function createQuickNote(input: {
    bookId: number;
    pageNumber: number;
    content: string;
}): Promise<JournalEntry> {
    return createJournalEntry({
        entryType: "note",
        bookId: input.bookId,
        pageNumber: input.pageNumber,
        content: input.content,
    });
}

// Save a quote from a book
export async function saveQuote(input: {
    bookId: number;
    pageNumber: number;
    quote: string;
}): Promise<JournalEntry> {
    return createJournalEntry({
        entryType: "quote",
        bookId: input.bookId,
        pageNumber: input.pageNumber,
        content: input.quote,
    });
}
