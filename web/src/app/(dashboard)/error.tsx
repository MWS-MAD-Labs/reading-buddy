'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard error:', error);
    }

    // TODO: Log to error tracking service (Sentry, LogRocket, etc.)
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white shadow-lg rounded-lg p-8 border border-red-200">
          {/* Error Icon */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Dashboard Error
          </h2>

          <p className="text-center text-gray-600 mb-6">
            An error occurred in the Server Components render. Please screenshot this screen and contact your admin.
          </p>

          {/* Error Details (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6">
              <details className="bg-gray-100 rounded p-4 border border-gray-300">
                <summary className="cursor-pointer font-semibold text-sm text-gray-700 mb-2">
                  Technical Details (Development)
                </summary>
                <div className="mt-3 space-y-2">
                  {error.message && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Error Message:</p>
                      <p className="text-xs font-mono text-red-600 break-all mt-1">
                        {error.message}
                      </p>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Stack Trace:</p>
                      <pre className="text-xs font-mono text-gray-700 overflow-auto mt-1 max-h-40">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {error.digest && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Error Digest:</p>
                      <p className="text-xs font-mono text-gray-700 mt-1">
                        {error.digest}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Error ID (always show) */}
          {error.digest && (
            <div className="mb-6 p-4 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Error ID (for support):
              </p>
              <code className="text-sm bg-white px-3 py-2 rounded border block break-all">
                {error.digest}
              </code>
              <p className="text-xs text-gray-500 mt-2">
                📸 Please include this ID when reporting the issue
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>

            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go to Dashboard
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded border border-gray-300 transition-colors"
            >
              Go to Home
            </button>
          </div>

          {/* Support Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              If this problem persists, please contact your system administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
