"use client";

import { useState, useRef } from "react";
import { bulkUploadUsers } from "@/app/(dashboard)/dashboard/admin/actions";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";
import { Alert, Button, Card, Label } from "@/components/ui";

type BulkUploadModalProps = {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export const BulkUploadModal = ({
  onClose,
  onSuccess,
  onError,
}: BulkUploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: boolean;
    created: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type !== "text/csv" &&
        !selectedFile.name.endsWith(".csv")
      ) {
        onError("Please upload a CSV file.");
        return;
      }
      setFile(selectedFile);
      setUploadResults(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      onError("Please select a CSV file to upload.");
      return;
    }

    setIsSubmitting(true);
    setUploadResults(null);

    try {
      const text = await file.text();
      // Parse CSV text into rows
      const rows = text.split("\n").slice(1); // Skip header
      const users = rows
        .filter((row: any) => row.trim())
        .map((row: any) => {
          const [email, password, fullName, role, accessLevel] = row
            .split(",")
            .map((s: any) => s.trim());
          return {
            email,
            password,
            fullName,
            role: role as "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN",
            accessLevel,
          };
        });
      const result = await bulkUploadUsers(users);
      setUploadResults(result);

      if (result.failed === 0) {
        onSuccess(`Successfully created/updated ${result.created} user(s)!`);
      } else {
        onError(
          `Processed ${result.created} user(s) successfully, but ${result.failed} failed. Check details below.`,
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to process CSV file.";
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = `email,password,full_name,role,access_level
student1@school.com,password123,John Doe,STUDENT,LOWER_ELEMENTARY
teacher1@school.com,password123,Jane Smith,TEACHER,
librarian1@school.com,password123,Bob Johnson,LIBRARIAN,
student2@school.com,password123,Alice Williams,STUDENT,UPPER_ELEMENTARY
admin1@school.com,password123,Admin User,ADMIN,`;

    const blob = new Blob([sampleData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#eadfda] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eadfda] bg-[#fffaf4] px-6 py-4">
          <h2 className="heading-font text-2xl font-bold text-[#241718]">
            Bulk Upload Users
          </h2>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="min-h-10 px-3"
            aria-label="Close"
            icon={<XMarkIcon className="h-5 w-5" />}
          >
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Instructions */}
          <Alert variant="info" title="Instructions">
            <ul className="space-y-1 text-xs font-semibold">
              <li>• Download the sample CSV template below</li>
              <li>
                • Fill in user information (email, password, full_name, role,
                access_level)
              </li>
              <li>• Roles: STUDENT, TEACHER, LIBRARIAN, ADMIN</li>
              <li>
                • Access levels (for students only): KINDERGARTEN,
                LOWER_ELEMENTARY, UPPER_ELEMENTARY, JUNIOR_HIGH, TEACHERS_STAFF
              </li>
              <li>
                • Leave access_level empty for staff roles (they get full
                access)
              </li>
              <li>• Upload the completed CSV file</li>
            </ul>
          </Alert>

          {/* Download Sample Button */}
          <Button
            type="button"
            onClick={downloadSampleCSV}
            variant="neutral"
            fullWidth
            icon={<ArrowDownTrayIcon className="h-5 w-5" />}
          >
            Download Sample CSV Template
          </Button>

          {/* File Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Upload CSV File</Label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#eadfda] bg-[#fffaf4] px-6 py-8 text-sm font-bold text-[#7E1518] transition hover:border-[#D6A13A] hover:bg-[#FBF2DF]"
                >
                  <DocumentArrowUpIcon className="h-8 w-8" />
                  <span>{file ? file.name : "Click to select CSV file"}</span>
                </button>
              </div>
            </div>

            {/* Upload Results */}
            {uploadResults && (
              <Card variant="frosted" padding="snug" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#486142]">
                      Success: {uploadResults.success} user(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#B94A4E]">
                      Failed: {uploadResults.failed} user(s)
                    </span>
                  </div>
                </div>

                {uploadResults.errors.length > 0 && (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[#B94A4E]/25 bg-white p-3">
                    <p className="mb-2 text-xs font-black uppercase text-[#B94A4E]">
                      Error Details:
                    </p>
                    {uploadResults.errors.map((error, idx) => (
                      <p
                        key={idx}
                        className="text-xs font-medium text-[#B94A4E]"
                      >
                        • {error.email}: {error.error}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                variant="neutral"
                className="flex-1"
              >
                {uploadResults ? "Close" : "Cancel"}
              </Button>
              {!uploadResults && (
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={!file}
                  className="flex-1"
                >
                  Upload and Process
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
