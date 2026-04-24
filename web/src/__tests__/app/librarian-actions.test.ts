import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  queryWithContext: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const queryResult = <TRow extends Record<string, unknown>>(rows: TRow[]) =>
  ({
    rows,
    rowCount: rows.length,
    command: "SELECT",
    oid: 0,
    fields: [],
  }) as unknown as Awaited<ReturnType<typeof queryWithContext>>;

describe("updateBookMetadata", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      profileId: "profile-1",
      email: "librarian@example.com",
    } as Awaited<ReturnType<typeof getCurrentUser>>);

    vi.mocked(queryWithContext).mockImplementation(async (_userId, sql) => {
      if (sql.includes("SELECT role FROM profiles")) {
        return queryResult([{ role: "LIBRARIAN" }]);
      }

      return queryResult([]);
    });
  });

  it("persists replacement file metadata and clears stale derived data when resetDerivedData is true", async () => {
    const { updateBookMetadata } = await import(
      "@/app/(dashboard)/dashboard/librarian/actions"
    );

    await updateBookMetadata({
      id: 42,
      isbn: "9781234567890",
      title: "Updated Title",
      author: "Updated Author",
      publisher: "Updated Publisher",
      publicationYear: 2024,
      genre: "Fantasy",
      language: "English",
      description: "Updated description",
      accessLevels: ["LOWER_ELEMENTARY"],
      pdfUrl: null,
      pageCount: 1,
      isPictureBook: false,
      fileFormat: "epub",
      originalFileUrl: "https://storage.example.com/books/replacement.epub",
      fileSizeBytes: 987654,
      resetDerivedData: true,
    });

    const updateCall = vi
      .mocked(queryWithContext)
      .mock.calls.find(([, sql]) => sql.includes("UPDATE books SET"));

    expect(updateCall).toBeDefined();

    const [userId, sql, params] = updateCall!;
    expect(userId).toBe("user-1");

    expect(sql).toContain("pdf_url = $10");
    expect(sql).toContain("page_count = $11");
    expect(sql).toContain("is_picture_book = $12");
    expect(sql).toContain("file_format = $13");
    expect(sql).toContain("original_file_url = $14");
    expect(sql).toContain("file_size_bytes = $15");

    expect(sql).toContain("page_images_prefix = NULL");
    expect(sql).toContain("page_images_count = NULL");
    expect(sql).toContain("page_images_rendered_at = NULL");
    expect(sql).toContain("text_json_url = NULL");
    expect(sql).toContain("page_text_content = NULL");
    expect(sql).toContain("text_extracted_at = NULL");
    expect(sql).toContain("text_extraction_method = NULL");
    expect(sql).toContain("text_extraction_status = NULL");
    expect(sql).toContain("text_extraction_error = NULL");

    expect(params).toEqual([
      42,
      "9781234567890",
      "Updated Title",
      "Updated Author",
      "Updated Publisher",
      2024,
      "Fantasy",
      "English",
      "Updated description",
      null,
      1,
      false,
      "epub",
      "https://storage.example.com/books/replacement.epub",
      987654,
    ]);

    expect(queryWithContext).toHaveBeenCalledWith(
      "user-1",
      expect.stringContaining("DELETE FROM book_access WHERE book_id = $1"),
      [42],
    );

    expect(queryWithContext).toHaveBeenCalledWith(
      "user-1",
      expect.stringContaining(
        "INSERT INTO book_access (book_id, access_level) VALUES ($1, $2)",
      ),
      [42, "LOWER_ELEMENTARY"],
    );

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/library");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/librarian");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/student/read/42");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/journal/42");
  });
});
