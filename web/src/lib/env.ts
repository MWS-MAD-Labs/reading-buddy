/**
 * Runtime environment configuration
 * This module provides a way to access environment variables at runtime,
 * which is necessary for Docker deployments where env vars are injected at container start.
 */

// Server-side: Always use process.env directly (works at runtime)
export function getServerEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
    NEXT_PUBLIC_RAG_API_URL: process.env.NEXT_PUBLIC_RAG_API_URL || '',
  };
}

// Client-side: Use a global variable injected by the server
declare global {
  interface Window {
    __ENV__?: {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      NEXT_PUBLIC_APP_URL: string;
      NEXT_PUBLIC_RAG_API_URL: string;
    };
  }
}

export function getClientEnv() {
  // In browser, use the injected env vars
  if (typeof window !== 'undefined' && window.__ENV__) {
    return window.__ENV__;
  }

  // Fallback to process.env (build-time values)
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
    NEXT_PUBLIC_RAG_API_URL: process.env.NEXT_PUBLIC_RAG_API_URL || '',
  };
}

// Universal function that works on both server and client
export function getEnv() {
  return typeof window === 'undefined' ? getServerEnv() : getClientEnv();
}
