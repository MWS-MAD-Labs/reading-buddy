'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log critical errors
    if (process.env.NODE_ENV === 'development') {
      console.error('CRITICAL ERROR:', error);
    }

    // TODO: Log to error tracking service with high priority
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            padding: '1rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ maxWidth: '32rem', width: '100%' }}>
            <div
              style={{
                backgroundColor: 'white',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                borderRadius: '0.5rem',
                padding: '2rem',
                border: '1px solid #fecaca',
              }}
            >
              {/* Error Icon */}
              <div
                style={{
                  width: '4rem',
                  height: '4rem',
                  margin: '0 auto 1rem',
                  backgroundColor: '#fee2e2',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  style={{ width: '2rem', height: '2rem', color: '#dc2626' }}
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
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  color: '#111827',
                  marginBottom: '0.5rem',
                }}
              >
                Critical Application Error
              </h2>

              <p
                style={{
                  textAlign: 'center',
                  color: '#4b5563',
                  marginBottom: '1.5rem',
                }}
              >
                An error occurred in the Server Components render. Please screenshot this screen and contact your admin.
              </p>

              {/* Error ID */}
              {error.digest && (
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: '#fef3c7',
                    borderRadius: '0.375rem',
                    border: '1px solid #fcd34d',
                    marginBottom: '1.5rem',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Error ID (for support):
                  </p>
                  <code
                    style={{
                      fontSize: '0.875rem',
                      backgroundColor: 'white',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      border: '1px solid #d1d5db',
                      display: 'block',
                      wordBreak: 'break-all',
                    }}
                  >
                    {error.digest}
                  </code>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.5rem',
                    }}
                  >
                    📸 Please include this ID when reporting the issue
                  </p>
                </div>
              )}

              {/* Development Error Details */}
              {process.env.NODE_ENV === 'development' && error.message && (
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.25rem',
                    border: '1px solid #d1d5db',
                    marginBottom: '1.5rem',
                  }}
                >
                  <p style={{ fontSize: '0.75rem', color: '#374151' }}>
                    <strong>Error:</strong> {error.message}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={reset}
                  style={{
                    width: '100%',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontWeight: '600',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = '#1d4ed8')
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = '#2563eb')
                  }
                >
                  Try Again
                </button>

                <button
                  onClick={() => (window.location.href = '/')}
                  style={{
                    width: '100%',
                    backgroundColor: '#e5e7eb',
                    color: '#1f2937',
                    fontWeight: '600',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = '#d1d5db')
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = '#e5e7eb')
                  }
                >
                  Go to Home
                </button>
              </div>

              {/* Support Info */}
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <p
                  style={{
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    color: '#6b7280',
                  }}
                >
                  If this problem persists, please contact your system administrator
                  {error.digest && ` with Error ID: ${error.digest}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
