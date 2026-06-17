"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

type UserRole = "ADMIN" | "LIBRARIAN" | "TEACHER" | "STUDENT";

type NavLink = {
  href: string;
  label: string;
  tone: "burgundy" | "sky" | "gold" | "rose" | "sage" | "navy";
  roles: UserRole[];
};

const navLinks: NavLink[] = [
  {
    href: "/dashboard",
    label: "Overview",
    tone: "burgundy",
    roles: ["ADMIN", "LIBRARIAN", "TEACHER", "STUDENT"],
  },
  {
    href: "/dashboard/library",
    label: "Library",
    tone: "sky",
    roles: ["ADMIN", "LIBRARIAN", "TEACHER", "STUDENT"],
  },
  {
    href: "/dashboard/student",
    label: "Student",
    tone: "gold",
    roles: ["ADMIN", "STUDENT"],
  },
  {
    href: "/dashboard/journal",
    label: "Journal",
    tone: "gold",
    roles: ["ADMIN", "STUDENT"],
  },
  {
    href: "/dashboard/teacher",
    label: "Teacher",
    tone: "rose",
    roles: ["ADMIN", "TEACHER"],
  },

  {
    href: "/dashboard/librarian",
    label: "Librarian",
    tone: "sage",
    roles: ["ADMIN", "LIBRARIAN"],
  },
  {
    href: "/dashboard/admin",
    label: "Admin",
    tone: "navy",
    roles: ["ADMIN"],
  },
];

type MobileNavProps = {
  userRole?: UserRole | null;
};

const toneClasses: Record<NavLink["tone"], { active: string; idle: string }> = {
  burgundy: {
    active: "bg-[#7E1518] text-white border-[#7E1518]",
    idle: "bg-[#F5E7E8] text-[#7E1518] border-[#7E1518]/10",
  },
  sky: {
    active: "bg-[#1F2A44] text-white border-[#1F2A44]",
    idle: "bg-[#EFF8FE] text-[#25638e] border-[#B8DDF8]/55",
  },
  gold: {
    active: "bg-[#D6A13A] text-[#241718] border-[#D6A13A]",
    idle: "bg-[#FBF2DF] text-[#7a5311] border-[#D6A13A]/25",
  },
  rose: {
    active: "bg-[#B94A4E] text-white border-[#B94A4E]",
    idle: "bg-[#F8EAEB] text-[#B94A4E] border-[#B94A4E]/15",
  },
  sage: {
    active: "bg-[#6F8B6A] text-white border-[#6F8B6A]",
    idle: "bg-[#EDF3EB] text-[#486142] border-[#6F8B6A]/20",
  },
  navy: {
    active: "bg-[#1F2A44] text-white border-[#1F2A44]",
    idle: "bg-[#E9EDF6] text-[#1F2A44] border-[#1F2A44]/15",
  },
};

export const MobileNav = ({ userRole }: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Track when component is mounted for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Filter links based on user role
  const visibleLinks = navLinks.filter((link) => {
    if (!userRole) return false;
    return link.roles.includes(userRole);
  });

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Portal content for drawer and backdrop
  const drawerContent = (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-[9999] h-full w-80 max-w-[85vw] transform border-l border-[#eadfda] bg-white/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#eadfda] bg-[#fffaf4] p-4">
            <h2 className="heading-font text-xl font-bold text-[#7E1518]">
              Menu
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="focus-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#7E1518]/15 bg-[#F5E7E8] p-2 text-[#7E1518] transition-all active:scale-95"
              aria-label="Close menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-3">
              {visibleLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`
                        heading-font flex min-h-[56px] items-center rounded-2xl border px-5 py-3 text-base font-bold transition-all active:scale-95
                        ${isActive ? toneClasses[link.tone].active : toneClasses[link.tone].idle}
                      `}
                    >
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="focus-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#7E1518]/15 bg-[#F5E7E8] p-2 text-[#7E1518] transition-all active:scale-95 lg:hidden"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Portal the drawer and backdrop to document.body to escape stacking context */}
      {mounted && createPortal(drawerContent, document.body)}
    </>
  );
};
