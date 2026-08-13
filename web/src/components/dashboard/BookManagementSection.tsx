"use client";

import { useEffect, useState } from "react";
import { BookUploadForm } from "@/components/dashboard/BookUploadForm";
import { BookEditForm } from "@/components/dashboard/BookEditForm";
import {
  BookManager,
  type ManagedBookRecord,
} from "@/components/dashboard/BookManager";

type BookManagementSectionProps = {
  books: ManagedBookRecord[];
  genreOptions: string[];
  languageOptions: string[];
  initialQuizBookId?: number;
};

export const BookManagementSection = ({
  books,
  genreOptions,
  languageOptions,
  initialQuizBookId,
}: BookManagementSectionProps) => {
  const [showUploader, setShowUploader] = useState(false);
  const [editingBook, setEditingBook] = useState<ManagedBookRecord | null>(
    null,
  );
  const closeUploader = () => setShowUploader(false);
  const closeEditor = () => setEditingBook(null);

  useEffect(() => {
    const isModalOpen = showUploader || editingBook !== null;
    if (!isModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showUploader, editingBook]);

  return (
    <div className="relative space-y-6">
      <BookManager
        books={books}
        genreOptions={genreOptions}
        languageOptions={languageOptions}
        onAddBookClick={() => setShowUploader(true)}
        onEditBookClick={(book) => setEditingBook(book)}
        isAddPanelOpen={showUploader}
        initialQuizBookId={initialQuizBookId}
      />
      {showUploader ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241718]/45 px-4 py-8 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/80 bg-white p-1 shadow-[0_35px_120px_rgba(36,23,24,0.22)]"
          >
            <BookUploadForm
              genreOptions={genreOptions}
              languageOptions={languageOptions}
              onCancel={closeUploader}
              onSuccess={closeUploader}
            />
          </div>
        </div>
      ) : null}
      {editingBook ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241718]/45 px-4 py-8 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/80 bg-white p-1 shadow-[0_35px_120px_rgba(36,23,24,0.22)]"
          >
            <BookEditForm
              book={editingBook}
              genreOptions={genreOptions}
              languageOptions={languageOptions}
              onCancel={closeEditor}
              onSuccess={closeEditor}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
