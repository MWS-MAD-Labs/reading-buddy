"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext, query } from "@/lib/db";

// Types for classroom messages
export interface ClassroomMessage {
    id: string;
    class_id: number;
    author_id: string;
    content: string;
    parent_id: string | null;
    attachments: MessageAttachment[];
    created_at: string;
    updated_at: string;
    // Joined author data
    author_name: string | null;
    author_role: string | null;
    // Reply count for threaded messages
    reply_count?: number;
}

export interface MessageAttachment {
    type: "note";
    noteId: string;
    bookId?: number;
    bookTitle?: string;
    noteContent?: string;
    pageNumber?: number;
    bookCoverUrl?: string | null;
}

export interface SharableNote {
    id: string;
    content: string;
    page_number: number | null;
    book_id: number | null;
    book_title: string | null;
    book_author: string | null;
    book_cover_url: string | null;
    created_at: string;
}

// Get all messages for a classroom (top-level messages with reply counts)
export async function getClassroomMessages(classId: number): Promise<ClassroomMessage[]> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to view classroom messages.");
    }

    // Verify user is a member of the class
    const memberCheck = await query(
        `SELECT 1 FROM class_students WHERE class_id = $1 AND student_id = $2
     UNION
     SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2
     UNION
     SELECT 1 FROM profiles WHERE id = $2 AND role IN ('ADMIN', 'LIBRARIAN')`,
        [classId, user.profileId]
    );

    if (memberCheck.rows.length === 0) {
        throw new Error("You don't have permission to view this classroom.");
    }

    // Get top-level messages with author info and reply counts
    const result = await queryWithContext(
        user.userId,
        `SELECT 
      cm.*,
      p.full_name as author_name,
      p.role as author_role,
      (SELECT COUNT(*) FROM classroom_messages replies WHERE replies.parent_id = cm.id) as reply_count
    FROM classroom_messages cm
    LEFT JOIN profiles p ON cm.author_id = p.id
    WHERE cm.class_id = $1 AND cm.parent_id IS NULL
    ORDER BY cm.created_at DESC
    LIMIT 100`,
        [classId]
    );

    return result.rows as ClassroomMessage[];
}

// Get replies for a specific message (thread)
export async function getMessageReplies(messageId: string): Promise<ClassroomMessage[]> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to view message replies.");
    }

    const result = await queryWithContext(
        user.userId,
        `SELECT 
      cm.*,
      p.full_name as author_name,
      p.role as author_role
    FROM classroom_messages cm
    LEFT JOIN profiles p ON cm.author_id = p.id
    WHERE cm.parent_id = $1
    ORDER BY cm.created_at ASC`,
        [messageId]
    );

    return result.rows as ClassroomMessage[];
}

// Send a new message
export async function sendClassroomMessage(input: {
    classId: number;
    content: string;
    parentId?: string;
    attachments?: MessageAttachment[];
}): Promise<ClassroomMessage> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to send messages.");
    }

    // Verify user is a member of the class
    const memberCheck = await query(
        `SELECT 1 FROM class_students WHERE class_id = $1 AND student_id = $2
     UNION
     SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2
     UNION
     SELECT 1 FROM profiles WHERE id = $2 AND role IN ('ADMIN', 'LIBRARIAN')`,
        [input.classId, user.profileId]
    );

    if (memberCheck.rows.length === 0) {
        throw new Error("You don't have permission to send messages in this classroom.");
    }

    const result = await queryWithContext(
        user.userId,
        `INSERT INTO classroom_messages (class_id, author_id, content, parent_id, attachments)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [
            input.classId,
            user.profileId,
            input.content,
            input.parentId ?? null,
            JSON.stringify(input.attachments ?? []),
        ]
    );

    // Get author info
    const authorResult = await query(
        `SELECT full_name, role FROM profiles WHERE id = $1`,
        [user.profileId]
    );

    const message = result.rows[0];
    message.author_name = authorResult.rows[0]?.full_name ?? null;
    message.author_role = authorResult.rows[0]?.role ?? null;

    revalidatePath(`/dashboard/student/classrooms/${input.classId}`);
    revalidatePath(`/dashboard/teacher/classrooms/${input.classId}`);

    return message as ClassroomMessage;
}

// Delete a message
export async function deleteClassroomMessage(messageId: string): Promise<void> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to delete messages.");
    }

    await queryWithContext(
        user.userId,
        `DELETE FROM classroom_messages WHERE id = $1`,
        [messageId]
    );

    revalidatePath(`/dashboard/student/classrooms`);
    revalidatePath(`/dashboard/teacher/classrooms`);
}

// Get notes that can be shared in a classroom (matching classroom reading list)
export async function getSharableNotes(classId: number): Promise<SharableNote[]> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to get sharable notes.");
    }

    // Get notes where the book is assigned to this classroom OR general notes (no book_id)
    // We prioritize notes from assigned books, but also allow general notes
    const result = await queryWithContext(
        user.userId,
        `SELECT 
      je.id,
      je.content,
      je.page_number,
      je.book_id,
      b.title as book_title,
      b.author as book_author,
      b.cover_url as book_cover_url,
      je.created_at
    FROM journal_entries je
    LEFT JOIN books b ON je.book_id = b.id
    LEFT JOIN class_books cb ON cb.book_id = je.book_id AND cb.class_id = $1
    WHERE je.student_id = $2 
      AND je.entry_type = 'note'
      AND (
        (je.book_id IS NOT NULL AND cb.book_id IS NOT NULL) -- Assigned book notes
        OR 
        je.book_id IS NULL -- General notes
      )
    ORDER BY je.created_at DESC`,
        [classId, user.profileId]
    );

    return result.rows as SharableNote[];
}

// Get all user notes that can be shared (for sharing from journal page)
export async function getAllSharableNotes(): Promise<(SharableNote & { classrooms: { id: number; name: string }[] })[]> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to get notes.");
    }

    // Get all notes with their associated classrooms
    const result = await queryWithContext(
        user.userId,
        `SELECT 
      je.id,
      je.content,
      je.page_number,
      je.book_id,
      b.title as book_title,
      b.author as book_author,
      je.created_at
    FROM journal_entries je
    INNER JOIN books b ON je.book_id = b.id
    WHERE je.student_id = $1 
      AND je.entry_type = 'note'
      AND je.book_id IS NOT NULL
    ORDER BY je.created_at DESC`,
        [user.profileId]
    );

    // For each note, get classrooms where the book is assigned and user is a member
    const notesWithClassrooms = await Promise.all(
        result.rows.map(async (note: SharableNote) => {
            const classroomsResult = await query(
                `SELECT c.id, c.name
         FROM classes c
         INNER JOIN class_books cb ON cb.class_id = c.id
         INNER JOIN class_students cs ON cs.class_id = c.id
         WHERE cb.book_id = $1 AND cs.student_id = $2`,
                [note.book_id, user.profileId]
            );

            return {
                ...note,
                classrooms: classroomsResult.rows as { id: number; name: string }[],
            };
        })
    );

    return notesWithClassrooms;
}

// Share a note to a classroom
export async function shareNoteToClassroom(input: {
    noteId: string;
    classId: number;
    additionalComment?: string;
}): Promise<ClassroomMessage> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to share notes.");
    }

    // Get the note details
    const noteResult = await queryWithContext(
        user.userId,
        `SELECT 
      je.id, je.content, je.page_number, je.book_id,
      b.title as book_title, b.cover_url as book_cover_url
    FROM journal_entries je
    LEFT JOIN books b ON je.book_id = b.id
    WHERE je.id = $1 AND je.student_id = $2`,
        [input.noteId, user.profileId]
    );

    if (noteResult.rows.length === 0) {
        throw new Error("Note not found or you don't have permission to share it.");
    }

    const note = noteResult.rows[0];

    // Create the message with the note as attachment
    const attachment: MessageAttachment = {
        type: "note",
        noteId: note.id,
        bookId: note.book_id,
        bookTitle: note.book_title || "General Note",
        noteContent: note.content,
        pageNumber: note.page_number,
        bookCoverUrl: note.book_cover_url,
    };

    const content = input.additionalComment || `Shared a note from "${note.book_title}"`;

    return sendClassroomMessage({
        classId: input.classId,
        content,
        attachments: [attachment],
    });
}
// Get classrooms (optionally filtered by book assignment)
export async function getClassroomsForBook(bookId?: number | null): Promise<{ id: number; name: string }[]> {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        throw new Error("You must be signed in to view classrooms.");
    }

    let queryStr = "";
    let params: any[] = [user.profileId];

    if (bookId) {
        queryStr = `
            SELECT c.id, c.name
            FROM classes c
            INNER JOIN class_books cb ON cb.class_id = c.id
            INNER JOIN class_students cs ON cs.class_id = c.id
            WHERE cb.book_id = $2 AND cs.student_id = $1
        `;
        params.push(bookId);
    } else {
        queryStr = `
            SELECT c.id, c.name
            FROM classes c
            INNER JOIN class_students cs ON cs.class_id = c.id
            WHERE cs.student_id = $1
        `;
    }

    const result = await query(queryStr, params);

    return result.rows as { id: number; name: string }[];
}
