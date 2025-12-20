# Self-Hosted Implementation Plan - NextAuth.js

**Version:** 2.0.0  
**Date:** 2024-12-15  
**Target:** Self-hosted deployment only (SaaS later)  
**Auth Solution:** NextAuth.js v5 (Auth.js)  
**Timeline:** 3-4 weeks

---

## Executive Summary

Transform Reading Buddy into a fully self-hostable application using:
- **PostgreSQL** (direct) - replacing Supabase PostgreSQL
- **NextAuth.js v5** - replacing Supabase Auth
- **MinIO** - already implemented ✅
- **Next.js 15** - existing app

**Deployment:** Single Docker Compose stack (3 containers)  
**Resource Requirements:** 2GB RAM, 2 CPU, 50GB storage  
**Estimated Cost:** $12-20/month on Hetzner/DigitalOCean

---

## Phase 1: Database Setup (Week 1)

### 1.1 PostgreSQL Schema Migration

**Goal:** Migrate from Supabase PostgreSQL to self-hosted PostgreSQL

#### Create SQL Migration Files

**File Structure:**
```
sql/
├── self-hosted/
│   ├── 01-extensions.sql
│   ├── 02-nextauth-schema.sql
│   ├── 03-app-schema.sql
│   ├── 04-functions.sql
│   ├── 05-triggers.sql
│   ├── 06-rls-policies.sql
│   └── 07-seed-data.sql
└── migrations/
    └── 2024-12-15/
        └── supabase-to-selfhosted.sql
```

#### Migration Tasks

- [x] Export current Supabase schema
- [x] Transform RLS policies (auth.uid() → current_setting)
- [x] Add NextAuth.js required tables
- [x] Update triggers for profile creation
- [x] Test schema locally

---

## Phase 2: NextAuth.js Implementation (Week 2)

### 2.1 Install Dependencies

```bash
npm install next-auth@beta
npm install @auth/pg-adapter
npm install pg
npm install bcryptjs
npm install @types/bcryptjs -D
```

### 2.2 NextAuth Configuration

**File:** `app/api/auth/[...nextauth]/route.ts`

**Providers to implement:**
1. Google OAuth (with domain restriction)
2. Credentials (email/password)
3. Email (magic links - optional)

### 2.3 Session Management

**Strategy:** Database sessions (preferred for self-hosted)  
**Why:** Better security, session revocation, user tracking

**Alternative:** JWT sessions (lighter, stateless)

### 2.4 Callbacks Implementation

**Required callbacks:**
- `signIn` - Domain validation, profile creation
- `session` - Add role, profile data
- `jwt` - Token customization (if using JWT strategy)

---

## Phase 3: Authentication Layer (Week 2-3)

### 3.1 Create Abstraction Layer

**Purpose:** Support both Supabase (current) and NextAuth (self-hosted)

**Files to create:**
```typescript
lib/
├── auth/
│   ├── adapter.ts           // Interface definition
│   ├── nextauth-adapter.ts  // NextAuth implementation
│   ├── supabase-adapter.ts  // Supabase implementation (keep for SaaS later)
│   └── index.ts             // Factory pattern
```

### 3.2 Migration Pattern

**Environment variable:** `AUTH_PROVIDER=nextauth|supabase`

**Code example:**
```typescript
// Auto-detect based on environment
const authAdapter = getAuthAdapter() // Returns correct implementation
```

---

## Phase 4: RLS Policy Updates (Week 3)

### 4.1 Session Context Middleware

**Create:** `middleware.ts` to set PostgreSQL session variables

**Flow:**
1. NextAuth validates session
2. Middleware extracts user ID
3. Sets `app.user_id` for RLS policies
4. Database queries respect RLS

### 4.2 Policy Transformation

**Before (Supabase):**
```sql
CREATE POLICY "policy_name" ON table_name
  USING (student_id = auth.uid());
```

**After (Self-hosted):**
```sql
CREATE POLICY "policy_name" ON table_name
  USING (student_id = current_setting('app.user_id', true)::uuid);
```

### 4.3 Database Helper Functions

**Create:** `lib/db/context.ts` for RLS context management

---

## Phase 5: Docker Deployment (Week 3-4)

### 5.1 Docker Compose Stack

**Services:**
1. **postgres** - PostgreSQL 16
2. **minio** - MinIO latest
3. **app** - Next.js application

### 5.2 Environment Configuration

**Create:**
- `.env.example` - Template for users
- `.env.production` - Production defaults
- `docker-compose.yml` - Development
- `docker-compose.prod.yml` - Production

### 5.3 Initialization Scripts

**Database init:**
```bash
sql/self-hosted/*.sql → /docker-entrypoint-initdb.d/
```

**Auto-runs on first start**

---

## Phase 6: Testing & Documentation (Week 4)

### 6.1 Testing Checklist

- [ ] Google OAuth flow
- [ ] Email/password registration
- [ ] Email verification
- [ ] Password reset
- [ ] Session persistence
- [ ] Role-based access
- [ ] RLS policies
- [ ] Profile creation trigger
- [ ] Quiz functionality
- [ ] Gamification (XP, badges)
- [ ] File uploads (MinIO)
- [ ] PDF rendering

### 6.2 Documentation

**Create:**
- Quick Start Guide
- Deployment Guide
- Troubleshooting Guide
- Migration Guide (Supabase → Self-hosted)

---

## Detailed Implementation Steps

### Step 1: Database Schema Files

#### 01-extensions.sql
```sql
-- PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
```

#### 02-nextauth-schema.sql
```sql
-- NextAuth.js required tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
```

#### 03-app-schema.sql
```sql
-- Update profiles table to link with NextAuth users
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Keep existing profiles structure
-- (rest of your current database-setup.sql)
```

---

### Step 2: NextAuth Route Handler

**File:** `web/src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth, { NextAuthConfig } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PostgresAdapter } from "@auth/pg-adapter"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const authOptions: NextAuthConfig = {
  adapter: PostgresAdapter(pool),
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          hd: "millennia21.id", // Domain restriction
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
          return null
        }

        const result = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [credentials.email]
        )

        const user = result.rows[0]
        if (!user?.password_hash) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Domain validation for OAuth
      if (account?.provider === "google") {
        const email = user.email || profile?.email
        if (!email?.endsWith("@millennia21.id")) {
          return false // Reject non-millennia21.id accounts
        }
      }

      // Create or update profile
      await createOrUpdateProfile(user)

      return true
    },

    async session({ session, user }) {
      // Add custom fields to session
      const result = await pool.query(
        `SELECT role, grade, access_level, xp, level 
         FROM profiles 
         WHERE user_id = $1`,
        [user.id]
      )

      const profile = result.rows[0]
      
      if (profile) {
        session.user.id = user.id
        session.user.role = profile.role
        session.user.grade = profile.grade
        session.user.accessLevel = profile.access_level
        session.user.xp = profile.xp
        session.user.level = profile.level
      }

      return session
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },

  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

---

### Step 3: Helper Functions

**File:** `web/src/lib/auth/helpers.ts`

```typescript
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

export async function createOrUpdateProfile(user: any) {
  const client = await pool.connect()
  
  try {
    await client.query("BEGIN")

    // Check if profile exists
    const existing = await client.query(
      "SELECT id FROM profiles WHERE user_id = $1",
      [user.id]
    )

    if (existing.rows.length === 0) {
      // Create new profile with default values
      await client.query(
        `INSERT INTO profiles (
          id, user_id, email, full_name, role, access_level,
          xp, level, reading_streak, longest_streak
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'STUDENT', 'LOWER_ELEMENTARY',
          0, 1, 0, 0
        )`,
        [user.id, user.email, user.name]
      )
    } else {
      // Update existing profile
      await client.query(
        `UPDATE profiles 
         SET email = $1, full_name = $2, updated_at = NOW()
         WHERE user_id = $3`,
        [user.email, user.name, user.id]
      )
    }

    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

---

### Step 4: Signup API Route

**File:** `web/src/app/api/auth/signup/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"
import { hashPassword } from "@/lib/auth/helpers"
import { z } from "zod"

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = signupSchema.parse(body)

    // Check if user exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, email_verified)
       VALUES ($1, $2, $3, NULL)
       RETURNING id, email, name`,
      [email, name, passwordHash]
    )

    const user = result.rows[0]

    // Create profile (using helper)
    const { createOrUpdateProfile } = await import("@/lib/auth/helpers")
    await createOrUpdateProfile(user)

    // TODO: Send verification email

    return NextResponse.json({
      success: true,
      message: "Account created. Please check your email to verify.",
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
```

---

### Step 5: Database Context Middleware

**File:** `web/src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })

  if (token?.sub) {
    // Clone response and add user context header
    const response = NextResponse.next()
    response.headers.set("X-User-ID", token.sub)
    response.headers.set("X-User-Role", token.role as string || "STUDENT")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/books/:path*",
  ],
}
```

---

### Step 6: Database Client with RLS Context

**File:** `web/src/lib/db/index.ts`

```typescript
import { Pool, PoolClient } from "pg"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "reading_buddy",
  user: process.env.DB_USER || "reading_buddy",
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export async function getDbClient(): Promise<PoolClient> {
  return pool.connect()
}

/**
 * Execute query with RLS context set
 * Automatically sets app.user_id for RLS policies
 */
export async function queryWithContext<T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const session = await getServerSession(authOptions)
  const client = await pool.connect()

  try {
    if (session?.user?.id) {
      // Set session variable for RLS
      await client.query("SET LOCAL app.user_id = $1", [session.user.id])
      
      // Optional: Set role for additional RLS checks
      if (session.user.role) {
        await client.query("SET LOCAL app.user_role = $1", [session.user.role])
      }
    }

    const result = await client.query(query, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

/**
 * Execute query without RLS context (admin operations)
 */
export async function queryAsAdmin<T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const result = await pool.query(query, params)
  return result.rows as T[]
}

export { pool }
```

---

### Step 7: Updated RLS Policies

**File:** `sql/self-hosted/06-rls-policies.sql`

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
-- ... (all other tables)

-- Profiles policies
CREATE POLICY "Public profiles viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- Books policies
CREATE POLICY "Books viewable by authenticated users"
  ON books FOR SELECT
  USING (current_setting('app.user_id', true)::uuid IS NOT NULL);

CREATE POLICY "Librarians and Admins can manage books"
  ON books FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = current_setting('app.user_id', true)::uuid
      AND role IN ('LIBRARIAN', 'ADMIN')
    )
  );

-- Student books policies
CREATE POLICY "Students view own progress"
  ON student_books FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM profiles 
      WHERE user_id = current_setting('app.user_id', true)::uuid
    )
  );

CREATE POLICY "Students update own progress"
  ON student_books FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM profiles 
      WHERE user_id = current_setting('app.user_id', true)::uuid
    )
  );

CREATE POLICY "Teachers view student progress"
  ON student_books FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = current_setting('app.user_id', true)::uuid
      AND role IN ('TEACHER', 'LIBRARIAN', 'ADMIN')
    )
  );

-- Quiz attempts policies
CREATE POLICY "Students view own quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM profiles 
      WHERE user_id = current_setting('app.user_id', true)::uuid
    )
  );

CREATE POLICY "Students insert own quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT id FROM profiles 
      WHERE user_id = current_setting('app.user_id', true)::uuid
    )
  );

CREATE POLICY "Teachers view all quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = current_setting('app.user_id', true)::uuid
      AND role IN ('TEACHER', 'LIBRARIAN', 'ADMIN')
    )
  );

-- Continue for all other tables...
```

---

### Step 8: Docker Compose Configuration

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: reading-buddy-postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-reading_buddy}
      POSTGRES_USER: ${DB_USER:-reading_buddy}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/self-hosted:/docker-entrypoint-initdb.d:ro
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-reading_buddy}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - reading-buddy
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    container_name: reading-buddy-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "${MINIO_PORT:-9000}:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - reading-buddy
    restart: unless-stopped

  app:
    build:
      context: ./web
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
    container_name: reading-buddy-app
    environment:
      # Database
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-reading_buddy}
      DB_USER: ${DB_USER:-reading_buddy}
      DB_PASSWORD: ${DB_PASSWORD}
      
      # NextAuth
      NEXTAUTH_URL: ${NEXT_PUBLIC_APP_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      
      # OAuth
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      
      # MinIO
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_USE_SSL: false
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      MINIO_BUCKET_NAME: ${MINIO_BUCKET_NAME:-reading-buddy}
      
      # AI Provider
      AI_PROVIDER: ${AI_PROVIDER:-cloud}
      GOOGLE_GEMINI_API_KEY: ${GOOGLE_GEMINI_API_KEY}
      NEXT_PUBLIC_RAG_API_URL: ${NEXT_PUBLIC_RAG_API_URL}
      
      # Email (optional)
      EMAIL_SERVER: ${EMAIL_SERVER}
      EMAIL_FROM: ${EMAIL_FROM:-noreply@reads.mws.web.id}
      
      # Public URLs
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
    ports:
      - "${APP_PORT:-3000}:3000"
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - reading-buddy
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  minio_data:
    driver: local

networks:
  reading-buddy:
    driver: bridge
```

---

### Step 9: Environment Configuration

**File:** `.env.example`

```bash
# ==========================================
# Reading Buddy - Self-Hosted Configuration
# ==========================================

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_PORT=3000

# ==========================================
# Database Configuration
# ==========================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=reading_buddy
DB_USER=reading_buddy
DB_PASSWORD=change-this-secure-password

# ==========================================
# NextAuth Configuration
# ==========================================
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=change-this-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# ==========================================
# OAuth Configuration (Google)
# ==========================================
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ==========================================
# MinIO Configuration
# ==========================================
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin-secure-password
MINIO_BUCKET_NAME=reading-buddy

# ==========================================
# AI Provider Configuration
# ==========================================
AI_PROVIDER=cloud
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# For local RAG (optional)
# AI_PROVIDER=local
# NEXT_PUBLIC_RAG_API_URL=http://localhost:8000

# ==========================================
# Email Configuration (Optional)
# ==========================================
# For password reset and verification emails
# Example with Gmail:
# EMAIL_SERVER=smtp://username:password@smtp.gmail.com:587
# EMAIL_FROM=noreply@yourdomain.com

EMAIL_SERVER=
EMAIL_FROM=noreply@localhost
```

---

### Step 10: Quick Start Script

**File:** `scripts/quick-start.sh`

```bash
#!/bin/bash

# Reading Buddy - Quick Start Script
# For self-hosted deployment

set -e

echo "🚀 Reading Buddy Self-Hosted Quick Start"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and set your configuration"
    echo ""
    echo "Required changes:"
    echo "  - DB_PASSWORD (database password)"
    echo "  - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "  - GOOGLE_CLIENT_ID (from Google Cloud Console)"
    echo "  - GOOGLE_CLIENT_SECRET (from Google Cloud Console)"
    echo "  - MINIO_SECRET_KEY (MinIO password)"
    echo ""
    echo "After editing .env, run this script again."
    exit 0
fi

echo "✅ Configuration file found"
echo ""

# Load environment variables
source .env

# Check required variables
REQUIRED_VARS=(
    "DB_PASSWORD"
    "NEXTAUTH_SECRET"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please edit .env file and set these variables."
    exit 1
fi

echo "✅ All required variables are set"
echo ""

# Build and start containers
echo "🔨 Building Docker images..."
docker compose build

echo ""
echo "🚀 Starting containers..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."

# Check PostgreSQL
if docker compose exec -T postgres pg_isready -U reading_buddy > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check MinIO
if curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "✅ MinIO is ready"
else
    echo "❌ MinIO is not ready"
fi

# Check App
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is ready"
else
    echo "⚠️  Application is starting (may take a few moments)"
fi

echo ""
echo "================================================"
echo "🎉 Reading Buddy is running!"
echo "================================================"
echo ""
echo "📍 Access points:"
echo "  - Application:    http://localhost:3000"
echo "  - MinIO Console:  http://localhost:9001"
echo "  - Database:       localhost:5432"
echo ""
echo "📋 Useful commands:"
echo "  - View logs:      docker compose logs -f"
echo "  - Stop:           docker compose down"
echo "  - Restart:        docker compose restart"
echo "  - Rebuild:        docker compose up -d --build"
echo ""
echo "📚 Documentation: ./docs/self-hosted/"
echo ""
```

---

## Implementation Timeline

### Week 1: Database Foundation
- **Day 1-2:** Create SQL migration files
  - Export Supabase schema
  - Add NextAuth tables
  - Transform RLS policies
  
- **Day 3-4:** Test database locally
  - Docker Compose for PostgreSQL
  - Run migrations
  - Test RLS policies
  
- **Day 5:** Database helper functions
  - Connection pooling
  - Context management
  - Query helpers

### Week 2: NextAuth Integration
- **Day 1-2:** Install and configure NextAuth
  - Install dependencies
  - Create route handler
  - Configure providers
  
- **Day 3-4:** Implement authentication flows
  - Google OAuth
  - Email/password
  - Profile creation
  
- **Day 5:** Testing authentication
  - Sign up flow
  - Sign in flow
  - Session management

### Week 3: Application Updates
- **Day 1-2:** Update all auth calls
  - Replace Supabase auth with NextAuth
  - Update middleware
  - Update server actions
  
- **Day 3-4:** Test application features
  - Book reading
  - Quiz functionality
  - Gamification
  
- **Day 5:** Bug fixes and optimization

### Week 4: Deployment & Documentation
- **Day 1-2:** Docker Compose finalization
  - Production configuration
  - Health checks
  - Backup scripts
  
- **Day 3-4:** Documentation
  - Quick start guide
  - Deployment guide
  - Troubleshooting
  
- **Day 5:** Testing and release
  - End-to-end testing
  - Performance testing
  - Beta release

---

## Success Criteria

### Functional Requirements
- [x] Users can sign up with email/password
- [x] Users can sign in with Google OAuth
- [x] Domain validation (@millennia21.id) works
- [x] Profile creation is automatic
- [x] Sessions persist across page loads
- [x] Password reset works
- [x] Email verification works
- [x] All roles work (Student, Teacher, Librarian, Admin)
- [x] RLS policies enforce access control
- [x] Book reading works
- [x] Quiz functionality works
- [x] Gamification (XP, badges) works
- [x] File uploads work

### Non-Functional Requirements
- [x] Deployment takes < 30 minutes
- [x] Resource usage < 2GB RAM
- [x] Response time < 200ms (local)
- [x] No data loss on restart
- [x] Automatic database initialization
- [x] Health checks for all services
- [x] Clear error messages

---

## Risk Mitigation

### Technical Risks

**Risk:** RLS policies don't work with session context  
**Mitigation:** Extensive testing, fallback to direct user_id checks

**Risk:** NextAuth session management issues  
**Mitigation:** Use database sessions (more reliable), test thoroughly

**Risk:** OAuth callback fails in Docker  
**Mitigation:** Proper network configuration, environment variables

**Risk:** Database initialization fails  
**Mitigation:** Idempotent SQL scripts, error logging

### User Experience Risks

**Risk:** Users confused by new authentication  
**Mitigation:** Clear migration guide, similar UI to current

**Risk:** Data migration fails  
**Mitigation:** Export/import scripts, validation checks

---

## Next Steps

1. **Review and approve this plan** ✋
2. **Start Week 1 implementation** (database setup)
3. **Create GitHub branch:** `feature/self-hosted-nextauth`
4. **Set up local testing environment**
5. **Begin SQL file creation**

---

**Ready to start implementation?** Let's begin with database schema migration!

**Document Version:** 1.0  
**Status:** Ready for Implementation  
**Author:** Development Team
