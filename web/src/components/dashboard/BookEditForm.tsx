"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  checkRenderStatus,
  convertMobiToImages,
  extractBookText,
  generateBookDescription,
  generatePresignedUploadUrls,
  renderBookImages,
  updateBookMetadata,
} from "@/app/(dashboard)/dashboard/librarian/actions";
import {
  type AccessLevelValue,
  normalizeAccessLevels,
} from "@/constants/accessLevels";
import type { ManagedBookRecord } from "@/components/dashboard/BookManager";
import {
  BookAvailabilitySection,
  BookCoverSection,
  BookDescriptionSection,
  BookDetailsSection,
  BookFileSection,
  BookFormActions,
  BookProcessingStatus,
  buildDefaultProcessingStages,
  type BookFormFieldErrors,
  type ProcessingStageKey,
} from "@/components/dashboard/BookFormSections";
import { Alert } from "@/components/ui";
import {
  getAcceptedMimeTypes,
  type SupportedEbookFormat,
  validateEbookFile,
} from "@/lib/file-type-detector";

type BookEditFormProps = {
  book: ManagedBookRecord;
  genreOptions?: string[];
  languageOptions?: string[];
  onCancel?: () => void;
  onSuccess?: () => void;
};

type UploadState =
  | "idle"
  | "request"
  | "uploading_pdf"
  | "uploading_cover"
  | "rendering"
  | "extracting_text"
  | "save";

type PdfDetectionState = "idle" | "working" | "error";

const workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PdfJsModule = typeof import("pdfjs-dist");

const getBusyLabel = (status: UploadState) => {
  switch (status) {
    case "request":
      return "Preparing changes...";
    case "uploading_pdf":
      return "Uploading replacement file...";
    case "uploading_cover":
      return "Uploading replacement cover...";
    case "rendering":
      return "Processing updated book...";
    case "extracting_text":
      return "Extracting text...";
    case "save":
      return "Saving changes...";
    default:
      return "Saving...";
  }
};

const mapStatusToStage = (
  status: UploadState,
): { activeKey?: ProcessingStageKey; processDescription?: string } => {
  switch (status) {
    case "request":
      return { activeKey: "validate" };
    case "uploading_pdf":
      return { activeKey: "uploadBook" };
    case "uploading_cover":
      return { activeKey: "uploadCover" };
    case "save":
      return { activeKey: "saveMetadata" };
    case "rendering":
      return {
        activeKey: "processContent",
        processDescription:
          "Rebuilding reader assets, converting formats, or rendering pages after replacement.",
      };
    case "extracting_text":
      return {
        activeKey: "processContent",
        processDescription:
          "Re-extracting text and selecting the best reader mode for the updated file.",
      };
    default:
      return {};
  }
};

export const BookEditForm = ({
  book,
  genreOptions = [],
  languageOptions = [],
  onCancel,
  onSuccess,
}: BookEditFormProps) => {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const genreListId = useId();
  const languageListId = useId();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<BookFormFieldErrors>({});
  const [status, setStatus] = useState<UploadState>("idle");
  const [selectedAccessLevels, setSelectedAccessLevels] = useState<
    Set<AccessLevelValue>
  >(new Set(normalizeAccessLevels(book.accessLevels)));
  const [pageCount, setPageCount] = useState<number | null>(book.pageCount);
  const [detectedFormat, setDetectedFormat] =
    useState<SupportedEbookFormat | null>(
      (book.fileFormat as SupportedEbookFormat | undefined) ?? null,
    );
  const [pdfDetectionState, setPdfDetectionState] =
    useState<PdfDetectionState>("idle");
  const [pdfDetectionMessage, setPdfDetectionMessage] = useState<string | null>(
    null,
  );
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [renderingProgress, setRenderingProgress] = useState<string>("");
  const [renderingPageProgress, setRenderingPageProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });

  const currentBookFileName = useMemo(() => {
    const fallback = `book.${book.fileFormat || "pdf"}`;
    if (!book.pdfUrl) return fallback;
    const last = book.pdfUrl.split("/").pop();
    return last && last.trim() ? last : fallback;
  }, [book.fileFormat, book.pdfUrl]);

  const currentCoverFileName = useMemo(() => {
    const fallback = "cover.jpg";
    if (!book.coverUrl) return fallback;
    const last = book.coverUrl.split("/").pop();
    return last && last.trim() ? last : fallback;
  }, [book.coverUrl]);

  const loadPdfModule = async (): Promise<PdfJsModule> => {
    const pdfModule = await import("pdfjs-dist");
    if (pdfModule.GlobalWorkerOptions?.workerSrc !== workerSrc) {
      pdfModule.GlobalWorkerOptions.workerSrc = workerSrc;
    }
    return pdfModule;
  };

  const extractPageCount = async (file: File) => {
    const pdfModule = await loadPdfModule();
    const buffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(buffer);
    const document = await pdfModule.getDocument({ data: typedArray }).promise;
    return document.numPages;
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  };

  const resetTransientState = () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    setStatus("idle");
    setSelectedAccessLevels(new Set(normalizeAccessLevels(book.accessLevels)));
    setPageCount(book.pageCount);
    setDetectedFormat(
      (book.fileFormat as SupportedEbookFormat | undefined) ?? null,
    );
    setPdfDetectionState("idle");
    setPdfDetectionMessage(null);
    setGeneratingDescription(false);
    setRenderingProgress("");
    setRenderingPageProgress({ current: 0, total: 0 });
  };

  const validateForm = (formData: FormData) => {
    const errors: BookFormFieldErrors = {};

    const isbn = String(formData.get("isbn") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const author = String(formData.get("author") ?? "").trim();
    const publisher = String(formData.get("publisher") ?? "").trim();
    const publicationYearRaw = Number(formData.get("publicationYear") ?? "0");
    const genre = String(formData.get("genre") ?? "").trim();
    const language = String(formData.get("language") ?? "").trim();

    if (!isbn) errors.isbn = "ISBN is required.";
    if (!title) errors.title = "Title is required.";
    if (!author) errors.author = "Author is required.";
    if (!publisher) errors.publisher = "Publisher is required.";
    if (!Number.isFinite(publicationYearRaw) || publicationYearRaw <= 0) {
      errors.publicationYear = "A valid publication year is required.";
    }
    if (!genre) errors.genre = "Genre is required.";
    if (!language) errors.language = "Language is required.";

    return errors;
  };

  const toggleAccessLevel = (level: AccessLevelValue) => {
    setSelectedAccessLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const handlePdfFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setPageCount(book.pageCount);
    setPdfDetectionMessage(null);
    setDetectedFormat(
      (book.fileFormat as SupportedEbookFormat | undefined) ?? null,
    );
    setPdfDetectionState("idle");
    setFieldErrors((prev) => ({ ...prev, bookFile: undefined }));
    setError(null);
    setSuccess(null);

    if (!file) {
      return;
    }

    setPageCount(null);
    setDetectedFormat(null);
    setPdfDetectionState("working");

    try {
      const validation = await validateEbookFile(file);

      if (!validation.valid || !validation.format) {
        const message = validation.error || "Invalid file.";
        setPdfDetectionState("error");
        setPdfDetectionMessage(message);
        setFieldErrors((prev) => ({ ...prev, bookFile: message }));
        setError(message);
        return;
      }

      setDetectedFormat(validation.format);

      if (validation.format === "pdf") {
        const detectedPages = await extractPageCount(file);
        setPageCount(detectedPages);
        setPdfDetectionMessage(
          "PDF detected. Replacing the file will trigger text extraction or page rendering.",
        );
      } else {
        const formatName = validation.format.toUpperCase();
        const helper =
          validation.format === "epub"
            ? `${formatName} detected. The replacement file will be ready without page rendering.`
            : `${formatName} detected. The replacement file will be converted after upload.`;
        setPdfDetectionMessage(helper);
      }

      setPdfDetectionState("idle");
    } catch {
      const message = "Unable to process this file.";
      setPdfDetectionState("error");
      setPdfDetectionMessage(message);
      setFieldErrors((prev) => ({ ...prev, bookFile: message }));
      setError(message);
    }
  };

  const handleGenerateDescription = async () => {
    clearMessages();
    setGeneratingDescription(true);

    try {
      const form = formRef.current;
      if (!form) {
        setError("Form not found.");
        return;
      }

      const formData = new FormData(form);
      const title = String(formData.get("title") ?? "").trim();
      const author = String(formData.get("author") ?? "").trim();
      const genre = String(formData.get("genre") ?? "").trim();

      const localErrors: BookFormFieldErrors = {};
      if (!title) localErrors.title = "Title is required for AI generation.";
      if (!author) localErrors.author = "Author is required for AI generation.";

      if (Object.keys(localErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...localErrors }));
        setError("Add at least the title and author before generating.");
        return;
      }

      const result = await generateBookDescription({
        title,
        author,
        genre: genre || undefined,
        pageCount: pageCount || undefined,
        bookId: book.id,
        pdfUrl: book.pdfUrl,
      });

      if (!result.success || !result.description) {
        setError(result.message || "Failed to generate description.");
        return;
      }

      const descriptionTextarea = form.querySelector<HTMLTextAreaElement>(
        'textarea[name="description"]',
      );

      if (!descriptionTextarea) {
        setError("Could not find the description field.");
        return;
      }

      descriptionTextarea.value = result.description;
      setSuccess("AI description generated successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate description.";
      setError(message);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError("Please fix the highlighted fields and try again.");
      return;
    }

    const isbn = String(formData.get("isbn") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const author = String(formData.get("author") ?? "").trim();
    const publisher = String(formData.get("publisher") ?? "").trim();
    const publicationYearRaw = Number(formData.get("publicationYear") ?? "0");
    const publicationYear =
      Number.isFinite(publicationYearRaw) && publicationYearRaw > 0
        ? publicationYearRaw
        : undefined;
    const description = String(formData.get("description") ?? "").trim();
    const genre = String(formData.get("genre") ?? "").trim();
    const language = String(formData.get("language") ?? "").trim();
    const pdfFile = formData.get("pdfFile") as File | null;
    const coverFile = formData.get("coverFile") as File | null;
    const accessLevels: AccessLevelValue[] = Array.from(selectedAccessLevels);

    const hasNewPdf = Boolean(pdfFile && pdfFile.size > 0);
    const hasNewCover = Boolean(coverFile && coverFile.size > 0);

    const initialFormat: SupportedEbookFormat =
      (book.fileFormat as SupportedEbookFormat | undefined) ?? "pdf";

    try {
      setStatus("request");

      let replacementFormat: SupportedEbookFormat = initialFormat;
      let pdfUrl = book.pdfUrl;
      let coverUrl = book.coverUrl;
      let resolvedPageCount = pageCount ?? book.pageCount;

      if (hasNewPdf) {
        const validation = await validateEbookFile(pdfFile!);
        if (!validation.valid || !validation.format) {
          throw new Error(validation.error || "Invalid replacement file.");
        }
        replacementFormat = validation.format;
        setDetectedFormat(validation.format);
      }

      if (hasNewPdf && replacementFormat === "pdf" && !resolvedPageCount) {
        setPdfDetectionState("working");
        try {
          resolvedPageCount = await extractPageCount(pdfFile!);
          setPageCount(resolvedPageCount);
          setPdfDetectionState("idle");
          setPdfDetectionMessage(
            "PDF detected. Replacing the file will trigger text extraction or page rendering.",
          );
        } catch (ex) {
          setPdfDetectionState("error");
          setPdfDetectionMessage("Unable to detect page count from the PDF.");
          throw ex instanceof Error
            ? ex
            : new Error("Unable to detect page count from the PDF.");
        }
      }

      if (
        hasNewPdf &&
        ["epub", "mobi", "azw", "azw3"].includes(replacementFormat || "") &&
        !resolvedPageCount
      ) {
        resolvedPageCount = 1;
      }

      if (!resolvedPageCount) {
        throw new Error("Page count is required.");
      }

      if (hasNewPdf || hasNewCover) {
        const uploadInfo = await generatePresignedUploadUrls({
          pdfFilename: hasNewPdf ? pdfFile!.name : currentBookFileName,
          coverFilename: hasNewCover ? coverFile!.name : currentCoverFileName,
        });

        if (hasNewPdf) {
          setStatus("uploading_pdf");
          const pdfResponse = await fetch(uploadInfo.pdfUploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": pdfFile!.type || "application/octet-stream",
            },
            body: pdfFile!,
          });

          if (!pdfResponse.ok) {
            throw new Error("Book file upload to storage failed.");
          }

          pdfUrl = uploadInfo.pdfPublicUrl;
        }

        if (hasNewCover) {
          setStatus("uploading_cover");
          const coverResponse = await fetch(uploadInfo.coverUploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": coverFile!.type || "image/png",
            },
            body: coverFile!,
          });

          if (!coverResponse.ok) {
            throw new Error("Cover upload to storage failed.");
          }

          coverUrl = uploadInfo.coverPublicUrl;
        }
      }

      setStatus("save");
      await updateBookMetadata({
        id: book.id,
        isbn,
        title,
        author,
        publisher,
        publicationYear: publicationYear!,
        genre,
        language,
        description: description || null,
        accessLevels,
        pdfUrl,
        coverUrl,
        pageCount: resolvedPageCount,
        isPictureBook:
          book.isPictureBook === null ? undefined : book.isPictureBook,
        fileFormat: replacementFormat,
        originalFileUrl: hasNewPdf ? pdfUrl : undefined,
        fileSizeBytes: hasNewPdf ? pdfFile!.size : undefined,
        resetDerivedData: hasNewPdf,
      });

      if (hasNewPdf) {
        if (replacementFormat === "epub") {
          setStatus("rendering");
          setRenderingProgress("EPUB replacement is ready for reading.");
          setSuccess(
            "Book updated successfully. The EPUB replacement is ready to read.",
          );
        } else if (["mobi", "azw", "azw3"].includes(replacementFormat || "")) {
          setStatus("rendering");
          const formatUpper = replacementFormat.toUpperCase();
          setRenderingProgress(
            `Converting ${formatUpper} into reader assets...`,
          );

          const renderResult = await convertMobiToImages(book.id);

          if (!("success" in renderResult) || !renderResult.success) {
            throw new Error(
              renderResult.message || `${formatUpper} conversion failed.`,
            );
          }

          let attempts = 0;
          const maxAttempts = 120;
          let renderComplete = false;

          while (attempts < maxAttempts && !renderComplete) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            attempts++;

            const renderStatus = await checkRenderStatus(book.id);

            if (renderStatus.completed) {
              renderComplete = true;
              const completedPageCount =
                renderStatus.pageCount ??
                renderStatus.totalPages ??
                renderStatus.processedPages ??
                0;
              setRenderingPageProgress({
                current: completedPageCount,
                total: completedPageCount,
              });
              setRenderingProgress(
                `Conversion complete. ${renderStatus.pageCount} pages are ready.`,
              );
            } else if (renderStatus.error) {
              throw new Error(`Conversion failed: ${renderStatus.error}`);
            } else if (renderStatus.processedPages && renderStatus.totalPages) {
              setRenderingPageProgress({
                current: renderStatus.processedPages,
                total: renderStatus.totalPages,
              });
              setRenderingProgress(
                `Converting pages: ${renderStatus.processedPages} / ${renderStatus.totalPages}`,
              );
            } else {
              setRenderingProgress(
                `Converting book assets... ${attempts * 5}s`,
              );
            }
          }

          setSuccess(
            renderComplete
              ? `Book updated successfully. ${formatUpper} is ready for reading.`
              : `Book updated successfully. ${formatUpper} conversion continues in the background.`,
          );
        } else {
          setStatus("extracting_text");
          setRenderingProgress("Analyzing updated PDF and extracting text...");

          try {
            const extractResult = await extractBookText(book.id);

            if (extractResult.success) {
              setRenderingProgress(
                `Text extracted successfully. ${extractResult.totalWords?.toLocaleString()} words found.`,
              );
              setSuccess(
                "Book updated successfully. PDF text content is ready for reading.",
              );
            } else if (extractResult.errorType === "insufficient_text") {
              setStatus("rendering");
              setRenderingProgress(
                "Scanned PDF detected. Rendering pages as images...",
              );

              const renderResult = await renderBookImages(book.id);

              if (!("success" in renderResult) || !renderResult.success) {
                throw new Error(
                  "error" in renderResult
                    ? renderResult.error
                    : "Rendering failed.",
                );
              }

              let attempts = 0;
              const maxAttempts = 120;
              let renderComplete = false;

              while (attempts < maxAttempts && !renderComplete) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                attempts++;

                const renderStatus = await checkRenderStatus(book.id);

                if (renderStatus.completed) {
                  renderComplete = true;
                  const completedPageCount =
                    renderStatus.pageCount ??
                    renderStatus.totalPages ??
                    renderStatus.processedPages ??
                    0;
                  setRenderingPageProgress({
                    current: completedPageCount,
                    total: completedPageCount,
                  });
                  setRenderingProgress(
                    `Rendered ${renderStatus.pageCount} pages as images.`,
                  );
                } else if (renderStatus.error) {
                  throw new Error(`Rendering failed: ${renderStatus.error}`);
                } else if (
                  renderStatus.processedPages &&
                  renderStatus.totalPages
                ) {
                  setRenderingPageProgress({
                    current: renderStatus.processedPages,
                    total: renderStatus.totalPages,
                  });
                  setRenderingProgress(
                    `Rendering pages: ${renderStatus.processedPages} / ${renderStatus.totalPages}`,
                  );
                } else {
                  setRenderingProgress(
                    `Rendering page images... ${attempts * 5}s`,
                  );
                }
              }

              setSuccess(
                renderComplete
                  ? "Book updated successfully. The scanned PDF is ready with the image reader."
                  : "Book updated successfully. Image rendering continues in the background.",
              );
            } else {
              setRenderingProgress(
                extractResult.message || "Processing finished.",
              );
              setSuccess(
                "Book updated successfully. Text extraction may need a manual retry.",
              );
            }
          } catch (extractErr) {
            const errorMessage =
              extractErr instanceof Error
                ? extractErr.message
                : "Unknown processing error";
            setRenderingProgress(errorMessage);
            setSuccess(
              "Book updated successfully, but processing needs attention in the background.",
            );
          }
        }
      } else {
        setSuccess("Book updated successfully.");
      }

      router.refresh();
      setTimeout(() => {
        onSuccess?.();
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed.";
      setError(message);
    } finally {
      setStatus("idle");
    }
  };

  const handleCancel = () => {
    formRef.current?.reset();
    resetTransientState();
    onCancel?.();
  };

  const isBusy = status !== "idle";
  const hasProcessingImpact = Boolean(renderingProgress) || Boolean(error);
  const stageMeta = mapStatusToStage(status);
  const stages =
    isBusy || Boolean(success) || Boolean(error) || Boolean(renderingProgress)
      ? buildDefaultProcessingStages(
          success ? "ready" : stageMeta.activeKey,
          error ? (stageMeta.activeKey ?? "validate") : undefined,
          stageMeta.processDescription,
        )
      : [];

  const processingSummaryParts = [
    renderingProgress,
    renderingPageProgress.total > 0
      ? `${renderingPageProgress.current} / ${renderingPageProgress.total} pages processed.`
      : null,
    success && !renderingProgress ? success : null,
    error && !renderingProgress ? error : null,
  ].filter(Boolean);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-[32px] border border-white/70 bg-white/90 p-6 text-indigo-950 shadow-[0_25px_70px_rgba(255,145,201,0.35)] md:p-8"
    >
      <div className="space-y-3">
        <div className="inline-flex rounded-full border-4 border-blue-300 bg-blue-400 px-4 py-1">
          <p className="text-sm font-black uppercase tracking-wide text-blue-900">
            ✏️ Edit Book
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-purple-900">
            Edit Book Details
          </h2>
          <p className="max-w-3xl text-base font-semibold text-purple-600">
            Update metadata safely, then replace files only when you want to
            regenerate reading assets and processing outputs.
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant="error" title="Update issue">
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert variant="success" title="Changes saved">
          {success}
        </Alert>
      ) : null}

      <BookDetailsSection
        genreListId={genreListId}
        languageListId={languageListId}
        genreOptions={genreOptions}
        languageOptions={languageOptions}
        defaultValues={{
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          publicationYear: book.publicationYear,
          genre: book.genre,
          language: book.language,
        }}
        errors={fieldErrors}
      />

      <BookDescriptionSection
        defaultValue={book.description ?? ""}
        generatingDescription={generatingDescription}
        disabled={isBusy}
        errors={fieldErrors}
        onGenerateDescription={handleGenerateDescription}
      />

      <BookAvailabilitySection
        selectedAccessLevels={selectedAccessLevels}
        onToggleAccessLevel={toggleAccessLevel}
        disabled={isBusy}
        errors={fieldErrors}
      />

      <BookFileSection
        mode="edit"
        inputName="pdfFile"
        acceptedTypes={getAcceptedMimeTypes()}
        disabled={isBusy}
        currentFileName={currentBookFileName}
        warningText="Replacing the book file clears extracted text, rendered page images, and other derived reading assets so they can be rebuilt."
        onFileChange={handlePdfFileChange}
        detectedFormat={detectedFormat}
        pageCount={pageCount}
        detectionState={pdfDetectionState}
        detectionMessage={pdfDetectionMessage}
        errors={fieldErrors}
      />

      <BookCoverSection
        mode="edit"
        inputName="coverFile"
        disabled={isBusy}
        currentFileName={currentCoverFileName}
        currentCoverUrl={book.coverUrl}
        errors={fieldErrors}
      />

      {hasProcessingImpact || stages.length > 0 ? (
        <BookProcessingStatus
          stages={stages}
          summary={
            processingSummaryParts.length > 0
              ? processingSummaryParts.join(" ")
              : null
          }
        />
      ) : null}

      <BookFormActions
        isBusy={isBusy}
        submitLabel="Save changes"
        busyLabel={getBusyLabel(status)}
        onCancel={handleCancel}
      />
    </form>
  );
};
