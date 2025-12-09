"use client";

import { useState } from "react";
import type {
  Badge,
  BadgeType,
  BadgeTier,
  BadgeCategory,
  BadgeCriteria,
} from "@/types/database";
import {
  createBadge,
  updateBadge,
  deleteBadge,
  toggleBadgeActive,
  createBookCompletionBadge,
  uploadBadgeIcon,
  generateBadgeIconWithAI,
  type BadgeWithBook,
  type CreateBadgeInput,
  type UpdateBadgeInput,
} from "@/app/(dashboard)/dashboard/admin/badge-actions";

// ============================================================================
// Constants
// ============================================================================

const BADGE_TYPES: { value: BadgeType; label: string }[] = [
  { value: "book_completion", label: "Book Completion (General)" },
  {
    value: "book_completion_specific",
    label: "Book Completion (Specific Book)",
  },
  { value: "quiz_mastery", label: "Quiz Mastery" },
  { value: "streak", label: "Reading Streak" },
  { value: "checkpoint", label: "Checkpoint" },
  { value: "custom", label: "Custom" },
];

const BADGE_TIERS: { value: BadgeTier; label: string; color: string }[] = [
  {
    value: "bronze",
    label: "Bronze",
    color: "bg-amber-100 text-amber-700 border-amber-300",
  },
  {
    value: "silver",
    label: "Silver",
    color: "bg-gray-100 text-gray-700 border-gray-300",
  },
  {
    value: "gold",
    label: "Gold",
    color: "bg-yellow-100 text-yellow-700 border-yellow-400",
  },
  {
    value: "platinum",
    label: "Platinum",
    color: "bg-cyan-100 text-cyan-700 border-cyan-400",
  },
  {
    value: "special",
    label: "Special",
    color: "bg-purple-100 text-purple-700 border-purple-400",
  },
];

const BADGE_CATEGORIES: {
  value: BadgeCategory;
  label: string;
  icon: string;
}[] = [
  { value: "reading", label: "Reading", icon: "📖" },
  { value: "quiz", label: "Quiz", icon: "📝" },
  { value: "streak", label: "Streak", icon: "🔥" },
  { value: "milestone", label: "Milestone", icon: "🏆" },
  { value: "special", label: "Special", icon: "⭐" },
  { value: "general", label: "General", icon: "🎯" },
];

const CRITERIA_TYPES = [
  { value: "books_completed", label: "Books Completed", hasCount: true },
  { value: "pages_read", label: "Pages Read", hasCount: true },
  { value: "quizzes_completed", label: "Quizzes Completed", hasCount: true },
  { value: "reading_streak", label: "Reading Streak (Days)", hasDays: true },
  { value: "quiz_score", label: "Quiz Score Threshold", hasMinScore: true },
  { value: "perfect_quiz", label: "Perfect Quiz Score", hasCount: false },
  {
    value: "book_completion_specific",
    label: "Specific Book Completion",
    hasCount: false,
  },
];

// ============================================================================
// Props
// ============================================================================

export interface UserPermissions {
  role: "ADMIN" | "LIBRARIAN";
  userId: string;
  canCreateAllBadges: boolean;
  canEditSystemBadges: boolean;
  canOnlyCreateBookBadges: boolean;
}

interface BadgeManagerProps {
  initialBadges: BadgeWithBook[];
  books: Array<{ id: number; title: string; author: string }>;
  permissions: UserPermissions;
}

// ============================================================================
// Main Component
// ============================================================================

export function BadgeManager({
  initialBadges,
  books,
  permissions,
}: BadgeManagerProps) {
  const [badges, setBadges] = useState<BadgeWithBook[]>(initialBadges);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeWithBook | null>(null);
  const [filter, setFilter] = useState<
    "all" | "active" | "inactive" | "book-specific"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Helper to check if user can edit a specific badge
  const canEditBadge = (badge: BadgeWithBook): boolean => {
    // Admins can edit all badges
    if (permissions.canEditSystemBadges) return true;

    // Librarians can only edit book-specific badges they created
    if (permissions.canOnlyCreateBookBadges) {
      return (
        badge.badge_type === "book_completion_specific" &&
        badge.created_by === permissions.userId
      );
    }

    return false;
  };

  // Helper to check if user can delete a specific badge
  const canDeleteBadge = (badge: BadgeWithBook): boolean => {
    // No one can delete system badges
    if (!badge.created_by) return false;

    // Admins can delete any custom badge
    if (permissions.canCreateAllBadges) return true;

    // Librarians can only delete book-specific badges they created
    if (permissions.canOnlyCreateBookBadges) {
      return (
        badge.badge_type === "book_completion_specific" &&
        badge.created_by === permissions.userId
      );
    }

    return false;
  };

  // Filter badges
  const filteredBadges = badges.filter((badge) => {
    const matchesSearch =
      badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case "active":
        return badge.is_active;
      case "inactive":
        return !badge.is_active;
      case "book-specific":
        return badge.book_id !== null;
      default:
        return true;
    }
  });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreateBadge = async (input: CreateBadgeInput) => {
    setIsLoading(true);
    try {
      const newBadge = await createBadge(input);
      setBadges((prev) => [...prev, newBadge as BadgeWithBook]);
      setIsCreateModalOpen(false);
      showMessage("success", `Badge "${newBadge.name}" created successfully!`);
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Failed to create badge.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBadge = async (input: UpdateBadgeInput) => {
    setIsLoading(true);
    try {
      const updatedBadge = await updateBadge(input);
      setBadges((prev) =>
        prev.map((b) =>
          b.id === updatedBadge.id ? { ...b, ...updatedBadge } : b,
        ),
      );
      setEditingBadge(null);
      showMessage(
        "success",
        `Badge "${updatedBadge.name}" updated successfully!`,
      );
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Failed to update badge.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBadge = async (badge: BadgeWithBook) => {
    if (
      !confirm(
        `Are you sure you want to delete "${badge.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteBadge(badge.id);
      setBadges((prev) => prev.filter((b) => b.id !== badge.id));
      showMessage("success", `Badge "${badge.name}" deleted successfully!`);
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Failed to delete badge.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (badge: BadgeWithBook) => {
    setIsLoading(true);
    try {
      const updatedBadge = await toggleBadgeActive(badge.id, !badge.is_active);
      setBadges((prev) =>
        prev.map((b) =>
          b.id === updatedBadge.id ? { ...b, ...updatedBadge } : b,
        ),
      );
      showMessage(
        "success",
        `Badge "${badge.name}" ${updatedBadge.is_active ? "activated" : "deactivated"}.`,
      );
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Failed to toggle badge.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getTierStyle = (tier: BadgeTier) => {
    return BADGE_TIERS.find((t) => t.value === tier)?.color || "";
  };

  const getCategoryIcon = (category: BadgeCategory) => {
    return BADGE_CATEGORIES.find((c) => c.value === category)?.icon || "🎯";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-indigo-950">
            Badge Management
          </h2>
          <p className="text-sm text-indigo-500">
            {permissions.canCreateAllBadges
              ? "Create, edit, and manage all badges for students."
              : "Create and manage book-specific completion badges."}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2 font-semibold text-white shadow-lg transition hover:scale-105"
        >
          +{" "}
          {permissions.canOnlyCreateBookBadges
            ? "Create Book Badge"
            : "Create Badge"}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success"
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search badges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-lg border border-indigo-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-lg border border-indigo-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Badges ({badges.length})</option>
          <option value="active">
            Active ({badges.filter((b) => b.is_active).length})
          </option>
          <option value="inactive">
            Inactive ({badges.filter((b) => !b.is_active).length})
          </option>
          <option value="book-specific">
            Book-Specific ({badges.filter((b) => b.book_id).length})
          </option>
        </select>
      </div>

      {/* Badge Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBadges.map((badge) => (
          <div
            key={badge.id}
            className={`relative rounded-2xl border-2 p-4 transition ${
              badge.is_active
                ? "border-indigo-200 bg-white"
                : "border-gray-200 bg-gray-50 opacity-60"
            }`}
          >
            {/* Tier Badge */}
            <div className="absolute -top-2 left-3">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getTierStyle(badge.tier)}`}
              >
                {badge.tier}
              </span>
            </div>

            {/* Active/Inactive indicator */}
            <div className="absolute -top-2 right-3">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  badge.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {badge.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-3 flex items-start gap-3">
              {/* Icon */}
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-2xl">
                {badge.icon_url ? (
                  <img
                    src={badge.icon_url}
                    alt={badge.name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  getCategoryIcon(badge.category)
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-indigo-900">{badge.name}</h3>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {badge.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-600">
                    +{badge.xp_reward} XP
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                    {badge.badge_type.replace(/_/g, " ")}
                  </span>
                </div>
                {badge.book && (
                  <p className="text-xs text-purple-600">
                    📚 {badge.book.title}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              {canEditBadge(badge) && (
                <button
                  onClick={() => setEditingBadge(badge)}
                  className="flex-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                >
                  Edit
                </button>
              )}
              {canEditBadge(badge) && (
                <button
                  onClick={() => handleToggleActive(badge)}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    badge.is_active
                      ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                      : "border-green-200 text-green-600 hover:bg-green-50"
                  }`}
                >
                  {badge.is_active ? "Deactivate" : "Activate"}
                </button>
              )}
              {canDeleteBadge(badge) && (
                <button
                  onClick={() => handleDeleteBadge(badge)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
              {!canEditBadge(badge) && (
                <span className="flex-1 rounded-lg bg-gray-100 px-3 py-1.5 text-center text-xs text-gray-500">
                  View Only
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-indigo-200 p-8 text-center">
          <p className="text-indigo-500">No badges found.</p>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <BadgeFormModal
          title={
            permissions.canOnlyCreateBookBadges
              ? "Create Book Badge"
              : "Create New Badge"
          }
          books={books}
          onSave={handleCreateBadge}
          onClose={() => setIsCreateModalOpen(false)}
          isLoading={isLoading}
          permissions={permissions}
        />
      )}

      {/* Edit Modal */}
      {editingBadge && (
        <BadgeFormModal
          title="Edit Badge"
          badge={editingBadge}
          books={books}
          onSave={(input) =>
            handleUpdateBadge({ id: editingBadge.id, ...input })
          }
          onClose={() => setEditingBadge(null)}
          isLoading={isLoading}
          permissions={permissions}
        />
      )}
    </div>
  );
}

// ============================================================================
// Badge Form Modal Component
// ============================================================================

interface BadgeFormModalProps {
  title: string;
  badge?: BadgeWithBook;
  books: Array<{ id: number; title: string; author: string }>;
  onSave: (input: CreateBadgeInput) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  permissions: UserPermissions;
}

function BadgeFormModal({
  title,
  badge,
  books,
  onSave,
  onClose,
  isLoading,
  permissions,
}: BadgeFormModalProps) {
  // For librarians, default to book_completion_specific
  const defaultBadgeType = permissions.canOnlyCreateBookBadges
    ? "book_completion_specific"
    : badge?.badge_type || "custom";

  const [formData, setFormData] = useState<CreateBadgeInput>({
    name: badge?.name || "",
    description: badge?.description || "",
    badge_type: defaultBadgeType,
    criteria: badge?.criteria || { type: defaultBadgeType },
    tier: badge?.tier || "bronze",
    xp_reward: badge?.xp_reward || 50,
    category: badge?.category || "reading",
    icon_url: badge?.icon_url || "",
    book_id: badge?.book_id || undefined,
  });

  // Filter badge types based on permissions
  const availableBadgeTypes = permissions.canOnlyCreateBookBadges
    ? BADGE_TYPES.filter((t) => t.value === "book_completion_specific")
    : BADGE_TYPES;

  const [criteriaType, setCriteriaType] = useState(
    (badge?.criteria as BadgeCriteria)?.type || "custom",
  );
  const [criteriaCount, setCriteriaCount] = useState(
    (badge?.criteria as BadgeCriteria)?.count || 1,
  );
  const [criteriaDays, setCriteriaDays] = useState(
    (badge?.criteria as BadgeCriteria)?.days || 7,
  );
  const [criteriaMinScore, setCriteriaMinScore] = useState(
    (badge?.criteria as BadgeCriteria)?.minScore || 90,
  );

  // Icon upload state
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle icon file upload
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIcon(true);
    setUploadError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const result = await uploadBadgeIcon(formDataUpload);
      setFormData((prev) => ({ ...prev, icon_url: result.url }));
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload image.",
      );
    } finally {
      setIsUploadingIcon(false);
      // Reset the input so the same file can be selected again
      e.target.value = "";
    }
  };

  // Handle AI icon generation
  const handleGenerateAI = async () => {
    if (!formData.name) {
      setUploadError("Please enter a badge name first.");
      return;
    }

    setIsGeneratingAI(true);
    setUploadError(null);

    try {
      const result = await generateBadgeIconWithAI({
        badgeName: formData.name,
        description: formData.description,
        tier: formData.tier,
        category: formData.category,
      });
      setFormData((prev) => ({ ...prev, icon_url: result.url }));
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to generate image with AI.",
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Build criteria object based on type
    let criteria: BadgeCriteria = { type: criteriaType };
    const selectedCriteriaConfig = CRITERIA_TYPES.find(
      (c) => c.value === criteriaType,
    );

    if (selectedCriteriaConfig?.hasCount) {
      criteria.count = criteriaCount;
    }
    if (selectedCriteriaConfig?.hasDays) {
      criteria.days = criteriaDays;
    }
    if (selectedCriteriaConfig?.hasMinScore) {
      criteria.minScore = criteriaMinScore;
    }
    if (criteriaType === "book_completion_specific" && formData.book_id) {
      criteria.book_id = formData.book_id;
    }

    await onSave({
      ...formData,
      criteria,
    });
  };

  const handleBookChange = (bookId: number | undefined) => {
    setFormData((prev) => ({ ...prev, book_id: bookId }));

    // If selecting a book and type is book_completion_specific, auto-fill name
    if (bookId && formData.badge_type === "book_completion_specific") {
      const book = books.find((b) => b.id === bookId);
      if (book && !formData.name) {
        setFormData((prev) => ({
          ...prev,
          name: `Finished "${book.title}"`,
          description: `Completed reading "${book.title}" by ${book.author}`,
        }));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black text-indigo-950">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Badge Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              rows={2}
            />
          </div>

          {/* Type and Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Badge Type *
              </label>
              <select
                value={formData.badge_type}
                onChange={(e) => {
                  const newType = e.target.value as BadgeType;
                  setFormData((prev) => ({ ...prev, badge_type: newType }));
                  // Update criteria type to match
                  if (newType === "book_completion_specific") {
                    setCriteriaType("book_completion_specific");
                  } else if (newType === "streak") {
                    setCriteriaType("reading_streak");
                  } else if (newType === "quiz_mastery") {
                    setCriteriaType("quizzes_completed");
                  } else if (newType === "book_completion") {
                    setCriteriaType("books_completed");
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              >
                {availableBadgeTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value as BadgeCategory,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              >
                {BADGE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Book Selection (for book-specific badges) */}
          {formData.badge_type === "book_completion_specific" && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Select Book *
              </label>
              <select
                value={formData.book_id || ""}
                onChange={(e) =>
                  handleBookChange(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                required
              >
                <option value="">Select a book...</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title} by {book.author}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Criteria Section */}
          {formData.badge_type !== "book_completion_specific" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Unlock Criteria
              </label>
              <div className="space-y-3">
                <select
                  value={criteriaType}
                  onChange={(e) => setCriteriaType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                >
                  {CRITERIA_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                {CRITERIA_TYPES.find((c) => c.value === criteriaType)
                  ?.hasCount && (
                  <div>
                    <label className="text-xs text-gray-500">
                      Required Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={criteriaCount}
                      onChange={(e) => setCriteriaCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                {CRITERIA_TYPES.find((c) => c.value === criteriaType)
                  ?.hasDays && (
                  <div>
                    <label className="text-xs text-gray-500">
                      Required Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={criteriaDays}
                      onChange={(e) => setCriteriaDays(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                {CRITERIA_TYPES.find((c) => c.value === criteriaType)
                  ?.hasMinScore && (
                  <div>
                    <label className="text-xs text-gray-500">
                      Minimum Score (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={criteriaMinScore}
                      onChange={(e) =>
                        setCriteriaMinScore(Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tier and XP Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Tier
              </label>
              <select
                value={formData.tier}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tier: e.target.value as BadgeTier,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              >
                {BADGE_TIERS.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                XP Reward
              </label>
              <input
                type="number"
                min="0"
                value={formData.xp_reward}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    xp_reward: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Badge Icon */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Badge Icon (optional)
            </label>

            {/* Icon Preview */}
            {formData.icon_url && (
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50">
                  <img
                    src={formData.icon_url}
                    alt="Badge icon preview"
                    className="h-12 w-12 rounded-lg object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, icon_url: "" }))
                  }
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}

            {/* AI Generation Button */}
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={isGeneratingAI || !formData.name}
              className="w-full rounded-lg border-2 border-purple-300 bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3 font-bold text-white transition hover:from-purple-600 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingAI ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating with AI...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  ✨ Generate Icon with AI
                </span>
              )}
            </button>

            {/* Upload Image Section */}
            <div className="space-y-3">
              <div>
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition ${
                    isUploadingIcon
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                    onChange={handleIconUpload}
                    disabled={isUploadingIcon}
                    className="hidden"
                  />
                  {isUploadingIcon ? (
                    <div className="flex items-center gap-2 text-indigo-600">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span className="text-sm font-medium">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mb-2 h-8 w-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-600">
                        Click to upload image
                      </span>
                      <span className="mt-1 text-xs text-gray-400">
                        PNG, JPG, GIF, WebP or SVG (max 2MB)
                      </span>
                    </>
                  )}
                </label>
                {uploadError && (
                  <p className="mt-2 text-sm text-red-500">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {isLoading
                ? "Saving..."
                : badge
                  ? "Update Badge"
                  : "Create Badge"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
