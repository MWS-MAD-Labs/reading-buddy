import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  BadgeManager,
  type UserPermissions,
} from "@/components/dashboard/BadgeManager";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin or librarian
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["ADMIN", "LIBRARIAN"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Build permissions object based on role
  const isAdmin = profile.role === "ADMIN";
  const isLibrarian = profile.role === "LIBRARIAN";

  const permissions: UserPermissions = {
    role: profile.role as "ADMIN" | "LIBRARIAN",
    userId: user.id,
    canCreateAllBadges: isAdmin,
    canEditSystemBadges: isAdmin,
    canOnlyCreateBookBadges: isLibrarian,
  };

  // Fetch all badges with book info
  const { data: badges, error: badgesError } = await supabaseAdmin
    .from("badges")
    .select("*, book:books(id, title, author)")
    .order("display_order", { ascending: true });

  if (badgesError) {
    console.error("Failed to fetch badges:", badgesError);
  }

  // Debug: Log badges count
  console.log(`[Badge Management] Fetched ${badges?.length ?? 0} badges`);

  // Fetch all books for the dropdown
  const { data: books, error: booksError } = await supabaseAdmin
    .from("books")
    .select("id, title, author")
    .order("title", { ascending: true });

  if (booksError) {
    console.error("Failed to fetch books:", booksError);
  }

  // Header text based on role
  const headerDescription = isAdmin
    ? "Create and manage all badges for students. You can create general badges or book-specific completion badges."
    : "Create book-specific completion badges. Select a book to create a badge that students earn when they finish reading it.";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-[32px] border border-white/60 bg-white/85 p-6 text-indigo-950 shadow-[0_25px_70px_rgba(147,118,255,0.25)]">
        <div className="flex items-center gap-2 text-sm text-indigo-400">
          <Link
            href={isAdmin ? "/dashboard/admin" : "/dashboard/librarian"}
            className="hover:text-indigo-600"
          >
            {isAdmin ? "Admin" : "Librarian"} Dashboard
          </Link>
          <span>/</span>
          <span className="text-indigo-600">Badge Management</span>
        </div>
        <h1 className="mt-2 text-3xl font-black">Badge Management</h1>
        <p className="text-sm text-indigo-500">{headerDescription}</p>
      </header>

      {/* Badge Manager Component */}
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(147,118,255,0.18)]">
        <BadgeManager
          initialBadges={badges ?? []}
          books={books ?? []}
          permissions={permissions}
        />
      </div>
    </div>
  );
}
