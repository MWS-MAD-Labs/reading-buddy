import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireRole, type UserRole } from "@/lib/auth/roleCheck";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT: ${url}`);
  }),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to login when user not authenticated", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    await expect(requireRole(["ADMIN"])).rejects.toThrow("REDIRECT: /login");
  });

  it("should allow access when user has required role", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = {
      id: "user-123",
      email: "admin@example.com",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "ADMIN" },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await requireRole(["ADMIN"]);

    expect(result.user.id).toBe("user-123");
    expect(result.user.email).toBe("admin@example.com");
    expect(result.role).toBe("ADMIN");
  });

  it("should allow access when user has one of multiple allowed roles", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = {
      id: "user-456",
      email: "teacher@example.com",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "TEACHER" },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await requireRole(["ADMIN", "LIBRARIAN", "TEACHER"]);

    expect(result.user.id).toBe("user-456");
    expect(result.role).toBe("TEACHER");
  });

  it("should redirect when user role is not in allowed list", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = {
      id: "user-789",
      email: "student@example.com",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "STUDENT" },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    await expect(requireRole(["ADMIN", "LIBRARIAN"])).rejects.toThrow(
      "REDIRECT: /dashboard?error=unauthorized"
    );
  });

  it("should redirect when profile has no role", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = {
      id: "user-000",
      email: "norole@example.com",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: null },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    await expect(requireRole(["ADMIN"])).rejects.toThrow(
      "REDIRECT: /dashboard?error=unauthorized"
    );
  });

  it("should redirect when profile is not found", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = {
      id: "user-999",
      email: "noprofile@example.com",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    await expect(requireRole(["ADMIN"])).rejects.toThrow(
      "REDIRECT: /dashboard?error=unauthorized"
    );
  });

  it("should handle user without email", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = {
      id: "user-noemail",
      email: undefined,
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "STUDENT" },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await requireRole(["STUDENT"]);

    expect(result.user.id).toBe("user-noemail");
    expect(result.user.email).toBeUndefined();
    expect(result.role).toBe("STUDENT");
  });

  it("should allow ADMIN role", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = { id: "admin-1", email: "admin@test.com" };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "ADMIN" },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await requireRole(["ADMIN"]);
    expect(result.role).toBe("ADMIN");
  });

  it("should allow LIBRARIAN role", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = { id: "lib-1", email: "librarian@test.com" };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "LIBRARIAN" },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await requireRole(["LIBRARIAN"]);
    expect(result.role).toBe("LIBRARIAN");
  });

  it("should allow TEACHER role", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = { id: "teacher-1", email: "teacher@test.com" };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "TEACHER" },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await requireRole(["TEACHER"]);
    expect(result.role).toBe("TEACHER");
  });

  it("should allow STUDENT role", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockUser = { id: "student-1", email: "student@test.com" };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "STUDENT" },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const result = await requireRole(["STUDENT"]);
    expect(result.role).toBe("STUDENT");
  });
});
