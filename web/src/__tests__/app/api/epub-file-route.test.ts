import { Readable } from "stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/epub/[bookId]/file/route";
import { getSession } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { getMinioBucketName, getMinioClient } from "@/lib/minio";
import { getObjectKeyFromPublicUrl } from "@/lib/minioUtils";

vi.mock("@/lib/auth/server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  queryWithContext: vi.fn(),
}));

vi.mock("@/lib/minio", () => ({
  getMinioClient: vi.fn(),
  getMinioBucketName: vi.fn(),
}));

vi.mock("@/lib/minioUtils", () => ({
  getObjectKeyFromPublicUrl: vi.fn(),
}));

const queryResult = <TRow extends Record<string, unknown>>(rows: TRow[]) =>
  ({
    rows,
    rowCount: rows.length,
    command: "SELECT",
    oid: 0,
    fields: [],
  }) as unknown as Awaited<ReturnType<typeof queryWithContext>>;

describe("GET /api/epub/[bookId]/file", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ bookId: "7" }),
    });

    expect(response.status).toBe(401);
  });

  it("streams the epub file with the expected headers", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { userId: "user-1" },
    } as Awaited<ReturnType<typeof getSession>>);

    vi.mocked(queryWithContext).mockResolvedValue({
      ...queryResult([
        {
          title: "My EPUB Book",
          file_format: "epub",
          original_file_url: "http://localhost:9000/test-bucket/books/my.epub",
        },
      ]),
    });

    const objectStream = Readable.from(Buffer.from("epub-data"));
    vi.mocked(getObjectKeyFromPublicUrl).mockReturnValue("books/my.epub");
    vi.mocked(getMinioBucketName).mockReturnValue("test-bucket");
    vi.mocked(getMinioClient).mockReturnValue({
      getObject: vi.fn().mockResolvedValue(objectStream),
      statObject: vi.fn().mockResolvedValue({ size: 9 }),
    } as unknown as ReturnType<typeof getMinioClient>);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ bookId: "7" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/epub+zip");
    expect(response.headers.get("Content-Disposition")).toContain("My-EPUB-Book.epub");

    const body = Buffer.from(await response.arrayBuffer()).toString("utf8");
    expect(body).toBe("epub-data");
  });
});
