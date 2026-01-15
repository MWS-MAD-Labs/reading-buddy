"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";

// Types for reviews
export type BookReview = {
    id: string;
    bookId: number;
    studentId: string;
    studentName: string;
    rating: number;
    comment: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    voteCount: number;
    hasVoted: boolean;
    rejectionFeedback?: string | null;
};

export type BookDetails = {
    id: number;
    title: string;
    author: string;
    coverUrl: string | null;
    description: string | null;
    genre: string | null;
    language: string | null;
    publisher: string | null;
    publicationYear: number | null;
    pageCount: number | null;
    averageRating: number | null;
    reviewCount: number;
    userHasCompleted: boolean;
    userHasReviewed: boolean;
};

/**
 * Get book details including rating info and user's completion status
 */
export async function getBookDetails(bookId: number): Promise<BookDetails | null> {
    const user = await getCurrentUser();
    if (!user?.userId) return null;

    const result = await queryWithContext(
        user.userId,
        `SELECT
      b.id, b.title, b.author, b.cover_url, b.description,
      b.genre, b.language, b.publisher, b.publication_year, b.page_count,
      COALESCE(AVG(br.rating) FILTER (WHERE br.status = 'APPROVED'), 0) as average_rating,
      COUNT(br.id) FILTER (WHERE br.status = 'APPROVED') as review_count,
      EXISTS(
        SELECT 1 FROM student_books sb
        WHERE sb.book_id = b.id AND sb.student_id = $2 AND sb.completed = true
      ) as user_has_completed,
      EXISTS(
        SELECT 1 FROM book_reviews br2
        WHERE br2.book_id = b.id AND br2.student_id = $2
      ) as user_has_reviewed
    FROM books b
    LEFT JOIN book_reviews br ON br.book_id = b.id
    WHERE b.id = $1
    GROUP BY b.id`,
        [bookId, user.profileId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        id: row.id,
        title: row.title,
        author: row.author,
        coverUrl: row.cover_url,
        description: row.description,
        genre: row.genre,
        language: row.language,
        publisher: row.publisher,
        publicationYear: row.publication_year,
        pageCount: row.page_count,
        averageRating: row.average_rating ? parseFloat(row.average_rating) : null,
        reviewCount: parseInt(row.review_count),
        userHasCompleted: row.user_has_completed,
        userHasReviewed: row.user_has_reviewed,
    };
}

/**
 * Get approved reviews for a book with pagination
 */
export async function getBookReviews(
    bookId: number,
    sortBy: "latest" | "most_voted" = "latest",
    page: number = 1,
    pageSize: number = 10
): Promise<{ reviews: BookReview[]; total: number }> {
    const user = await getCurrentUser();
    if (!user?.userId) return { reviews: [], total: 0 };

    const offset = (page - 1) * pageSize;
    const orderBy = sortBy === "most_voted" ? "vote_count DESC, br.created_at DESC" : "br.created_at DESC";

    const result = await queryWithContext(
        user.userId,
        `SELECT
      br.id, br.book_id, br.student_id, br.rating, br.comment, br.status, br.created_at,
      p.full_name as student_name,
      COUNT(rv.id) as vote_count,
      EXISTS(SELECT 1 FROM review_votes rv2 WHERE rv2.review_id = br.id AND rv2.user_id = $2) as has_voted
    FROM book_reviews br
    JOIN profiles p ON p.id = br.student_id
    LEFT JOIN review_votes rv ON rv.review_id = br.id
    WHERE br.book_id = $1 AND br.status = 'APPROVED'
    GROUP BY br.id, p.full_name
    ORDER BY ${orderBy}
    LIMIT $3 OFFSET $4`,
        [bookId, user.profileId, pageSize, offset]
    );

    // Get total count
    const countResult = await queryWithContext(
        user.userId,
        `SELECT COUNT(*) as total FROM book_reviews WHERE book_id = $1 AND status = 'APPROVED'`,
        [bookId]
    );

    const reviews: BookReview[] = result.rows.map((row: any) => ({
        id: row.id,
        bookId: row.book_id,
        studentId: row.student_id,
        studentName: row.student_name || "Anonymous",
        rating: row.rating,
        comment: row.comment,
        status: row.status,
        createdAt: row.created_at,
        voteCount: parseInt(row.vote_count),
        hasVoted: row.has_voted,
    }));

    return {
        reviews,
        total: parseInt(countResult.rows[0]?.total || "0"),
    };
}

/**
 * Get current user's review for a book (if any)
 */
export async function getUserReview(bookId: number): Promise<BookReview | null> {
    const user = await getCurrentUser();
    if (!user?.userId || !user?.profileId) return null;

    const result = await queryWithContext(
        user.userId,
        `SELECT
      br.id, br.book_id, br.student_id, br.rating, br.comment, br.status, br.created_at,
      br.rejection_feedback,
      p.full_name as student_name,
      COUNT(rv.id) as vote_count
    FROM book_reviews br
    JOIN profiles p ON p.id = br.student_id
    LEFT JOIN review_votes rv ON rv.review_id = br.id
    WHERE br.book_id = $1 AND br.student_id = $2
    GROUP BY br.id, p.full_name`,
        [bookId, user.profileId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        id: row.id,
        bookId: row.book_id,
        studentId: row.student_id,
        studentName: row.student_name || "Anonymous",
        rating: row.rating,
        comment: row.comment,
        status: row.status,
        createdAt: row.created_at,
        voteCount: parseInt(row.vote_count),
        hasVoted: false,
        rejectionFeedback: row.rejection_feedback,
    };
}

/**
 * Submit a book review
 */
export async function submitBookReview(
    bookId: number,
    rating: number,
    comment: string
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user?.userId || !user?.profileId) {
        return { success: false, error: "You must be signed in to submit a review." };
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
        return { success: false, error: "Rating must be between 1 and 5." };
    }

    // Validate comment length
    if (!comment || comment.trim().length < 10) {
        return { success: false, error: "Comment must be at least 10 characters." };
    }

    // Check if user has completed the book
    const completionResult = await queryWithContext(
        user.userId,
        `SELECT completed FROM student_books WHERE book_id = $1 AND student_id = $2`,
        [bookId, user.profileId]
    );

    if (completionResult.rows.length === 0 || !completionResult.rows[0].completed) {
        return { success: false, error: "You must finish reading the book before leaving a review." };
    }

    // Check if user already has a review
    const existingResult = await queryWithContext(
        user.userId,
        `SELECT id FROM book_reviews WHERE book_id = $1 AND student_id = $2`,
        [bookId, user.profileId]
    );

    if (existingResult.rows.length > 0) {
        return { success: false, error: "You have already reviewed this book." };
    }

    // Insert review
    try {
        await queryWithContext(
            user.userId,
            `INSERT INTO book_reviews (book_id, student_id, rating, comment)
       VALUES ($1, $2, $3, $4)`,
            [bookId, user.profileId, rating, comment.trim()]
        );

        revalidatePath("/dashboard/library");
        revalidatePath(`/dashboard/librarian/reviews`);
        return { success: true };
    } catch (error) {
        console.error("Failed to submit review:", error);
        return { success: false, error: "Failed to submit review. Please try again." };
    }
}

/**
 * Toggle vote (thumbs up) on a review
 */
export async function voteReview(
    reviewId: string
): Promise<{ success: boolean; newVoteCount: number }> {
    const user = await getCurrentUser();
    if (!user?.userId || !user?.profileId) {
        return { success: false, newVoteCount: 0 };
    }

    // Check if already voted
    const existingVote = await queryWithContext(
        user.userId,
        `SELECT id FROM review_votes WHERE review_id = $1 AND user_id = $2`,
        [reviewId, user.profileId]
    );

    if (existingVote.rows.length > 0) {
        // Remove vote
        await queryWithContext(
            user.userId,
            `DELETE FROM review_votes WHERE review_id = $1 AND user_id = $2`,
            [reviewId, user.profileId]
        );
    } else {
        // Add vote
        await queryWithContext(
            user.userId,
            `INSERT INTO review_votes (review_id, user_id) VALUES ($1, $2)`,
            [reviewId, user.profileId]
        );
    }

    // Get new count
    const countResult = await queryWithContext(
        user.userId,
        `SELECT COUNT(*) as count FROM review_votes WHERE review_id = $1`,
        [reviewId]
    );

    revalidatePath("/dashboard/library");
    return {
        success: true,
        newVoteCount: parseInt(countResult.rows[0]?.count || "0"),
    };
}

/**
 * Get all pending reviews (for librarians/admins)
 */
export async function getPendingReviews(): Promise<{
    reviews: (BookReview & { bookTitle: string })[];
}> {
    const user = await getCurrentUser();
    if (!user?.userId || !user?.profileId) {
        return { reviews: [] };
    }

    // Check if user is librarian or admin
    const roleResult = await queryWithContext(
        user.userId,
        `SELECT role FROM profiles WHERE id = $1`,
        [user.profileId]
    );

    const role = roleResult.rows[0]?.role;
    if (role !== "LIBRARIAN" && role !== "ADMIN") {
        return { reviews: [] };
    }

    const result = await queryWithContext(
        user.userId,
        `SELECT
      br.id, br.book_id, br.student_id, br.rating, br.comment, br.status, br.created_at,
      p.full_name as student_name,
      b.title as book_title,
      COUNT(rv.id) as vote_count
    FROM book_reviews br
    JOIN profiles p ON p.id = br.student_id
    JOIN books b ON b.id = br.book_id
    LEFT JOIN review_votes rv ON rv.review_id = br.id
    WHERE br.status = 'PENDING'
    GROUP BY br.id, p.full_name, b.title
    ORDER BY br.created_at ASC`,
        []
    );

    return {
        reviews: result.rows.map((row: any) => ({
            id: row.id,
            bookId: row.book_id,
            studentId: row.student_id,
            studentName: row.student_name || "Anonymous",
            rating: row.rating,
            comment: row.comment,
            status: row.status,
            createdAt: row.created_at,
            voteCount: parseInt(row.vote_count),
            hasVoted: false,
            bookTitle: row.book_title,
        })),
    };
}

/**
 * Moderate a review (approve or reject with feedback)
 */
export async function moderateReview(
    reviewId: string,
    action: "approve" | "reject",
    feedback?: string
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user?.userId || !user?.profileId) {
        return { success: false, error: "You must be signed in." };
    }

    // Check if user is librarian or admin
    const roleResult = await queryWithContext(
        user.userId,
        `SELECT role FROM profiles WHERE id = $1`,
        [user.profileId]
    );

    const role = roleResult.rows[0]?.role;
    if (role !== "LIBRARIAN" && role !== "ADMIN") {
        return { success: false, error: "You do not have permission to moderate reviews." };
    }

    // Require feedback for rejections
    if (action === "reject" && (!feedback || feedback.trim().length < 10)) {
        return { success: false, error: "Please provide feedback (at least 10 characters) when rejecting a review." };
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    try {
        await queryWithContext(
            user.userId,
            `UPDATE book_reviews
       SET status = $1, moderated_by = $2, moderated_at = NOW(), updated_at = NOW(),
           rejection_feedback = $4
       WHERE id = $3`,
            [newStatus, user.profileId, reviewId, action === "reject" ? feedback?.trim() : null]
        );

        revalidatePath("/dashboard/library");
        revalidatePath("/dashboard/librarian/reviews");
        return { success: true };
    } catch (error) {
        console.error("Failed to moderate review:", error);
        return { success: false, error: "Failed to moderate review." };
    }
}

/**
 * Resubmit a rejected review with updated content
 */
export async function resubmitReview(
    reviewId: string,
    rating: number,
    comment: string
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUser();
    if (!user?.userId || !user?.profileId) {
        return { success: false, error: "You must be signed in." };
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
        return { success: false, error: "Rating must be between 1 and 5." };
    }

    // Validate comment length
    if (!comment || comment.trim().length < 10) {
        return { success: false, error: "Comment must be at least 10 characters." };
    }

    // Check if review exists and belongs to user and is rejected
    const reviewResult = await queryWithContext(
        user.userId,
        `SELECT id, status FROM book_reviews WHERE id = $1 AND student_id = $2`,
        [reviewId, user.profileId]
    );

    if (reviewResult.rows.length === 0) {
        return { success: false, error: "Review not found." };
    }

    if (reviewResult.rows[0].status !== "REJECTED") {
        return { success: false, error: "Only rejected reviews can be resubmitted." };
    }

    try {
        await queryWithContext(
            user.userId,
            `UPDATE book_reviews
       SET rating = $1, comment = $2, status = 'PENDING', 
           rejection_feedback = NULL, moderated_by = NULL, moderated_at = NULL,
           updated_at = NOW()
       WHERE id = $3`,
            [rating, comment.trim(), reviewId]
        );

        revalidatePath("/dashboard/library");
        revalidatePath("/dashboard/librarian/reviews");
        revalidatePath("/dashboard/journal");
        return { success: true };
    } catch (error) {
        console.error("Failed to resubmit review:", error);
        return { success: false, error: "Failed to resubmit review. Please try again." };
    }
}

/**
 * Extended review type for journal with book info
 */
export type UserBookReview = {
    id: string;
    bookId: number;
    bookTitle: string;
    bookAuthor: string;
    bookCoverUrl: string | null;
    rating: number;
    comment: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    rejectionFeedback: string | null;
    createdAt: string;
    updatedAt: string;
};

/**
 * Get all of the current user's book reviews (for Journal page)
 */
export async function getUserBookReviews(): Promise<UserBookReview[]> {
    const user = await getCurrentUser();
    if (!user?.userId || !user?.profileId) return [];

    const result = await queryWithContext(
        user.userId,
        `SELECT
      br.id, br.book_id, br.rating, br.comment, br.status, 
      br.rejection_feedback, br.created_at, br.updated_at,
      b.title as book_title, b.author as book_author, b.cover_url as book_cover_url
    FROM book_reviews br
    JOIN books b ON b.id = br.book_id
    WHERE br.student_id = $1
    ORDER BY br.created_at DESC`,
        [user.profileId]
    );

    return result.rows.map((row: any) => ({
        id: row.id,
        bookId: row.book_id,
        bookTitle: row.book_title,
        bookAuthor: row.book_author,
        bookCoverUrl: row.book_cover_url,
        rating: row.rating,
        comment: row.comment,
        status: row.status,
        rejectionFeedback: row.rejection_feedback,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}

