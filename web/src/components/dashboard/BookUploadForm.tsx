"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  checkRenderStatus,
  extractBookText,
  generateBookDescription,
  generatePresignedUploadUrls,
  renderBookImages,
  saveBookMetadata,
} from "@/app/(dashboard)/dashboard/librarian/actions";
import type { AccessLevelValue } from "@/constants/accessLevels";
import {
  getAcceptedMimeTypes,
  validateEbookFile,
  type SupportedEbookFormat,
} from "@/lib/file-type-detector";
import { Alert } from "@/components/ui";
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

type UploadState =
  | "idle"
  | "request"
  | "uploading_pdf"
  | "uploading_cover"
  | "rendering"
  | "extracting_text"
  | "save";

type PdfDetectionState = "idle" | "working" | "error";

type BookUploadFormProps = {
  genreOptions?: string[];
  languageOptions?: string[];
  onCancel?: () => void;
  onSuccess?: () => void;
};

const workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PdfJsModule = typeof import("pdfjs-dist");

const getBusyLabel = (status: UploadState) => {
  switch (status) {
    case "request":
      return "Preparing upload...";
    case "uploading_pdf":
      return "Uploading book file...";
    case "uploading_cover":
      return "Uploading cover...";
    case "rendering":
      return "Processing book...";
    case "extracting_text":
      return "Extracting text...";
    case "save":
      return "Saving metadata...";
    default:
      return "Uploading...";
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
          "Rendering pages or converting the uploaded format for reading.",
      };
    case "extracting_text":
      return {
        activeKey: "processContent",
        processDescription:
          "Extracting text and determining the best reader mode.",
      };
    default:
      return {};
  }
};

export const BookUploadForm = ({
  genreOptions = [],
  languageOptions = [],
  onCancel,
  onSuccess,
}: BookUploadFormProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<UploadState>("idle");
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<BookFormFieldErrors>({});
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [detectedFormat, setDetectedFormat] =
    useState<SupportedEbookFormat | null>(null);
  const [pdfDetectionState, setPdfDetectionState] =
    useState<PdfDetectionState>("idle");
  const [pdfDetectionMessage, setPdfDetectionMessage] = useState<string | null>(
    null,
  );
  const [selectedAccessLevels, setSelectedAccessLevels] = useState<
    Set<AccessLevelValue>
  >(new Set());
  const [renderingProgress, setRenderingProgress] = useState<string>("");
  const [renderingPageProgress, setRenderingPageProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    book: number;
    cover: number;
  }>({ book: 0, cover: 0 });

  const formRef = useRef<HTMLFormElement | null>(null);
  const genreListId = useId();
  const languageListId = useId();

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

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  };

  const resetTransientState = () => {
    setPageCount(null);
    setDetectedFormat(null);
    setPdfDetectionState("idle");
    setPdfDetectionMessage(null);
    setSelectedAccessLevels(new Set());
    setRenderingProgress("");
    setRenderingPageProgress({ current: 0, total: 0 });
    setUploadProgress({ book: 0, cover: 0 });
    setFieldErrors({});
    setError(null);
    setSuccess(null);
    setStatus("idle");
    setIsClosing(false);
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
    const bookFile = formData.get("pdfFile") as File | null;
    const coverFile = formData.get("coverFile") as File | null;

    if (!isbn) errors.isbn = "ISBN is required.";
    if (!title) errors.title = "Title is required.";
    if (!author) errors.author = "Author is required.";
    if (!publisher) errors.publisher = "Publisher is required.";
    if (!Number.isFinite(publicationYearRaw) || publicationYearRaw <= 0) {
      errors.publicationYear = "A valid publication year is required.";
    }
    if (!genre) errors.genre = "Genre is required.";
    if (!language) errors.language = "Language is required.";
    if (!bookFile || bookFile.size === 0) {
      errors.bookFile = "A book file is required.";
    }
    if (!coverFile || coverFile.size === 0) {
      errors.coverFile = "A cover image is required.";
    }

    return errors;
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
      const publisher = String(formData.get("publisher") ?? "").trim();
      const language = String(formData.get("language") ?? "").trim();
      const publicationYear = String(
        formData.get("publicationYear") ?? "",
      ).trim();

      const localErrors: BookFormFieldErrors = {};
      if (!title) localErrors.title = "Title is required for AI generation.";
      if (!author) localErrors.author = "Author is required for AI generation.";

      if (Object.keys(localErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...localErrors }));
        setError("Add at least the title and author before generating.");
        return;
      }

      const textPreview = [
        `Title: ${title}`,
        `Author: ${author}`,
        genre ? `Genre: ${genre}` : null,
        publisher ? `Publisher: ${publisher}` : null,
        publicationYear ? `Publication year: ${publicationYear}` : null,
        language ? `Language: ${language}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const result = await generateBookDescription({
        title,
        author,
        genre: genre || undefined,
        pageCount: pageCount || undefined,
        textPreview,
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

  const handlePdfFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setPageCount(null);
    setPdfDetectionMessage(null);
    setDetectedFormat(null);
    setPdfDetectionState("idle");
    setFieldErrors((prev) => ({ ...prev, bookFile: undefined }));
    setError(null);
    setSuccess(null);

    if (!file) {
      return;
    }

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
          `PDF detected. The system will render page images after upload.`,
        );
      } else {
        const formatName = validation.format.toUpperCase();
        const helper =
          validation.format === "epub"
            ? `${formatName} detected. This format can be used directly after upload.`
            : `${formatName} detected. This format will be converted after upload.`;
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

  const uploadFileWithProgress = async ({
    url,
    file,
    contentType,
    onProgress,
    failureMessage,
  }: {
    url: string;
    file: File;
    contentType: string;
    onProgress: (progress: number) => void;
    failureMessage: string;
  }) => {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", contentType);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || event.total === 0) {
          return;
        }

        onProgress(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onerror = () => reject(new Error(failureMessage));
      xhr.onabort = () => reject(new Error(failureMessage));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
          return;
        }

        reject(new Error(failureMessage));
      };

      xhr.send(file);
    });
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
    const bookFile = formData.get("pdfFile") as File;
    const coverFile = formData.get("coverFile") as File;
    const accessLevels: AccessLevelValue[] = Array.from(selectedAccessLevels);

    try {
      setStatus("request");

      let resolvedPageCount = pageCount;

      if (!detectedFormat) {
        const validation = await validateEbookFile(bookFile);
        if (!validation.valid || !validation.format) {
          throw new Error(validation.error || "Invalid book file.");
        }
        setDetectedFormat(validation.format);
      }

      const resolvedFormat = detectedFormat ?? "pdf";

      if (!resolvedPageCount && resolvedFormat === "pdf") {
        setPdfDetectionState("working");
        try {
          resolvedPageCount = await extractPageCount(bookFile);
          setPageCount(resolvedPageCount);
          setPdfDetectionState("idle");
          setPdfDetectionMessage(
            "PDF detected. The system will render page images after upload.",
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
        !resolvedPageCount &&
        ["epub", "mobi", "azw", "azw3"].includes(resolvedFormat)
      ) {
        resolvedPageCount = 1;
      }

      if (!resolvedPageCount) {
        throw new Error("Page count is required.");
      }

      const uploadInfo = await generatePresignedUploadUrls({
        pdfFilename: bookFile.name,
        coverFilename: coverFile.name,
      });

      setUploadProgress({ book: 0, cover: 0 });

      setStatus("uploading_pdf");
      await uploadFileWithProgress({
        url: uploadInfo.pdfUploadUrl,
        file: bookFile,
        contentType: bookFile.type || "application/octet-stream",
        onProgress: (progress) =>
          setUploadProgress((prev) => ({ ...prev, book: progress })),
        failureMessage: "Book file upload to storage failed.",
      });

      setStatus("uploading_cover");
      await uploadFileWithProgress({
        url: uploadInfo.coverUploadUrl,
        file: coverFile,
        contentType: coverFile.type || "image/png",
        onProgress: (progress) =>
          setUploadProgress((prev) => ({ ...prev, cover: progress })),
        failureMessage: "Cover upload to storage failed.",
      });

      setStatus("save");
      const saveResult = await saveBookMetadata({
        isbn,
        title,
        author,
        publisher,
        publicationYear,
        genre,
        language,
        description,
        pageCount: resolvedPageCount,
        accessLevels,
        pdfUrl: uploadInfo.pdfPublicUrl,
        coverUrl: uploadInfo.coverPublicUrl,
        fileFormat: resolvedFormat,
        fileSizeBytes: bookFile.size,
      });

      if (resolvedFormat === "epub") {
        setStatus("rendering");
        setRenderingProgress(
          "EPUB uploaded successfully and is ready to read.",
        );

        const { markBookAsReady } =
          await import("@/app/(dashboard)/dashboard/librarian/actions");
        await markBookAsReady(saveResult.bookId, "epub");

        setSuccess(
          "EPUB uploaded successfully. The book is ready for reading.",
        );
      } else if (["mobi", "azw", "azw3"].includes(resolvedFormat)) {
        setStatus("rendering");
        const formatUpper = resolvedFormat.toUpperCase();
        setRenderingProgress(`Converting ${formatUpper} into reader assets...`);

        const { convertMobiToImages } =
          await import("@/app/(dashboard)/dashboard/librarian/actions");

        const renderResult = await convertMobiToImages(saveResult.bookId);

        if (!renderResult.success) {
          throw new Error(renderResult.message);
        }

        let attempts = 0;
        const maxAttempts = 120;
        let renderComplete = false;

        while (attempts < maxAttempts && !renderComplete) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;

          const renderStatus = await checkRenderStatus(saveResult.bookId);

          if (renderStatus.completed) {
            renderComplete = true;
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
            setRenderingProgress(`Converting book assets... ${attempts * 5}s`);
          }
        }

        if (!renderComplete) {
          throw new Error(
            `${formatUpper} conversion did not finish within the expected time.`,
          );
        }

        setSuccess(
          `${formatUpper} converted successfully. The book is ready for reading.`,
        );
      } else {
        setStatus("rendering");
        setRenderingProgress("Rendering PDF pages for reading...");

        const renderResult = await renderBookImages(saveResult.bookId);

        if (!renderResult.success) {
          throw new Error(renderResult.message);
        }

        let attempts = 0;
        const maxAttempts = 120;
        let renderComplete = false;

        while (attempts < maxAttempts && !renderComplete) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;

          const renderStatus = await checkRenderStatus(saveResult.bookId);

          if (renderStatus.completed) {
            renderComplete = true;
            setRenderingProgress(
              `Rendered ${renderStatus.pageCount} pages as images.`,
            );
          } else if (renderStatus.error) {
            throw new Error(`Rendering failed: ${renderStatus.error}`);
          } else if (renderStatus.processedPages && renderStatus.totalPages) {
            setRenderingPageProgress({
              current: renderStatus.processedPages,
              total: renderStatus.totalPages,
            });
            setRenderingProgress(
              `Rendering pages: ${renderStatus.processedPages} / ${renderStatus.totalPages}`,
            );
          } else {
            setRenderingProgress(`Rendering page images... ${attempts * 5}s`);
          }
        }

        if (!renderComplete) {
          throw new Error(
            "PDF rendering did not finish within the expected time.",
          );
        }

        setSuccess(
          "PDF uploaded successfully and is ready with the image reader.",
        );
      }

      router.refresh();
      setFieldErrors({});
      setSuccess(
        (prev) =>
          prev ?? "Book uploaded successfully and added to the catalog.",
      );
      setUploadProgress({ book: 100, cover: 100 });
      setRenderingProgress(
        (prev) => prev || "Everything is ready. Closing this form...",
      );
      setIsClosing(true);
      setTimeout(() => {
        form.reset();
        resetTransientState();
        onSuccess?.();
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
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

  const isBusy = status !== "idle" || isClosing;
  const stageMeta = mapStatusToStage(status);
  const stages =
    isBusy || Boolean(success) || Boolean(error) || Boolean(renderingProgress)
      ? buildDefaultProcessingStages(
          success ? "ready" : stageMeta.activeKey,
          error ? (stageMeta.activeKey ?? "validate") : undefined,
          stageMeta.processDescription,
        )
      : [];

  const renderingPercent =
    renderingPageProgress.total > 0
      ? Math.round(
          (renderingPageProgress.current / renderingPageProgress.total) * 100,
        )
      : isClosing
        ? 100
        : 0;

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
        <div className="inline-flex rounded-full border-4 border-pink-300 bg-pink-400 px-4 py-1">
          <p className="text-sm font-black uppercase tracking-wide text-pink-900">
            📚 New Adventure
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-purple-900">Add New Book</h2>
          <p className="max-w-3xl text-base font-semibold text-purple-600">
            Upload a book file, cover image, and catalog details in one guided
            flow. The system will automatically prepare the best reading
            experience based on the detected format.
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant="error" title="Upload issue">
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert variant="success" title="Upload complete">
          {success}
        </Alert>
      ) : null}

      <BookFileSection
        mode="create"
        inputName="pdfFile"
        acceptedTypes={getAcceptedMimeTypes()}
        required
        disabled={isBusy}
        onFileChange={handlePdfFileChange}
        detectedFormat={detectedFormat}
        pageCount={pageCount}
        detectionState={pdfDetectionState}
        detectionMessage={pdfDetectionMessage}
        errors={fieldErrors}
        helperText="Supported formats: PDF, EPUB, MOBI, AZW, and AZW3."
      />

      <BookCoverSection
        mode="create"
        inputName="coverFile"
        required
        disabled={isBusy}
        errors={fieldErrors}
      />

      <BookDetailsSection
        genreListId={genreListId}
        languageListId={languageListId}
        genreOptions={genreOptions}
        languageOptions={languageOptions}
        errors={fieldErrors}
      />

      <BookDescriptionSection
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

      {(uploadProgress.book > 0 ||
        uploadProgress.cover > 0 ||
        renderingProgress ||
        renderingPageProgress.total > 0) && (
        <div className="space-y-4 rounded-[28px] border border-indigo-100 bg-white/90 p-5 shadow-[0_18px_50px_rgba(99,102,241,0.10)]">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-indigo-950">
              Upload and processing progress
            </h3>
            <p className="text-sm font-medium text-indigo-600">
              Stay on this form while the book uploads and the reader assets are
              prepared automatically.
            </p>
          </div>

          {(uploadProgress.book > 0 || status === "uploading_pdf") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-indigo-800">
                <span>Book file upload</span>
                <span>{uploadProgress.book}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${uploadProgress.book}%` }}
                />
              </div>
            </div>
          )}

          {(uploadProgress.cover > 0 || status === "uploading_cover") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-indigo-800">
                <span>Cover upload</span>
                <span>{uploadProgress.cover}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${uploadProgress.cover}%` }}
                />
              </div>
            </div>
          )}

          {(renderingProgress ||
            renderingPageProgress.total > 0 ||
            status === "rendering" ||
            status === "extracting_text") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-indigo-800">
                <span>
                  {status === "extracting_text"
                    ? "Text extraction"
                    : "Page rendering"}
                </span>
                <span>
                  {renderingPageProgress.total > 0
                    ? `${renderingPercent}%`
                    : status === "idle"
                      ? "Done"
                      : "Working..."}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-indigo-100">
                {renderingPageProgress.total > 0 ? (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-500 transition-all duration-300"
                    style={{ width: `${renderingPercent}%` }}
                  />
                ) : (
                  <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-amber-300 via-fuchsia-400 to-indigo-500" />
                )}
              </div>
              {renderingProgress ? (
                <p className="text-sm font-medium text-indigo-600">
                  {renderingProgress}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {stages.length > 0 ? (
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
        submitLabel="Upload book"
        busyLabel={isClosing ? "Finishing..." : getBusyLabel(status)}
        onCancel={handleCancel}
      />
    </form>
  );
};
