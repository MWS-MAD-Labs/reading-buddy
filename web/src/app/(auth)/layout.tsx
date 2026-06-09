import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#fffaf4] via-white to-[#eff8fe] px-4 py-12">
      {children}
    </div>
  );
}
