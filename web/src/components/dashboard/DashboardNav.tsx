"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type UserRole = "ADMIN" | "LIBRARIAN" | "TEACHER" | "STUDENT";

type NavLink = {
  href: string;
  label: string;
  tone: "burgundy" | "sky" | "gold" | "rose" | "sage" | "navy";
  roles: UserRole[]; // Which roles can see this link
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

type DashboardNavProps = {
  userRole?: UserRole | null;
};

const toneClasses: Record<NavLink["tone"], { active: string; idle: string }> = {
  burgundy: {
    active: "bg-[#7E1518] text-white border-[#7E1518]",
    idle: "bg-[#F5E7E8] text-[#7E1518] border-[#7E1518]/10 hover:bg-[#eed6d8]",
  },
  sky: {
    active: "bg-[#1F2A44] text-white border-[#1F2A44]",
    idle: "bg-[#EFF8FE] text-[#25638e] border-[#B8DDF8]/55 hover:bg-[#dff1fc]",
  },
  gold: {
    active: "bg-[#D6A13A] text-[#241718] border-[#D6A13A]",
    idle: "bg-[#FBF2DF] text-[#7a5311] border-[#D6A13A]/25 hover:bg-[#f6e6c4]",
  },
  rose: {
    active: "bg-[#B94A4E] text-white border-[#B94A4E]",
    idle: "bg-[#F8EAEB] text-[#B94A4E] border-[#B94A4E]/15 hover:bg-[#f1d9db]",
  },
  sage: {
    active: "bg-[#6F8B6A] text-white border-[#6F8B6A]",
    idle: "bg-[#EDF3EB] text-[#486142] border-[#6F8B6A]/20 hover:bg-[#dfead9]",
  },
  navy: {
    active: "bg-[#1F2A44] text-white border-[#1F2A44]",
    idle: "bg-[#E9EDF6] text-[#1F2A44] border-[#1F2A44]/15 hover:bg-[#d9e0ef]",
  },
};

export const DashboardNav = ({ userRole }: DashboardNavProps) => {
  const pathname = usePathname();

  // Filter links based on user role
  const visibleLinks = navLinks.filter((link) => {
    if (!userRole) return false;
    return link.roles.includes(userRole);
  });

  return (
    <nav className="hidden gap-2 lg:flex">
      {visibleLinks.map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              heading-font btn-squish focus-ring
              min-h-[44px]
              rounded-full border px-5 py-2.5 text-sm font-bold transition-all
              ${isActive ? toneClasses[link.tone].active : toneClasses[link.tone].idle}
            `}
          >
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
