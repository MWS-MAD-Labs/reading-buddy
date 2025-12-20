import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
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
        <NextAuthProvider>
          <SupabaseProvider>{children}</SupabaseProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
