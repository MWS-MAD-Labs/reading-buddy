"use client";

import type { ChangeEventHandler, ReactNode } from "react";
import {
  ACCESS_LEVEL_OPTIONS,
  type AccessLevelValue,
} from "@/constants/accessLevels";
import {
  getFormatColor,
  getFormatName,
  type SupportedEbookFormat,
} from "@/lib/file-type-detector";
import { Alert } from "@/components/ui";
import { cn } from "@/lib/cn";

export type BookFormFieldErrors = Partial<
  Record<
    | "isbn"
    | "title"
    | "author"
    | "publisher"
    | "publicationYear"
    | "genre"
    | "language"
    | "description"
    | "bookFile"
    | "coverFile"
    | "accessLevels",
    string
  >
>;

export type ProcessingStageKey =
  | "validate"
  | "uploadBook"
  | "uploadCover"
  | "saveMetadata"
  | "processContent"
  | "ready";

export type ProcessingStageState = "pending" | "active" | "complete" | "error";

export type ProcessingStage = {
  key: ProcessingStageKey;
  label: string;
  description?: string;
  state: ProcessingStageState;
};

type SectionShellProps = {
  title: string;
  description?: string;
  badge?: string;
  tone?: "default" | "highlight" | "warning";
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

type BookDetailsSectionProps = {
  genreListId: string;
  languageListId: string;
  genreOptions?: string[];
  languageOptions?: string[];
  defaultValues?: {
    isbn?: string;
    title?: string;
    author?: string;
    publisher?: string;
    publicationYear?: number | null;
    genre?: string;
    language?: string;
  };
  errors?: BookFormFieldErrors;
};

type BookDescriptionSectionProps = {
  defaultValue?: string | null;
  generatingDescription?: boolean;
  disabled?: boolean;
  errors?: BookFormFieldErrors;
  onGenerateDescription?: () => void;
};

type BookAvailabilitySectionProps = {
  selectedAccessLevels: Set<AccessLevelValue>;
  onToggleAccessLevel: (level: AccessLevelValue) => void;
  disabled?: boolean;
  errors?: BookFormFieldErrors;
};

type BookFileSectionProps = {
  mode: "create" | "edit";
  inputName?: string;
  acceptedTypes: string;
  required?: boolean;
  disabled?: boolean;
  currentFileName?: string | null;
  helperText?: string;
  warningText?: string;
  onFileChange?: ChangeEventHandler<HTMLInputElement>;
  detectedFormat?: SupportedEbookFormat | null;
  pageCount?: number | null;
  detectionState?: "idle" | "working" | "error";
  detectionMessage?: string | null;
  errors?: BookFormFieldErrors;
};

type BookCoverSectionProps = {
  mode: "create" | "edit";
  inputName?: string;
  required?: boolean;
  disabled?: boolean;
  currentFileName?: string | null;
  currentCoverUrl?: string | null;
  helperText?: string;
  errors?: BookFormFieldErrors;
};

type BookProcessingStatusProps = {
  stages: ProcessingStage[];
  title?: string;
  summary?: string | null;
  className?: string;
};

type BookFormActionsProps = {
  isBusy?: boolean;
  submitLabel: string;
  busyLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  className?: string;
};

const toneClasses: Record<NonNullable<SectionShellProps["tone"]>, string> = {
  default:
    "border-white/70 bg-white/90 shadow-[0_22px_60px_rgba(99,102,241,0.10)]",
  highlight:
    "border-indigo-100 bg-gradient-to-br from-white via-sky-50 to-indigo-50 shadow-[0_25px_70px_rgba(99,102,241,0.14)]",
  warning:
    "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-[0_25px_70px_rgba(245,158,11,0.14)]",
};

const sectionHeadingBadgeClasses: Record<
  NonNullable<SectionShellProps["tone"]>,
  string
> = {
  default: "border-indigo-200 bg-indigo-100 text-indigo-800",
  highlight: "border-sky-200 bg-sky-100 text-sky-800",
  warning: "border-amber-200 bg-amber-100 text-amber-900",
};

export const SectionShell = ({
  title,
  description,
  badge,
  tone = "default",
  children,
  actions,
  className,
}: SectionShellProps) => {
  return (
    <section
      className={cn(
        "space-y-5 rounded-[28px] border p-5 md:p-6",
        toneClasses[tone],
        className,
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          {badge ? (
            <span
              className={cn(
                "inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em]",
                sectionHeadingBadgeClasses[tone],
              )}
            >
              {badge}
            </span>
          ) : null}
          <div className="space-y-1">
            <h3 className="text-xl font-black text-indigo-950">{title}</h3>
            {description ? (
              <p className="max-w-3xl text-sm font-medium leading-relaxed text-indigo-700/80">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {children}
    </section>
  );
};

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="text-xs font-semibold text-rose-600">{message}</p>
  ) : null;

const BaseField = ({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) => {
  return (
    <label className="space-y-2 text-base font-bold text-purple-700">
      <span className="flex items-center gap-2">
        <span>{label}</span>
        {required ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-700">
            Required
          </span>
        ) : (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-600">
            Optional
          </span>
        )}
      </span>
      {children}
      {hint ? (
        <p className="text-xs font-medium text-indigo-500">{hint}</p>
      ) : null}
      <FieldError message={error} />
    </label>
  );
};

const textInputClass =
  "w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 font-semibold text-purple-950 outline-none transition-all placeholder:text-purple-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const fileInputClass =
  "w-full rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-3 py-3 text-indigo-950 file:mr-4 file:rounded-full file:file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold";
const bookFileInputClass = `${fileInputClass} file:bg-gradient-to-r file:from-rose-400 file:to-fuchsia-500 file:text-white`;
const coverFileInputClass = `${fileInputClass} file:bg-gradient-to-r file:from-sky-400 file:to-emerald-400 file:text-white`;

export const BookDetailsSection = ({
  genreListId,
  languageListId,
  genreOptions = [],
  languageOptions = [],
  defaultValues,
  errors,
}: BookDetailsSectionProps) => {
  const normalizedGenreOptions = Array.from(
    new Set(genreOptions.filter((value) => Boolean(value?.trim()))),
  ).sort((a, b) => a.localeCompare(b));

  const normalizedLanguageOptions = Array.from(
    new Set(languageOptions.filter((value) => Boolean(value?.trim()))),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <SectionShell
      title="Book details"
      description="Capture the catalog metadata students and librarians will use to discover this title."
      badge="Metadata"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseField label="ISBN" required error={errors?.isbn}>
          <input
            name="isbn"
            required
            maxLength={32}
            defaultValue={defaultValues?.isbn ?? ""}
            className={textInputClass}
            placeholder="9780743273565"
          />
        </BaseField>

        <BaseField label="Title" required error={errors?.title}>
          <input
            name="title"
            required
            defaultValue={defaultValues?.title ?? ""}
            className={textInputClass}
            placeholder="The Great Gatsby"
          />
        </BaseField>

        <BaseField label="Author" required error={errors?.author}>
          <input
            name="author"
            required
            defaultValue={defaultValues?.author ?? ""}
            className={textInputClass}
            placeholder="F. Scott Fitzgerald"
          />
        </BaseField>

        <BaseField label="Publisher" required error={errors?.publisher}>
          <input
            name="publisher"
            required
            defaultValue={defaultValues?.publisher ?? ""}
            className={textInputClass}
            placeholder="Charles Scribner's Sons"
          />
        </BaseField>

        <BaseField
          label="Publication year"
          required
          error={errors?.publicationYear}
        >
          <input
            name="publicationYear"
            type="number"
            min={1800}
            max={3000}
            required
            defaultValue={defaultValues?.publicationYear ?? ""}
            className={textInputClass}
            placeholder="1925"
          />
        </BaseField>

        <BaseField
          label="Genre"
          required
          error={errors?.genre}
          hint="Choose an existing genre or type a new one."
        >
          <>
            <input
              name="genre"
              list={genreListId}
              required
              defaultValue={defaultValues?.genre ?? ""}
              className={textInputClass}
              placeholder="Classics"
            />
            {normalizedGenreOptions.length ? (
              <datalist id={genreListId}>
                {normalizedGenreOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            ) : null}
          </>
        </BaseField>

        <BaseField
          label="Language"
          required
          error={errors?.language}
          hint="Pick from the list or enter a new language."
        >
          <>
            <input
              name="language"
              list={languageListId}
              required
              defaultValue={defaultValues?.language ?? ""}
              className={textInputClass}
              placeholder="English"
            />
            {normalizedLanguageOptions.length ? (
              <datalist id={languageListId}>
                {normalizedLanguageOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            ) : null}
          </>
        </BaseField>
      </div>
    </SectionShell>
  );
};

export const BookDescriptionSection = ({
  defaultValue,
  generatingDescription = false,
  disabled = false,
  errors,
  onGenerateDescription,
}: BookDescriptionSectionProps) => {
  return (
    <SectionShell
      title="Description"
      description="Add a short summary for catalog browsing and quiz-generation context."
      badge="Summary"
      actions={
        <button
          type="button"
          onClick={onGenerateDescription}
          disabled={disabled || generatingDescription}
          className={cn(
            "rounded-xl border-2 px-4 py-2 text-sm font-black text-white shadow transition disabled:cursor-not-allowed disabled:opacity-60",
            generatingDescription
              ? "border-purple-400 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"
              : "border-indigo-300 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600",
          )}
        >
          {generatingDescription ? "✨ Generating..." : "🤖 Generate with AI"}
        </button>
      }
    >
      <BaseField
        label="Catalog description"
        error={errors?.description}
        hint="Keep it short and age-appropriate. You can refine the AI result before saving."
      >
        <textarea
          name="description"
          rows={4}
          defaultValue={defaultValue ?? ""}
          className={cn(textInputClass, "min-h-[120px] resize-y")}
          placeholder="Quick summary for librarians, students, and AI quiz prompts."
        />
      </BaseField>
    </SectionShell>
  );
};

export const BookAvailabilitySection = ({
  selectedAccessLevels,
  onToggleAccessLevel,
  disabled = false,
  errors,
}: BookAvailabilitySectionProps) => {
  const selectedLabels = ACCESS_LEVEL_OPTIONS.filter((option) =>
    selectedAccessLevels.has(option.value),
  ).map((option) => option.label);

  return (
    <SectionShell
      title="Availability"
      description="Choose which readers can access this book. Leave all access levels empty to keep the title in draft."
      badge="Access"
      tone="highlight"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACCESS_LEVEL_OPTIONS.map((option) => {
            const selected = selectedAccessLevels.has(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                  selected
                    ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-950 shadow-[0_12px_30px_rgba(217,70,239,0.14)]"
                    : "border-indigo-100 bg-white/80 text-indigo-900 hover:border-indigo-200 hover:bg-indigo-50/70",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleAccessLevel(option.value)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
                />
                <span className="space-y-1">
                  <span className="block font-bold">{option.label}</span>
                  <span className="block text-xs font-medium text-indigo-600">
                    {selected
                      ? "Included in current audience access"
                      : "Not currently selected"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <Alert variant="info" title="Visibility summary">
          {selectedLabels.length > 0 ? (
            <span>Visible to: {selectedLabels.join(", ")}.</span>
          ) : (
            <span>Draft only — no audience access selected yet.</span>
          )}
        </Alert>

        <FieldError message={errors?.accessLevels} />
      </div>
    </SectionShell>
  );
};

export const BookFileSection = ({
  mode,
  inputName = "pdfFile",
  acceptedTypes,
  required = false,
  disabled = false,
  currentFileName,
  helperText,
  warningText,
  onFileChange,
  detectedFormat,
  pageCount,
  detectionState = "idle",
  detectionMessage,
  errors,
}: BookFileSectionProps) => {
  const isEditMode = mode === "edit";

  return (
    <SectionShell
      title={isEditMode ? "Replace book file" : "Book file"}
      description={
        isEditMode
          ? "Upload a new file only if you want to replace the current title source. Replacement files trigger regeneration of derived reading assets."
          : "Upload the main reading file first. The detected format determines how the book is processed after upload."
      }
      badge="File"
      tone={isEditMode ? "warning" : "default"}
    >
      <div className="space-y-4">
        {isEditMode && currentFileName ? (
          <Alert variant="warning" title="Current file">
            {currentFileName}
          </Alert>
        ) : null}

        {warningText ? (
          <Alert variant="warning" title="Processing impact">
            {warningText}
          </Alert>
        ) : null}

        <BaseField
          label={isEditMode ? "Replacement file" : "Book file"}
          required={required}
          error={errors?.bookFile}
          hint={
            helperText ?? "Supported formats: PDF, EPUB, MOBI, AZW, and AZW3."
          }
        >
          <input
            name={inputName}
            type="file"
            accept={acceptedTypes}
            required={required}
            disabled={disabled}
            onChange={onFileChange}
            className={bookFileInputClass}
          />
        </BaseField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/80 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-indigo-700">
              Detected format
            </p>
            <div className="mt-3">
              {detectedFormat ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
                    getFormatColor(detectedFormat),
                  )}
                >
                  {getFormatName(detectedFormat)}
                </span>
              ) : (
                <p className="text-sm font-medium text-indigo-500">
                  Select a file to analyze its format.
                </p>
              )}
            </div>
            {detectionMessage ? (
              <p className="mt-3 text-xs font-medium text-indigo-600">
                {detectionMessage}
              </p>
            ) : null}
            {detectionState === "working" ? (
              <p className="mt-3 text-xs font-semibold text-indigo-500">
                Analyzing file…
              </p>
            ) : null}
            {detectionState === "error" && detectionMessage ? (
              <p className="mt-3 text-xs font-semibold text-rose-600">
                {detectionMessage}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/80 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-indigo-700">
              Page count
            </p>
            <p className="mt-3 text-lg font-black text-indigo-950">
              {pageCount ? `${pageCount} pages` : "Pending detection"}
            </p>
            <p className="mt-2 text-xs font-medium text-indigo-500">
              PDFs can usually be analyzed immediately. EPUB and MOBI-family
              files may resolve page counts after processing.
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
};

export const BookCoverSection = ({
  mode,
  inputName = "coverFile",
  required = false,
  disabled = false,
  currentFileName,
  currentCoverUrl,
  helperText,
  errors,
}: BookCoverSectionProps) => {
  const isEditMode = mode === "edit";

  return (
    <SectionShell
      title={isEditMode ? "Replace cover image" : "Cover image"}
      description={
        isEditMode
          ? "Update the cover independently from the main book file."
          : "Upload a cover image students will see in the library and reader."
      }
      badge="Cover"
      tone="highlight"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <BaseField
          label={isEditMode ? "Replacement cover" : "Cover image"}
          required={required}
          error={errors?.coverFile}
          hint={
            helperText ?? "Accepted formats depend on browser image support."
          }
        >
          <input
            name={inputName}
            type="file"
            accept="image/*"
            required={required}
            disabled={disabled}
            className={coverFileInputClass}
          />
        </BaseField>

        <div className="rounded-2xl border border-dashed border-sky-200 bg-white/80 p-4">
          <p className="text-sm font-black uppercase tracking-wide text-sky-800">
            Current cover
          </p>
          {currentCoverUrl ? (
            <div className="mt-3 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-sky-100 bg-sky-50">
                <img
                  src={currentCoverUrl}
                  alt={
                    currentFileName ? `${currentFileName} cover` : "Book cover"
                  }
                  className="h-40 w-full object-cover"
                />
              </div>
              {currentFileName ? (
                <p className="text-xs font-semibold text-sky-700">
                  {currentFileName}
                </p>
              ) : null}
            </div>
          ) : currentFileName ? (
            <p className="mt-3 text-xs font-semibold text-sky-700">
              {currentFileName}
            </p>
          ) : (
            <p className="mt-3 text-sm font-medium text-indigo-500">
              No current cover preview available.
            </p>
          )}
        </div>
      </div>
    </SectionShell>
  );
};

const stageStatusAppearance: Record<
  ProcessingStageState,
  {
    dot: string;
    ring: string;
    label: string;
  }
> = {
  pending: {
    dot: "bg-slate-200",
    ring: "border-slate-200 bg-white",
    label: "Pending",
  },
  active: {
    dot: "bg-indigo-500",
    ring: "border-indigo-200 bg-indigo-50",
    label: "In progress",
  },
  complete: {
    dot: "bg-emerald-500",
    ring: "border-emerald-200 bg-emerald-50",
    label: "Done",
  },
  error: {
    dot: "bg-rose-500",
    ring: "border-rose-200 bg-rose-50",
    label: "Needs attention",
  },
};

export const BookProcessingStatus = ({
  stages,
  title = "Processing status",
  summary,
  className,
}: BookProcessingStatusProps) => {
  if (!stages.length) {
    return null;
  }

  return (
    <SectionShell
      title={title}
      description="Track the book pipeline from validation to reader readiness."
      badge="Status"
      tone="highlight"
      className={className}
    >
      <div className="space-y-4">
        {summary ? <Alert variant="info">{summary}</Alert> : null}

        <ol className="space-y-3">
          {stages.map((stage) => {
            const appearance = stageStatusAppearance[stage.state];
            return (
              <li
                key={stage.key}
                className={cn(
                  "flex items-start gap-4 rounded-2xl border p-4",
                  appearance.ring,
                )}
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white bg-white shadow-sm">
                  <span
                    className={cn("h-3 w-3 rounded-full", appearance.dot)}
                  />
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-black text-indigo-950">
                      {stage.label}
                    </p>
                    <span className="inline-flex w-fit rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-indigo-700">
                      {appearance.label}
                    </span>
                  </div>

                  {stage.description ? (
                    <p className="text-xs font-medium leading-relaxed text-indigo-700/80">
                      {stage.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </SectionShell>
  );
};

export const BookFormActions = ({
  isBusy = false,
  submitLabel,
  busyLabel = "Saving…",
  cancelLabel = "Cancel",
  onCancel,
  className,
}: BookFormActionsProps) => {
  return (
    <div
      className={cn(
        "sticky bottom-0 flex flex-wrap gap-3 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_-10px_35px_rgba(99,102,241,0.10)] backdrop-blur",
        className,
      )}
    >
      <button
        type="submit"
        disabled={isBusy}
        className="btn-3d btn-squish flex-1 rounded-2xl border-4 border-pink-300 bg-gradient-to-r from-pink-500 to-fuchsia-600 px-8 py-4 text-lg font-black text-white shadow-xl transition hover:from-pink-600 hover:to-fuchsia-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-400/60 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
      >
        {isBusy ? busyLabel : submitLabel}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={isBusy}
        className="rounded-2xl border-4 border-indigo-200 bg-white px-6 py-4 text-base font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cancelLabel}
      </button>
    </div>
  );
};

export const buildDefaultProcessingStages = (
  activeKey?: ProcessingStageKey | null,
  errorKey?: ProcessingStageKey | null,
  processDescription?: string,
): ProcessingStage[] => {
  const ordered: Array<{
    key: ProcessingStageKey;
    label: string;
    description?: string;
  }> = [
    {
      key: "validate",
      label: "Validate inputs",
      description:
        "Check metadata, supported formats, and any locally detected file details.",
    },
    {
      key: "uploadBook",
      label: "Upload book file",
      description: "Store the main reading file in object storage.",
    },
    {
      key: "uploadCover",
      label: "Upload cover image",
      description:
        "Store the selected cover art for use in the catalog and reader.",
    },
    {
      key: "saveMetadata",
      label: "Save metadata",
      description:
        "Persist bibliographic details, access levels, and file URLs.",
    },
    {
      key: "processContent",
      label: "Process content",
      description:
        processDescription ??
        "Extract text, convert format-specific assets, or render pages for reading.",
    },
    {
      key: "ready",
      label: "Ready",
      description:
        "The title is available for reading once background processing is complete.",
    },
  ];

  const activeIndex = activeKey
    ? ordered.findIndex((stage) => stage.key === activeKey)
    : -1;
  const errorIndex = errorKey
    ? ordered.findIndex((stage) => stage.key === errorKey)
    : -1;

  return ordered.map((stage, index) => {
    let state: ProcessingStageState = "pending";

    if (errorIndex === index) {
      state = "error";
    } else if (activeIndex === index) {
      state = "active";
    } else if (
      activeIndex > -1 &&
      index < activeIndex &&
      (errorIndex === -1 || index < errorIndex)
    ) {
      state = "complete";
    }

    if (!activeKey && !errorKey && index === ordered.length - 1) {
      state = "pending";
    }

    return {
      ...stage,
      state,
    };
  });
};
