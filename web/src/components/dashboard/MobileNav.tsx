"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

type UserRole = "ADMIN" | "LIBRARIAN" | "TEACHER" | "STUDENT";

type NavLink = {
  href: string;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  roles: UserRole[];
};

const navLinks: NavLink[] = [
  {
    href: "/dashboard",
    label: "Overview",
    emoji: "🏠",
    color: "from-purple-400 to-pink-400",
    textColor: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
    roles: ["ADMIN", "LIBRARIAN", "TEACHER", "STUDENT"],
  },
  {
    href: "/dashboard/library",
    label: "Library",
    emoji: "📚",
    color: "from-blue-400 to-cyan-400",
    textColor: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    roles: ["ADMIN", "LIBRARIAN", "TEACHER", "STUDENT"],
  },
  {
    href: "/dashboard/student",
    label: "Student",
    emoji: "🎒",
    color: "from-yellow-400 to-orange-400",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-300",
    roles: ["ADMIN", "STUDENT"],
  },
  {
    href: "/dashboard/teacher",
    label: "Teacher",
    emoji: "👨‍🏫",
    color: "from-rose-400 to-pink-400",
    textColor: "text-rose-600",
    bgColor: "bg-rose-100",
    borderColor: "border-rose-300",
    roles: ["ADMIN", "TEACHER"],
  },
  {
    href: "/dashboard/librarian",
    label: "Librarian",
    emoji: "👩‍💼",
    color: "from-emerald-400 to-teal-400",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
    roles: ["ADMIN", "LIBRARIAN"],
  },
  {
    href: "/dashboard/admin",
    label: "Admin",
    emoji: "⚙️",
    color: "from-violet-400 to-purple-400",
    textColor: "text-violet-600",
    bgColor: "bg-violet-100",
    borderColor: "border-violet-300",
    roles: ["ADMIN"],
  },
];

type MobileNavProps = {
  userRole?: UserRole | null;
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
  const visibleLinks = navLinks.filter((link: any) => {
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
        className={`fixed right-0 top-0 z-[9999] h-full w-80 max-w-[85vw] transform bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b-4 border-purple-200 bg-white/50 p-4">
            <h2 className="text-xl font-black text-purple-600">📱 Menu</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-4 border-purple-300 bg-purple-100 p-2 text-purple-600 transition-all hover:scale-105 active:scale-95"
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
              {visibleLinks.map((link: any) => {
                const isActive =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`
                        flex min-h-[56px] items-center gap-3 rounded-2xl border-4 px-5 py-3 text-base font-black transition-all active:scale-95
                        ${
                          isActive
                            ? `bg-gradient-to-r ${link.color} text-white shadow-lg ${link.borderColor}`
                            : `${link.bgColor} ${link.textColor} ${link.borderColor} hover:scale-105 hover:shadow-md`
                        }
                      `}
                    >
                      <span className="text-2xl">{link.emoji}</span>
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
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-4 border-purple-300 bg-purple-100 p-2 text-purple-600 transition-all hover:scale-105 active:scale-95 lg:hidden"
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
