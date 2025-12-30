import NextAuth, { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Create a dedicated pool for NextAuth adapter
const authPool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5434"),
  database: process.env.DB_NAME || "reading_buddy",
  user: process.env.DB_USER || "reading_buddy",
  password: process.env.DB_PASSWORD,
  max: 20,
  ssl:
    process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export const authOptions: NextAuthConfig = {
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          // Domain restriction for Google Workspace
          hd: "millennia21.id",
        },
      },
    }),

    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const result = await authPool.query(
          "SELECT * FROM users WHERE email = $1",
          [credentials.email],
        );

        const user = result.rows[0];
        if (!user?.password_hash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("=== signIn callback started ===");
      console.log("Provider:", account?.provider);
      console.log("User email:", user.email);

      // Domain validation for OAuth
      if (account?.provider === "google") {
        const email = user.email || profile?.email;
        console.log("Google OAuth - checking domain for:", email);

        if (!email?.endsWith("@millennia21.id")) {
          console.log("Rejected sign-in: email not from millennia21.id domain");
          return false;
        }

        console.log("Domain check passed, creating/updating user...");

        // Create or update user in database for OAuth
        try {
          // Check if user exists
          const existingUser = await authPool.query(
            "SELECT id FROM users WHERE email = $1",
            [user.email],
          );
          console.log(
            "Existing user check:",
            existingUser.rows.length > 0 ? "found" : "not found",
          );

          let userId: string;

          if (existingUser.rows.length === 0) {
            // Create new user
            console.log("Creating new user...");
            const newUser = await authPool.query(
              "INSERT INTO users (email, name, email_verified, image) VALUES ($1, $2, NOW(), $3) RETURNING id",
              [user.email, user.name, user.image],
            );
            userId = newUser.rows[0].id;
            console.log("New user created with ID:", userId);
          } else {
            userId = existingUser.rows[0].id;
            console.log("Using existing user ID:", userId);
          }

          // Check if profile already exists
          const existingProfile = await authPool.query(
            "SELECT id, role FROM profiles WHERE id = $1",
            [userId],
          );

          if (existingProfile.rows.length > 0) {
            // Profile exists - just update name/email, preserve role
            console.log(
              "Profile exists - preserving existing role:",
              existingProfile.rows[0].role,
            );
            await authPool.query(
              "UPDATE profiles SET full_name = $1, updated_at = NOW() WHERE id = $2",
              [user.name, userId],
            );
            console.log("Profile updated (role preserved)");
          } else {
            // New profile - check if this is the first user (make them ADMIN)
            const profileCount = await authPool.query(
              "SELECT COUNT(*) as count FROM profiles",
            );
            const count = parseInt(profileCount.rows[0].count);
            const isFirstUser = count === 0;
            const role = isFirstUser ? "ADMIN" : "STUDENT";
            console.log("Creating NEW profile with role:", role);

            await authPool.query(
              "SELECT create_or_update_profile($1, $2, $3, $4)",
              [userId, user.email, user.name, role],
            );
            console.log("New profile created with role:", role);
          }
        } catch (error) {
          console.error("!!! Error creating/updating user:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          // Don't block sign-in if user creation fails
        }
      }

      return true;
    },

    async session({ session, token }) {
      // Add user ID from token
      if (token?.sub) {
        session.user.id = token.sub;
      }

      // Only fetch profile if we have user email
      if (!token?.email) {
        return session;
      }

      // Fetch profile from database
      try {
        // Get user_id from users table by email
        const userResult = await authPool.query(
          "SELECT id FROM users WHERE email = $1",
          [token.email],
        );

        if (userResult.rows.length === 0) {
          // User doesn't exist in DB yet, return session with defaults
          session.user.role = "STUDENT";
          return session;
        }

        const userId = userResult.rows[0].id;

        // Store user_id in session for RLS context
        session.user.userId = userId;
        console.log("Session callback - setting userId:", userId);

        // Get profile
        const result = await authPool.query(
          `SELECT id, role, grade, access_level, xp, level, full_name
           FROM profiles
           WHERE id = $1`,
          [userId],
        );

        const profile = result.rows[0];

        if (profile) {
          session.user.profileId = profile.id;
          session.user.role = profile.role;
          session.user.grade = profile.grade;
          session.user.accessLevel = profile.access_level;
          session.user.xp = profile.xp;
          session.user.level = profile.level;
          session.user.fullName = profile.full_name;
        } else {
          // Profile doesn't exist yet, set defaults
          session.user.role = "STUDENT";
        }
      } catch (error) {
        console.error("Error fetching profile in session callback:", error);
        // Set safe defaults
        session.user.role = "STUDENT";
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === "development",
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
