import type { Metadata } from "next";
import { Lora, Nunito_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import { getServerEnv } from "@/lib/env";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-quote",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Reading Buddy",
  description:
    "A friendly, self-hosted e-library for K-12 schools with AI quiz generation.",
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
        className={`${plusJakartaSans.variable} ${nunitoSans.variable} ${lora.variable} antialiased`}
      >
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
