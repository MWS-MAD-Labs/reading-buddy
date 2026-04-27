import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookEditForm } from "@/components/dashboard/BookEditForm";
import type { ManagedBookRecord } from "@/components/dashboard/BookManager";

const refreshMock = vi.fn();

const actionMocks = vi.hoisted(() => ({
  updateBookMetadata: vi.fn(),
  generatePresignedUploadUrls: vi.fn(),
  renderBookImages: vi.fn(),
  checkRenderStatus: vi.fn(),
  generateBookDescription: vi.fn(),
  extractBookText: vi.fn(),
  convertMobiToImages: vi.fn(),
}));

const fileTypeMocks = vi.hoisted(() => ({
  validateEbookFile: vi.fn(),
  getAcceptedMimeTypes: vi.fn(() => ".pdf,.epub,.mobi,.azw,.azw3"),
  getFormatName: vi.fn((format: string) => format.toUpperCase()),
  getFormatColor: vi.fn(() => "bg-emerald-100 text-emerald-700"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/app/(dashboard)/dashboard/librarian/actions", () => ({
  updateBookMetadata: actionMocks.updateBookMetadata,
  generatePresignedUploadUrls: actionMocks.generatePresignedUploadUrls,
  renderBookImages: actionMocks.renderBookImages,
  checkRenderStatus: actionMocks.checkRenderStatus,
  generateBookDescription: actionMocks.generateBookDescription,
  extractBookText: actionMocks.extractBookText,
  convertMobiToImages: actionMocks.convertMobiToImages,
}));

vi.mock("@/lib/file-type-detector", () => ({
  validateEbookFile: fileTypeMocks.validateEbookFile,
  getAcceptedMimeTypes: fileTypeMocks.getAcceptedMimeTypes,
  getFormatName: fileTypeMocks.getFormatName,
  getFormatColor: fileTypeMocks.getFormatColor,
}));

describe("BookEditForm", () => {
  const book: ManagedBookRecord = {
    id: 42,
    isbn: "9780743273565",
    title: "Original PDF Book",
    author: "F. Scott Fitzgerald",
    publisher: "Scribner",
    publicationYear: 1925,
    genre: "Classics",
    language: "English",
    description: "Existing description",
    pageCount: 120,
    pdfUrl: "https://storage.example.com/books/original.pdf",
    coverUrl: "https://storage.example.com/covers/original.jpg",
    accessLevels: ["UPPER_ELEMENTARY"],
    fileFormat: "pdf",
    isPictureBook: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );

    actionMocks.generatePresignedUploadUrls.mockResolvedValue({
      pdfUploadUrl: "https://upload.example.com/books/replacement.epub",
      coverUploadUrl: "https://upload.example.com/covers/replacement.jpg",
      pdfObjectKey: "books/replacement.epub",
      coverObjectKey: "covers/replacement.jpg",
      pdfPublicUrl: "https://storage.example.com/books/replacement.epub",
      coverPublicUrl: "https://storage.example.com/covers/replacement.jpg",
    });

    actionMocks.updateBookMetadata.mockResolvedValue({ success: true });
    actionMocks.convertMobiToImages.mockResolvedValue({
      success: true,
      message: "converted",
    });
    actionMocks.extractBookText.mockResolvedValue({
      success: true,
      message: "extracted",
      totalWords: 100,
    });
    actionMocks.renderBookImages.mockResolvedValue({
      success: true,
      message: "rendering",
    });
    actionMocks.checkRenderStatus.mockResolvedValue({
      completed: true,
      pageCount: 10,
    });

    fileTypeMocks.validateEbookFile.mockResolvedValue({
      valid: true,
      format: "epub",
      fileSize: 1234,
    });
  });

  it("detects an EPUB replacement file and shows the format-specific helper message", async () => {
    const user = userEvent.setup();

    render(
      <BookEditForm
        book={book}
        genreOptions={["Classics"]}
        languageOptions={["English"]}
      />,
    );

    const fileInput = screen.getByLabelText(
      /replacement file/i,
    ) as HTMLInputElement;

    expect(fileInput.accept).toContain(".epub");

    const replacementFile = new File(["epub-content"], "replacement.epub", {
      type: "application/epub+zip",
    });

    await user.upload(fileInput, replacementFile);

    await waitFor(() => {
      expect(fileTypeMocks.validateEbookFile).toHaveBeenCalledWith(
        replacementFile,
      );
    });

    expect(
      screen.getByText(
        /epub detected\. the replacement file will be ready without page rendering\./i,
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("EPUB")).toBeInTheDocument();

    expect(actionMocks.generatePresignedUploadUrls).not.toHaveBeenCalled();
    expect(actionMocks.updateBookMetadata).not.toHaveBeenCalled();
    expect(actionMocks.extractBookText).not.toHaveBeenCalled();
    expect(actionMocks.convertMobiToImages).not.toHaveBeenCalled();
    expect(actionMocks.renderBookImages).not.toHaveBeenCalled();
    expect(actionMocks.checkRenderStatus).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
