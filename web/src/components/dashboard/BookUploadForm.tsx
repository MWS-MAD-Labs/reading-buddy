"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  generatePresignedUploadUrls,
  saveBookMetadata,
  renderBookImages,
  checkRenderStatus,
  extractBookText,
  generateBookDescription,
} from "@/app/(dashboard)/dashboard/librarian/actions";
import {
  ACCESS_LEVEL_OPTIONS,
  type AccessLevelValue,
} from "@/constants/accessLevels";
import {
  validateEbookFile,
  getFormatName,
  getFormatColor,
  type SupportedEbookFormat,
} from "@/lib/file-type-detector";

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

export const BookUploadForm = ({
  genreOptions = [],
  languageOptions = [],
  onCancel,
  onSuccess,
}: BookUploadFormProps) => {
  const [status, setStatus] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
  const [uploadProgress, setUploadProgress] = useState<{
    pdf: number;
    cover: number;
  }>({ pdf: 0, cover: 0 });
  const [renderingProgress, setRenderingProgress] = useState<string>("");
  const [renderingPageProgress, setRenderingPageProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });
  const [uploadedBookId, setUploadedBookId] = useState<number | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const genreListId = useId();
  const languageListId = useId();

  const normalizedGenreOptions = useMemo(
    () =>
      Array.from(
        new Set(
          genreOptions.filter((value): value is string =>
            Boolean(value && value.trim()),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [genreOptions],
  );

  const normalizedLanguageOptions = useMemo(
    () =>
      Array.from(
        new Set(
          languageOptions.filter((value): value is string =>
            Boolean(value && value.trim()),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [languageOptions],
  );

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

  const handleGenerateDescription = async () => {
    console.log("🤖 Generate AI Description clicked");
    setGeneratingDescription(true);
    setError(null);

    try {
      const form = formRef.current;
      if (!form) {
        console.error("Form ref not found");
        return;
      }

      const formData = new FormData(form);
      const title = String(formData.get("title") ?? "").trim();
      const author = String(formData.get("author") ?? "").trim();
      const genre = String(formData.get("genre") ?? "").trim();
      const pdfFile = formData.get("pdfFile") as File | null;

      console.log("📋 Form data:", {
        title,
        author,
        genre,
        hasPdfFile: !!pdfFile,
      });

      if (!title || !author) {
        setError("Title and author are required to generate description");
        return;
      }

      if (!pdfFile || pdfFile.size === 0) {
        setError("Please upload a PDF file first");
        return;
      }

      // Call RAG API directly from the client
      const ragApiUrl =
        process.env.NEXT_PUBLIC_RAG_API_URL || "http://172.16.0.65:8000";
      console.log("🌐 RAG API URL:", ragApiUrl);

      const ragFormData = new FormData();
      ragFormData.append("file", pdfFile);

      console.log("📤 Sending request to RAG API...");
      const response = await fetch(`${ragApiUrl}/generate-description`, {
        method: "POST",
        body: ragFormData,
      });

      console.log("📥 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ RAG API error:", errorText);
        throw new Error(`RAG API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ RAG API result:", result);

      if (result.description) {
        // Set the description in the textarea
        const descriptionTextarea = form.querySelector<HTMLTextAreaElement>(
          'textarea[name="description"]',
        );
        if (descriptionTextarea) {
          descriptionTextarea.value = result.description;
        }
        setSuccess("AI description generated successfully!");
      } else {
        setError("Failed to generate description - no description returned");
      }
    } catch (err) {
      console.error("💥 Generate description error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to generate description";
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
    setError(null);

    if (!file) {
      setPdfDetectionState("idle");
      return;
    }

    setPdfDetectionState("working");

    try {
      // Validate file format and size
      const validation = await validateEbookFile(file);

      if (!validation.valid) {
        setPdfDetectionState("error");
        setPdfDetectionMessage(validation.error || "Invalid file");
        setError(validation.error || "Invalid file");
        return;
      }

      setDetectedFormat(validation.format!);

      // Extract page count (only works for PDF currently)
      if (validation.format === "pdf") {
        const detectedPages = await extractPageCount(file);
        setPageCount(detectedPages);
      } else if (
        validation.format &&
        ["epub", "mobi", "azw", "azw3"].includes(validation.format)
      ) {
        // For EPUB and MOBI/AZW formats, we'll get page count after conversion
        const formatName = validation.format.toUpperCase();
        setPdfDetectionMessage(
          `${formatName} file detected. Page count will be determined after upload.`,
        );
      }

      setPdfDetectionState("idle");
    } catch (err) {
      console.error("Failed to validate/detect file:", err);
      setPdfDetectionState("error");
      setPdfDetectionMessage("Unable to process this file.");
      setError("Unable to process this file.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

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
    const accessLevels = Array.from(selectedAccessLevels);

    if (!isbn) {
      setError("ISBN is required.");
      return;
    }

    if (!title) {
      setError("Title is required.");
      return;
    }

    if (!author) {
      setError("Author is required.");
      return;
    }

    if (!publisher) {
      setError("Publisher is required.");
      return;
    }

    if (!publicationYear) {
      setError("A valid publication year is required.");
      return;
    }

    if (!genre) {
      setError("Genre is required.");
      return;
    }

    if (!language) {
      setError("Language is required.");
      return;
    }

    // Access levels are optional - books with no levels are "draft" books

    if (!pdfFile || pdfFile.size === 0) {
      setError("A book file (PDF or EPUB) is required.");
      return;
    }

    if (!coverFile || coverFile.size === 0) {
      setError("A cover image is required.");
      return;
    }

    try {
      setPdfDetectionMessage(null);
      setPdfDetectionState("idle");

      let resolvedPageCount = pageCount;

      // Only require page count for PDFs (EPUB page count determined after conversion)
      if (!resolvedPageCount && detectedFormat === "pdf") {
        setPdfDetectionState("working");
        try {
          resolvedPageCount = await extractPageCount(pdfFile);
          setPageCount(resolvedPageCount);
          setPdfDetectionState("idle");
          setPdfDetectionMessage(null);
        } catch (ex) {
          setPdfDetectionState("error");
          setPdfDetectionMessage("Unable to detect page count from the PDF.");
          throw ex instanceof Error
            ? ex
            : new Error("Unable to detect page count from the PDF.");
        }
      }

      if (!resolvedPageCount && detectedFormat === "pdf") {
        setError(
          "Unable to detect page count from the PDF. Please try another file.",
        );
        return;
      }

      // For EPUB and MOBI/AZW, use placeholder page count (will be updated after conversion)
      if (
        ["epub", "mobi", "azw", "azw3"].includes(detectedFormat || "") &&
        !resolvedPageCount
      ) {
        resolvedPageCount = 1; // Placeholder
      }

      // Ensure we have a valid page count (TypeScript safety)
      if (!resolvedPageCount) {
        setError("Page count is required");
        return;
      }

      setStatus("request");
      const uploadInfo = await generatePresignedUploadUrls({
        pdfFilename: pdfFile.name,
        coverFilename: coverFile.name,
      });

      // Upload PDF with progress
      setStatus("uploading_pdf");
      setUploadProgress({ pdf: 0, cover: 0 });
      const pdfResponse = await fetch(uploadInfo.pdfUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": pdfFile.type || "application/pdf" },
        body: pdfFile,
      });

      if (!pdfResponse.ok) {
        throw new Error("PDF upload to MinIO failed.");
      }
      setUploadProgress((prev) => ({ ...prev, pdf: 100 }));

      // Upload Cover with progress
      setStatus("uploading_cover");
      const coverResponse = await fetch(uploadInfo.coverUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": coverFile.type || "image/png" },
        body: coverFile,
      });

      if (!coverResponse.ok) {
        throw new Error("Cover upload to MinIO failed.");
      }
      setUploadProgress((prev) => ({ ...prev, cover: 100 }));

      // Save book metadata
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
        fileFormat: detectedFormat || "pdf",
        fileSizeBytes: pdfFile.size,
      });

      setUploadedBookId(saveResult.bookId);

      // Process based on file format
      if (detectedFormat === "epub") {
        // EPUB files work natively - no processing needed!
        // EpubFlipReader handles text and images directly from the file
        setStatus("rendering");
        setRenderingProgress(
          "EPUB file ready! No additional processing needed.",
        );

        // Mark as ready in database
        const { markBookAsReady } =
          await import("@/app/(dashboard)/dashboard/librarian/actions");
        await markBookAsReady(saveResult.bookId, "epub");

        setSuccess("EPUB uploaded successfully! Ready for reading.");
      } else if (["mobi", "azw", "azw3"].includes(detectedFormat || "")) {
        // MOBI/AZW formats need conversion to images
        setStatus("rendering");
        const formatUpper = detectedFormat?.toUpperCase();
        setRenderingProgress(`Converting ${formatUpper} to readable format...`);

        const { convertMobiToImages } =
          await import("@/app/(dashboard)/dashboard/librarian/actions");
        const renderResult = await convertMobiToImages(saveResult.bookId);

        if (!renderResult.success) {
          throw new Error(renderResult.message);
        }

        // Poll for conversion completion
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
              `Conversion complete! ${renderStatus.pageCount} pages ready.`,
            );
          } else if (renderStatus.error) {
            throw new Error(`Conversion failed: ${renderStatus.error}`);
          } else if (renderStatus.processedPages && renderStatus.totalPages) {
            setRenderingPageProgress({
              current: renderStatus.processedPages,
              total: renderStatus.totalPages,
            });
            setRenderingProgress(
              `Converting: ${renderStatus.processedPages} / ${renderStatus.totalPages} pages`,
            );
          } else {
            setRenderingProgress(`Converting: ${attempts * 5}s elapsed`);
          }
        }

        setSuccess(
          renderComplete
            ? `${formatUpper} converted successfully! Ready for reading.`
            : `${formatUpper} uploaded. Conversion continues in background.`,
        );
      } else {
        // PDF: Try text extraction first, only render images if it's a scanned PDF
        setStatus("extracting_text");
        setRenderingProgress("Analyzing PDF content...");

        try {
          const extractResult = await extractBookText(saveResult.bookId);

          if (extractResult.success) {
            // PDF has extractable text - ready for TextFlipReader!
            setRenderingProgress(
              `✓ Text extracted: ${extractResult.totalWords?.toLocaleString()} words`,
            );
            setSuccess("PDF uploaded with text content! Ready for reading.");
          } else if (extractResult.errorType === "insufficient_text") {
            // Scanned PDF - need to render as images
            setRenderingProgress(
              "Scanned PDF detected. Rendering pages as images...",
            );
            setStatus("rendering");

            const renderResult = await renderBookImages(saveResult.bookId);

            if (!renderResult.success) {
              throw new Error(renderResult.message);
            }

            // Poll for render completion
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
                  `✓ Rendered ${renderStatus.pageCount} pages as images`,
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
                  `Rendering: ${renderStatus.processedPages} / ${renderStatus.totalPages} pages`,
                );
              } else {
                setRenderingProgress(`Rendering: ${attempts * 5}s elapsed`);
              }
            }

            setSuccess(
              renderComplete
                ? "Scanned PDF uploaded! Using image-based reader."
                : "Scanned PDF uploaded. Image rendering continues in background.",
            );
          } else {
            // Other extraction error - log but don't fail
            console.warn("Text extraction issue:", extractResult.message);
            setRenderingProgress(`⚠️ ${extractResult.message}`);
            setSuccess(
              "PDF uploaded. You may need to retry text extraction manually.",
            );
          }
        } catch (extractErr) {
          console.warn("Text extraction error:", extractErr);
          const errorMessage =
            extractErr instanceof Error
              ? extractErr.message
              : "Unknown error occurred";
          setRenderingProgress(`⚠️ Processing issue: ${errorMessage}`);
          // Don't fail the upload - just warn
          setSuccess(
            "PDF uploaded. Processing encountered an issue - please check the book status.",
          );
        }
      }

      form.reset();
      setPageCount(null);
      setPdfDetectionState("idle");
      setPdfDetectionMessage(null);
      setSelectedAccessLevels(new Set());
      setUploadProgress({ pdf: 0, cover: 0 });
      setRenderingProgress("");
      setRenderingPageProgress({ current: 0, total: 0 });
      setUploadedBookId(null);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(message);
    } finally {
      setStatus("idle");
    }
  };

  const isBusy = status !== "idle";

  const handleCancel = () => {
    formRef.current?.reset();
    setError(null);
    setSuccess(null);
    setPageCount(null);
    setPdfDetectionState("idle");
    setPdfDetectionMessage(null);
    setSelectedAccessLevels(new Set());
    setUploadProgress({ pdf: 0, cover: 0 });
    setRenderingProgress("");
    setRenderingPageProgress({ current: 0, total: 0 });
    setUploadedBookId(null);
    onCancel?.();
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-[32px] border border-white/70 bg-white/90 p-6 text-indigo-950 shadow-[0_25px_70px_rgba(255,145,201,0.35)] md:p-8"
    >
      <div>
        <div className="mb-2 inline-block rounded-2xl border-4 border-pink-300 bg-pink-400 px-4 py-1">
          <p className="text-sm font-black uppercase tracking-wide text-pink-900">
            📚 New Adventure
          </p>
        </div>
        <h2 className="text-3xl font-black text-purple-900">Add New Book</h2>
        <p className="text-base font-semibold text-purple-600">
          Upload the PDF, cover image, and metadata.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-2 text-base font-bold text-purple-700">
          ISBN
          <input
            name="isbn"
            required
            maxLength={32}
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 font-semibold text-purple-900 outline-none transition-all"
            placeholder="9780743273565"
          />
        </label>

        <label className="space-y-2 text-base font-bold text-purple-700">
          Title
          <input
            name="title"
            required
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 font-semibold text-purple-900 outline-none transition-all"
            placeholder="The Great Gatsby"
          />
        </label>

        <label className="space-y-2 text-base font-bold text-purple-700">
          Author
          <input
            name="author"
            required
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 font-semibold text-purple-900 outline-none transition-all"
            placeholder="F. Scott Fitzgerald"
          />
        </label>

        <label className="space-y-2 text-base font-bold text-purple-700">
          Publisher
          <input
            name="publisher"
            required
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 font-semibold text-purple-900 outline-none transition-all"
            placeholder="Charles Scribner's Sons"
          />
        </label>

        <label className="space-y-2 text-base font-bold text-purple-700">
          Year
          <input
            name="publicationYear"
            type="number"
            min={1800}
            max={3000}
            required
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 font-semibold text-purple-900 outline-none transition-all"
            placeholder="1925"
          />
        </label>

        <label className="space-y-2 text-base font-bold text-purple-700">
          Genre
          <input
            name="genre"
            list={genreListId}
            required
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 font-semibold text-purple-900 outline-none transition-all"
            placeholder="Classics"
          />
          {normalizedGenreOptions.length ? (
            <datalist id={genreListId}>
              {normalizedGenreOptions.map((option: any) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          ) : null}
          <p className="text-xs text-indigo-500">
            Choose an existing genre or type a new one.
          </p>
        </label>

        <label className="space-y-2 text-base font-bold text-purple-700">
          Language
          <input
            name="language"
            list={languageListId}
            required
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 font-semibold text-purple-900 outline-none transition-all"
            placeholder="English"
          />
          {normalizedLanguageOptions.length ? (
            <datalist id={languageListId}>
              {normalizedLanguageOptions.map((option: any) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          ) : null}
          <p className="text-xs text-indigo-500">
            Pick from the list or enter a new language.
          </p>
        </label>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-base font-bold text-purple-700">
              Description
            </label>
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={generatingDescription || status !== "idle"}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-bold text-white shadow transition disabled:opacity-50 ${
                generatingDescription
                  ? "animate-pulse border-purple-400 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 bg-[length:200%_100%] animate-[gradient_2s_ease-in-out_infinite]"
                  : "border-indigo-300 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              }`}
              style={
                generatingDescription
                  ? {
                      animation:
                        "pulse 1.5s ease-in-out infinite, gradient 2s ease-in-out infinite",
                      backgroundSize: "200% 100%",
                    }
                  : undefined
              }
            >
              {generatingDescription ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span className="animate-pulse">✨ Generating...</span>
                </span>
              ) : (
                "🤖 AI Generate"
              )}
            </button>
          </div>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 font-semibold text-purple-900 outline-none transition-all"
            placeholder="Quick summary for librarians and AI quiz prompts."
          />
        </div>

        <fieldset className="space-y-2 text-base font-bold text-purple-700 md:col-span-2">
          <legend>Access</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ACCESS_LEVEL_OPTIONS.map((option: any) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-white/70 px-3 py-2 text-sm text-indigo-900"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-indigo-300 text-fuchsia-500 focus:ring-2 focus:ring-rose-200"
                  checked={selectedAccessLevels.has(option.value)}
                  onChange={() => toggleAccessLevel(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-indigo-500">
            Choose who can access this title. Leave empty for draft books.
          </p>
        </fieldset>

        <div className="space-y-2 text-base font-bold text-purple-700">
          Detected page count
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/80 px-3 py-2 text-sm text-indigo-900">
            {pageCount
              ? `${pageCount} pages`
              : "Select a PDF to detect page count"}
          </div>
          {pdfDetectionState === "working" ? (
            <p className="text-xs text-indigo-500">Analyzing file…</p>
          ) : null}
          {detectedFormat && pdfDetectionState === "idle" ? (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getFormatColor(detectedFormat)}`}
              >
                {getFormatName(detectedFormat)}
              </span>
              {pdfDetectionMessage ? (
                <p className="text-xs text-indigo-600">{pdfDetectionMessage}</p>
              ) : null}
            </div>
          ) : null}
          {pdfDetectionState === "error" && pdfDetectionMessage ? (
            <p className="text-xs text-rose-500">{pdfDetectionMessage}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-2 text-base font-bold text-purple-700">
          Book File (PDF, EPUB, MOBI, AZW, AZW3)
          <input
            name="pdfFile"
            type="file"
            accept=".pdf,.epub,.mobi,.azw,.azw3,application/pdf,application/epub+zip,application/x-mobipocket-ebook"
            required
            onChange={handlePdfFileChange}
            className="w-full rounded-2xl border border-dashed border-indigo-200 bg-white/50 px-3 py-2 text-indigo-900 file:mr-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-rose-400 file:to-fuchsia-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>

        <label className="space-y-2 text-base font-bold text-purple-700">
          Cover image
          <input
            name="coverFile"
            type="file"
            accept="image/*"
            required
            className="w-full rounded-2xl border border-dashed border-indigo-200 bg-white/50 px-3 py-2 text-indigo-900 file:mr-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-sky-400 file:to-emerald-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      {/* Progress Indicators */}
      {status === "uploading_pdf" ||
      status === "uploading_cover" ||
      uploadProgress.pdf > 0 ? (
        <div className="space-y-3 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm font-semibold text-purple-700">
              <span>📄 PDF Upload</span>
              <span>{uploadProgress.pdf}%</span>
            </div>
            <div className="h-2 rounded-full bg-purple-200">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-300"
                style={{ width: `${uploadProgress.pdf}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm font-semibold text-purple-700">
              <span>🖼️ Cover Upload</span>
              <span>{uploadProgress.cover}%</span>
            </div>
            <div className="h-2 rounded-full bg-purple-200">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-300"
                style={{ width: `${uploadProgress.cover}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Rendering Progress */}
      {status === "rendering" && renderingProgress ? (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-700">
                🎨 Rendering Book Pages
              </p>
              <p className="text-sm text-emerald-600">{renderingProgress}</p>
            </div>
          </div>
          {renderingPageProgress.total > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-semibold text-emerald-700">
                <span>Page Conversion Progress</span>
                <span>
                  {renderingPageProgress.current} /{" "}
                  {renderingPageProgress.total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-emerald-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${(renderingPageProgress.current / renderingPageProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isBusy}
          className="btn-3d btn-squish flex-1 rounded-2xl border-4 border-pink-300 bg-gradient-to-r from-pink-500 to-fuchsia-600 px-8 py-4 text-xl font-black text-white shadow-xl transition hover:from-pink-600 hover:to-fuchsia-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-400/60 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        >
          {isBusy
            ? status === "request"
              ? "⏳ Preparing..."
              : status === "uploading_pdf"
                ? "📤 Uploading PDF..."
                : status === "uploading_cover"
                  ? "📤 Uploading Cover..."
                  : status === "rendering"
                    ? "🎨 Rendering..."
                    : status === "extracting_text"
                      ? "📝 Extracting Text..."
                      : "💾 Saving..."
            : "📚 Upload Book"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isBusy}
          className="rounded-2xl border-4 border-indigo-200 bg-white px-6 py-4 text-base font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
