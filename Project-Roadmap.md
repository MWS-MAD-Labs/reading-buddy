# Reading Buddy: Project Roadmap

> **Current Version:** v1.4.0 ✅  
> **Last Updated:** December 7, 2025  
> **Maintainer:** Faisal Nur Hidayat

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Architecture (v1.0.0)](#2-current-architecture-v100)
3. [Completed Development Phases](#3-completed-development-phases-v100)
4. [MVP Success Criteria](#4-mvp-success-criteria---all-met-)
5. [Future Development Roadmap](#5-future-development-roadmap)
6. [Detailed Feature Planning](#6-detailed-feature-planning)
7. [Implementation Timeline](#7-implementation-timeline)
8. [Migration Strategies](#8-migration-strategies)
9. [Technology Evaluation](#9-technology-evaluation)
10. [Contribution Guidelines](#10-contribution-guidelines)

---

## 1. Project Overview

### Goal
A web-based e-library for K-12 students (Reading Buddy) with role-based access for Students, Teachers, Librarians, and Admins. The platform is gamified and features an AI-powered quiz generator.

### Architecture Philosophy
**Hybrid Stack (Option 3):** This project uses a decoupled, hybrid-cloud architecture combining:
- **Managed Backend** (Supabase) for database and authentication - developer-friendly
- **Self-Hosted Storage** (MinIO) for large files - cost-effective and controlled
- **AI Integration** (Google Gemini API) for intelligent features

---

## 2. Current Architecture (v1.0.0)

### Frontend Stack
- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui

### Backend (Database & Auth)
- **Service:** Supabase (Cloud-hosted)
- **SDK:** @supabase/supabase-js
- **Features:** PostgreSQL with Row Level Security (RLS), Authentication with Google OAuth

### Backend (File Storage)
- **Service:** MinIO (Self-hosted on Proxmox)
- **SDK:** minio-js
- **Storage:** Book PDFs, cover images, badge icons

### AI Integration
- **Service:** Google Gemini API
- **SDK:** @google/generative-ai
- **Features:** Quiz generation via Next.js Server Actions

### Key Integrations
- **react-pdf:** PDF rendering in student reader
- **shadcn/ui:** Accessible UI components

---

## 3. Completed Development Phases (v1.0.0)

### ✅ Phase 0: Infrastructure Setup
- MinIO server deployed on Proxmox
- Reverse proxy configured with SSL/HTTPS
- DNS and firewall configured

### ✅ Phase 1: Project Scaffolding & Core Backend
- Supabase project created with complete schema
- Role-Based Access (RLS) policies implemented
- Next.js 15+ project initialized
- Environment configuration completed

### ✅ Phase 2: Authentication & User Roles
- Login, Sign Up, and Password Reset UI
- Google OAuth integration
- Automatic profile creation via SQL triggers
- Route protection middleware

### ✅ Phase 3: Librarian & Book Management
- Librarian dashboard
- Book upload form (PDF + cover image)
- MinIO presigned URL upload workflow
- Library UI for students

### ✅ Phase 4: Student Reader & Gamification
- Student dashboard with assigned books
- PDF reader with react-pdf
- Reading progress tracking (current page)
- Basic achievement/badge system

### ✅ Phase 5: AI Quiz Generation
- AI quiz generation UI
- Gemini API integration
- Quiz storage in Supabase
- Student quiz-taking interface

### ✅ Phase 6: Teacher & Admin Dashboards
- Teacher progress monitoring
- Classroom management UI
- Admin user and role management

### ✅ Phase 7: Enhanced Gamification (v1.4.0)
- Complete XP & Leveling system
- Streak tracking & rewards
- Enhanced badge system with progress tracking
- Gamification UI components (Toasts, Cards)

---

## 4. MVP Success Criteria - All Met! ✅

- ✅ Librarians can upload PDFs and cover images to MinIO
- ✅ Students can log in and read books via react-pdf
- ✅ Teachers can view student reading progress
- ✅ AI quizzes can be generated and taken by students
- ✅ Role-based access control (Student, Teacher, Librarian, Admin)
- ✅ Reading progress tracking
- ✅ Basic gamification with badges

---

## 5. Future Development Roadmap

### Version Release Timeline

| Version | Target | Focus Area | Status |
|---------|--------|------------|--------|
| v1.0.0 | Nov 2025 | MVP Launch | ✅ Complete |
| v1.1.0 | Nov 2025 | MOBI/AZW Format Support | ✅ Complete |
| v1.2.0 | Nov 2025 | Mobile Responsive UI & Fullscreen | ✅ Complete |
| v1.3.0 | Dec 2025 | Polish & Stability | ✅ Complete |
| v1.4.0 | Dec 2025 | Gamification | ✅ Complete |
| v1.5.0 | Q1 2026 | UX & AI Flexibility | 📋 Planned |
| v1.6.0 | Q2 2026 | Content & Competition | 📋 Planned |
| v1.7.0 | Q3 2026 | Additional Formats (CBZ/DOCX) | 📋 Planned |
| v2.0.0 | Q4 2026 | Major Architecture Changes | 💡 Proposed |

---

## 6. Detailed Feature Planning

### 6.1 Storage & Performance Optimizations

#### Image-Only Architecture
**Priority:** Medium | **Target:** v2.0.0

**Current State (v1.0.0):**
- Books stored as both PDF files and rendered page images
- Separate cover image file required
- Dual storage increases MinIO usage

**Proposed Changes:**
- Convert all books to images only (remove PDF storage)
- Auto-use first page image as cover
- ~40-50% storage savings

**Considerations:**
- Loss of text selection/copy functionality
- Robust text extraction required before conversion
- Screen reader accessibility via stored text content
- Migration strategy for existing PDF-based books

**Implementation Notes:**
```sql
-- Schema changes needed
ALTER TABLE books
  ALTER COLUMN pdf_url DROP NOT NULL; -- Make nullable
ALTER TABLE books
  ALTER COLUMN cover_url DROP NOT NULL; -- Derive from page_images_prefix
-- Keep page_text_content JSONB for searchability and accessibility
```

---

#### Multi-Format E-book Support
**Priority:** High | **Status:** ✅ Partially Complete (v1.1.0)

**Supported Formats:**
- ✅ PDF (v1.0.0 - original format)
- ✅ EPUB (v1.0.0 - most common e-book format)
- ✅ MOBI (v1.1.0 - Mobipocket/Kindle format)
- ✅ AZW (v1.1.0 - Amazon Kindle format)
- ✅ AZW3 (v1.1.0 - Kindle Format 8)
- ⏳ CBZ/CBR (Comic book formats) - Planned for v1.5.0
- ⏳ DOCX (Word documents) - Planned for v1.5.0
- ⏳ ODT (OpenDocument Text) - Planned for v1.5.0

**Technical Approach (v1.1.0 Implementation):**
1. ✅ **Calibre-based conversion pipeline** - Uses existing Calibre installation
2. ✅ **Unified format handling** - All formats → PDF → Images
3. ✅ **Magic number detection** - Validates file signatures (BOOKMOBI at offset 60)
4. ✅ **Automatic conversion** - `/api/convert-mobi` endpoint with progress tracking
5. ✅ **Text extraction** - Enables AI quiz generation for all formats
6. ✅ **MinIO storage** - Original files + converted PDFs stored in MinIO

**Current Pipeline:**
```
EPUB/MOBI/AZW → Calibre → PDF → pdf2pic → Page Images → Text Extraction → AI Quizzes
```

**Benefits Achieved:**
- ✅ Broader content compatibility (5 formats supported)
- ✅ Easier for librarians (no manual conversion required)
- ✅ Reuses 95% of existing infrastructure
- ✅ No Docker changes needed

**Remaining Work (v1.5.0):**
- ⏳ CBZ/CBR comic book format support
- ⏳ DOCX Word document support
- ⏳ ODT OpenDocument support

---

### 6.2 Self-Hosted Infrastructure

#### Full Self-Hosted Deployment Option
**Priority:** High | **Target:** v1.7.0 - v2.0.0 | **Status:** Partially Complete

**Vision:** Complete on-premises deployment with zero external dependencies for organizations requiring full data sovereignty.

**Current State (v1.5.0):** Partially Self-Hosted ✅

| Component | Status | Solution | Notes |
|-----------|--------|----------|-------|
| **Storage (S3)** | ✅ **Self-Hosted** | MinIO | Complete - no cloud dependency |
| **AI Services** | ✅ **Self-Hosted Option** | Local RAG + Diffuser | Configurable via `AI_PROVIDER=local` |
| **Database** | ⚠️ Cloud | Supabase (PostgreSQL) | **Needs self-hosted option** |
| **Authentication** | ⚠️ Cloud | Supabase Auth | **Needs self-hosted option** |
| **Application** | ✅ Self-Hosted | Next.js Docker | Already containerized |

**Achievements (v1.0.0 - v1.5.0):**
- ✅ MinIO self-hosted S3-compatible storage (v1.0.0)
- ✅ Docker deployment for Next.js application (v1.0.0)
- ✅ Local AI provider option with RAG + Diffuser (v1.5.0)
- ✅ Environment-based configuration system (v1.5.0)

**Remaining Goals:**

### Phase 1: Self-Hosted Database (v1.7.0 - Target Q2 2026)

**Objective:** Add PostgreSQL self-hosted option alongside Supabase

**Implementation:**

**A. Database Layer**

*Option 1: Direct PostgreSQL (Recommended)*
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: reading_buddy
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
```

*Implementation Tasks:*
- Create database adapter layer (abstract Supabase client)
- Implement direct PostgreSQL connection with `pg` or Prisma
- Migrate RLS policies to application-level middleware
- Create database migration scripts from Supabase schema
- Add connection pooling (PgBouncer)
- Implement health checks and monitoring

*Configuration:*
```env
# Database Provider Selection
DB_PROVIDER=supabase  # or "postgres" for self-hosted

# Supabase (Cloud)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Self-Hosted PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=reading_buddy
POSTGRES_USER=admin
POSTGRES_PASSWORD=...
POSTGRES_SSL=false
```

*Option 2: PostgREST (Supabase-compatible)*
- Deploy PostgREST for REST API layer
- Maintains compatibility with existing Supabase client code
- Keep existing RLS policies in database
- Minimal code changes required

### Phase 2: Self-Hosted Authentication (v1.8.0 - Target Q3 2026)

**Objective:** Replace Supabase Auth with self-hosted authentication

**Authentication Options Comparison:**

| Solution | Complexity | Features | Supabase Compatibility | Recommendation |
|----------|-----------|----------|----------------------|----------------|
| **Keycloak** | High | OAuth2, SAML, LDAP, MFA, SSO | Low (requires rewrite) | Enterprise deployments |
| **Authentik** | Medium | OAuth2, LDAP, SCIM, Modern UI | Low (requires rewrite) | Modern orgs |
| **Auth.js (NextAuth)** | Low | OAuth providers, JWT, Session | Medium (some rewrite) | **Recommended** |
| **Custom JWT** | Low | Full control, lightweight | Low (full rewrite) | Small deployments |

**Recommended: Auth.js (NextAuth.js v5)**

*Why Auth.js:*
- Native Next.js integration
- Built-in OAuth providers (Google, GitHub, etc.)
- JWT and session support
- Lightweight and easy to configure
- Active development and community
- Credential provider for email/password

*Implementation Tasks:*
- Install and configure Auth.js in Next.js app
- Create auth adapter for PostgreSQL (store sessions, users, accounts)
- Implement OAuth providers (Google, GitHub, Microsoft)
- Add credential provider (email/password with bcrypt)
- Create role-based access control middleware
- Migrate existing user accounts from Supabase Auth
- Update all auth-protected routes and API endpoints
- Implement session management and refresh tokens

*Configuration:*
```env
# Auth Provider Selection
AUTH_PROVIDER=supabase  # or "authjs" for self-hosted

# Supabase Auth (Cloud)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Auth.js (Self-Hosted)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

*Auth.js Example Setup:*
```typescript
// /web/src/lib/auth/authjs-config.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PostgresAdapter } from "@auth/pg-adapter"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        // Validate credentials against PostgreSQL
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.role = user.role // Add custom fields
      return session
    },
  },
})
```

### Phase 3: Complete Self-Hosted Stack (v2.0.0 - Target Q4 2026)

**Objective:** Unified deployment with zero cloud dependencies

**Full Docker Compose Stack:**
```yaml
version: '3.8'

services:
  # Application
  app:
    build: ./web
    environment:
      - DB_PROVIDER=postgres
      - AUTH_PROVIDER=authjs
      - AI_PROVIDER=local
      - S3_PROVIDER=minio
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - minio
      - rag-api
      - diffuser-api
  
  # Database
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: reading_buddy
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  # Object Storage
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
  
  # AI Services (Local)
  rag-api:
    image: your-rag-api:latest
    ports:
      - "8000:8000"
  
  diffuser-api:
    image: your-diffuser-api:latest
    ports:
      - "8001:8000"
  
  # Connection Pooler (Optional)
  pgbouncer:
    image: pgbouncer/pgbouncer
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: admin
      DATABASES_DATABASE: reading_buddy
    ports:
      - "6432:6432"

volumes:
  postgres_data:
  minio_data:
```

**Deployment Options:**

*Option 1: Single Server*
- All services on one machine
- Suitable for small schools (< 500 users)
- 8GB RAM, 4 CPU cores, 500GB storage minimum

*Option 2: Multi-Server*
- App server (load balanced)
- Database server (with replication)
- Storage server (MinIO cluster)
- AI server (GPU for diffuser)

*Option 3: Kubernetes*
- Helm charts for all services
- Auto-scaling for app pods
- StatefulSets for database
- Persistent volumes for storage

**Benefits:**
- ✅ Complete data sovereignty
- ✅ No cloud vendor lock-in
- ✅ Zero external API costs (except optional OAuth providers)
- ✅ Enhanced privacy and security
- ✅ Can run entirely on-premises or air-gapped networks
- ✅ Full control over updates and maintenance
- ✅ Customizable to organization needs

**Migration Strategy:**

*For Existing Deployments (Supabase → Self-Hosted):*

1. **Preparation Phase**
   - Audit current data and usage
   - Set up parallel self-hosted environment
   - Test all functionality in self-hosted mode
   - Train team on new infrastructure

2. **Database Migration**
   - Export Supabase data to SQL dump
   - Set up PostgreSQL container
   - Import data and verify integrity
   - Update connection strings with `DB_PROVIDER=postgres`
   - Run in parallel for validation

3. **Authentication Migration**
   - Deploy Auth.js configuration
   - Configure OAuth providers
   - Migrate user accounts (preserve passwords if using credentials)
   - Update auth middleware
   - Test all auth flows (login, logout, password reset, OAuth)
   - Run both auth systems in parallel

4. **Cutover**
   - Set cutover date and maintenance window
   - Final data sync from Supabase
   - Switch environment variables
   - Monitor for issues
   - Keep Supabase as backup for 30 days

5. **Cleanup**
   - Decommission Supabase project
   - Remove Supabase dependencies
   - Update documentation
   - Archive migration scripts

**Documentation Deliverables:**
- Self-hosted deployment guide
- Migration playbook
- Backup and recovery procedures
- Monitoring and maintenance guide
- Troubleshooting documentation
- Security hardening checklist

---

### 6.3 AI Flexibility

#### Bring Your Own AI (BYOAI)
**Priority:** High | **Status:** ✅ Partially Complete (v1.5.0) | **Next:** v1.6.0

**Current State (v1.5.0):** Configurable provider system with Cloud (Gemini) and Local (RAG + Diffuser) support

**Implemented Providers (v1.5.0):**
1. **Cloud Provider** - Google Gemini 2.5 Flash
   - Text generation: `gemini-2.5-flash`
   - Image generation: `gemini-2.5-flash-image`
   - Requires: `GEMINI_API_KEY`

2. **Local Provider** - Self-hosted RAG + Diffuser
   - Quiz/Description: RAG API
   - Images: Stable Diffusion 1.5 via Diffuser API
   - Requires: `RAG_API_URL`, `DIFFUSER_API_URL`

**Planned Additional Providers (v1.6.0+):**

1. **OpenAI (GPT Models)**
   - GPT-4, GPT-4 Turbo, GPT-3.5 Turbo

2. **Anthropic (Claude Models)**
   - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku

3. **Google (Gemini Models)**
   - Gemini 2.5 Flash (current), Gemini 1.5 Pro, Gemini Ultra

4. **Local LLM (Self-hosted)**
   - Ollama (Llama 3.1, Mistral, Phi-3)
   - LM Studio, vLLM, LocalAI

**Current Configuration (v1.5.0):**
```env
# AI Provider Selection (REQUIRED)
AI_PROVIDER=cloud # or "local"

# Cloud Provider (Gemini) - Required when AI_PROVIDER=cloud
GEMINI_API_KEY=your-gemini-api-key

# Local Provider - Required when AI_PROVIDER=local
RAG_API_URL=http://172.16.0.65:8000
DIFFUSER_API_URL=http://172.16.0.165:8000
```

**Planned Configuration (v1.6.0+):**
```env
# AI Provider Selection
AI_PROVIDER=openai # or anthropic, gemini, ollama, localai, local

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Google Gemini (current)
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Per-feature provider override
AI_QUIZ_GENERATION_PROVIDER=anthropic
AI_DESCRIPTION_PROVIDER=gemini
AI_SUMMARY_PROVIDER=ollama
```

**Implementation (v1.5.0 - Complete):**
```typescript
// AI abstraction layer - IMPLEMENTED
interface IAIProvider {
  generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationOutput>
  generateDescription(input: DescriptionGenerationInput): Promise<DescriptionGenerationOutput>
  generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput>
  getName(): string
  getType(): AIProvider
}

// Implemented providers
class CloudAIProvider implements IAIProvider { ... } // Gemini
class LocalAIProvider implements IAIProvider { ... } // RAG + Diffuser

// Factory pattern - IMPLEMENTED
const provider = getAIProvider() // Returns cached singleton

// Service layer - IMPLEMENTED
class AIService {
  static async generateQuiz(input): Promise<QuizGenerationOutput>
  static async generateDescription(input): Promise<DescriptionGenerationOutput>
  static async generateImage(input): Promise<ImageGenerationOutput>
}
```

**Planned Extensions (v1.6.0+):**
```typescript
class OpenAIProvider implements IAIProvider { ... }
class AnthropicProvider implements IAIProvider { ... }
class OllamaProvider implements IAIProvider { ... }
```

**Benefits:**
- No vendor lock-in
- Cost optimization (cheaper models for simple tasks)
- Privacy (local LLM for sensitive content)
- Performance tuning per task type
- Automatic fallback capability

---

### 6.4 Gamification & Engagement

#### Enhanced Badges & Gamification System
**Priority:** High | **Status:** ✅ Complete (v1.4.0)

**Current State:**
- Complete XP & Leveling system with square root formula
- Streak tracking (Daily, Weekly, Monthly)
- Enhanced badge system with progress tracking
- Gamification UI (Toasts, Cards, Notifications)

**Features Implemented:**
- **XP Sources:** Page reads (+1), Books (+100), Quizzes (+50-100), Streaks (+10-200)
- **Levels:** "Beginner Reader" to "Reading Legend"
- **Streak Tracking:** Daily streaks with milestone bonuses
- **Badge System:** Tiered badges with progress bars

---

### 6.5 UX & Dashboard Improvements

#### Comprehensive Dashboard Enhancements
**Priority:** High | **Target:** v1.6.0 | **Status:** Planned

**Current Issues Identified:**
- Admin dashboard has minimal content (only 3 cards, lots of white space)
- Student dashboard shows good gamification but limited functionality
- Teacher dashboard needs more classroom management tools
- Librarian table view is overwhelming without better organization
- Navigation could be more intuitive across roles
- Missing quick actions and shortcuts for common tasks

**Planned Improvements:**

**A. Dashboard-Specific Enhancements**

*Admin Overview:*
- System statistics cards (total users by role, total books, active readers)
- Recent activity feed (new signups, uploads, quiz submissions)
- System health indicators (storage usage, AI provider status, error rates)
- Quick action panel (add user, upload book, manage badges, view reports)
- Usage analytics charts (daily active users, books read per week)
- Alert center (pending approvals, system issues, low storage warnings)

*Student Dashboard:*
- Personalized book recommendations (based on reading history, genre preferences)
- Reading progress charts (pages per day, books per month)
- Class & global leaderboards with ranking
- Expanded achievement showcase (badges in progress, next milestones)
- Reading goals tracker (books per month, pages per day)
- Continue reading section with visual page preview
- Friend activity feed (if social features added)
- Weekly reading challenge cards

*Teacher Dashboard:*
- Class analytics overview (average reading time, completion rates, engagement)
- Assignment tracking (pending reviews, overdue submissions)
- Student performance heatmap (identify struggling students)
- Quick class management (add/remove students, assign books)
- Reading assignment calendar view
- Bulk operations (assign quizzes to multiple classes, export reports)
- Top performers and students needing help sections

*Librarian Dashboard:*
- Upload statistics (success rate, format distribution, processing times)
- Popular books widget (most read, most quizzed, trending)
- Recent uploads with processing status
- Content moderation queue (pending reviews, reported content)
- Batch operations UI (bulk edit metadata, delete, assign access)
- Book collection management (create collections, featured books)
- AI generation analytics (quiz generation success rate, costs)

**B. Navigation & User Flow Improvements**

*Global Navigation:*
- Breadcrumb trail for deep navigation
- Quick switcher modal (Cmd/Ctrl+K for power users)
- Contextual help system (tooltips, guided tours for new users)
- Role-based dashboard shortcuts in header
- Sticky header with compact mode on scroll
- Notification center dropdown (system alerts, mentions, updates)

*Search & Discovery:*
- Advanced search modal with filters
- Recently viewed books section
- "Recommended for you" personalized suggestions
- Genre/category browse mode with filtering
- Multiple sort options (popularity, recent, rating, alphabetical)
- Search history and saved searches
- Quick filters chips (New arrivals, Popular, By grade level)

*Library Page Enhancements:*
- View mode toggle (Grid/List/Compact)
- Pagination with infinite scroll option
- Book preview card on hover (cover zoom, quick description, stats)
- Quick action buttons (Read now, Add to favorites, Assign to class)
- Active filter chips with clear all option
- Collapsible/expandable filter sidebar
- Bulk selection mode for librarians/teachers

**C. Component & Interaction Improvements**

*Forms & Input Fields:*
- Real-time inline validation with helpful error messages
- Auto-save for long forms (draft saving)
- Field-level contextual help icons
- Progress indicators for multi-step forms
- Smart defaults and suggestions
- Better date/time pickers
- Rich text editor for descriptions

*Tables & Data Lists:*
- Sortable columns with visual indicators
- Column visibility customization
- Export functionality (CSV, Excel, PDF)
- Advanced filtering per column
- Bulk selection with action menu
- Pagination controls with size options
- Expandable rows for detailed view
- Sticky header on scroll

*Modals & Overlays:*
- Slide-over panels for secondary actions
- Full keyboard navigation support
- Stacked modal management
- Better loading states within modals
- Context-aware confirmation dialogs
- Modal sizing options (small, medium, large, fullscreen)

**D. Visual Design & Feedback**

*Loading & Empty States:*
- Skeleton screens for content loading
- Animated progress indicators
- Optimistic UI updates (immediate feedback)
- Helpful empty states with call-to-action
- Error states with recovery suggestions
- Success confirmations with animations

*Notifications & Alerts:*
- Enhanced toast notifications (with actions, auto-dismiss, persistence)
- Celebration animations for achievements
- Contextual inline alerts
- Notification center with history
- Email/push notification preferences
- Undo actions for destructive operations

*Responsive & Mobile:*
- Mobile-optimized dashboard layouts
- Touch-friendly controls (larger tap targets)
- Swipe gestures for navigation
- Bottom navigation for mobile
- Tablet-specific multi-column layouts
- Progressive Web App (PWA) support

### 6.6 Enhanced Reading Experience

#### Reader Improvements
**Priority:** Medium | **Target:** v1.6.0

- Bookmarks with notes capability (mark important pages)
- Annotations & highlights (student markup with sharing)
- Dark mode / Reading mode themes (sepia, night mode)
- Better resume reading (visual page preview, "Continue from page X")
- Reading position sync across devices
- Adjustable font size, family, spacing, and margins
- Audio narration (Text-to-speech or uploaded audio)
- Reading statistics (time spent, pages per session, reading speed)
- Page thumbnails navigator
- Fullscreen mode improvements
- Read-along mode (TTS word highlighting)

---

### 6.6 Advanced AI Features

#### AI-Powered Learning
**Priority:** Medium | **Target:** v1.5.0

- Personalized quiz difficulty (Adapt based on past performance)
- Auto-generated summaries (Per chapter/section)
- Vocabulary extraction (Custom word lists from books)
- Comprehension analysis (Track understanding trends)
- Reading recommendations (Based on interests and history)
- Reading level assessment (Lexile/AR calculation)
- Smart checkpoint placement (AI suggests optimal quiz locations)
- Question variety (Multiple choice, true/false, short answer, matching)

---

### 6.7 Content Management

#### Librarian Tools
**Priority:** Medium | **Target:** v1.6.0+

- Bulk upload (Multiple books via ZIP)
- Series management (Link related books, reading order)
- Content moderation (Review uploaded books)
- Version control (Update books without breaking links)
- Categories/tags (Custom tagging, multiple categories)
- Advanced search (Full-text across all books)
- Book recommendations (Suggest to students)
- Reading lists (Curated collections)
- Check-out system (Book availability - optional)
- ISBN lookup (Auto-fill metadata)

---

### 6.8 Mobile Applications

#### Mobile Apps
**Priority:** High | **Target:** v2.0.0

**Platforms:** iOS and Android (React Native - 95%+ code reuse)

**Features:**
- Offline reading (Download books)
- Push notifications (Reminders, deadlines, unlocks)
- Camera upload (Photo books - future OCR)
- Reading timer (Daily tracking)
- Night mode (OLED-friendly)
- Gesture controls (Swipe pages)
- Biometric login (Face ID / Touch ID)
- Adaptive UI (Phone and tablet optimized)

---

### 6.9 Analytics & Reporting

#### Data & Insights
**Priority:** Medium | **Target:** v1.6.0+

**Librarian Dashboard:**
- Popular books, usage stats, genre trends
- Completion rates, reading level distribution

**Teacher Reports:**
- Exportable (PDF, CSV)
- Individual and class summaries
- Reading vs quiz correlation
- Struggling student identification

**Admin Analytics:**
- School-wide metrics
- Year-over-year comparisons
- Teacher effectiveness
- Resource allocation insights

**Custom Report Builder:**
- Drag-and-drop creation
- Flexible filtering
- Scheduled reports
- Multiple export formats

---

### 6.10 External Integrations

#### Integration & API
**Priority:** Low | **Target:** v2.0.0+

**RESTful API:**
- Complete documentation
- API key management
- Rate limiting
- Webhook support

**LMS Integration:**
- Canvas LMS, Google Classroom, Moodle, Schoology
- Gradebook sync

**Authentication:**
- SSO (SAML, OAuth)
- LDAP/Active Directory
- Google Workspace, Microsoft 365

**Library Systems:**
- Follett Destiny, Alexandria, Koha
- Catalog imports

---

### 6.11 Performance & Scalability

#### Infrastructure Optimization
**Priority:** High | **Target:** v1.3.0+

**Content Delivery:**
- CDN integration (Cloudflare, CloudFront)
- Edge caching
- Geo-distributed storage

**Image Optimization:**
- WebP with JPEG fallback
- Responsive images (srcset)
- Lazy loading
- Progressive loading

**Database:**
- Query tuning
- Connection pooling (PgBouncer)
- Read replicas
- Table partitioning

**Caching:**
- Redis for sessions
- API response caching
- Static asset caching

**Monitoring:**
- Real-time metrics
- Error tracking (Sentry)
- Uptime monitoring
- Alert system

**PWA:**
- Installable web app
- Offline functionality
- Background sync

---

### 6.12 Technical Debt & Code Quality

#### Refactoring & Testing
**Priority:** High | **Target:** v1.3.0+

**Testing:**
- Unit tests (Jest) - 80%+ coverage
- Integration tests
- E2E tests (Playwright)
- Visual regression tests
- Load testing

**CI/CD:**
- GitHub Actions pipeline
- Automated testing on PR
- Automated deployment
- Preview deployments
- Rollback capabilities

**Code Quality:**
- ESLint strict mode
- Remove all `any` types (19 instances)
- TypeScript strict mode
- Code review guidelines

**Documentation:**
- API docs (OpenAPI/Swagger)
- Component docs (Storybook)
- Architecture decision records
- Developer onboarding guide

---

### 6.13 Security & Compliance

#### Security Hardening
**Priority:** High | **Target:** v1.3.0+

**Application Security:**
- Security audit & penetration testing
- Rate limiting
- CAPTCHA for public forms
- Content Security Policy (CSP)
- XSS protection
- CSRF protection

**Data Protection:**
- Encryption at rest (MinIO, PostgreSQL)
- Encryption in transit (HTTPS)
- GDPR compliance
- COPPA compliance (K-12)

**Access Control:**
- Multi-factor authentication (MFA)
- Session management improvements
- Account lockout (failed attempts)
- Password complexity requirements
- Audit logging for admin actions

---

### 6.14 Accessibility

#### WCAG Compliance
**Priority:** High | **Target:** v1.5.0

**Compliance Targets:**
- WCAG 2.1 AA
- Section 508
- ADA

**Improvements:**
- Screen reader optimization (ARIA labels)
- Keyboard navigation (all features)
- Color contrast (4.5:1 minimum)
- Alternative text for images
- Resizable text (up to 200%)
- Focus indicators
- Accessible forms with labels

---

### 6.15 Localization

#### Multi-Language Support
**Priority:** Medium | **Target:** v2.0.0+

**Initial Languages:**
- English (default), Spanish, French, Mandarin Chinese, Arabic, Hindi

**Implementation:**
- i18n library (next-intl or react-i18next)
- RTL support (Arabic/Hebrew)
- Date/time localization
- Translated UI + docs
- Multi-language books

---

## 7. Implementation Timeline

### v1.1.0 (Nov 2025) - MOBI/AZW Format Support ✅ COMPLETE
- ✅ MOBI format support (Mobipocket/Kindle)
- ✅ AZW format support (Amazon Kindle)
- ✅ AZW3 format support (Kindle Format 8)
- ✅ Calibre-based conversion pipeline
- ✅ Magic number file validation (BOOKMOBI signature)
- ✅ `/api/convert-mobi` endpoint with progress tracking
- ✅ Text extraction for AI quiz generation
- ✅ Format-specific UI badges and messaging

### v1.2.0 (Nov 2025) - Mobile Responsive UI & Fullscreen ✅ COMPLETE
- ✅ Mobile-responsive layout with orientation detection
- ✅ Portrait mode: Single-page view optimized for mobile
- ✅ Landscape/desktop: Spread (two-page) view
- ✅ Immersive fullscreen reading mode
- ✅ Floating exit button (only UI in fullscreen)
- ✅ Pure white background in fullscreen
- ✅ Auto-adaptive layout based on screen orientation
- ✅ Maximized screen usage (20px minimal padding)
- ✅ 3D page flip shadow effect in all modes
- ✅ Cross-browser fullscreen API support
- ✅ React portal fix for mobile menu z-index
- ✅ Dynamic page dimensions for optimal readability

### ✅ v1.3.0 (Completed December 4, 2025) - Testing Infrastructure
- ✅ Vitest setup for unit and integration testing
- ✅ @vitest/coverage-v8 for code coverage reporting
- ✅ Playwright setup for E2E testing
- ✅ Comprehensive test suite (92 tests passing)
- ✅ Test coverage: 72.41% overall
  - ✅ rate-limit.ts: 82.35% coverage (25 tests)
  - ✅ roleCheck.ts: 100% coverage (11 tests)
  - ✅ pdf-extractor.ts: 57.69% coverage (19 tests)
  - ✅ file-type-detector.ts: 80.48% coverage
  - ✅ minioUtils.ts: 68.08% coverage
- ✅ E2E test examples (homepage, auth, dashboard)
- ✅ Complete TESTING.md documentation
- ✅ npm scripts for all test types

### ✅ v1.4.0 (Completed December 6, 2025) - Gamification
- ✅ XP & Leveling system (Square root progression)
- ✅ Reading Streak tracking (Daily, Weekly, Monthly)
- ✅ Enhanced Badge System (Tiered badges, 25+ types)
- ✅ Gamification UI (Toast notifications, Progress cards)
- ✅ Badge collection page with progress bars
- ✅ Real-time XP updates on reading/quiz completion

### ✅ v1.5.0 (Completed December 9, 2025) - AI Provider Flexibility
- ✅ Configurable AI provider system (Cloud/Local)
- ✅ Single `AI_PROVIDER` environment variable for deployment-time choice
- ✅ Cloud provider: Google Gemini 2.5 Flash (text + images)
- ✅ Local provider: Self-hosted RAG + Diffuser APIs
- ✅ Factory pattern with service abstraction layer
- ✅ Type-safe AI service infrastructure (`/web/src/lib/ai/`)
- ✅ Comprehensive console logging with timing metrics
- ✅ Environment validation with clear error messages
- ✅ Test script: `npm run test:ai-providers`
- ✅ Complete migration guide and documentation
- ✅ Code refactoring: ~550 lines of duplicate code removed
- ✅ Plain text output for descriptions (markdown stripping)
- ✅ Unified error handling with AIProviderError class

### v1.6.0 (Q1 2026) - UX & Dashboard Enhancements
**Focus:** Comprehensive UX improvements across all dashboards and user flows

#### Dashboard Improvements
- **Admin Overview**
  - System-wide statistics cards (total users, books, active students)
  - Recent activity feed (new users, uploads, quiz completions)
  - Quick action shortcuts (add user, upload book, manage badges)
  - System health indicators (storage usage, AI provider status)
  
- **Student Dashboard**
  - Personalized book recommendations based on reading history
  - Reading progress visualization (charts, graphs)
  - Leaderboard widget (class ranking, global ranking)
  - Achievement showcase (earned badges, milestones)
  - Reading goals and progress tracking
  - Continue reading section with page preview
  
- **Teacher Dashboard**
  - Class analytics overview (average reading time, completion rates)
  - Assignment tracking dashboard (pending, in-progress, completed)
  - Student performance heatmap
  - Quick class management actions
  - Reading assignment calendar
  - Bulk quiz assignment interface
  
- **Librarian Dashboard**
  - Upload statistics (success rate, format distribution)
  - Popular books widget (most read, most quizzed)
  - Recent uploads with status
  - Content moderation queue
  - Batch operations UI improvements
  - Book collection management

#### Navigation & Flow Improvements
- **Global Navigation**
  - Breadcrumb navigation for deep pages
  - Quick switcher (Cmd/Ctrl+K) for power users
  - Contextual help tooltips
  - Sticky header with minimal mode on scroll
  
- **Search & Discovery**
  - Advanced search with saved filters
  - Recently viewed books
  - Recommended for you section
  - Genre/category browse mode
  - Sort options (popularity, date, rating)
  
- **Library Page**
  - Grid/List view toggle
  - Pagination with infinite scroll option
  - Book preview on hover (cover, description, stats)
  - Quick actions (read, add to list, assign)
  - Filter chips for active filters
  - Collapsible filter sidebar

#### Reading Experience
- **Book Reader**
  - Bookmarks with notes capability
  - Dark mode / Reading mode themes
  - Better resume reading (visual page preview)
  - Reading position sync across devices
  - Adjustable font size and spacing
  - Progress indicator improvements
  
- **Quiz Interface**
  - Progress bar during quiz
  - Question navigator (jump to question)
  - Review mode before submission
  - Detailed feedback with explanations
  - Retry mechanism for failed quizzes

#### Component Enhancements
- **Forms & Inputs**
  - Better validation feedback (inline errors)
  - Auto-save for long forms
  - Field-level help text
  - Progress indicators for multi-step forms
  
- **Tables & Lists**
  - Column sorting and filtering
  - Customizable column visibility
  - Export functionality (CSV, PDF)
  - Bulk selection improvements
  - Row actions menu
  
- **Modals & Dialogs**
  - Slide-over panels for non-critical actions
  - Keyboard navigation support
  - Better loading states
  - Confirmation dialogs with context

#### Visual & Interaction Design
- **Loading States**
  - Skeleton screens for content
  - Progress indicators for long operations
  - Optimistic UI updates
  - Better error messages with recovery actions
  
- **Notifications & Feedback**
  - Toast notification improvements (actions, persistence)
  - Success animations
  - Empty states with call-to-action
  - Contextual onboarding tips
  
- **Responsive Design**
  - Mobile-optimized dashboards
  - Tablet-specific layouts
  - Touch-friendly controls
  - Improved mobile navigation

#### Accessibility (WCAG 2.1 AA)
- Keyboard navigation for all features
- Screen reader optimization
- Focus indicators and skip links
- Color contrast compliance
- Alt text for all images
- ARIA labels and roles

#### Performance Optimizations
- Image lazy loading and optimization
- Code splitting for faster initial load
- Caching strategies
- Debounced search inputs
- Virtual scrolling for large lists

#### Extended AI Flexibility
- Additional providers (OpenAI, Anthropic, Ollama)
- Per-feature provider selection
- AI usage analytics dashboard

#### Quality Gates
- 80% test coverage target
- Visual regression tests (Chromatic/Percy)
- Performance budgets
- Accessibility audits

### v1.7.0 (Q2 2026) - Content & Competition
- Class vs class competitions
- Bulk book upload
- Book series management
- Advanced search
- Reading lists/collections
- Analytics dashboard for teachers

### v1.8.0 (Q3 2026) - Additional Format Support
- CBZ/CBR comic book format support
- DOCX Word document support
- ODT OpenDocument support
- Enhanced upload workflow for bulk operations
- Improved text extraction for complex layouts

### v2.0.0 (Q4 2026) - Major Architectural Changes
- Image-only storage (remove PDF requirement)
- Full self-hosted option (replace Supabase)
- Mobile apps (iOS & Android)
- Social/collaborative features
- Advanced AI features
- Plugin system

---

## 8. Migration Strategies

### From v1.0.0 to Image-Only Architecture (v2.0.0)

**Pre-migration:**
1. Run text extraction on all existing books
2. Render all PDFs to images (if not already done)
3. Verify complete page_text_content in MinIO
4. Export book list for verification

**Migration:**
1. Update schema (make pdf_url nullable)
2. Update book upload flow
3. Update reader to use images only
4. Gradually archive PDF files (after verification)
5. Update documentation

**Rollback Plan:**
- Keep PDFs in MinIO for 90 days
- Flag books as "migrated" vs "legacy"
- Allow per-book rollback if issues found

---

## 9. Technology Evaluation

### Technologies to Research

**AI & ML:**
- Alternative AI models (GPT-4, Claude, Llama)
- Vector databases (Pinecone, Weaviate)
- Speech-to-text (Whisper)
- Text-to-speech (ElevenLabs, Azure TTS)

**Real-time Features:**
- WebSocket (Socket.io)
- Real-time leaderboard updates

**Analytics:**
- PostHog, Mixpanel, Amplitude

**Communication:**
- Email (SendGrid, Postmark, Resend)
- SMS (Twilio)

**File Processing:**
- Cloud OCR (Google Vision, AWS Textract)
- Advanced PDF processing (Adobe PDF Services)
- Image optimization (Imgix, Cloudinary)

---

## 10. Contribution Guidelines

### How to Contribute

1. Check this roadmap to see if your idea is planned
2. Open a GitHub Discussion to propose new ideas
3. Get maintainer feedback before implementing
4. Reference this roadmap in your proposal
5. Follow coding standards and test requirements
6. Update this roadmap when adding features

### Priority Framework

**High Priority:**
- Features that improve student engagement
- Features that reduce operational costs
- Features that enhance accessibility
- Security and performance improvements

**Medium Priority:**
- Features that improve teacher/librarian workflows
- Nice-to-have UX improvements
- Advanced analytics

**Low Priority:**
- Social features (wait for user demand)
- External integrations (case-by-case)
- Advanced customization

---

## Feedback & Suggestions

Have ideas not listed here? We want to hear them!

- **GitHub Issues:** Feature requests and bug reports
- **GitHub Discussions:** Ideas and general feedback
- **Email:** [Add maintainer email]
- **Discord:** [Add community Discord link]

---

**Current Version:** 1.0.0  
**Status:** Production Ready  
**Document Status:** Living document - continuously updated

This roadmap evolves as Reading Buddy grows. Ideas may be added, refined, reprioritized, or removed based on user feedback, technical constraints, and strategic direction.

**See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.**
