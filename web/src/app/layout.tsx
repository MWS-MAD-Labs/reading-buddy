import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { getServerEnv } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reading Buddy",
  description:
    "Hybrid Supabase + MinIO e-library for K-12 schools with AI quiz generation.",
};

// Force dynamic rendering for all pages (no static generation at build time)
// This is required because the app uses Supabase authentication and dynamic data
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get runtime environment variables on the server
  const env = getServerEnv();

  // Check if this is staging environment
  const isStaging = env.NEXT_PUBLIC_APP_URL?.includes("staging");

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__ = ${JSON.stringify(env)};`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {isStaging && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 py-3 text-center font-bold text-sm sticky top-0 z-50 shadow-lg border-b-4 border-orange-600 animate-pulse">
            🚀 STAGING ENVIRONMENT - CI/CD Pipeline Active - Commit:{" "}
            {process.env.GIT_COMMIT_SHA?.substring(0, 7) || "latest"} 🚀
          </div>
        )}
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
