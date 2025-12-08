"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMinioClient, getMinioBucketName } from "@/lib/minio";
import {
  buildPublicObjectUrl,
  getObjectKeyFromPublicUrl,
} from "@/lib/minioUtils";
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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Profile not found.");
  }

  return {
    id: user.id,
    email: user.email || "",
    role: profile.role as UserRole,
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

export async function getAllBadges(): Promise<BadgeWithBook[]> {
  await requireAdminOrLibrarian();

  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("badges")
    .select("*, book:books(id, title, author)")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch badges:", error);
    throw new Error("Failed to fetch badges.");
  }

  return (data ?? []) as BadgeWithBook[];
}

// ============================================================================
// Get Badges for a Specific Book
// ============================================================================

export async function getBadgesForBook(bookId: number): Promise<Badge[]> {
  await requireAdminOrLibrarian();

  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("badges")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch book badges:", error);
    throw new Error("Failed to fetch book badges.");
  }

  return (data ?? []) as Badge[];
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
  const supabaseAdmin = getSupabaseAdminClient();

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
    const { data: maxOrder } = await supabaseAdmin
      .from("badges")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    displayOrder = (maxOrder?.display_order ?? 0) + 1;
  }

  const { data, error } = await supabaseAdmin
    .from("badges")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      badge_type: input.badge_type,
      criteria: input.criteria,
      tier: input.tier || "bronze",
      xp_reward: input.xp_reward || 50,
      category: input.category || "general",
      icon_url: input.icon_url || null,
      book_id: input.book_id || null,
      display_order: displayOrder,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create badge:", error);
    if (error.code === "23505") {
      throw new Error("A badge with this name already exists.");
    }
    throw new Error("Failed to create badge.");
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/badges");
  revalidatePath("/dashboard/librarian");
  revalidatePath("/dashboard/student/badges");

  return data as Badge;
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
  const supabaseAdmin = getSupabaseAdminClient();

  if (!input.id) {
    throw new Error("Badge ID is required.");
  }

  // Get the existing badge to check permissions
  const { data: existingBadge, error: fetchError } = await supabaseAdmin
    .from("badges")
    .select("*")
    .eq("id", input.id)
    .single();

  if (fetchError || !existingBadge) {
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
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined)
    updates.description = input.description?.trim() || null;
  if (input.badge_type !== undefined) updates.badge_type = input.badge_type;
  if (input.criteria !== undefined) updates.criteria = input.criteria;
  if (input.tier !== undefined) updates.tier = input.tier;
  if (input.xp_reward !== undefined) updates.xp_reward = input.xp_reward;
  if (input.category !== undefined) updates.category = input.category;
  if (input.icon_url !== undefined) updates.icon_url = input.icon_url || null;
  if (input.book_id !== undefined) updates.book_id = input.book_id;
  if (input.display_order !== undefined)
    updates.display_order = input.display_order;
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("badges")
    .update(updates)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update badge:", error);
    if (error.code === "23505") {
      throw new Error("A badge with this name already exists.");
    }
    throw new Error("Failed to update badge.");
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/badges");
  revalidatePath("/dashboard/librarian");
  revalidatePath("/dashboard/student/badges");

  return data as Badge;
}

// ============================================================================
// Delete Badge
// ============================================================================

export async function deleteBadge(
  badgeId: string,
): Promise<{ success: boolean }> {
  const user = await requireAdminOrLibrarian();
  const supabaseAdmin = getSupabaseAdminClient();

  if (!badgeId) {
    throw new Error("Badge ID is required.");
  }

  // Get the badge details
  const { data: badge } = await supabaseAdmin
    .from("badges")
    .select("*")
    .eq("id", badgeId)
    .single();

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
  const { error } = await supabaseAdmin
    .from("badges")
    .delete()
    .eq("id", badgeId);

  if (error) {
    console.error("Failed to delete badge:", error);
    throw new Error("Failed to delete badge.");
  }

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
  const supabaseAdmin = getSupabaseAdminClient();

  // Get book details for default name/description
  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id, title, author")
    .eq("id", input.bookId)
    .single();

  if (bookError || !book) {
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
  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("books")
    .select("id, title, author")
    .order("title", { ascending: true });

  if (error) {
    console.error("Failed to fetch books:", error);
    throw new Error("Failed to fetch books.");
  }

  return data ?? [];
}

// ============================================================================
// Reorder Badges
// ============================================================================

export async function reorderBadges(
  badgeOrders: Array<{ id: string; display_order: number }>,
): Promise<{ success: boolean }> {
  await requireAdminOrLibrarian();
  const supabaseAdmin = getSupabaseAdminClient();

  // Update each badge's display_order
  for (const { id, display_order } of badgeOrders) {
    const { error } = await supabaseAdmin
      .from("badges")
      .update({ display_order })
      .eq("id", id);

    if (error) {
      console.error("Failed to reorder badge:", error);
      throw new Error("Failed to reorder badges.");
    }
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

  const diffuserApiUrl =
    process.env.DIFFUSER_API_URL || "http://172.16.0.165:8000";
  const endpoint = "/generate-badge-image";

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
    settings: { width: 512, height: 512, steps: 40, guidance: 11 },
    apiUrl: diffuserApiUrl,
  });

  try {
    // Call Diffuser API
    const response = await fetch(`${diffuserApiUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: negativePrompt,
        width: 512,
        height: 512,
        num_inference_steps: 40,
        guidance_scale: 11,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Diffuser API error:", errorText);
      throw new Error(
        `Failed to generate image: ${response.statusText} - ${errorText}`,
      );
    }

    const result = await response.json();
    console.log("📦 Diffuser API response keys:", Object.keys(result));

    // Check for base64 encoded image first
    const base64Image =
      result.image_base64 ||
      result.base64 ||
      result.imageBase64 ||
      result.image_data ||
      result.data;

    let imageBuffer: Buffer;

    if (base64Image) {
      console.log("📥 Processing base64 image from response");

      // Remove data:image/png;base64, prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

      // Convert base64 to buffer
      imageBuffer = Buffer.from(base64Data, "base64");
      console.log("📊 Decoded base64 image size:", imageBuffer.length, "bytes");
    } else {
      // Check for URL/path to download
      const imagePath =
        result.image_url ||
        result.url ||
        result.imageUrl ||
        result.image ||
        result.output_url ||
        result.output ||
        result.image_path ||
        result.path;

      if (!imagePath) {
        console.error("❌ No image data found in response:", result);
        throw new Error(
          `Diffuser API did not return an image. Response: ${JSON.stringify(result).substring(0, 200)}`,
        );
      }

      console.log("📥 Downloading generated image from:", imagePath);

      // Download the generated image from Diffuser API
      let imageResponse: Response;
      try {
        // If it's a relative path, prepend the API URL
        const imageUrl = imagePath.startsWith("http")
          ? imagePath
          : `${diffuserApiUrl}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;

        imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) {
          throw new Error(
            `Failed to download image: ${imageResponse.statusText}`,
          );
        }
      } catch (downloadError) {
        console.error("❌ Failed to download generated image:", downloadError);
        throw new Error(
          `Failed to download generated image: ${downloadError instanceof Error ? downloadError.message : "Unknown error"}`,
        );
      }

      // Convert to buffer
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      console.log("📊 Downloaded image size:", imageBuffer.length, "bytes");
    }

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
          "Content-Type": "image/png",
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
