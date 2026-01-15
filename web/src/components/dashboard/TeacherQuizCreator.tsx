"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    previewQuizAsTeacher,
    saveAndAssignTeacherQuiz,
    getBookDetailsForQuiz,
} from "@/app/(dashboard)/dashboard/teacher/actions";
import { Sparkles, BookOpen, Loader2, CheckCircle2, ChevronRight, RefreshCw, X } from "lucide-react";

type BookInfo = {
    id: number;
    title: string;
    pageCount: number | null;
    hasExtractedText: boolean;
};

type QuizQuestion = {
    question: string;
    options: string[];
    answerIndex: number;
    explanation?: string;
};

type QuizPayload = {
    title?: string;
    description?: string;
    questions: QuizQuestion[];
};

type TeacherQuizCreatorProps = {
    classId: number;
    bookId: number;
    bookTitle: string;
    onQuizCreated?: () => void;
    onCancel?: () => void;
};

export const TeacherQuizCreator = ({
    classId,
    bookId,
    bookTitle,
    onQuizCreated,
    onCancel,
}: TeacherQuizCreatorProps) => {
    const router = useRouter();
    const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Quiz form state
    const [quizType, setQuizType] = useState<"classroom" | "checkpoint">(
        "classroom"
    );
    const [usePageRange, setUsePageRange] = useState(false);
    const [pageRangeStart, setPageRangeStart] = useState(1);
    const [pageRangeEnd, setPageRangeEnd] = useState(10);
    const [checkpointPage, setCheckpointPage] = useState(10);
    const [questionCount, setQuestionCount] = useState(5);

    // Preview state
    const [previewData, setPreviewData] = useState<QuizPayload | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    useEffect(() => {
        const loadBookInfo = async () => {
            try {
                const info = await getBookDetailsForQuiz(bookId);
                if (info) {
                    setBookInfo(info);
                    if (info.pageCount) {
                        setPageRangeEnd(Math.min(10, info.pageCount));
                        setCheckpointPage(Math.min(10, info.pageCount));
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load book info");
            } finally {
                setLoading(false);
            }
        };
        loadBookInfo();
    }, [bookId]);

    const handlePreview = async () => {
        setGenerating(true);
        setError(null);

        try {
            const result = await previewQuizAsTeacher({
                classId,
                bookId,
                quizType,
                pageRangeStart: usePageRange ? pageRangeStart : undefined,
                pageRangeEnd: usePageRange ? pageRangeEnd : undefined,
                checkpointPage: quizType === "checkpoint" ? checkpointPage : undefined,
                questionCount,
            });

            setPreviewData(result.quiz);
            setIsPreviewMode(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate quiz preview");
        } finally {
            setGenerating(false);
        }
    };

    const handleConfirm = async () => {
        if (!previewData) return;
        setSaving(true);
        setError(null);

        try {
            await saveAndAssignTeacherQuiz({
                classId,
                bookId,
                quizType,
                pageRangeStart: usePageRange ? pageRangeStart : undefined,
                pageRangeEnd: usePageRange ? pageRangeEnd : undefined,
                checkpointPage: quizType === "checkpoint" ? checkpointPage : undefined,
                quizPayload: previewData,
            });
            setSuccess(true);
            router.refresh();
            if (onQuizCreated) {
                onQuizCreated();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save quiz");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-6 text-center animate-in zoom-in duration-300">
                <div className="mb-2 text-4xl">✨</div>
                <p className="text-lg font-bold text-green-700">Quiz Created!</p>
                <p className="text-sm text-green-600">
                    The quiz has been automatically assigned to your class.
                </p>
            </div>
        );
    }

    // Preview Phase UI
    if (isPreviewMode && previewData) {
        return (
            <div className="space-y-4 rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-xl animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                            <Sparkles className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-indigo-900">Preview Quiz Questions</h3>
                            <p className="text-sm text-indigo-600">Review the AI-generated content</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsPreviewMode(false)}
                        className="rounded-full p-2 hover:bg-gray-100"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {error && (
                    <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-600">
                        ⚠️ {error}
                    </div>
                )}

                <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    {previewData.questions.map((q, idx) => (
                        <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                            <p className="mb-3 font-bold text-gray-900">
                                {idx + 1}. {q.question}
                            </p>
                            <div className="grid gap-2">
                                {q.options.map((opt, optIdx) => (
                                    <div
                                        key={optIdx}
                                        className={`rounded-lg border px-3 py-2 text-sm ${optIdx === q.answerIndex
                                                ? "border-green-300 bg-green-50 text-green-800 font-semibold"
                                                : "border-gray-200 bg-white text-gray-600"
                                            }`}
                                    >
                                        {opt} {optIdx === q.answerIndex && "✓"}
                                    </div>
                                ))}
                            </div>
                            {q.explanation && (
                                <p className="mt-3 text-xs italic text-gray-500 bg-white p-2 rounded-lg border border-gray-100">
                                    <span className="font-bold">Explanation:</span> {q.explanation}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handlePreview}
                        disabled={generating || saving}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50"
                    >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Regenerate
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={generating || saving}
                        className="flex-[2] rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:from-indigo-700 hover:to-purple-700"
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Confirm & Assign to Class
                            </span>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Configuration Phase UI
    return (
        <div className="space-y-4 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-5 shadow-inner animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-indigo-900">Create AI Quiz</h3>
                    <p className="text-sm text-indigo-600">
                        <BookOpen className="mr-1 inline h-4 w-4" />
                        {bookTitle}
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-600">
                    ⚠️ {error}
                </div>
            )}

            {!bookInfo?.hasExtractedText && (
                <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-700">
                        ⚠️ Text not extracted from this book
                    </p>
                    <p className="text-xs text-amber-600">
                        The quiz will be generated using the book description. For better quizzes, ask a librarian to extract text.
                    </p>
                </div>
            )}

            {/* Quiz Type Selection */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => setQuizType("classroom")}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${quizType === "classroom"
                            ? "border-blue-400 bg-blue-100 text-blue-900 shadow-md"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                >
                    🏫 Classroom Quiz
                </button>
                <button
                    type="button"
                    onClick={() => setQuizType("checkpoint")}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${quizType === "checkpoint"
                            ? "border-green-400 bg-green-100 text-green-900 shadow-md"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                >
                    🎯 Checkpoint Quiz
                </button>
            </div>

            {/* Question Count */}
            <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                    Number of Questions
                </label>
                <input
                    type="number"
                    min={3}
                    max={15}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none"
                />
            </div>

            {/* Checkpoint Page */}
            {quizType === "checkpoint" && (
                <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">
                        Checkpoint Page
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={bookInfo?.pageCount || 100}
                        value={checkpointPage}
                        onChange={(e) => setCheckpointPage(Number(e.target.value))}
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Students must complete this quiz before reading past page {checkpointPage}
                    </p>
                </div>
            )}

            {/* Page Range Toggle */}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id={`pageRange-${bookId}`}
                    checked={usePageRange}
                    onChange={(e) => setUsePageRange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-500 focus:ring-purple-400"
                />
                <label
                    htmlFor={`pageRange-${bookId}`}
                    className="text-sm font-medium text-gray-700"
                >
                    Use specific page range
                </label>
            </div>

            {/* Page Range Inputs */}
            {usePageRange && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-700">
                            From Page
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={bookInfo?.pageCount || 100}
                            value={pageRangeStart}
                            onChange={(e) => setPageRangeStart(Number(e.target.value))}
                            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-700">
                            To Page
                        </label>
                        <input
                            type="number"
                            min={pageRangeStart}
                            max={bookInfo?.pageCount || 100}
                            value={pageRangeEnd}
                            onChange={(e) => setPageRangeEnd(Number(e.target.value))}
                            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-purple-400 focus:outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    onClick={handlePreview}
                    disabled={generating}
                    className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${generating
                            ? "border-purple-400 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"
                            : "border-purple-400 bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_8px_20px_rgba(168,85,247,0.35)] hover:shadow-[0_12px_25px_rgba(168,85,247,0.45)]"
                        }`}
                >
                    {generating ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Generating...</span>
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <span>Next</span>
                            <ChevronRight className="h-4 w-4" />
                        </span>
                    )}
                </button>
            </div>
            <p className="text-center text-[10px] uppercase tracking-widest text-indigo-400 font-bold">
                Step 1 of 2: Configure & Generate
            </p>
        </div>
    );
};
