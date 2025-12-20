import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      userId?: string; // user_id from users table for RLS context
      profileId?: string;
      role?: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
      grade?: number;
      accessLevel?: string;
      xp?: number;
      level?: number;
      fullName?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
  }
}
