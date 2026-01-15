"use client";

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
  roles: UserRole[]; // Which roles can see this link
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
    href: "/dashboard/journal",
    label: "Journal",
    emoji: "📓",
    color: "from-amber-400 to-yellow-400",
    textColor: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
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

type DashboardNavProps = {
  userRole?: UserRole | null;
};

export const DashboardNav = ({ userRole }: DashboardNavProps) => {
  const pathname = usePathname();

  // Filter links based on user role
  const visibleLinks = navLinks.filter((link: any) => {
    if (!userRole) return false;
    return link.roles.includes(userRole);
  });

  return (
    <nav className="hidden gap-3 lg:flex">
      {visibleLinks.map((link: any) => {
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              btn-squish hover-bounce
              min-h-[44px]
              rounded-2xl border-4 px-6 py-3 text-base font-black transition-all
              ${isActive
                ? `bg-gradient-to-r ${link.color} text-white shadow-lg ${link.borderColor}`
                : `${link.bgColor} ${link.textColor} ${link.borderColor} hover:scale-105 hover:shadow-md`
              }
            `}
          >
            <span className="flex items-center gap-2">
              <span className="text-xl">{link.emoji}</span>
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
