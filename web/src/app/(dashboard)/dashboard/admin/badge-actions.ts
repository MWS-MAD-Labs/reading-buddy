"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { getMinioClient, getMinioBucketName } from "@/lib/minio";
import {
  buildPublicObjectUrl,
  getObjectKeyFromPublicUrl,
} from "@/lib/minioUtils";
import { AIService } from "@/lib/ai";
import type {
  Badge,
  BadgeType,
  BadgeTier,
  BadgeCategory,
  BadgeCriteria,
} from "@/types/database";

// ============================================================================
// Helper: Get user with role
// ============================================================================

type UserRole = "ADMIN" | "LIBRARIAN" | "TEACHER" | "STUDENT";

interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
}

async function getUserWithRole(): Promise<UserWithRole> {
  const session = await getSession();

  if (!session?.user) {
    throw new Error("You must be signed in.");
  }

  const role = session.user.role as UserRole | undefined;
  if (!role) {
    throw new Error("Profile not found.");
  }

  return {
    id: session.user.id!,
    email: session.user.email || "",
    role: role,
  };
}

async function requireAdminOrLibrarian(): Promise<UserWithRole> {
  const user = await getUserWithRole();

  if (!["ADMIN", "LIBRARIAN"].includes(user.role)) {
    throw new Error("You do not have permission to manage badges.");
  }

  return user;
}

async function requireAdmin(): Promise<UserWithRole> {
  const user = await getUserWithRole();

  if (user.role !== "ADMIN") {
    throw new Error("Only administrators can perform this action.");
  }

  return user;
}

// ============================================================================
// Get All Badges (for management)
// ============================================================================

export interface BadgeWithBook extends Badge {
  book?: {
    id: number;
    title: string;
    author: string;
  } | null;
}

interface BadgeRow {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  xp_reward: number;
  badge_type: string;
  tier: string;
  category: string;
  criteria: Record<string, unknown>;
  book_id: number | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  book_title?: string | null;
  book_author?: string | null;
}

export async function getAllBadges(): Promise<BadgeWithBook[]> {
  await requireAdminOrLibrarian();

  const result = await query<BadgeRow>(
    `SELECT b.*, 
            bk.title as book_title, 
            bk.author as book_author
     FROM badges b
     LEFT JOIN books bk ON b.book_id = bk.id
     ORDER BY b.display_order ASC`
  );

  return result.rows.map((row) => ({
    ...row,
    badge_type: row.badge_type as BadgeType,
    tier: row.tier as BadgeTier,
    category: row.category as BadgeCategory,
    criteria: row.criteria as unknown as BadgeCriteria,
    book: row.book_id ? {
      id: row.book_id,
      title: row.book_title || "",
      author: row.book_author || "",
    } : null,
  })) as BadgeWithBook[];
}

// ============================================================================
// Get Badges for a Specific Book
// ============================================================================

export async function getBadgesForBook(bookId: number): Promise<Badge[]> {
  await requireAdminOrLibrarian();

  const result = await query<BadgeRow>(
    `SELECT * FROM badges WHERE book_id = $1 ORDER BY created_at DESC`,
    [bookId]
  );

  return result.rows.map(row => ({
    ...row,
    badge_type: row.badge_type as BadgeType,
    tier: row.tier as BadgeTier,
    category: row.category as BadgeCategory,
    criteria: row.criteria as unknown as BadgeCriteria
  })) as Badge[];
}

// ============================================================================
// Create Badge
// ============================================================================

export interface CreateBadgeInput {
  name: string;
  description: string;
  badge_type: BadgeType;
  criteria: BadgeCriteria;
  tier: BadgeTier;
  xp_reward: number;
  category: BadgeCategory;
  icon_url?: string;
  book_id?: number;
  display_order?: number;
}

export async function createBadge(input: CreateBadgeInput): Promise<Badge> {
  const user = await requireAdminOrLibrarian();

  // Validate required fields
  if (!input.name?.trim()) {
    throw new Error("Badge name is required.");
  }

  if (!input.badge_type) {
    throw new Error("Badge type is required.");
  }

  // Librarians can only create book-specific badges
  if (user.role === "LIBRARIAN") {
    if (input.badge_type !== "book_completion_specific") {
      throw new Error(
        "Librarians can only create book-specific completion badges.",
      );
    }
    if (!input.book_id) {
      throw new Error("Book-specific badges must be associated with a book.");
    }
  }

  // Get max display_order if not provided
  let displayOrder = input.display_order;
  if (displayOrder === undefined) {
    const maxOrderResult = await query<{ display_order: number }>(
      `SELECT display_order FROM badges ORDER BY display_order DESC LIMIT 1`
    );
    displayOrder = (maxOrderResult.rows[0]?.display_order ?? 0) + 1;
  }

  try {
    const result = await query<BadgeRow>(
      `INSERT INTO badges (name, description, badge_type, criteria, tier, xp_reward, category, icon_url, book_id, display_order, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
       RETURNING *`,
      [
        input.name.trim(),
        input.description?.trim() || null,
        input.badge_type,
        JSON.stringify(input.criteria),
        input.tier || "bronze",
        input.xp_reward || 50,
        input.category || "general",
        input.icon_url || null,
        input.book_id || null,
        displayOrder,
        user.id,
      ]
    );

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/badges");
    revalidatePath("/dashboard/librarian");
    revalidatePath("/dashboard/student/badges");

    return result.rows[0] as Badge;
  } catch (error: any) {
    console.error("Failed to create badge:", error);
    if (error.code === "23505") {
      throw new Error("A badge with this name already exists.");
    }
    throw new Error("Failed to create badge.");
  }
}

// ============================================================================
// Update Badge
// ============================================================================

export interface UpdateBadgeInput {
  id: string;
  name?: string;
  description?: string;
  badge_type?: BadgeType;
  criteria?: BadgeCriteria;
  tier?: BadgeTier;
  xp_reward?: number;
  category?: BadgeCategory;
  icon_url?: string;
  book_id?: number | null;
  display_order?: number;
  is_active?: boolean;
}

export async function updateBadge(input: UpdateBadgeInput): Promise<Badge> {
  const user = await requireAdminOrLibrarian();

  if (!input.id) {
    throw new Error("Badge ID is required.");
  }

  // Get the existing badge to check permissions
  const existingResult = await query<BadgeRow>(
    `SELECT * FROM badges WHERE id = $1`,
    [input.id]
  );

  const existingBadge = existingResult.rows[0];
  if (!existingBadge) {
    throw new Error("Badge not found.");
  }

  // Permission checks based on role
  if (user.role === "LIBRARIAN") {
    // Librarians can only edit book-specific badges they created
    if (existingBadge.badge_type !== "book_completion_specific") {
      throw new Error(
        "Librarians can only edit book-specific completion badges.",
      );
    }
    if (existingBadge.created_by && existingBadge.created_by !== user.id) {
      throw new Error("You can only edit badges you created.");
    }
    // Librarians cannot change badge type to non-book-specific
    if (input.badge_type && input.badge_type !== "book_completion_specific") {
      throw new Error(
        "Librarians can only manage book-specific completion badges.",
      );
    }
  }

  // Only admins can edit system badges (badges without created_by)
  if (!existingBadge.created_by && user.role !== "ADMIN") {
    throw new Error("Only administrators can edit system badges.");
  }

  // Build update object with only provided fields
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(input.name.trim());
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(input.description?.trim() || null);
  }
  if (input.badge_type !== undefined) {
    updates.push(`badge_type = $${paramIndex++}`);
    params.push(input.badge_type);
  }
  if (input.criteria !== undefined) {
    updates.push(`criteria = $${paramIndex++}`);
    params.push(JSON.stringify(input.criteria));
  }
  if (input.tier !== undefined) {
    updates.push(`tier = $${paramIndex++}`);
    params.push(input.tier);
  }
  if (input.xp_reward !== undefined) {
    updates.push(`xp_reward = $${paramIndex++}`);
    params.push(input.xp_reward);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    params.push(input.category);
  }
  if (input.icon_url !== undefined) {
    updates.push(`icon_url = $${paramIndex++}`);
    params.push(input.icon_url || null);
  }
  if (input.book_id !== undefined) {
    updates.push(`book_id = $${paramIndex++}`);
    params.push(input.book_id);
  }
  if (input.display_order !== undefined) {
    updates.push(`display_order = $${paramIndex++}`);
    params.push(input.display_order);
  }
  if (input.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(input.is_active);
  }

  updates.push(`updated_at = NOW()`);
  params.push(input.id);

  try {
    const result = await query<BadgeRow>(
      `UPDATE badges SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/badges");
    revalidatePath("/dashboard/librarian");
    revalidatePath("/dashboard/student/badges");

    return result.rows[0] as Badge;
  } catch (error: any) {
    console.error("Failed to update badge:", error);
    if (error.code === "23505") {
      throw new Error("A badge with this name already exists.");
    }
    throw new Error("Failed to update badge.");
  }
}

// ============================================================================
// Delete Badge
// ============================================================================

export async function deleteBadge(
  badgeId: string,
): Promise<{ success: boolean }> {
  const user = await requireAdminOrLibrarian();

  if (!badgeId) {
    throw new Error("Badge ID is required.");
  }

  // Get the badge details
  const badgeResult = await query<BadgeRow>(
    `SELECT * FROM badges WHERE id = $1`,
    [badgeId]
  );

  const badge = badgeResult.rows[0];
  if (!badge) {
    throw new Error("Badge not found.");
  }

  // System badges cannot be deleted by anyone
  if (!badge.created_by) {
    throw new Error(
      "System badges cannot be deleted. You can deactivate them instead.",
    );
  }

  // Permission checks based on role
  if (user.role === "LIBRARIAN") {
    // Librarians can only delete book-specific badges they created
    if (badge.badge_type !== "book_completion_specific") {
      throw new Error(
        "Librarians can only delete book-specific completion badges.",
      );
    }
    if (badge.created_by !== user.id) {
      throw new Error("You can only delete badges you created.");
    }
  }

  // Delete the badge
  await query(`DELETE FROM badges WHERE id = $1`, [badgeId]);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/badges");
  revalidatePath("/dashboard/librarian");
  revalidatePath("/dashboard/student/badges");

  return { success: true };
}

// ============================================================================
// Toggle Badge Active Status
// ============================================================================

export async function toggleBadgeActive(
  badgeId: string,
  isActive: boolean,
): Promise<Badge> {
  return updateBadge({ id: badgeId, is_active: isActive });
}

// ============================================================================
// Create Book-Specific Completion Badge
// ============================================================================

export async function createBookCompletionBadge(input: {
  bookId: number;
  name?: string;
  description?: string;
  tier?: BadgeTier;
  xp_reward?: number;
  icon_url?: string;
}): Promise<Badge> {
  // Get book details for default name/description
  const bookResult = await query<{ id: number; title: string; author: string }>(
    `SELECT id, title, author FROM books WHERE id = $1`,
    [input.bookId]
  );

  const book = bookResult.rows[0];
  if (!book) {
    throw new Error("Book not found.");
  }

  const badgeName = input.name || `Finished "${book.title}"`;
  const badgeDescription =
    input.description || `Completed reading "${book.title}" by ${book.author}`;

  return createBadge({
    name: badgeName,
    description: badgeDescription,
    badge_type: "book_completion_specific",
    criteria: { type: "book_completion_specific", book_id: input.bookId },
    tier: input.tier || "gold",
    xp_reward: input.xp_reward || 150,
    category: "reading",
    icon_url: input.icon_url,
    book_id: input.bookId,
  });
}

// ============================================================================
// Get All Books (for badge assignment dropdown)
// ============================================================================

export async function getBooksForBadgeAssignment(): Promise<
  Array<{ id: number; title: string; author: string }>
> {
  await requireAdminOrLibrarian();

  const result = await query<{ id: number; title: string; author: string }>(
    `SELECT id, title, author FROM books ORDER BY title ASC`
  );

  return result.rows;
}

// ============================================================================
// Reorder Badges
// ============================================================================

export async function reorderBadges(
  badgeOrders: Array<{ id: string; display_order: number }>,
): Promise<{ success: boolean }> {
  await requireAdminOrLibrarian();

  // Update each badge's display_order
  for (const { id, display_order } of badgeOrders) {
    await query(
      `UPDATE badges SET display_order = $1 WHERE id = $2`,
      [display_order, id]
    );
  }

  revalidatePath("/dashboard/admin/badges");
  revalidatePath("/dashboard/student/badges");

  return { success: true };
}

// ============================================================================
// Get Current User's Role (for UI permissions)
// ============================================================================

export async function getCurrentUserRole(): Promise<{
  role: UserRole;
  userId: string;
  canCreateAllBadges: boolean;
  canEditSystemBadges: boolean;
  canOnlyCreateBookBadges: boolean;
}> {
  const user = await requireAdminOrLibrarian();

  const isAdmin = user.role === "ADMIN";
  const isLibrarian = user.role === "LIBRARIAN";

  return {
    role: user.role,
    userId: user.id,
    canCreateAllBadges: isAdmin,
    canEditSystemBadges: isAdmin,
    canOnlyCreateBookBadges: isLibrarian,
  };
}

// ============================================================================
// Upload Badge Icon
// ============================================================================

export async function uploadBadgeIcon(
  formData: FormData,
): Promise<{ url: string }> {
  await requireAdminOrLibrarian();

  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided.");
  }

  // Validate file type
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      "Invalid file type. Please upload a PNG, JPG, GIF, WebP, or SVG image.",
    );
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    throw new Error("File too large. Maximum size is 2MB.");
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
  const fileName = `badge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const objectKey = `badge-icons/${fileName}`;

  // Convert File to ArrayBuffer then to Buffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to MinIO
  const minioClient = getMinioClient();
  const bucketName = getMinioBucketName();

  try {
    await minioClient.putObject(bucketName, objectKey, buffer, buffer.length, {
      "Content-Type": file.type,
    });
  } catch (error) {
    console.error("Failed to upload badge icon to MinIO:", error);
    throw new Error("Failed to upload image. Please try again.");
  }

  // Build public URL
  const publicUrl = buildPublicObjectUrl(objectKey);

  return { url: publicUrl };
}

// ============================================================================
// Generate Badge Icon with AI
// ============================================================================

export async function generateBadgeIconWithAI(input: {
  badgeName: string;
  description?: string;
  tier?: string;
  category?: string;
}): Promise<{ url: string }> {
  await requireAdminOrLibrarian();

  // Build a descriptive prompt for the AI
  const tierDescriptions: Record<string, string> = {
    bronze: "bronze colored, beginner level",
    silver: "silver colored, intermediate level",
    gold: "gold colored, advanced level",
    platinum: "platinum colored, expert level",
    special: "special colorful design",
  };

  const categoryEmojis: Record<string, string> = {
    reading: "📖 book",
    quiz: "📝 quiz",
    streak: "🔥 fire",
    milestone: "🏆 trophy",
    special: "⭐ star",
    general: "🎯 target",
  };

  const tierDesc = tierDescriptions[input.tier || "bronze"] || "colorful";
  const categoryIcon =
    categoryEmojis[input.category || "general"] || "achievement";
  const description = input.description || input.badgeName;

  // Build detailed positive prompt for Diffuser API
  const prompt = `professional app icon, single ${tierDesc} achievement badge, circular medal shape, centered composition, ${categoryIcon} book symbol in middle, flat vector illustration style, bright vibrant gradient colors, clean modern design, white background, high quality, detailed, polished, glossy finish, mobile game UI badge, Duolingo style achievement`;

  // Build negative prompt to avoid unwanted elements
  const negativePrompt = `multiple objects, multiple badges, grid layout, collage, text, letters, words, numbers, watermark, signature, realistic photo, photograph, blurry, low quality, bad quality, dark background, colored background, gradient background, character, person, human, animal face, cartoon character, mascot, ornate, medieval, complex patterns, runes, symbols, shadow, 3d render, depth, perspective, frame, border, multiple icons, duplicate, copy`;
  console.log("🎨 Generating badge icon with AI:", {
    badgeName: input.badgeName,
    prompt: prompt,
    negativePrompt: negativePrompt,
    settings: { width: 512, height: 512 },
  });

  try {
    const { base64Image, mimeType } = await AIService.generateImage({
      prompt,
      negativePrompt,
      width: 512,
      height: 512,
    });

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");
    console.log("📊 Generated image size:", imageBuffer.length, "bytes");

    // Generate unique filename for MinIO
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = `badge-ai-${timestamp}-${randomId}.png`;
    const objectKey = `badge-icons/${fileName}`;

    // Upload to MinIO
    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();

    console.log("📤 Uploading to MinIO:", objectKey);

    try {
      await minioClient.putObject(
        bucketName,
        objectKey,
        imageBuffer,
        imageBuffer.length,
        {
          "Content-Type": mimeType || "image/png",
        },
      );
    } catch (uploadError) {
      console.error("❌ Failed to upload to MinIO:", uploadError);
      throw new Error(
        `Failed to upload image to storage: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
      );
    }

    // Build public URL
    const publicUrl = buildPublicObjectUrl(objectKey);
    console.log("✅ Badge icon saved to MinIO:", publicUrl);

    return { url: publicUrl };
  } catch (error) {
    console.error("❌ Failed to generate badge icon with AI:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`AI generation failed: ${message}`);
  }
}

// ============================================================================
// Delete Badge Icon
// ============================================================================

export async function deleteBadgeIcon(
  iconUrl: string,
): Promise<{ success: boolean }> {
  await requireAdminOrLibrarian();

  // Extract object key from URL
  const objectKey = getObjectKeyFromPublicUrl(iconUrl);
  if (!objectKey) {
    throw new Error("Invalid icon URL.");
  }

  const minioClient = getMinioClient();
  const bucketName = getMinioBucketName();

  try {
    await minioClient.removeObject(bucketName, objectKey);
  } catch (error) {
    console.error("Failed to delete badge icon from MinIO:", error);
    throw new Error("Failed to delete image.");
  }

  return { success: true };
}
