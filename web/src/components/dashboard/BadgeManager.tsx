"use client";

import { useState } from "react";
import type {
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
  uploadBadgeIcon,
  generateBadgeIconWithAI,
  type BadgeWithBook,
  type CreateBadgeInput,
  type UpdateBadgeInput,
} from "@/app/(dashboard)/dashboard/admin/badge-actions";
import {
  Alert,
  Badge,
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Select,
} from "@/components/ui";

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
  const filteredBadges = badges.filter((badge: any) => {
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
        prev.map((b: any) =>
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
      setBadges((prev) => prev.filter((b: any) => b.id !== badge.id));
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
        prev.map((b: any) =>
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="heading-font text-2xl font-bold text-[#241718]">
            Badge Management
          </h2>
          <p className="text-sm text-[#5d4b4c]">
            {permissions.canCreateAllBadges
              ? "Create, edit, and manage all badges for students."
              : "Create and manage book-specific completion badges."}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          variant="secondary"
        >
          {permissions.canOnlyCreateBookBadges
            ? "Create Book Badge"
            : "Create Badge"}
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "success" : "error"}>
          {message.text}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Input
          type="text"
          placeholder="Search badges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="max-w-xs"
        >
          <option value="all">All Badges ({badges.length})</option>
          <option value="active">
            Active ({badges.filter((b: any) => b.is_active).length})
          </option>
          <option value="inactive">
            Inactive ({badges.filter((b: any) => !b.is_active).length})
          </option>
          <option value="book-specific">
            Book-Specific ({badges.filter((b: any) => b.book_id).length})
          </option>
        </Select>
      </div>

      {/* Badge Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBadges.map((badge: any) => (
          <Card
            key={badge.id}
            variant="frosted"
            padding="snug"
            className={badge.is_active ? "relative" : "relative opacity-60"}
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
              <Badge variant={badge.is_active ? "lime" : "neutral"} size="sm">
                {badge.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="mt-3 flex items-start gap-3">
              {/* Icon */}
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#EFF8FE] text-2xl">
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
                <h3 className="font-bold text-[#241718]">{badge.name}</h3>
                <p className="text-xs text-[#5d4b4c] line-clamp-2">
                  {badge.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="sky" size="sm">
                    +{badge.xp_reward} XP
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    {badge.badge_type.replace(/_/g, " ")}
                  </Badge>
                </div>
                {badge.book && (
                  <p className="text-xs font-semibold text-[#7E1518]">
                    {badge.book.title}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              {canEditBadge(badge) && (
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditingBadge(badge)}
                >
                  Edit
                </Button>
              )}
              {canEditBadge(badge) && (
                <Button
                  type="button"
                  variant={badge.is_active ? "outline" : "secondary"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleToggleActive(badge)}
                >
                  {badge.is_active ? "Deactivate" : "Activate"}
                </Button>
              )}
              {canDeleteBadge(badge) && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteBadge(badge)}
                >
                  Delete
                </Button>
              )}
              {!canEditBadge(badge) && (
                <Badge variant="neutral" className="flex-1 justify-center">
                  View Only
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <Card variant="frosted" padding="cozy" className="text-center">
          <p className="text-[#5d4b4c]">No badges found.</p>
        </Card>
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
    ? BADGE_TYPES.filter((t: any) => t.value === "book_completion_specific")
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
    const criteria: BadgeCriteria = { type: criteriaType };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[#eadfda] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between border-b border-[#eadfda] pb-4">
          <h2 className="heading-font text-xl font-bold text-[#241718]">
            {title}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label>Badge Name *</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="focus-ring w-full rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-base font-medium text-[#241718] transition focus-visible:border-[#D6A13A]"
              rows={2}
            />
          </div>

          {/* Type and Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Badge Type *</Label>
              <Select
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
              >
                {availableBadgeTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value as BadgeCategory,
                  }))
                }
              >
                {BADGE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Book Selection (for book-specific badges) */}
          {formData.badge_type === "book_completion_specific" && (
            <div>
              <Label>Select Book *</Label>
              <Select
                value={formData.book_id || ""}
                onChange={(e) =>
                  handleBookChange(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                required
              >
                <option value="">Select a book...</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title} by {book.author}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Criteria Section */}
          {formData.badge_type !== "book_completion_specific" && (
            <Card variant="frosted" padding="snug">
              <Label>Unlock Criteria</Label>
              <div className="space-y-3">
                <Select
                  value={criteriaType}
                  onChange={(e) => setCriteriaType(e.target.value)}
                >
                  {CRITERIA_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>

                {CRITERIA_TYPES.find((c) => c.value === criteriaType)
                  ?.hasCount && (
                  <div>
                    <Label className="text-xs">Required Count</Label>
                    <Input
                      type="number"
                      min="1"
                      value={criteriaCount}
                      onChange={(e) => setCriteriaCount(Number(e.target.value))}
                    />
                  </div>
                )}

                {CRITERIA_TYPES.find((c) => c.value === criteriaType)
                  ?.hasDays && (
                  <div>
                    <Label className="text-xs">Required Days</Label>
                    <Input
                      type="number"
                      min="1"
                      value={criteriaDays}
                      onChange={(e) => setCriteriaDays(Number(e.target.value))}
                    />
                  </div>
                )}

                {CRITERIA_TYPES.find((c) => c.value === criteriaType)
                  ?.hasMinScore && (
                  <div>
                    <Label className="text-xs">Minimum Score (%)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={criteriaMinScore}
                      onChange={(e) =>
                        setCriteriaMinScore(Number(e.target.value))
                      }
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Tier and XP Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tier</Label>
              <Select
                value={formData.tier}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tier: e.target.value as BadgeTier,
                  }))
                }
              >
                {BADGE_TIERS.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>XP Reward</Label>
              <Input
                type="number"
                min="0"
                value={formData.xp_reward}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    xp_reward: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          {/* Badge Icon */}
          <div>
            <Label>Badge Icon (optional)</Label>

            {/* Icon Preview */}
            {formData.icon_url && (
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#eadfda] bg-[#EFF8FE]">
                  <img
                    src={formData.icon_url}
                    alt="Badge icon preview"
                    className="h-12 w-12 rounded-lg object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, icon_url: "" }))
                  }
                >
                  Remove
                </Button>
              </div>
            )}

            {/* AI Generation Button */}
            <Button
              type="button"
              onClick={handleGenerateAI}
              loading={isGeneratingAI}
              disabled={!formData.name}
              fullWidth
              variant="secondary"
            >
              Generate Icon with AI
            </Button>

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
                  <FieldError className="mt-2">{uploadError}</FieldError>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="neutral"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} className="flex-1">
              {badge ? "Update Badge" : "Create Badge"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
