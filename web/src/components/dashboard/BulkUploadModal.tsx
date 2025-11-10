'use client';

import { useState, useRef } from 'react';
import { bulkUploadUsers } from '@/app/(dashboard)/dashboard/admin/actions';
import { XMarkIcon, ArrowDownTrayIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

type BulkUploadModalProps = {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export const BulkUploadModal = ({ onClose, onSuccess, onError }: BulkUploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        onError('Please upload a CSV file.');
        return;
      }
      setFile(selectedFile);
      setUploadResults(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      onError('Please select a CSV file to upload.');
      return;
    }

    setIsSubmitting(true);
    setUploadResults(null);

    try {
      const text = await file.text();
      const result = await bulkUploadUsers(text);
      setUploadResults(result);

      if (result.failed === 0) {
        onSuccess(`Successfully created/updated ${result.success} user(s)!`);
      } else {
        onError(`Processed ${result.success} user(s) successfully, but ${result.failed} failed. Check details below.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to process CSV file.';
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

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border-4 border-violet-300 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4">
          <h2 className="text-2xl font-black text-violet-900">Bulk Upload Users</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-violet-500 transition-colors hover:bg-violet-100 hover:text-violet-700"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Instructions */}
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-2 text-sm font-black text-blue-900">📋 Instructions</h3>
            <ul className="space-y-1 text-xs font-semibold text-blue-700">
              <li>• Download the sample CSV template below</li>
              <li>• Fill in user information (email, password, full_name, role, access_level)</li>
              <li>• Roles: STUDENT, TEACHER, LIBRARIAN, ADMIN</li>
              <li>• Access levels (for students only): KINDERGARTEN, LOWER_ELEMENTARY, UPPER_ELEMENTARY, JUNIOR_HIGH, TEACHERS_STAFF</li>
              <li>• Leave access_level empty for staff roles (they get full access)</li>
              <li>• Upload the completed CSV file</li>
            </ul>
          </div>

          {/* Download Sample Button */}
          <button
            onClick={downloadSampleCSV}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-indigo-300 bg-indigo-100 px-6 py-3 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-200 active:scale-95"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download Sample CSV Template
          </button>

          {/* File Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-violet-900">Upload CSV File</label>
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 px-6 py-8 text-sm font-bold text-violet-700 transition-all hover:border-violet-400 hover:bg-violet-100"
                >
                  <DocumentArrowUpIcon className="h-8 w-8" />
                  <span>{file ? file.name : 'Click to select CSV file'}</span>
                </button>
              </div>
            </div>

            {/* Upload Results */}
            {uploadResults && (
              <div className="space-y-3 rounded-2xl border-2 border-violet-200 bg-violet-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <span className="text-sm font-bold text-emerald-700">
                      Success: {uploadResults.success} user(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">❌</span>
                    <span className="text-sm font-bold text-rose-700">Failed: {uploadResults.failed} user(s)</span>
                  </div>
                </div>

                {uploadResults.errors.length > 0 && (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-rose-200 bg-white p-3">
                    <p className="mb-2 text-xs font-black uppercase text-rose-700">Error Details:</p>
                    {uploadResults.errors.map((error, idx) => (
                      <p key={idx} className="text-xs font-medium text-rose-600">
                        • {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 rounded-full border-2 border-violet-300 bg-white px-6 py-3 text-sm font-bold text-violet-700 transition-all hover:bg-violet-50 active:scale-95 disabled:opacity-50"
              >
                {uploadResults ? 'Close' : 'Cancel'}
              </button>
              {!uploadResults && (
                <button
                  type="submit"
                  disabled={isSubmitting || !file}
                  className="flex-1 rounded-full border-2 border-blue-400 bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-600 hover:shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload and Process'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
