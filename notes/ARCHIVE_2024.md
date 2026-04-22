
--- 
### Original File: notes//2024-12-14/roadmap/CHANGELOG.md

# Changelog

All notable changes to Reading Buddy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for v1.5.0 - UX & AI Flexibility

#### Planned Features
- **Reader Enhancements** - Bookmarks/annotations, better resume cues, and dark mode
- **Accessibility/Performance** - WCAG 2.1 AA audit, keyboard/focus polish, and reduced layout shift
- **Extended BYOAI Support** - Support for OpenAI, Anthropic, and additional local LLMs (Ollama)
- **Quality Gates** - Push coverage toward 80%, add server-action integration tests, and visual regression baselines
- **CI/CD** - Automated Vitest + Playwright runs with coverage gating and dashboards

---

## [1.5.0] - 2025-12-09

### Added

#### Configurable AI Provider System
- **Deployment-Time AI Choice** - Single `AI_PROVIDER` environment variable to choose between cloud and local AI
  - `AI_PROVIDER=cloud` - Uses Google Gemini 2.5 Flash for all AI operations
  - `AI_PROVIDER=local` - Uses self-hosted RAG + Diffuser APIs
  - Factory pattern with service abstraction layer for clean architecture
  - Environment validation with clear error messages on misconfiguration

- **Cloud Provider (Gemini)**
  - Text generation: `gemini-2.5-flash` (temperature 0.4 for quizzes, 0.7 for descriptions)
  - Image generation: `gemini-2.5-flash-image` for badge icons
  - JSON response mode for structured outputs
  - Requires extracted text (no PDF upload support)
  - Plain text output without markdown formatting

- **Local Provider (RAG + Diffuser)**
  - Wraps existing RAG API for quiz and description generation
  - Wraps existing Diffuser API for image generation
  - Supports both extracted text and PDF upload strategies
  - Base64 image normalization across all responses

- **AI Service Infrastructure**
  - New `/web/src/lib/ai/` module with 8 core files
  - Type-safe interfaces throughout with TypeScript
  - Comprehensive console logging with timing metrics for all operations
  - Unified error handling with `AIProviderError` class
  - Response normalization between different providers

- **Testing & Documentation**
  - Test script: `npm run test:ai-providers` to verify both providers
  - Migration guide: `/web/docs/AI_PROVIDER_MIGRATION.md`
  - Updated README with AI configuration section
  - Troubleshooting guide for common issues

### Changed

#### Code Refactoring
- **Librarian Actions** - Refactored 3 functions to use `AIService`
  - `generateQuizForBook` - Simplified from ~200 lines using direct RAG calls
  - `generateQuizForBookWithContent` - Simplified from ~250 lines
  - `generateBookDescription` - Simplified from ~150 lines
  - Total reduction: ~550 lines of duplicate code removed

- **Badge Actions** - Refactored image generation
  - `generateBadgeIconWithAI` - Simplified from ~150 lines using direct Diffuser calls
  - Unified interface regardless of AI provider

- **Environment Configuration**
  - Updated `.env.example` with comprehensive AI provider settings
  - Added validation for required environment variables per provider
  - Clear documentation for both cloud and local configurations

### Technical Details

#### Architecture
- **Factory Pattern**: Single point of provider instantiation with caching
- **Service Layer**: High-level API with logging and error wrapping
- **Provider Interface**: Contract that all providers must implement
  - `generateQuiz()` - Quiz generation from text or PDF
  - `generateDescription()` - Book description generation
  - `generateImage()` - Badge icon generation

#### Implementation
```typescript
// Usage example
const result = await AIService.generateQuiz({
  title: "Book Title",
  author: "Author Name",
  quizType: "classroom",
  questionCount: 5,
  pages: extractedPages,
});
```

#### Configuration
```bash
# Environment variables
AI_PROVIDER=local              # or "cloud"
GEMINI_API_KEY=your-key        # Required when cloud
RAG_API_URL=http://...         # Required when local
DIFFUSER_API_URL=http://...    # Required when local
```

#### Performance
- Console logging shows timing for all AI operations
- Cached provider instance for optimal performance
- Minimal overhead with factory pattern

#### Files Changed
- **New**: 11 files (8 in `/web/src/lib/ai/`, test script, migration guide, providers directory)
- **Modified**: 6 files (2 action files, .env.example, README, package.json, web/.env.example)
- **Code reduction**: ~550 lines removed through refactoring

### Migration Required

#### For Existing Deployments
1. **Set AI_PROVIDER** - Add to environment variables (required, no default)
   ```bash
   AI_PROVIDER=local  # or "cloud"
   ```

2. **Cloud Provider** - If using `AI_PROVIDER=cloud`
   ```bash
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. **Local Provider** - If using `AI_PROVIDER=local`
   ```bash
   RAG_API_URL=http://172.16.0.65:8000
   DIFFUSER_API_URL=http://172.16.0.165:8000
   ```

4. **Restart Application** - Provider is cached, requires restart to pick up changes

#### Testing
```bash
# Test local provider
AI_PROVIDER=local npm run test:ai-providers

# Test cloud provider  
AI_PROVIDER=cloud npm run test:ai-providers
```

#### Breaking Changes
None - maintains full backward compatibility. Only requires adding `AI_PROVIDER` to environment.

### Notes
- Provider choice is global - all AI features use the same backend
- Gemini requires extracted text - cannot process PDFs directly
- Local provider supports both text and PDF inputs
- Cost consideration: Gemini charges per request (~$0.039 per image)
- See migration guide for detailed troubleshooting

---

## [1.4.0] - 2025-12-06

### Added

#### Complete Gamification System
- **XP & Leveling System** - Students earn XP for reading pages, completing books, and passing quizzes
  - Level calculation using square root formula (Level = sqrt(XP/50) + 1)
  - XP rewards: 1 XP per page, 100 XP per book, 50-150 XP per quiz (based on score)
  - Level titles from "Beginner Reader" to "Reading Legend"
- **Reading Streak Tracking** - Track consecutive days of reading
  - Daily streak bonuses (+10 XP)
  - Milestone bonuses: 7-day (+50 XP), 30-day (+200 XP)
  - Longest streak record tracking
- **Enhanced Badge System** - 25+ badges across 6 categories
  - Categories: Reading, Quiz, Streak, Milestone, Special, General
  - Tiers: Bronze, Silver, Gold, Platinum, Special
  - Each badge awards XP upon earning
  - Progress tracking for unearned badges
- **XP Transaction Audit Trail** - Complete history of all XP earned
- **Reading Challenges** - Database support for time-limited reading challenges

#### New UI Components
- **XP Progress Card** - Visual display of current level, XP, and progress to next level
- **Streak Card** - Weekly calendar view showing reading streak
- **Stats Grid** - Quick stats overview (streak, books, pages, quizzes)
- **Badge Cards** - Tiered badge display with progress bars
- **Badge Unlock Notifications** - Animated modal when badges are earned
- **XP/Level/Streak Toasts** - Real-time notifications for XP gains and milestones

#### Dashboard Enhancements
- Redesigned student dashboard with gamification section
- New `/dashboard/student/badges` page showing all badges with progress
- Recent badges section on main dashboard
- Real-time XP and badge updates during reading and quiz completion

### Changed
- `evaluateAchievements()` now uses the new badge system instead of legacy achievements
- `recordReadingProgress()` now awards XP and updates streaks
- `submitQuizAttempt()` now awards XP and evaluates quiz-related badges
- Migrated from `student_achievements` table to `student_badges` table

### Technical Details

**New Files:**
- `migrations/add-gamification-system.sql` - Database migration for gamification
- `web/src/lib/gamification.ts` - Core gamification engine
- `web/src/components/dashboard/gamification/` - UI components
  - `XPProgressCard.tsx` - Level and XP display
  - `StatsGrid.tsx` - Statistics and streak display
  - `BadgeCard.tsx` - Badge display with progress
  - `BadgeUnlockNotification.tsx` - Badge unlock modal
  - `XPToast.tsx` - XP/level/streak toasts
- `web/src/app/(dashboard)/dashboard/student/badges/page.tsx` - Badge collection page

**Database Changes:**
```sql
-- Profile gamification fields
ALTER TABLE profiles ADD COLUMN xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN reading_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN longest_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_read_date DATE;
ALTER TABLE profiles ADD COLUMN total_books_completed INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN total_pages_read INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN total_quizzes_completed INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN total_perfect_quizzes INTEGER DEFAULT 0;

-- Badge enhancements
ALTER TABLE badges ADD COLUMN tier VARCHAR(20) DEFAULT 'bronze';
ALTER TABLE badges ADD COLUMN xp_reward INTEGER DEFAULT 50;
ALTER TABLE badges ADD COLUMN category VARCHAR(50) DEFAULT 'general';

-- New tables
CREATE TABLE xp_transactions (...);
CREATE TABLE reading_challenges (...);
CREATE TABLE student_challenge_progress (...);
```

### Migration Required

Run `migrations/add-gamification-system.sql` in Supabase SQL Editor to enable the gamification system.

---

## [1.3.0] - 2025-12-04

### Added
- Comprehensive testing infrastructure with Vitest 4, Playwright 1.57, @vitest/coverage-v8, happy-dom, and Testing Library for component tests
- 92 unit/integration tests (72.41% coverage) across rate limiting, auth role checks, PDF extraction, file type detection/helpers, and MinIO utilities
- 11 Playwright E2E tests covering Google OAuth entry points, role-based dashboard redirects, and homepage responsiveness
- Testing documentation: `web/TESTING.md` (full guide) and `web/TEST-RESULTS.md` (latest results and coverage)

### Changed
- Added npm scripts for unit tests, watch/UI modes, coverage, E2E variants (headed/UI/debug/report), and combined `test:all` runner
- Configured `web/vitest.config.ts` and `web/vitest.setup.ts` for React test setup, coverage reporting, and E2E exclusions
- Configured `web/playwright.config.ts` with dev-server integration and installed Chromium, Firefox, and WebKit for local/CI runs

---

## [1.2.1] - 2025-12-04

### Fixed

#### Text Extraction System Improvements
- **Manual text extraction button** - Added "📝 Extract Text" button in book list for failed/pending extractions
- **Extraction status visibility** - Added status column showing Extracted (✓ green), Failed (✗ red), or Pending (⚠ yellow) badges
- **Error tracking and reporting** - Enhanced server action with comprehensive error handling and categorized error types
- **Database error tracking** - Added `text_extraction_error`, `text_extraction_attempts`, and `last_extraction_attempt_at` columns
- **Error tooltips** - Failed badge shows specific error message on hover
- **Enhanced quiz warning** - Replaced simple warning with actionable panel including "Extract Text Now" button
- **Better upload feedback** - Specific error messages during upload with guidance for manual retry
- **PDF.js worker configuration** - Fixed worker path for Next.js server-side rendering

#### Quiz Creation & Preview Fixes
- **RLS recursion error** - Fixed "infinite recursion in policy for relation classes" by using admin client for quiz generation
- **Cookie modification error** - Fixed authentication flow to prevent cookie modification errors in server actions
- **Missing table handling** - Gracefully handle missing `class_quiz_assignments` table
- **Admin/Librarian access** - Use admin client bypass for ADMIN/LIBRARIAN roles to prevent RLS blocking
- **Separate queries** - Split quiz and book queries to avoid RLS join conflicts
- **Authentication flow** - Fixed `ensureLibrarianOrAdmin()` to properly return user object

### Added
- Database migration script: `add_text_extraction_error_tracking.sql`
- Error type categorization: `not_found`, `missing_file`, `conversion_required`, `insufficient_text`, `database_error`, `extraction_error`
- Status badge helper function for consistent UI display
- Manual extraction handler with loading states and success feedback

### Changed
- Quiz generation now uses `getSupabaseAdminClient()` instead of `createSupabaseServerClient()`
- Student quiz page checks user role and uses admin client for librarians/admins
- Extraction button only appears when `textExtractedAt` is null
- Quiz queries split into separate operations to avoid RLS policy conflicts

### Technical Details

**Files Modified:**
- `database-setup.sql` - Added error tracking columns and index
- `web/src/app/(dashboard)/dashboard/librarian/actions.ts` - Enhanced extractBookText() with error handling
- `web/src/components/dashboard/BookManager.tsx` - Added status column and extract button
- `web/src/app/(dashboard)/dashboard/librarian/page.tsx` - Updated data fetching for new columns
- `web/src/components/dashboard/BookQuizManagement.tsx` - Enhanced warning panel
- `web/src/components/dashboard/BookUploadForm.tsx` - Better error messages
- `web/src/lib/pdf-extractor.ts` - Fixed PDF.js worker configuration
- `web/src/app/(dashboard)/dashboard/student/quiz/[quizId]/page.tsx` - RLS bypass for admins

**Error Types Handled:**
```typescript
- not_found: Book doesn't exist
- missing_file: No PDF URL
- conversion_required: EPUB/MOBI needs rendering first
- insufficient_text: Image-based PDF (< 10 words extracted)
- database_error: Failed to save results
- extraction_error: PDF processing failed
```

### Migration Required

Run this SQL in Supabase to add error tracking:
```sql
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS text_extraction_error TEXT,
ADD COLUMN IF NOT EXISTS text_extraction_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_extraction_attempt_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_books_extraction_failed 
ON books(text_extraction_error) 
WHERE text_extraction_error IS NOT NULL;
```

---

## [1.2.0] - 2025-11-25

### Added

#### Responsive Mobile UI & Fullscreen Reading Mode
- **Mobile-responsive layout** with automatic orientation detection
- **Portrait mode optimization** - Single-page view on mobile devices in portrait orientation
- **Landscape/desktop optimization** - Spread (two-page) view on landscape and desktop screens
- **Hamburger menu** with React portal implementation to fix z-index stacking issues
- **Immersive fullscreen reading mode** for distraction-free reading experience
- **Floating exit button** as the only UI element in fullscreen mode
- **Pure white background** in fullscreen with all decorative elements removed
- **Auto-adaptive layout** - Automatically switches between single-page and spread views based on screen orientation
- **Maximized screen usage** - 20px minimal padding in fullscreen mode
- **3D page flip shadow effect** maintained in all viewing modes
- **Dynamic page dimensions** calculated based on viewport size for optimal readability

#### Mobile Reading Experience
- Viewport orientation detection with automatic layout adjustments
- Single-page view fills screen width in portrait mode
- Properly sized pages with 1.4:1 aspect ratio for book pages
- Dynamic key prop to force re-render on orientation changes
- Preserved current page position when toggling between modes
- Touch-friendly navigation controls (44px minimum tap targets)

#### Fullscreen Features
- Cross-browser fullscreen API support (webkit, moz, ms)
- Hide all UI elements: navigation controls, settings panel, progress bar
- Pure white page backgrounds (no amber/golden tones)
- Minimal visual clutter for immersive reading
- Portrait fullscreen: Single page maximizes full screen height
- Landscape fullscreen: Spread view with both pages maximized
- ESC key support to exit fullscreen

### Changed
- Refactored FlipBook reader dimensions for better responsiveness
- Updated container styling to adapt based on viewing mode
- Modified page background styling to be pure white in fullscreen
- Improved z-index management using React portals for mobile menu

### Fixed
- **Mobile menu z-index issue** - Menu now appears above all page content using React portal
- **Portrait mode spread view** - Correctly shows single page instead of cramped spread
- **Non-fullscreen dimensions** - Restored proper page sizing in normal viewing mode
- **Fullscreen screen usage** - Eliminated excessive blank space around pages
- **Page flip effect in fullscreen** - Re-enabled 3D shadow effect for realistic book experience
- **Reading progress restoration** - Fixed database query to correctly load saved reading position
  - Removed non-existent `updated_at` column from query
  - Added `useEffect` to sync `currentPage` state when `initialPage` prop changes
  - Books now correctly resume from last read page when reopening

### Technical Details

**Files Modified:**
- `web/src/components/dashboard/FlipBookReader.tsx` - Complete responsive and fullscreen implementation, spread view sizing fixes
- `web/src/components/dashboard/MobileNav.tsx` - Portal implementation for z-index fix
- `web/src/app/(dashboard)/dashboard/student/read/[bookId]/page.tsx` - Fixed progress query
- `web/src/app/(dashboard)/dashboard/student/actions.ts` - Added revalidatePath for book pages

**Key Features:**
```typescript
// Responsive dimension calculation
- Portrait mobile: 300-500px width (viewport - 60px)
- Landscape/desktop: 500x700px base dimensions
- Fullscreen portrait: Maximizes height, width = height / 1.4
- Fullscreen landscape: Both pages maximize height

// Fullscreen API support
- Standard: requestFullscreen / exitFullscreen
- WebKit: webkitRequestFullscreen / webkitExitFullscreen
- Mozilla: mozRequestFullScreen / mozCancelFullScreen
- Microsoft: msRequestFullscreen / msExitFullscreen
```

**Component Structure:**
```
- Container with viewport detection hooks
- Floating exit button (fullscreen only)
- Navigation controls (hidden in fullscreen)
- Settings panel (hidden in fullscreen)
- FlipBook with dynamic dimensions
- Progress bar (hidden in fullscreen)
```

### Performance
- Orientation detection with resize and orientationchange event listeners
- Fullscreen state tracking with multiple browser event listeners
- Dynamic re-rendering only when orientation or fullscreen state changes
- Preserved page position across mode transitions

---

## [1.1.0] - 2025-11-24

### Added

#### Multi-Format E-book Support
- **MOBI format support** - Mobipocket format (older Kindle books)
- **AZW format support** - Amazon Kindle format
- **AZW3 format support** - Kindle Format 8 (newer format with better ToC support)
- File type detection using magic numbers (validates "BOOKMOBI" signature at offset 60)
- Format-specific validation and error messages
- Color-coded format badges (MOBI: orange, AZW: amber, AZW3: yellow)

#### Conversion Pipeline
- New API endpoint `/api/convert-mobi` for Kindle format conversion
- Calibre-based MOBI/AZW/AZW3 → PDF conversion with Kindle-optimized settings
- Automatic page rendering from converted PDFs
- Text extraction for AI quiz generation from all Kindle formats
- Progress tracking during conversion process

#### Database Updates
- Extended `file_format` column to support: `'pdf', 'epub', 'mobi', 'azw', 'azw3'`
- Migration scripts for database schema updates
- Updated file format constraints and documentation

#### UI Improvements
- Updated file upload form to accept `.mobi`, `.azw`, `.azw3` extensions
- Format-specific detection messages during upload
- Real-time conversion progress indicators
- Format badges displaying detected e-book type

### Technical Details

**Files Modified:**
- `web/src/lib/file-type-detector.ts` - Added MOBI/AZW detection logic
- `web/src/app/api/convert-mobi/route.ts` - New conversion endpoint
- `web/src/app/(dashboard)/dashboard/librarian/actions.ts` - Added `convertMobiToImages()`
- `web/src/components/dashboard/BookUploadForm.tsx` - UI updates for MOBI support
- `migrations/add-mobi-azw-support.sql` - Database migration

**Calibre Conversion Settings:**
```bash
ebook-convert input.mobi output.pdf \
  --output-profile kindle \
  --paper-size a4 \
  --pdf-default-font-size 18 \
  --margin-left 20 --margin-right 20 \
  --margin-top 20 --margin-bottom 20
```

### Architecture

All Kindle formats follow the unified conversion pipeline:
```
MOBI/AZW/AZW3 → Calibre → PDF → Page Images → Text Extraction → AI Quizzes
```

This approach:
- ✅ Reuses 95% of existing EPUB infrastructure
- ✅ Maintains consistency across all e-book formats
- ✅ Requires no Docker changes (Calibre already installed)
- ✅ Enables AI quiz generation for all formats

### Performance

- MOBI conversion: ~10-30 seconds (typical)
- AZW conversion: ~10-30 seconds (typical)
- AZW3 conversion: ~15-40 seconds (larger files)
- Page rendering: Same as PDF/EPUB (5-10 min for typical book)

### Known Limitations

- DRM-protected Kindle books cannot be converted (Calibre limitation)
- Page count not available until after conversion (same as EPUB)
- 50MB file size limit (typical Kindle books are 1-5MB)

### Migration Notes

**Database Migration Required:**
Run `migrations/add-mobi-azw-support.sql` in Supabase SQL Editor to enable MOBI/AZW support.

```sql
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_file_format_check;
ALTER TABLE books ADD CONSTRAINT books_file_format_check 
  CHECK (file_format IN ('pdf', 'epub', 'mobi', 'azw', 'azw3'));
```

---

## [1.0.0] - 2025-11-20

### 🎉 Initial Release - MVP Complete!

Reading Buddy v1.0.0 marks the successful completion of the Minimum Viable Product with all core features implemented and ready for production use.

### Added

#### Infrastructure & Setup
- MinIO server deployment on Proxmox for self-hosted file storage
- Reverse proxy configuration with SSL/HTTPS
- DNS and firewall configuration for secure access

#### Backend & Database
- Supabase project with complete PostgreSQL schema
- Row Level Security (RLS) policies for all tables
- Database tables: `profiles`, `books`, `classes`, `student_books`, `quizzes`, `quiz_attempts`, `badges`, `student_badges`
- Automatic profile creation via SQL triggers
- Google OAuth authentication integration

#### Frontend & UI
- Next.js 15+ project with App Router
- TypeScript implementation throughout
- Tailwind CSS styling system
- shadcn/ui component library integration
- Responsive design for desktop and tablet

#### Authentication & Authorization
- Login page with email/password authentication
- Sign Up page with profile creation
- Password reset functionality
- Google OAuth sign-in
- Route protection middleware
- Role-based access control (Student, Teacher, Librarian, Admin)

#### Librarian Features
- Librarian dashboard with book management interface
- Book upload form (PDF + cover image)
- MinIO presigned URL upload workflow
- Book metadata management (title, author, grade level, description)
- Library view showing all uploaded books
- Book editing and deletion capabilities

#### Student Features
- Student dashboard with assigned books
- PDF reader using react-pdf
- Page-by-page navigation
- Reading progress tracking (current page saved automatically)
- Basic achievement/badge system
- Quiz-taking interface
- Quiz results and score tracking

#### Teacher Features
- Teacher dashboard with class overview
- Student progress monitoring
- Reading progress visualization
- Quiz score tracking per student
- Classroom management (view assigned students)

#### Admin Features
- Admin dashboard
- User management interface
- Role assignment and modification
- System overview and statistics

#### AI Features
- Google Gemini API integration
- AI-powered quiz generation from book content
- Quiz question generation with multiple-choice format
- Automatic quiz storage in database
- Quiz checkpoint system

#### Gamification
- Basic badge system (6 default badges)
- Badge database schema (`badges` and `student_badges` tables)
- Achievement tracking foundation
- Badge icon storage in MinIO

### Technical Details

#### Stack
- **Frontend:** Next.js 15+, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Authentication)
- **Storage:** MinIO (Self-hosted)
- **AI:** Google Gemini API
- **PDF Rendering:** react-pdf

#### Security
- Row Level Security (RLS) policies on all database tables
- Secure authentication with Supabase Auth
- Protected routes with middleware
- Environment variable configuration for sensitive data
- HTTPS/SSL for all connections

#### Performance
- Presigned URL uploads (direct client-to-MinIO)
- Optimized database queries
- Server-side rendering where appropriate
- Lazy loading for book images

### Database Schema

```sql
-- Core tables implemented:
- profiles (user data and roles)
- books (book metadata and file URLs)
- classes (classroom information)
- student_books (reading progress tracking)
- quizzes (AI-generated quiz data)
- quiz_attempts (student quiz submissions)
- badges (achievement badges)
- student_badges (earned badges per student)
```

### Known Limitations

- PDF-only format support (EPUB, MOBI not yet supported)
- Basic badge system (not fully integrated into student dashboard)
- Legacy `achievements` table still in use (planned migration to `badges`)
- Limited analytics and reporting features
- No mobile app (web-only)
- Single AI provider (Google Gemini only)
- 19 TypeScript `any` types that need addressing

### Success Criteria - All Met ✅

- ✅ Librarians can upload PDFs and cover images to MinIO
- ✅ Students can log in and read books via react-pdf
- ✅ Teachers can view student reading progress
- ✅ AI quizzes can be generated and taken by students
- ✅ Role-based access control functioning properly
- ✅ Reading progress tracking working correctly
- ✅ Basic gamification with badges operational

### Notes

This release represents the completion of all 6 planned development phases:
- Phase 0: Infrastructure Setup
- Phase 1: Project Scaffolding & Core Backend
- Phase 2: Authentication & User Roles
- Phase 3: Librarian & Book Management
- Phase 4: Student Reader & Gamification
- Phase 5: AI Quiz Generation
- Phase 6: Teacher & Admin Dashboards

### Migration Notes

This is the initial release. No migration required.

### Contributors

- Faisal Nur Hidayat (Lead Developer & Maintainer)

---

### Planned for v1.4.0 - Enhanced UX & Gamification

#### Planned
- BYOAI (Bring Your Own AI) support
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude 3.5, Claude 3)
  - Ollama (local LLM support)
- Personalized quiz difficulty based on student performance
- AI-generated book summaries
- Advanced badge types and tiers (Bronze, Silver, Gold, Platinum)
- Reading challenges system
- Enhanced leaderboard features
- Migrate from legacy `achievements` to `badges` system
- Enhanced student dashboard with XP, levels, and badges
- Reading streak tracking (daily reading consistency)
- Leaderboards (global, class, grade level)
- Dark mode for reader

### Planned for v1.5.0 - Content & Competition

#### Planned
- Class vs class competitions
- Bulk book upload functionality
- Book series management
- Advanced search and filtering
- Curated reading lists and collections
- Teacher analytics dashboard
- Enhanced reporting features

### Planned for v1.6.0 - Advanced Features

#### Planned
- EPUB file support
- DOCX (Word document) support
- CBZ/CBR (Comic book) format support
- ODT (OpenDocument) support
- Advanced search and filtering
- Curated reading lists

### Planned for v2.0.0 - Major Architecture Changes

#### Planned
- Image-only storage architecture (remove PDF storage requirement)
- Full self-hosted option (replace Supabase with PostgreSQL + Keycloak/Authentik)
- Mobile apps (iOS and Android with React Native)
- Social and collaborative features
- Plugin system for extensibility
- Advanced AI features
- Multi-language support (i18n)

---

## Version History Summary

| Version | Release Date | Milestone |
|---------|--------------|-----------|
| 1.2.1   | 2025-12-04   | 🔧 Text Extraction & Quiz System Fixes |
| 1.2.0   | 2025-11-25   | 📱 Mobile Responsive UI & Immersive Fullscreen Reading + Progress Fixes |
| 1.1.0   | 2025-11-24   | 📚 Multi-Format Support - MOBI/AZW/AZW3 |
| 1.0.0   | 2025-11-20   | 🎉 MVP Complete - Initial Production Release |

---

## Semantic Versioning Guide

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0): Incompatible API changes or major architecture changes
- **MINOR** version (0.X.0): New features in a backward-compatible manner
- **PATCH** version (0.0.X): Backward-compatible bug fixes

---

## Contributing

See [Project-Roadmap.md](./Project-Roadmap.md) for the full development roadmap and contribution guidelines.

For bug reports and feature requests, please open an issue on GitHub.

---

**Maintainer:** Faisal Nur Hidayat  
**Last Updated:** December 4, 2025

--- 
### Original File: notes//2024-12-14/roadmap/UX-IMPROVEMENT-ROADMAP.md

# UI/UX Improvement Roadmap - v1.6.0+

> **Current Branch:** `ui-improvement`  
> **Base Version:** v1.5.0  
> **Target Version:** v1.6.0 and beyond  
> **Last Updated:** December 11, 2025  
> **Status:** In Progress — Priority 3 (Enhanced UI Components) underway

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What's Been Improved (v1.6.0 Progress)](#whats-been-improved-v160-progress)
3. [Identified Gaps](#identified-gaps)
4. [✅ Priority 1: Dashboard Content Enrichment](#priority-1-dashboard-content-enrichment-completed-dec-11-2025)
5. [⏳ Priority 2: Navigation & User Flow](#priority-2-navigation--user-flow-deferred-to-v170)
6. [🎯 Priority 3: Enhanced UI Components](#priority-3-enhanced-ui-components-current-in-progress)
7. [⏳ Priority 4: Reading Experience](#priority-4-reading-experience-deferred-to-v170)
8. [⏳ Priority 5: Library Page Redesign](#priority-5-library-page-redesign-deferred-to-v170)
9. [⏳ Priority 6: Accessibility & Performance](#priority-6-accessibility--performance-deferred-to-v170)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Success Metrics](#success-metrics)
12. [Comparison Summary](#comparison-summary)

---

## Executive Summary

The `ui-improvement` branch has made significant progress toward v1.6.0 completion with core dashboard widgets, gamification features, and design system foundation in place.

**Current State:**
- ✅ Design system foundation (6 UI components)
- ✅ Login page redesign with broadcast system
- ✅ Admin dashboard widgets (stats, activity, health, actions) - **NEW Dec 11, 2025**
- ✅ Admin broadcast manager
- ✅ Teacher dashboard analytics (class overview, assignments, heatmap)
- ✅ Student gamification (leaderboards, weekly challenges)
- 🎯 Component library (skeleton, tables, charts, modals) - **IN PROGRESS**
- ⏳ Navigation enhancements (breadcrumbs, quick switcher) - Deferred to v1.7.0+
- ⏳ Reading experience features - Deferred to v1.7.0+

**Completion Status:** ~65% of v1.6.0 goals achieved (updated from 40%)

---

## What's Been Improved (v1.6.0 Progress)

### ✅ Design System Foundation

**New Components** (`web/src/components/ui/`):
- **Button** - 6 variants (primary, secondary, neutral, outline, ghost, danger), loading states, icon support
- **Card** - 3 variants (frosted, playful, glow), flexible padding system
- **Alert** - 4 variants (info, success, warning, error) with icons and titles
- **Badge** - 6 variants (bubble, sky, lime, amber, neutral, outline), 2 sizes
- **Input/Label** - Unified form styling with focus states and validation
- **Index** - Centralized exports

**Design Language:**
- Playful, vibrant color palette (purple, pink, yellow, amber gradients)
- 3D effects with box shadows (depth perception)
- Consistent border radius (12-28px for friendly feel)
- Frosted glass effects (backdrop-blur for modern look)
- 4px border thickness for emphasis
- Gradient backgrounds for visual interest

### ✅ Authentication Pages Redesign

**LoginForm.tsx** - Major Overhaul:
- Two-column layout (sign-in + announcement panel)
- **Broadcast System Integration** - Dynamic login announcements
- Tone-based styling (info, success, warning, alert)
- Custom Google logo SVG component
- Enhanced error handling with Alert component
- Professional gradient styling
- Improved responsive design

**Benefits:**
- Admins can publish system announcements
- Better first impression for users
- Clear communication channel for maintenance/updates

### ✅ Admin Dashboard Enhancement (December 11, 2025)

**Completed Widgets:**
- ✅ **SystemStatsCards** - User counts by role, total books, active readers
- ✅ **RecentActivityFeed** - Real-time activity stream with event tracking
- ✅ **SystemHealthPanel** - Storage usage, AI provider status, database health
- ✅ **QuickActionsPanel** - Shortcuts for common admin tasks

**Database Schema:**
- `login_broadcasts` table for announcement system
- Navigation links for "Manage Badges" and "Login Messages"
- Improved header with gradient backgrounds

**Deferred to v1.7.0+:**
- ⏳ Usage analytics charts (Recharts implementation)
- ⏳ Alert center with notification aggregation

### ✅ Dashboard Layout Cleanup

**Changes:**
- Removed emoji clutter from role labels
- Cleaner professional appearance
- Consistent spacing and formatting
- Better responsive behavior

### ✅ Gamification Features (December 10, 2025)

**Leaderboard System:**
- ✅ Separate global leaderboards for students vs staff
- ✅ Student leaderboard with medals (🥇🥈🥉) and ranking
- ✅ Staff leaderboard with icons (👑⭐🌟) for teachers/librarians/admins
- ✅ Integrated into main dashboard page
- ✅ Full leaderboard page at `/dashboard/leaderboard`
- ✅ Real-time XP, level, books completed, and pages read stats

**Weekly Challenge System:**
- ✅ 6 rotating weekly challenges (automatic rotation)
- ✅ Challenge types: pages, books, quizzes, streaks, perfect scores
- ✅ XP rewards: 200-300 XP per challenge
- ✅ Progress tracking with visual progress bar
- ✅ Auto-award XP when completed
- ✅ One-time completion per week (prevents farming)
- ✅ WeeklyChallengeCard component on student dashboard
- ✅ Database tracking via `weekly_challenge_completions` table

**Database Updates:**
- ✅ Gamification columns added to profiles table (xp, level, streaks, etc.)
- ✅ Migration scripts for backfilling XP from transactions
- ✅ Weekly challenge completions table with RLS policies
- ✅ Updated database-setup.sql and documentation

**Bug Fixes:**
- ✅ Fixed "last page" detection in BookReader (now uses pageImages.count)
- ✅ Fixed leaderboard showing 0 XP (field name mismatch)
- ✅ Added retry logic for transient Supabase auth failures

### ✅ Teacher Dashboard Analytics (December 10, 2025)

**Completed Components:**
- ✅ **ClassAnalyticsOverview** - Average reading time, completion rates, engagement scores
- ✅ **AssignmentTrackingDashboard** - Pending reviews, overdue submissions, grading interface
- ✅ **StudentPerformanceHeatmap** - Visual matrix of student performance

**Deferred to v1.7.0+:**
- ⏳ Quick class management tools (bulk operations, CSV import)
- ⏳ Reading assignment calendar view
- ⏳ Enhanced bulk operations interface

---

## Identified Gaps

### Critical Missing Features (from v1.6.0 Roadmap)

#### Dashboard Content - Mostly Complete ✅

**Admin Dashboard:**
- ✅ System statistics cards (users by role, total books, active readers) - **Completed Dec 11, 2025**
- ✅ Recent activity feed - **Completed Dec 11, 2025**
- ✅ System health indicators - **Completed Dec 11, 2025**
- ✅ Quick action panel - **Completed Dec 11, 2025**
- ⏳ Usage analytics charts (Deferred to v1.7.0+)
- ⏳ Alert center (Deferred to v1.7.0+)

**Student Dashboard:**
- ⏳ Personalized book recommendations (Deferred to v1.7.0+)
- ⏳ Reading progress charts (Deferred to v1.7.0+)
- ✅ Class & global leaderboards (Completed Dec 10, 2025)
- ⏳ Enhanced achievement showcase (Deferred to v1.7.0+)
- ⏳ Reading goals tracker (Deferred to v1.7.0+)
- ✅ Continue reading section with previews (Already exists)
- ✅ Weekly reading challenges (Completed Dec 10, 2025)

**Teacher Dashboard:**
- ✅ Class analytics overview (Completed Dec 10, 2025)
- ✅ Assignment tracking dashboard (Completed Dec 10, 2025)
- ✅ Student performance heatmap (Completed Dec 10, 2025)
- ⏳ Quick class management tools (Deferred to v1.7.0+)
- ⏳ Reading assignment calendar (Deferred to v1.7.0+)
- ⏳ Bulk operations interface (Deferred to v1.7.0+)

**Librarian Dashboard:**
- ⏳ Upload statistics widget (Deferred to v1.7.0+)
- ⏳ Popular books section (Deferred to v1.7.0+)
- ⏳ Content moderation queue (Deferred to v1.7.0+)
- ⏳ Batch operations UI (Deferred to v1.7.0+)
- ⏳ AI generation analytics (Deferred to v1.7.0+)

#### Navigation & User Flow - Deferred ⏳
- ⏳ Breadcrumb navigation (Deferred to v1.7.0+)
- ⏳ Quick switcher (Cmd/Ctrl+K) (Deferred to v1.7.0+)
- ⏳ Contextual help system (Deferred to v1.7.0+)
- ⏳ Notification center dropdown (Deferred to v1.7.0+)

#### Component Library - **CURRENT PRIORITY** 🎯
- ❌ Skeleton loading states (In Progress)
- ❌ Data table with sorting/filtering (In Progress)
- ❌ Chart components (In Progress)
- ❌ Modal/dialog improvements (In Progress)
- ❌ Search with autocomplete (In Progress)
- ❌ Empty state component (In Progress)

#### Reading Experience - Deferred ⏳
- ⏳ Bookmarks with notes (Deferred to v1.7.0+)
- ⏳ Dark mode / reading themes (Deferred to v1.7.0+)
- ⏳ Font customization (Deferred to v1.7.0+)
- ⏳ Better resume reading UI (Deferred to v1.7.0+)

#### Accessibility - Deferred ⏳
- ⏳ Keyboard navigation improvements (Deferred to v1.7.0+)
- ⏳ ARIA labels enhancement (Deferred to v1.7.0+)
- ⏳ Color contrast audit (Deferred to v1.7.0+)
- ⏳ Screen reader optimization (Deferred to v1.7.0+)

---

## ✅ Priority 1: Dashboard Content Enrichment (Completed Dec 11, 2025)

**Goal:** Transform minimal dashboards into information-rich, actionable interfaces.

**Status:** ✅ Core admin dashboard widgets completed. Student/Teacher/Librarian enhancements deferred to v1.7.0+ as they require additional features (charts, advanced analytics, bulk operations).

### ✅ 1.1 Admin Dashboard Widgets (Completed Dec 11, 2025)

All core admin dashboard components have been implemented:

- ✅ **SystemStatsCards** - Displays user counts by role, total books, active readers
- ✅ **RecentActivityFeed** - Shows recent system events in real-time
- ✅ **SystemHealthPanel** - Monitors storage, AI provider status, database health
- ✅ **QuickActionsPanel** - Provides shortcuts to common admin tasks

### ⏳ 1.2 Student Dashboard Enhancements (Deferred to v1.7.0+)

**Note:** Core gamification features (leaderboards, weekly challenges) already completed. Additional enhancements below moved to future release.

**Deferred Components:**
- PersonalizedRecommendations (requires ML/recommendation engine)
- ReadingProgressCharts (requires chart library - Priority 3)
- ReadingGoalsTracker (requires goal management system)
- Enhanced achievement showcase

### ⏳ 1.3 Teacher Dashboard Enhancements (Deferred to v1.7.0+)

**Note:** Core analytics features (class overview, assignment tracking, performance heatmap) already completed. Additional enhancements below moved to future release.

**Deferred Components:**
- QuickClassManagement (bulk operations, CSV import)
- ReadingAssignmentCalendar (requires calendar library)
- Advanced bulk operations interface

### ⏳ 1.4 Librarian Dashboard Enhancements (Deferred to v1.7.0+)

All librarian-specific dashboard enhancements have been deferred to v1.7.0+ to focus on core component library development.

**Deferred Components:**
- UploadStatistics (requires chart library - Priority 3)
- PopularBooksWidget (requires analytics aggregation)
- RecentUploadsWithStatus (requires real-time monitoring)
- ContentModerationQueue
- AI generation analytics

---

## ⏳ Priority 2: Navigation & User Flow (Deferred to v1.7.0+)

**Goal:** Improve discoverability and reduce clicks to common actions.

**Status:** Deferred to future release to focus on core component library first (Priority 3).

**Deferred Components:**
- BreadcrumbNavigation
- QuickSwitcher (Cmd/Ctrl+K)
- ContextualHelpSystem
- NotificationCenter

---

## 🎯 Priority 3: Enhanced UI Components (CURRENT - In Progress)

**Goal:** Build reusable, production-ready components for consistent UX across all dashboards.

**Status:** **ACTIVE** - This is the current development focus for v1.6.0 completion.

**Rationale:** These components are foundational and required by many deferred features (charts for analytics, tables for data display, modals for forms, etc.). Building these first enables faster development of future features.

### 3.1 SkeletonLoader Components

```typescript
// File: web/src/components/ui/skeleton.tsx

Components:
- Skeleton (base component)
- SkeletonCard
- SkeletonTable
- SkeletonList
- SkeletonAvatar
- SkeletonText

Features:
- Shimmer animation effect
- Configurable size and shape
- Matches real content dimensions
- Accessible (aria-busy, aria-live)

Implementation:
1. Create base Skeleton component with animation
2. Build specialized skeleton components
3. Use in loading states throughout app
4. Add to UI library exports
```

### 3.2 DataTable Component (TanStack Table)

```typescript
// File: web/src/components/ui/data-table.tsx

Features:
- Sortable columns (click header)
- Column visibility toggle
- Advanced filtering (per column)
- Pagination with size options (10, 25, 50, 100)
- Bulk selection with checkboxes
- Export to CSV/Excel/PDF
- Sticky header on scroll
- Expandable rows (optional)
- Row actions menu
- Search across all columns

Design:
- Clean table styling
- Hover states on rows
- Sort indicators (↑↓)
- Filter icons on headers
- Checkbox column
- Responsive (horizontal scroll on mobile)

Implementation:
1. Install @tanstack/react-table
2. Create base DataTable component
3. Add sorting, filtering, pagination
4. Build column configuration system
5. Implement bulk actions
6. Add export functionality (react-csv, jspdf)
7. Create example usage docs
```

### 3.3 Chart Components (Recharts)

```typescript
// Files: web/src/components/charts/*

Components:
- LineChart (time series)
- BarChart (comparisons)
- DonutChart (proportions)
- PieChart (composition)
- AreaChart (trends)
- HeatmapCalendar (GitHub-style)

Features:
- Responsive sizing
- Interactive tooltips
- Legends
- Color themes
- Loading states
- Empty states ("No data")
- Export as image (PNG)

Implementation:
1. Install recharts
2. Create wrapper components for each chart type
3. Build consistent color palette
4. Add responsive container
5. Implement tooltip customization
6. Add accessibility labels
7. Create chart utils (data transformation)
```

### 3.4 Modal/Dialog Improvements

```typescript
// File: web/src/components/ui/dialog.tsx

Features:
- Slide-over panels (drawer from right)
- Stacked modal management (multiple modals)
- Better loading states within modals
- Keyboard shortcuts (Esc to close, Tab navigation)
- Focus trap (keyboard navigation contained)
- Click outside to close (optional)
- Animation transitions (slide, fade, scale)

Design:
- Overlay backdrop (blur + darken)
- Centered modal or slide-over
- Header with title + close button
- Scrollable content area
- Footer with actions
- Responsive sizing

Implementation:
1. Install @radix-ui/react-dialog or headlessui
2. Create Dialog component
3. Add SlideOver variant
4. Implement focus trap
5. Add keyboard navigation
6. Create DialogHeader, DialogContent, DialogFooter
7. Build stacking context manager
```

### 3.5 SearchBar with Autocomplete

```typescript
// File: web/src/components/ui/search-bar.tsx

Features:
- Debounced input (300ms delay)
- Autocomplete suggestions dropdown
- Recent searches (stored in localStorage)
- Search history
- Filter chips (active filters)
- Clear button
- Loading indicator
- Keyboard navigation (arrow keys, Enter)

Design:
- Rounded search input with icon
- Dropdown below input
- Highlighted matching text
- Category headers in suggestions
- Recent searches section
- Keyboard shortcut hint (Cmd+K)

Implementation:
1. Create SearchBar component
2. Implement debouncing (use-debounce)
3. Build suggestions dropdown
4. Add localStorage for recent searches
5. Implement keyboard navigation
6. Add loading state
7. Integrate with existing search
```

### 3.6 EmptyState Component

```typescript
// File: web/src/components/ui/empty-state.tsx

Features:
- Illustration or icon
- Contextual message
- Call-to-action button
- Context-specific variants
- Responsive sizing

Variants:
- NoBooks ("No books yet? Upload your first book!")
- NoStudents ("No students in this class yet.")
- NoResults ("No search results found.")
- NoNotifications ("All caught up!")
- Error ("Something went wrong. Try again.")

Design:
- Centered layout
- Large icon (illustration)
- Headline text
- Description text
- CTA button
- Subtle background

Implementation:
1. Create EmptyState component
2. Build variant system
3. Add illustrations (use undraw.co or custom)
4. Create presets for common cases
5. Add to component library
```

---

## ⏳ Priority 4: Reading Experience (Deferred to v1.7.0+)

**Goal:** Enhance the book reading experience with modern features.

**Status:** Deferred to future release.

**Deferred Features:**
- Bookmark system with notes
- Dark mode / Reading mode themes
- Font customization (size, family, spacing)
- Better resume reading UI with page previews

---

## ⏳ Priority 5: Library Page Redesign (Deferred to v1.7.0+)

**Goal:** Improve book discovery and browsing experience.

**Status:** Deferred to future release.

**Deferred Features:**
- View mode toggle (Grid/List/Compact)
- Advanced filtering system
- Book preview on hover
- Improved pagination with infinite scroll
- Bulk selection for librarians/teachers

---

## ⏳ Priority 6: Accessibility & Performance (Deferred to v1.7.0+)

**Goal:** Ensure WCAG 2.1 AA compliance and optimize performance.

**Status:** Deferred to future release.

**Deferred Tasks:**
- Keyboard navigation improvements
- ARIA labels and semantic HTML
- Color contrast audit
- Screen reader optimization
- Image optimization and lazy loading
- Code splitting and caching strategies
- Database query optimization
- Lighthouse audit compliance

---

## Implementation Roadmap

### ✅ Completed (Dec 11, 2025)
- ✅ Admin dashboard widgets (SystemStatsCards, RecentActivityFeed, SystemHealthPanel, QuickActionsPanel)
- ✅ Teacher dashboard analytics (ClassAnalyticsOverview, AssignmentTrackingDashboard, StudentPerformanceHeatmap)
- ✅ Student gamification (Leaderboards, Weekly Challenges)
- ✅ Design system foundation (6 UI components)
- ✅ Authentication redesign with broadcast system

### 🎯 Current Sprint (v1.6.0 Completion)
**Priority 3: Enhanced UI Components** (Estimated: 40-50 hours)

**Week 1:**
- Day 1: Skeleton Loaders (6h)
- Day 2-3: DataTable with TanStack Table (16h)
  - Core table implementation (10h)
  - Export functionality (6h)

**Week 2:**
- Day 1-2: Chart Components with Recharts (8h)
- Day 3: Modal/Dialog improvements (6h)
- Day 4: SearchBar with autocomplete (6h)
- Day 5: EmptyState component + Testing (8h)

### ⏳ Future Releases (v1.7.0+)
- Priority 2: Navigation & User Flow
- Priority 4: Reading Experience
- Priority 5: Library Page Redesign
- Priority 6: Accessibility & Performance
- Additional dashboard enhancements (Student, Librarian)

---

## Success Metrics

### v1.6.0 Completion Criteria

**Must Have (Current Sprint):**
- ✅ Admin dashboard functional with core widgets
- ✅ Teacher analytics dashboard complete
- ✅ Student gamification features live
- 🎯 Component library complete (Skeleton, DataTable, Charts, Modals, Search, EmptyState)
- 🎯 All existing features using new component library

**Nice to Have (v1.7.0+):**
- Navigation enhancements (breadcrumbs, quick switcher)
- Reading experience improvements
- Library page redesign
- Additional dashboard features

### Quantitative Targets (v1.6.0)

**Dashboard Engagement:**
- Admin dashboard widget interaction > 50%
- Teacher analytics usage > 60% of teachers
- Student leaderboard views > 70% of active students

**Component Library:**
- All data tables use new DataTable component
- All charts use Recharts wrapper components
- All modals use improved Dialog component
- Loading states use Skeleton components

**Performance:**
- Page load time < 3s (current baseline)
- No critical accessibility violations
- Mobile responsive across all pages

---

## Comparison Summary

| Feature Category | Before v1.6.0 | Current (v1.6.0 Progress) | After Priority 3 | Gap Closed |
|------------------|---------------|---------------------------|------------------|------------|
| **Design System** | ❌ None | ✅ 6 components | ✅ 12+ components | 100% |
| **Auth Pages** | ⚠️ Basic | ✅ Redesigned + Broadcasts | ✅ Complete | 100% |
| **Admin Dashboard** | ⚠️ Minimal | ✅ 4 core widgets | ✅ Complete for v1.6.0 | 100% |
| **Student Dashboard** | ⚠️ Basic | ✅ Gamification complete | ✅ v1.6.0 goals met | 100% |
| **Teacher Dashboard** | ⚠️ Basic table | ✅ Analytics complete | ✅ v1.6.0 goals met | 100% |
| **Librarian Dashboard** | ⚠️ Table only | ⚠️ No change | ⏳ Deferred to v1.7.0+ | 0% |
| **Component Library** | ⚠️ Minimal | ⚠️ 6 components | ✅ 12+ components | 100% |
| **Navigation** | ✅ Basic nav | ✅ Basic nav | ⏳ Deferred to v1.7.0+ | 0% |
| **Reading Experience** | ✅ PDF reader | ✅ PDF reader | ⏳ Deferred to v1.7.0+ | 0% |

**Legend:**
- ❌ Missing (0-10% complete)
- ⚠️ Partial (10-60% complete)
- ✅ Complete (90-100% complete)
- ⏳ Deferred to future release
- 🎯 In progress

**Overall v1.6.0 Progress:**
- **Completed:** 65% (updated from 40%)
- **In Progress:** 20% (Priority 3 components)
- **Deferred:** 15% (moved to v1.7.0+)

---

## Dependencies to Add

### Required for Priority 3 (Current Sprint)

```json
{
  "@tanstack/react-table": "^8.11.0",
  "recharts": "^2.10.0",
  "@radix-ui/react-dialog": "^1.0.5",
  "react-csv": "^2.2.2",
  "jspdf": "^2.5.1",
  "jspdf-autotable": "^3.8.2",
  "use-debounce": "^10.0.0"
}
```

### Future Dependencies (v1.7.0+)

```json
{
  "@tanstack/react-query": "^5.17.0",
  "@radix-ui/react-popover": "^1.0.7",
  "react-hot-toast": "^2.4.1",
  "framer-motion": "^10.18.0",
  "fuse.js": "^7.0.0",
  "date-fns": "^3.0.0",
  "@axe-core/react": "^4.8.0",
  "react-intersection-observer": "^9.5.0"
}
```

---

## Technical Debt Considerations

### Items to Address During Priority 3

1. **Component Consistency**
   - Standardize prop naming across all components
   - Create consistent loading state patterns
   - Unified error handling approach

2. **TypeScript Improvements**
   - Add proper type definitions for chart data
   - Type-safe table column definitions
   - Remove `any` types from new components

3. **Documentation**
   - Add Storybook stories for each new component
   - Create usage examples
   - Document component props and variants

4. **Testing**
   - Unit tests for all new components
   - Integration tests for tables and charts
   - Accessibility tests (keyboard navigation, screen readers)

---

## Next Steps

### Immediate Actions (This Week)

1. **Install Dependencies**
   ```bash
   npm install @tanstack/react-table recharts @radix-ui/react-dialog react-csv jspdf jspdf-autotable use-debounce
   ```

2. **Create Component Structure**
   ```
   web/src/components/
   ├── ui/
   │   ├── skeleton.tsx (NEW)
   │   ├── data-table.tsx (NEW)
   │   ├── dialog.tsx (ENHANCE)
   │   ├── search-bar.tsx (NEW)
   │   └── empty-state.tsx (NEW)
   └── charts/
       ├── line-chart.tsx (NEW)
       ├── bar-chart.tsx (NEW)
       ├── donut-chart.tsx (NEW)
       └── pie-chart.tsx (NEW)
   ```

3. **Implementation Order**
   - Day 1: Skeleton components (foundation for loading states)
   - Day 2-3: DataTable (most requested feature)
   - Day 4-5: Charts (enables deferred analytics features)
   - Day 6: Modals (improves form UX)
   - Day 7: Search + EmptyState (polish)

### Weekly Milestones

**Week 1:**
- ✅ All skeleton components complete and in use
- ✅ DataTable component with sorting, filtering, pagination
- ✅ Export functionality working (CSV/PDF)

**Week 2:**
- ✅ All chart components complete
- ✅ Modal/Dialog enhancements done
- ✅ SearchBar and EmptyState components complete
- ✅ Documentation and tests complete

---

## Questions & Decisions

### Resolved
- ✅ Focus on component library before navigation features (Priority 3 before Priority 2)
- ✅ Defer Student/Teacher/Librarian enhancements to v1.7.0+ (requires components from Priority 3)
- ✅ Complete admin dashboard widgets in current sprint (enables system monitoring)

### Pending
- ❓ Chart library: Recharts vs Victory vs Chart.js (Recommendation: Recharts for React integration)
- ❓ Table library: TanStack Table vs react-table v7 (Recommendation: TanStack Table for modern features)
- ❓ Modal library: Radix UI vs Headless UI (Recommendation: Radix UI for better accessibility)

### For Future Discussion (v1.7.0+)
- State management: React Query vs Zustand for global state
- Navigation: React Router vs Next.js App Router patterns
- Real-time: Supabase Realtime vs WebSockets vs polling

---

**Document Status:** Living document - updated December 11, 2025  
**Next Review:** After Priority 3 completion (estimated 2 weeks)

--- 
### Original File: notes//2024-12-14/roadmap/Project-Roadmap.md

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
- **Weekly Challenges System** (v1.6.0) ✅

**Features Implemented:**
- **XP Sources:** Page reads (+1), Books (+100), Quizzes (+50-100), Streaks (+10-200), Weekly Challenges (+200-300)
- **Levels:** "Beginner Reader" to "Reading Legend"
- **Streak Tracking:** Daily streaks with milestone bonuses
- **Badge System:** Tiered badges with progress bars
- **Weekly Challenges:** 6 rotating challenges with automatic weekly rotation

#### Weekly Challenge System Details (v1.6.0) ✅
**Status:** ✅ Complete (December 10, 2025)

**Current Implementation:**
- **Automatic Rotation:** 6 hardcoded challenges that rotate weekly based on week number
- **Challenge Types:**
  1. Page Turner - Read 100 pages (200 XP)
  2. Avid Reader - Read 150 pages (300 XP)
  3. Book Worm - Complete 2 books (250 XP)
  4. Quiz Master - Complete 5 quizzes (200 XP)
  5. Week Warrior - Read 7 consecutive days (300 XP)
  6. Perfect Scholar - Get 3 perfect quiz scores (250 XP)
- **Progress Tracking:** Real-time calculation from existing data (xp_transactions, student_books, quiz_attempts)
- **Auto-Award XP:** Automatic XP reward when challenge is completed
- **One-Time Completion:** Each challenge can only be completed once per week (prevents farming)
- **Visual Feedback:** Progress bar, completion badge, XP display on student dashboard

**Future Enhancement Ideas:**
**Priority:** Medium | **Target:** v1.7.0 or later | **Status:** Planned

*Admin/Librarian Challenge Management:*
- **Challenge Creation Interface:**
  - Create custom challenges with configurable goals and XP rewards
  - Define challenge types (pages, books, quizzes, streaks, custom metrics)
  - Set challenge difficulty levels (Easy, Medium, Hard, Expert)
  - Add custom icons, titles, and descriptions
  
- **Challenge Scheduling:**
  - Schedule specific challenges for specific weeks
  - Create seasonal/themed challenges (Summer Reading Challenge, Holiday Marathon)
  - Set challenge duration (weekly, bi-weekly, monthly)
  - Define start/end dates for special events
  
- **Challenge Management Dashboard:**
  - View all active and upcoming challenges
  - Edit existing challenges
  - Enable/disable challenges
  - View completion statistics (how many students completed each challenge)
  - Analytics: completion rates, average progress, most popular challenges
  
- **Challenge Templates:**
  - Pre-built challenge templates for common scenarios
  - Duplicate and customize existing challenges
  - Import/export challenge configurations
  
- **Multiple Active Challenges:**
  - Allow multiple simultaneous challenges (e.g., weekly + monthly + special event)
  - Challenge categories (Reading, Quiz Mastery, Social, Special Events)
  - Student choice: select which challenges to participate in
  
- **Team Challenges:**
  - Class-based challenges (entire classroom competes)
  - School-wide challenges
  - Team leaderboards and collaborative goals

**Technical Implementation Notes:**
- Current system uses `weekly_challenge_completions` table to track completion
- Challenge definitions stored in code (`/web/src/lib/weekly-challenges.ts`)
- For admin management, would need new tables: `challenges`, `active_challenges`, `challenge_schedules`
- UI components already built: `WeeklyChallengeCard.tsx` (can be extended for multiple challenges)

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
- **Future Enhancements (v1.7.0+):**
  - System statistics cards (total users by role, total books, active readers)
  - Recent activity feed (new signups, uploads, quiz submissions)
  - System health indicators (storage usage, AI provider status, error rates)
  - Quick action panel (add user, upload book, manage badges, view reports)
  - Usage analytics charts (daily active users, books read per week)
  - Alert center (pending approvals, system issues, low storage warnings)

*Student Dashboard:*
- ✅ Class & global leaderboards with ranking (Completed v1.6.0 - Dec 10, 2025)
- ✅ Weekly reading challenge cards (Completed v1.6.0 - Dec 10, 2025)
- ✅ Continue reading section with visual page preview (Already exists)
- **Future Enhancements (v1.7.0+):**
  - Personalized book recommendations (based on reading history, genre preferences)
  - Reading progress charts (pages per day, books per month)
  - Expanded achievement showcase (badges in progress, next milestones)
  - Reading goals tracker (books per month, pages per day)
  - Friend activity feed (if social features added)

*Teacher Dashboard:*
- ✅ Class analytics overview (average reading time, completion rates, engagement) (Completed v1.6.0 - Dec 10, 2025)
- ✅ Assignment tracking (book and quiz progress monitoring) (Completed v1.6.0 - Dec 10, 2025)
- ✅ Student performance heatmap (identify struggling students) (Completed v1.6.0 - Dec 10, 2025)
- **Future Enhancements (v1.7.0+):**
  - Quick class management panel with shortcuts
    - One-click actions for common tasks (add student, assign book, create quiz)
    - Recent actions history
    - Pinned classes for quick access
  - Reading assignment calendar view
    - Visual calendar showing due dates and milestones
    - Drag-and-drop assignment scheduling
    - Integration with class schedule
  - Bulk operations interface
    - Assign quizzes to multiple classes at once
    - Export class reports (CSV, PDF)
    - Bulk student enrollment
    - Mass book assignments
  - Top performers and students needing help sections
    - Automatic identification of struggling students
    - Intervention recommendations
    - Success stories and achievements showcase
    - Parent notification system

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
**Focus:** Enhanced UI component library and core dashboard features

**Status:** In Progress (65% complete as of Dec 11, 2025)

#### ✅ Completed Features (Dec 11, 2025)
- **Admin Dashboard**
  - ✅ System-wide statistics cards (total users, books, active students)
  - ✅ Recent activity feed (new users, uploads, quiz completions)
  - ✅ Quick action shortcuts (add user, upload book, manage badges)
  - ✅ System health indicators (storage usage, AI provider status)
  
- **Student Dashboard**
  - ✅ Leaderboard widget (class ranking, global ranking) - Completed Dec 10, 2025
  - ✅ Weekly challenges with progress tracking - Completed Dec 10, 2025
  - ✅ Continue reading section with page preview - Already exists
  
- **Teacher Dashboard**
  - ✅ Class analytics overview (average reading time, completion rates) - Completed Dec 10, 2025
  - ✅ Assignment tracking dashboard (pending, in-progress, completed) - Completed Dec 10, 2025
  - ✅ Student performance heatmap - Completed Dec 10, 2025
  
#### 🎯 Current Priority: Enhanced UI Components
- **Component Library (In Progress)**
  - Skeleton loading states
  - Data table with sorting/filtering (TanStack Table)
  - Chart components (Recharts: Line, Bar, Donut, Pie)
  - Modal/Dialog improvements
  - Search bar with autocomplete
  - Empty state component

#### ⏳ Deferred to v1.7.0+ (Future Enhancements)
- **Student Dashboard Enhancements**
  - Personalized book recommendations based on reading history
  - Reading progress visualization (charts, graphs)
  - Achievement showcase (earned badges, milestones)
  - Reading goals and progress tracking

- **Teacher Dashboard Enhancements**
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

#### ⏳ Navigation & Flow Improvements (Deferred to v1.7.0+)
- Breadcrumb navigation for deep pages
- Quick switcher (Cmd/Ctrl+K) for power users
- Contextual help tooltips
- Advanced search with saved filters
- Library page view modes (Grid/List/Compact)
- Book preview on hover
- Advanced filtering system

#### ⏳ Reading Experience Enhancements (Deferred to v1.7.0+)
- Bookmarks with notes capability
- Dark mode / Reading mode themes
- Better resume reading (visual page preview)
- Reading position sync across devices
- Adjustable font size and spacing
- Progress indicator improvements

#### ⏳ Accessibility & Performance (Deferred to v1.7.0+)
- Keyboard navigation for all features
- Screen reader optimization (WCAG 2.1 AA)
- Color contrast compliance
- Image lazy loading and optimization
- Code splitting for faster initial load
- Caching strategies with React Query

### v1.7.0 (Q2 2026) - Advanced Dashboard Features & UX Polish
**Focus:** Complete deferred v1.6.0 features and add advanced functionality

#### Deferred v1.6.0 Features
- **Student Dashboard**
  - Personalized book recommendations (AI-powered)
  - Reading progress charts and analytics
  - Enhanced achievement showcase
  - Reading goals tracker with gamification

- **Teacher Dashboard**
  - Quick class management tools (bulk operations, CSV import)
  - Reading assignment calendar view
  - Advanced bulk operations interface

- **Librarian Dashboard**
  - Upload statistics with charts
  - Popular books widget
  - Recent uploads monitoring with real-time status
  - Content moderation queue
  - AI generation analytics

- **Navigation & User Flow**
  - Breadcrumb navigation system
  - Quick switcher (Cmd/Ctrl+K)
  - Contextual help system
  - Notification center with real-time updates

- **Library Page Redesign**
  - View mode toggle (Grid/List/Compact)
  - Advanced filtering system
  - Book preview on hover
  - Improved pagination with infinite scroll
  - Bulk selection for librarians/teachers

- **Reading Experience**
  - Bookmark system with notes
  - Dark mode / Reading mode themes
  - Font customization (size, family, spacing)
  - Better resume reading UI

- **Accessibility & Performance**
  - WCAG 2.1 AA compliance audit
  - Performance optimization (Lighthouse score > 90)
  - Complete keyboard navigation
  - Screen reader optimization

#### New Features
- Class vs class competitions
- Bulk book upload
- Book series management
- Reading lists/collections
- Extended AI provider support (OpenAI, Anthropic, Ollama)

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

--- 
### Original File: notes//2024-12-14/development/AUTH_COMPARISON.md

# Authentication Architecture: Detailed Comparison

**Date:** 2024-12-15  
**Purpose:** Compare authentication strategies for self-hosted Reading Buddy

---

## The Confusion: Keycloak vs NextAuth.js

**They're not competitors - they serve different roles:**

| Component | Role | Layer |
|-----------|------|-------|
| **Keycloak** | Identity Provider (IdP) | Backend authentication server |
| **NextAuth.js** | Authentication library | Next.js integration layer |

Think of it like this:
- **Keycloak** = Your own "Supabase Auth server"
- **NextAuth.js** = The client library that talks to it (like `@supabase/auth-helpers`)

---

## Architecture Options Compared

### Option 1: NextAuth.js + Keycloak (Recommended in Original Plan)

```
User → Next.js App → NextAuth.js → Keycloak → PostgreSQL
                                      ↓
                                  Google OAuth
```

**Pros:**
- ✅ Separation of concerns (auth server separate from app)
- ✅ Keycloak handles: password hashing, OAuth, email verification, MFA
- ✅ NextAuth.js handles: session management, JWT, cookies
- ✅ Multi-application support (future mobile app, admin panel)
- ✅ Advanced features: User federation, SSO, custom auth flows
- ✅ Admin UI for user management (non-technical admins)

**Cons:**
- ❌ Additional container to run (~512MB RAM)
- ❌ More complex architecture (3 services: DB, Keycloak, App)
- ❌ Learning curve for Keycloak configuration

**Best For:**
- Schools wanting centralized user management
- Future multi-app deployments (mobile, admin portal)
- Enterprises needing SSO/LDAP integration
- Non-technical admins managing users

---

### Option 2: NextAuth.js Alone (Simpler Alternative) ⭐ RECOMMENDED

```
User → Next.js App → NextAuth.js → PostgreSQL
                          ↓
                      Google OAuth
                      Email Provider
```

**How it works:**
- NextAuth.js stores users directly in PostgreSQL
- Built-in OAuth providers (Google, GitHub, etc.)
- Built-in email/password with credential provider
- Session management with JWT or database sessions

**Pros:**
- ✅ **Much simpler** - Only 2 containers (DB + App)
- ✅ **Lower resource usage** - Save ~512MB RAM
- ✅ **Faster deployment** - No Keycloak configuration
- ✅ **Native Next.js integration** - Built for App Router
- ✅ **All core features** - OAuth, email/password, sessions
- ✅ **Email verification** - Built-in with email provider
- ✅ **Password reset** - Built-in token-based flow

**Cons:**
- ❌ No admin UI (manage users via SQL or custom admin panel)
- ❌ No advanced features (user federation, SSO, LDAP)
- ❌ Single application focus

**Best For:**
- Individual schools self-hosting
- Simple deployments
- Resource-constrained environments
- 90% of use cases

---

### Option 3: Custom Auth (Not Recommended)

```
User → Next.js App → Custom Auth Code → PostgreSQL
```

**Pros:**
- ✅ Full control
- ✅ No dependencies

**Cons:**
- ❌ **Security risks** - DIY crypto is dangerous
- ❌ **2-4 weeks development time**
- ❌ **Ongoing maintenance burden**
- ❌ **Missing features** - OAuth, email verification, password reset
- ❌ **No MFA support**

**Verdict:** Don't do this. Use NextAuth.js at minimum.

---

## Detailed Comparison Table

| Feature | Keycloak + NextAuth | NextAuth Alone | Custom Auth |
|---------|---------------------|----------------|-------------|
| **Setup Complexity** | High | Low | Medium |
| **Resource Usage** | High (1.5-2GB RAM) | Low (700MB RAM) | Low |
| **OAuth (Google, etc.)** | ✅ Advanced | ✅ Built-in | ❌ DIY (2-3 days) |
| **Email/Password** | ✅ | ✅ | ❌ DIY (1 week) |
| **Password Hashing** | ✅ bcrypt | ✅ bcrypt | ❌ DIY (risky) |
| **Email Verification** | ✅ | ✅ | ❌ DIY (2 days) |
| **Password Reset** | ✅ | ✅ | ❌ DIY (2 days) |
| **Session Management** | ✅ | ✅ | ❌ DIY (3 days) |
| **Admin UI** | ✅ Beautiful | ❌ None | ❌ None |
| **User Management** | ✅ No-code | 🟡 SQL/API | 🟡 SQL/API |
| **MFA/2FA** | ✅ Built-in | 🟡 Manual integration | ❌ |
| **SSO** | ✅ SAML, OIDC | ❌ | ❌ |
| **LDAP/AD Integration** | ✅ | ❌ | ❌ |
| **User Federation** | ✅ | ❌ | ❌ |
| **Custom Auth Flows** | ✅ | 🟡 Limited | ✅ |
| **Multi-Tenancy** | ✅ Realms | 🟡 DIY | 🟡 DIY |
| **Audit Logs** | ✅ Built-in | 🟡 DIY | 🟡 DIY |
| **Role Management** | ✅ UI | 🟡 Database | 🟡 Database |
| **Production Ready** | ✅ Enterprise-grade | ✅ Battle-tested | ❌ |
| **Development Time** | 2 weeks | 3-5 days | 3-4 weeks |
| **Maintenance** | Medium | Low | High |

---

## NextAuth.js Deep Dive (Recommended Approach)

### Why NextAuth.js is Sufficient

NextAuth.js v5 (Auth.js) provides everything Supabase Auth does:

#### 1. OAuth Providers (20+ built-in)
```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Domain restriction (like Supabase)
      authorization: {
        params: {
          prompt: "select_account",
          hd: "millennia21.id" // Google Workspace domain
        }
      }
    })
  ]
})
```

#### 2. Email/Password (Credentials Provider)
```typescript
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"

export default NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await db.query(
          'SELECT * FROM auth_users WHERE email = $1',
          [credentials.email]
        )
        
        if (!user) return null
        
        const valid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        )
        
        if (!valid) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    })
  ]
})
```

#### 3. Email Verification
```typescript
import Resend from '@auth/core/providers/resend'

export default NextAuth({
  providers: [
    Resend({
      from: "noreply@reads.mws.web.id",
      // Automatically sends magic links for verification
    })
  ],
  
  callbacks: {
    async signIn({ user, account }) {
      // Check if email is verified
      const dbUser = await db.query(
        'SELECT email_verified FROM auth_users WHERE email = $1',
        [user.email]
      )
      
      if (!dbUser.email_verified && account.provider === 'credentials') {
        // Send verification email
        await sendVerificationEmail(user.email)
        return '/verify-email?email=' + user.email
      }
      
      return true
    }
  }
})
```

#### 4. Password Reset
```typescript
// app/api/auth/reset-password/route.ts
import { randomBytes } from 'crypto'
import { sendEmail } from '@/lib/email'

export async function POST(req: Request) {
  const { email } = await req.json()
  
  // Generate reset token
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 3600000) // 1 hour
  
  // Store token
  await db.query(
    'INSERT INTO password_reset_tokens (email, token, expires) VALUES ($1, $2, $3)',
    [email, token, expires]
  )
  
  // Send email
  await sendEmail(email, 'Reset Password', `
    Click here to reset your password:
    ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}
  `)
  
  return Response.json({ success: true })
}
```

#### 5. Session Management
```typescript
export default NextAuth({
  session: {
    strategy: "database", // or "jwt"
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  callbacks: {
    async session({ session, user }) {
      // Add custom fields to session
      const profile = await db.query(
        'SELECT role, grade, access_level FROM profiles WHERE id = $1',
        [user.id]
      )
      
      session.user.role = profile.role
      session.user.grade = profile.grade
      
      return session
    }
  }
})
```

#### 6. Database Schema (NextAuth Tables)

```sql
-- NextAuth required tables
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE accounts (
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
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image TEXT,
  password_hash TEXT, -- for credentials provider
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link to existing profiles table
ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES users(id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

---

## Revised Recommendation: NextAuth.js Only ⭐

### Why This is Better for Most Users

1. **Simplicity**
   - 1 fewer container to manage
   - Faster deployment (30 minutes vs 2 hours)
   - Less configuration

2. **Cost**
   - Saves ~512MB RAM = smaller VPS = $5-10/month savings
   - Recommended VPS: 2GB RAM instead of 4GB

3. **Maintenance**
   - No Keycloak updates to manage
   - Fewer moving parts = fewer failures
   - Simpler backup strategy

4. **Feature Parity with Supabase**
   - ✅ OAuth (Google, GitHub, etc.)
   - ✅ Email/password
   - ✅ Email verification
   - ✅ Password reset
   - ✅ Session management
   - ✅ Role-based access

### Docker Compose (Simplified)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: reading_buddy
      POSTGRES_USER: reading_buddy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U reading_buddy"]
      interval: 10s

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s

  app:
    build: ./web
    environment:
      # Database
      DATABASE_URL: postgresql://reading_buddy:${DB_PASSWORD}@postgres:5432/reading_buddy
      
      # NextAuth
      NEXTAUTH_URL: ${NEXT_PUBLIC_APP_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      
      # OAuth
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      
      # MinIO
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      
      # Email (optional - for password reset)
      EMAIL_SERVER: smtp://user:pass@smtp.gmail.com:587
      EMAIL_FROM: noreply@reads.mws.web.id
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy

volumes:
  postgres_data:
  minio_data:
```

**Total Containers: 3** (was 4 with Keycloak)  
**Total RAM: ~1GB** (was ~2GB with Keycloak)

---

## When to Use Keycloak Instead

### Use Keycloak if you need:

1. **Admin UI for User Management**
   - Non-technical staff managing users
   - Bulk user operations
   - User import/export

2. **Enterprise Features**
   - SSO (Single Sign-On) across multiple apps
   - LDAP/Active Directory integration
   - SAML authentication
   - User federation

3. **Multi-Application Architecture**
   - Mobile app + web app + admin panel
   - All sharing same user base
   - Centralized auth server

4. **Advanced Security**
   - Custom authentication flows
   - Step-up authentication
   - Passwordless authentication (WebAuthn)
   - Device management

5. **Compliance Requirements**
   - GDPR user data export
   - Detailed audit logs
   - Fine-grained access control

### Realistic Assessment

**For Reading Buddy self-hosted:**
- 90% of users: **NextAuth.js is sufficient**
- 10% of users: **Keycloak adds value** (large schools, districts)

**For Reading Buddy SaaS (your managed offering):**
- Consider Keycloak for **multi-tenant architecture**
- Each school = separate Keycloak realm
- Centralized user management for support team

---

## Hybrid Approach (Best of Both Worlds)

### Start with NextAuth.js, Keep Keycloak Optional

```typescript
// lib/auth/adapter.ts
export interface AuthAdapter {
  signIn(email: string, password: string): Promise<AuthResult>
  signOut(): Promise<void>
  getSession(): Promise<Session | null>
}

// Default: NextAuth implementation
export class NextAuthAdapter implements AuthAdapter {
  async signIn(email: string, password: string) {
    return signIn("credentials", { email, password })
  }
}

// Optional: Keycloak implementation (for enterprise users)
export class KeycloakAdapter implements AuthAdapter {
  async signIn(email: string, password: string) {
    return keycloak.login({ username: email, password })
  }
}

// Factory pattern
export function getAuthAdapter(): AuthAdapter {
  const authProvider = process.env.AUTH_PROVIDER || 'nextauth'
  
  if (authProvider === 'keycloak') {
    return new KeycloakAdapter()
  }
  
  return new NextAuthAdapter() // Default
}
```

**Configuration:**
```bash
# .env
AUTH_PROVIDER=nextauth  # or 'keycloak' for enterprise deployments
```

---

## Final Recommendation

### For Your Use Case:

**Self-Hosted (Open Source):**
```
✅ Use NextAuth.js only
- Simpler for end users
- Lower resource requirements
- Faster deployment
- 90% feature parity with Supabase Auth
```

**Managed SaaS:**
```
🤔 Consider Keycloak for multi-tenancy
- Centralized user management across schools
- Admin UI for support team
- Advanced features for enterprise customers
- OR stick with Supabase Auth (already working)
```

### Revised Architecture

```
┌─────────────────────────────────────────────┐
│          Reading Buddy Ecosystem             │
├─────────────────────────────────────────────┤
│                                               │
│  Self-Hosted (Free)      Managed SaaS (Paid) │
│  ─────────────────       ─────────────────   │
│  PostgreSQL              Supabase            │
│  NextAuth.js       OR    Supabase Auth       │
│  MinIO                   MinIO/S3            │
│  Next.js                 Next.js             │
│                                               │
│  Optional Add-on:                             │
│  Keycloak (for enterprise self-hosted users) │
│                                               │
└─────────────────────────────────────────────┘
```

---

## Implementation Complexity

### NextAuth.js Migration (3-5 days)

**Day 1:**
- Install NextAuth.js
- Set up database adapter
- Configure Google OAuth

**Day 2:**
- Implement credentials provider (email/password)
- Add email verification flow
- Test authentication flows

**Day 3:**
- Implement password reset
- Add session management
- Update middleware for RLS

**Day 4:**
- Migrate existing users from Supabase
- Test all auth flows end-to-end

**Day 5:**
- Documentation
- Deployment testing

### Keycloak Migration (2 weeks)

**Week 1:**
- Deploy Keycloak
- Configure realm and clients
- Set up Google OAuth
- Configure email settings
- User migration scripts

**Week 2:**
- NextAuth.js + Keycloak integration
- Testing all flows
- Admin UI customization
- Documentation

---

## Cost Comparison

### Self-Hosted Infrastructure

**NextAuth.js Stack:**
- VPS: 2GB RAM, 2 CPU, 50GB SSD = **$12-18/month**
- Domain: $12/year
- Email (SendGrid free tier)
- **Total: ~$15-20/month**

**Keycloak Stack:**
- VPS: 4GB RAM, 2 CPU, 80GB SSD = **$24-40/month**
- Domain: $12/year
- Email (SendGrid free tier)
- **Total: ~$27-45/month**

**Savings with NextAuth.js: $12-25/month**

---

## Conclusion

### The Answer to "Why Keycloak?"

**Short Answer:** You probably don't need it. Use **NextAuth.js only** for 90% of use cases.

**Long Answer:**
- **Keycloak** = Enterprise features most users won't use
- **NextAuth.js** = All the features Supabase Auth provides
- **Keycloak** makes sense for large deployments, multi-app ecosystems, or SSO requirements

### Updated Recommendation

**Self-Hosted Version:**
```
PostgreSQL + NextAuth.js + MinIO
- Simpler
- Cheaper  
- Faster to deploy
- Sufficient for 90% of users
```

**Optional Enterprise Add-on:**
```
Add Keycloak for schools needing:
- Admin UI
- SSO/LDAP
- Multi-app architecture
```

---

**Document Version:** 1.0  
**Recommendation:** NextAuth.js as default, Keycloak as optional enterprise add-on  
**Author:** Development Team  
**Status:** Final Recommendation

--- 
### Original File: notes//2024-12-14/development/MIGRATION_INSTRUCTIONS.md

# Database Migrations: Fix Gamification & Reading Tracking

## Problems
1. **Leaderboard shows 0 XP for everyone**: The `profiles` table is missing gamification columns (xp, level, reading_streak, etc.)
2. **Books not sorting by last read**: The `student_books` table is missing an `updated_at` column

## Solutions
1. Add gamification columns to `profiles` table
2. Add `updated_at` column to `student_books` table

## Steps to Apply Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project: `hbrosmlrvbkmcbyggriv`
3. Go to **SQL Editor** in the left sidebar

**Run Migration 1 - Add Gamification Columns:**
4. Click **New Query**
5. Copy and paste the SQL from `migrations/add_gamification_columns_to_profiles.sql`
6. Click **Run** or press Cmd/Ctrl+Enter
7. Verify success - you should see "Success. No rows returned"

**Run Migration 2 - Add updated_at to student_books:**
8. Click **New Query** again
9. Copy and paste the SQL from `migrations/add_student_books_updated_at.sql`
10. Click **Run** or press Cmd/Ctrl+Enter
11. Verify success - you should see "Success. No rows returned"

### Option 2: Using psql (if you have direct access)
```bash
psql <your_connection_string> -f migrations/add_student_books_updated_at.sql
```

## What These Migrations Do

**Migration 1: Gamification Columns**
- ✅ Adds `xp`, `level`, `reading_streak`, `longest_streak` columns
- ✅ Adds `total_books_completed`, `total_pages_read` columns
- ✅ Adds `total_quizzes_completed`, `total_perfect_quizzes` columns
- ✅ Adds `books_completed`, `pages_read`, `last_read_date` columns
- ✅ Creates indexes for leaderboard performance
- ✅ **Fixes leaderboard showing 0 XP for everyone**

**Migration 2: student_books updated_at**
- ✅ Adds `updated_at TIMESTAMPTZ` column to `student_books`
- ✅ Sets default value to NOW() for new records
- ✅ Backfills existing records (sets to completed_at or started_at)
- ✅ Creates trigger to auto-update on changes
- ✅ **Fixes books sorting by last read**

## Verification
After running both migrations, verify with:

**Check gamification columns:**
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('xp', 'level', 'reading_streak', 'total_pages_read');
```

**Check updated_at column:**
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'student_books' AND column_name = 'updated_at';
```

You should see all columns listed.

## Impact
- ✅ **Leaderboards work**: Staff and student leaderboards will show actual XP/rankings
- ✅ **Reading Journey displays correctly**: Level, XP, streak, books completed all visible
- ✅ **Books sort properly**: Most recently read books appear first
- ✅ **Dashboard "Currently Reading"**: Shows the actual last book you read
- ✅ **XP tracking enabled**: Reading pages, completing books, and quizzes now award XP
- ✅ **No Breaking Changes**: All existing functionality continues to work

--- 
### Original File: notes//2024-12-14/development/MOBI_AZW_IMPLEMENTATION.md

# MOBI/AZW Format Support Implementation

## Overview
Successfully implemented support for MOBI, AZW, and AZW3 (Kindle) formats in Reading Buddy. These formats are now fully integrated into the existing e-book processing pipeline.

## Implementation Date
2025-11-23

## Supported Formats
- **MOBI** - Mobipocket format (older Kindle books)
- **AZW** - Amazon Kindle format (identical to MOBI)
- **AZW3** - Kindle Format 8 (newer, better ToC support)

## Architecture

### Conversion Pipeline
All Kindle formats follow the same conversion pipeline as EPUB:
```
MOBI/AZW/AZW3 → Calibre → PDF → Page Images → Text Extraction
```

This approach:
- ✅ Reuses 95% of existing EPUB infrastructure
- ✅ Maintains consistency across formats
- ✅ Requires no Docker changes (Calibre already installed)
- ✅ Enables AI quiz generation for all formats

## Changes Made

### 1. Database Schema (`migrations/add-mobi-azw-support.sql`)
**New Migration File Created:**
- Updated `books.file_format` constraint to include: `'mobi', 'azw', 'azw3'`
- Updated column documentation
- Success message with format list

**Existing Migration Updated** (`migrations/add-file-format-support.sql`):
- Updated CHECK constraint for future deployments
- Updated comments and notices

### 2. File Type Detection (`web/src/lib/file-type-detector.ts`)
**Type System:**
- Extended `SupportedEbookFormat`: `"pdf" | "epub" | "mobi" | "azw" | "azw3"`

**Detection Logic:**
- Added `readBytesAtOffset()` function for reading specific file positions
- Added `verifyMobiStructure()` function:
  - Reads PalmDB header at offset 60
  - Checks for "BOOKMOBI" or "TEXTMOBI" signature
  - Distinguishes formats by file extension
  
**Helper Functions Updated:**
- `getAcceptedMimeTypes()`: Added `.mobi,.azw,.azw3` extensions
- `getFormatName()`: Returns proper names (MOBI, AZW, AZW3)
- `getFormatColor()`: 
  - MOBI: `bg-orange-100 text-orange-800`
  - AZW: `bg-amber-100 text-amber-800`
  - AZW3: `bg-yellow-100 text-yellow-800`

### 3. Conversion API (`web/src/app/api/convert-mobi/route.ts`)
**New API Endpoint:** `/api/convert-mobi`

**Features:**
- Accepts `bookId`, `mobiUrl`, and `format` parameters
- Downloads MOBI/AZW/AZW3 from MinIO
- Converts to PDF using Calibre with Kindle-optimized settings:
  ```bash
  ebook-convert input.mobi output.pdf \
    --output-profile kindle \
    --paper-size a4 \
    --pdf-default-font-size 18 \
    --margin-left 20 --margin-right 20 \
    --margin-top 20 --margin-bottom 20
  ```
- Uploads converted PDF to MinIO
- Updates database with PDF URL
- 5-minute timeout, same as EPUB

### 4. Server Actions (`web/src/app/(dashboard)/dashboard/librarian/actions.ts`)

**Updated `saveBookMetadata()`:**
- Extended `fileFormat` type: `"pdf" | "epub" | "mobi" | "azw" | "azw3"`

**New Function: `convertMobiToImages()`:**
- Validates book is MOBI/AZW/AZW3 format
- Calls `/api/convert-mobi` endpoint
- Triggers PDF rendering pipeline
- Returns success/error status with messages

**Updated `extractBookText()`:**
- Extended format check: `["epub", "mobi", "azw", "azw3"]`
- Uses converted PDF for text extraction
- Enables AI quiz generation for all Kindle formats

### 5. UI Components (`web/src/components/dashboard/BookUploadForm.tsx`)

**File Input Updated:**
- Label: "Book File (PDF, EPUB, MOBI, AZW, AZW3)"
- Accept attribute includes all MOBI variants and MIME types

**Detection Logic:**
- `handlePdfFileChange()`: Handles MOBI/AZW/AZW3 detection
- Shows format-specific messages: "MOBI file detected. Page count will be determined after upload."

**Upload Flow:**
- Uses placeholder page count for MOBI/AZW/AZW3 (like EPUB)
- Calls `convertMobiToImages()` for Kindle formats
- Shows progress: "Converting MOBI to images..."
- Polls for completion with progress updates

## Technical Details

### MOBI File Structure
- **Format**: PalmDB database format
- **Magic Bytes**: "BOOKMOBI" or "TEXTMOBI" at offset 60
- **Header**: 78 bytes total
- **Variants**:
  - Mobi6: Older format
  - KF8: Newer format (used in AZW3)

### Calibre Support
Calibre fully supports:
- MOBI → PDF conversion
- AZW → PDF conversion
- AZW3 → PDF conversion
- Kindle output profiles for optimal formatting

### Security & Validation
- File size limit: 50MB (same as other formats)
- Magic number validation at offset 60
- Structure verification before conversion
- DRM-protected files cannot be converted (limitation)

## Usage

### For Librarians
1. Go to Librarian Dashboard
2. Click "Add New Book"
3. Select MOBI/AZW/AZW3 file (up to 50MB)
4. Fill in metadata
5. Upload
6. System automatically:
   - Converts to PDF using Calibre
   - Renders page images
   - Extracts text for AI quizzes

### For Developers
```typescript
// Import the conversion function
import { convertMobiToImages } from '@/app/(dashboard)/dashboard/librarian/actions';

// Convert a MOBI book
const result = await convertMobiToImages(bookId);

if (result.success) {
  console.log(result.message); // "MOBI converted to PDF and rendering started"
}
```

## Testing Checklist

### Manual Testing Required
- [ ] Upload .mobi file → converts to PDF
- [ ] Upload .azw file → converts to PDF  
- [ ] Upload .azw3 file → converts to PDF
- [ ] Page images render correctly
- [ ] Text extraction works for quiz generation
- [ ] Format badges display correctly (orange/amber/yellow)
- [ ] File size validation works (50MB limit)
- [ ] Error handling for corrupted files
- [ ] Progress indicators show conversion status
- [ ] Database records file_format correctly

### Integration Testing
- [ ] MOBI upload → render → quiz generation flow
- [ ] Multiple format uploads in sequence
- [ ] Concurrent MOBI and EPUB conversions
- [ ] MinIO storage and retrieval
- [ ] Calibre conversion error handling

## Performance Considerations

### Conversion Times
- **MOBI**: ~10-30 seconds (depends on size)
- **AZW**: ~10-30 seconds (same as MOBI)
- **AZW3**: ~15-40 seconds (larger, more complex)
- **Rendering**: Same as PDF/EPUB (5-10 min for typical book)

### Resource Usage
- CPU: Moderate (Calibre conversion)
- Memory: ~100-200MB per conversion
- Disk: Temporary files cleaned up automatically
- Network: MinIO upload/download bandwidth

## Known Limitations

1. **DRM Protection**: Cannot convert DRM-protected Kindle books
2. **Page Count**: Not available until after conversion (same as EPUB)
3. **Complex Layouts**: Some complex formatting may not convert perfectly
4. **File Size**: 50MB limit (typical Kindle books are 1-5MB)

## Troubleshooting

### Common Issues

**Issue**: "File has .mobi extension but is not a valid Kindle format"
- **Cause**: Corrupted file or not a true MOBI file
- **Solution**: Verify file integrity, try re-downloading

**Issue**: "Calibre conversion failed"
- **Cause**: Unsupported MOBI variant or DRM protection
- **Solution**: Check Calibre logs, verify file is not DRM-protected

**Issue**: Conversion takes too long
- **Cause**: Large file size or complex content
- **Solution**: Normal for books over 10MB, wait for background completion

### Debug Commands

```bash
# Test Calibre installation
ebook-convert --version

# Manual conversion test
ebook-convert input.mobi output.pdf --output-profile kindle

# Check file structure
hexdump -C input.mobi | head -n 10  # Should see BOOKMOBI at offset 60
```

## Future Enhancements

### Potential Improvements
1. **Direct MOBI Reading**: Render MOBI without PDF conversion
2. **KFX Format**: Support newer Amazon KFX format
3. **Batch Conversion**: Convert multiple books simultaneously
4. **Format Preservation**: Keep original formatting/ToC
5. **Compression**: Optimize converted PDF size

### API Extensions
```typescript
// Potential future API
POST /api/convert-batch
{
  "bookIds": [1, 2, 3],
  "targetFormat": "pdf",
  "options": {
    "quality": "high",
    "preserveToc": true
  }
}
```

## Migration Guide

### For Existing Deployments

1. **Run Database Migration:**
   ```bash
   psql -U postgres -d reading_buddy -f migrations/add-mobi-azw-support.sql
   ```

2. **Verify Calibre Installation:**
   ```bash
   docker exec reading-buddy-container ebook-convert --version
   ```

3. **Test Upload:**
   - Upload a test MOBI file
   - Verify conversion completes
   - Check page images render

4. **No Code Changes Required:**
   - Frontend automatically supports new formats
   - Backend routes are backwards compatible

## Documentation Updates

### Updated Files
- `CHANGELOG.md`: Add MOBI/AZW support entry
- `README.md`: Update supported formats list
- `DOCKER_DEPLOYMENT.md`: Note Calibre supports all formats
- `.env.example`: No changes needed (uses existing vars)

### API Documentation
```markdown
## Supported E-book Formats
- **PDF** - Portable Document Format
- **EPUB** - Electronic Publication (standard e-book format)
- **MOBI** - Mobipocket (Kindle format)
- **AZW** - Amazon Kindle format
- **AZW3** - Kindle Format 8 (KF8)

All formats are automatically converted to PDF for rendering and text extraction.
```

## Conclusion

MOBI/AZW/AZW3 support has been successfully implemented with:
- ✅ Complete format detection and validation
- ✅ Calibre-based conversion pipeline
- ✅ Full integration with existing features
- ✅ Minimal code duplication
- ✅ Comprehensive error handling
- ✅ User-friendly progress indicators

The implementation leverages the existing EPUB infrastructure, making it reliable and maintainable. All Kindle format books can now be uploaded, converted, rendered, and used for AI quiz generation seamlessly.

## References

- [Calibre ebook-convert Documentation](https://manual.calibre-ebook.com/generated/en/ebook-convert.html)
- [MOBI File Format Specification](https://wiki.mobileread.com/wiki/MOBI)
- [PalmDB Header Format](https://wiki.mobileread.com/wiki/PDB)
- [Kindle Format Evolution](https://en.wikipedia.org/wiki/Kindle_File_Format)

--- 
### Original File: notes//2024-12-14/development/SELF_HOSTED_ARCHITECTURE.md

# Self-Hosted Architecture Plan for Reading Buddy

**Version:** 2.0.0  
**Date:** 2024-12-15  
**Status:** Planning Phase  
**Target:** Full Self-Hostable Solution with Dual Deployment Strategy

---

## Executive Summary

This document outlines the complete migration plan to make Reading Buddy fully self-hostable while maintaining backward compatibility with the managed SaaS version. The plan enables:

1. **Open Source Deployment:** Anyone can deploy Reading Buddy to their own infrastructure
2. **Managed SaaS:** Maintained Supabase-based deployment for paid customers
3. **Feature Parity:** Both deployments support identical features
4. **Easy Migration:** Users can migrate between self-hosted and managed versions

---

## 1. Current Supabase Dependencies Analysis

### Core Services to Replace

| Supabase Service | Current Usage | Replacement Strategy |
|------------------|---------------|---------------------|
| **PostgreSQL Database** | 19 tables, RLS, triggers, functions | PostgreSQL (direct) |
| **Auth** | Email/password, Google OAuth, sessions | Keycloak or Authentik |
| **Storage** | ❌ Not used | Already using MinIO ✅ |
| **Realtime** | ❌ Not actively used | Skip for now |
| **Edge Functions** | ❌ Not used | N/A |

### Critical Features to Preserve

1. **Row Level Security (RLS)** - 18 tables with complex policies
2. **Database Functions** - Gamification logic (XP, badges, streaks)
3. **Triggers** - Auto-profile creation, timestamp updates
4. **OAuth Integration** - Google OAuth with domain validation
5. **Session Management** - Cookie-based, server-side sessions
6. **Password Reset** - Email-based recovery flow
7. **Email Verification** - New user verification

---

## 2. Recommended Architecture

### Option A: PostgreSQL + Keycloak (Recommended)

**Pros:**
- Industry-standard, battle-tested
- Full OAuth 2.0/OIDC support (Google, GitHub, Microsoft, etc.)
- Built-in user federation, SSO
- Admin UI for user management
- Email verification, password reset
- Custom themes and branding
- Role-based access control (RBAC)
- Session management with JWT or cookies
- Active community, extensive documentation
- Docker-ready with official images

**Cons:**
- Java-based (heavier resource usage)
- More complex initial setup
- Requires separate service (3 containers: DB, App, Keycloak)

**Container Requirements:**
- PostgreSQL: ~200MB RAM
- Next.js App: ~512MB RAM
- Keycloak: ~512MB-1GB RAM
- **Total:** ~1.5-2GB RAM minimum

### Option B: PostgreSQL + Authentik (Alternative)

**Pros:**
- Modern, Python-based
- Beautiful admin UI (Django-based)
- Lighter than Keycloak (~300-400MB RAM)
- Built-in user self-service portal
- OIDC, SAML, LDAP support
- Advanced policy engine

**Cons:**
- Smaller community than Keycloak
- Fewer integrations
- Less mature (launched 2019 vs Keycloak 2014)

### Option C: PostgreSQL + Custom Auth (Not Recommended)

**Pros:**
- Full control, minimal dependencies
- Lighter resource footprint

**Cons:**
- High development effort (2-4 weeks)
- Security risks (DIY auth is dangerous)
- Missing features: OAuth, MFA, SSO
- Ongoing maintenance burden

---

## 3. Final Recommendation: PostgreSQL + Keycloak

**Why Keycloak:**
1. **Production-Ready:** Used by Red Hat, Cisco, Dell, thousands of enterprises
2. **Security:** FIPS 140-2 compliant, extensive security audits
3. **OAuth Compatibility:** Drop-in replacement for Supabase OAuth
4. **Extensible:** Custom authenticators, user storage providers
5. **Multi-Tenancy:** Future-proof for potential multi-school deployments

---

## 4. Database Migration Strategy

### Phase 1: Direct PostgreSQL Migration

**Goal:** Move from Supabase PostgreSQL to self-hosted PostgreSQL while preserving all features.

#### Database Setup

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: reading_buddy
      POSTGRES_USER: reading_buddy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U reading_buddy"]
      interval: 10s
      timeout: 5s
      retries: 5
```

#### Migration Steps

1. **Export Supabase Schema**
   ```bash
   # Using Supabase CLI
   supabase db dump --schema public > schema.sql
   supabase db dump --schema auth > auth-schema.sql
   ```

2. **Transform RLS Policies**
   - Supabase RLS uses `auth.uid()` → Replace with session context
   - Rewrite policies to use `current_setting('app.user_id')::uuid`

3. **Preserve Database Functions**
   - All gamification functions migrate as-is (no Supabase dependencies)
   - `award_xp()`, `update_reading_streak()`, etc. are pure PostgreSQL

4. **Migrate Triggers**
   - `handle_new_user()` trigger changes (see Auth section)
   - Timestamp triggers migrate unchanged

#### RLS Policy Transformation Example

**Before (Supabase):**
```sql
CREATE POLICY "Students can view their own reading progress"
  ON student_books FOR SELECT
  USING (student_id = auth.uid());
```

**After (Self-Hosted):**
```sql
-- Using session variables set by middleware
CREATE POLICY "Students can view their own reading progress"
  ON student_books FOR SELECT
  USING (student_id = current_setting('app.user_id', true)::uuid);
```

#### Database Initialization Script

```sql
-- /sql/init/01-extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- /sql/init/02-schema.sql
-- (Existing schema from database-setup.sql)

-- /sql/init/03-rls-policies.sql
-- (Transformed RLS policies)

-- /sql/init/04-functions.sql
-- (Gamification functions, triggers)

-- /sql/init/05-seed-data.sql
-- (Default badges, achievements)
```

### Phase 2: User Authentication Migration

**Challenge:** Supabase stores users in `auth.users` table with proprietary password hashing.

**Solution:** Two-tier migration strategy

#### Option 1: Export and Rehash (One-Time Migration)

```bash
# Export users from Supabase
supabase db dump --data-only --table auth.users > users.sql

# Transform script (Python)
python scripts/migrate-users.py
```

**Migration Script:**
```python
import bcrypt
import psycopg2
from supabase import create_client

# 1. Export users from Supabase
supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
users = supabase.auth.admin.list_users()

# 2. Create users in Keycloak via Admin API
for user in users:
    keycloak.create_user({
        'username': user.email,
        'email': user.email,
        'emailVerified': user.email_confirmed_at is not None,
        'enabled': True,
        'credentials': [{
            'type': 'password',
            'value': generate_temp_password(),  # Force password reset
            'temporary': True
        }]
    })
    
    # 3. Update profiles table with Keycloak user ID
    db.execute(
        "UPDATE profiles SET keycloak_id = %s WHERE id = %s",
        (keycloak_user_id, user.id)
    )
```

**Post-Migration:**
- Send password reset emails to all users
- Users set new passwords on first login

#### Option 2: Gradual Migration (User-Initiated)

```typescript
// Dual authentication during transition period
async function authenticate(email: string, password: string) {
  // Try Keycloak first
  const keycloakResult = await keycloak.authenticate(email, password);
  if (keycloakResult.success) return keycloakResult;
  
  // Fallback to Supabase (legacy)
  const supabaseResult = await supabase.auth.signInWithPassword({ email, password });
  if (supabaseResult.data.user) {
    // Migrate user to Keycloak
    await migrateUserToKeycloak(supabaseResult.data.user, password);
    return supabaseResult;
  }
  
  return { error: 'Invalid credentials' };
}
```

---

## 5. Keycloak Integration Architecture

### Container Setup

```yaml
# docker-compose.yml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
      KC_HOSTNAME: auth.reads.mws.web.id
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    command: start --optimized
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
```

### Keycloak Realm Configuration

**Realm:** `reading-buddy`

**Clients:**
1. **next-app** (Public client for Next.js frontend)
   - Client ID: `reading-buddy-app`
   - Access Type: `public`
   - Valid Redirect URIs: `https://reads.mws.web.id/*`
   - Web Origins: `https://reads.mws.web.id`
   - Direct Access Grants: Enabled (for email/password login)

2. **admin-cli** (Service account for backend)
   - Client ID: `reading-buddy-admin`
   - Access Type: `confidential`
   - Service Accounts Enabled: `true`

**Roles:**
- `STUDENT` (default)
- `TEACHER`
- `LIBRARIAN`
- `ADMIN`

**User Attributes:**
- `full_name` (mapped from Google OAuth)
- `grade` (custom field)
- `access_level` (custom field)
- `profile_id` (link to profiles table)

**Identity Providers:**
- Google OAuth (existing credentials)
  - Client ID: `${GOOGLE_OAUTH_CLIENT_ID}`
  - Client Secret: `${GOOGLE_OAUTH_CLIENT_SECRET}`
  - Hosted Domain: `millennia21.id` (domain validation)

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant NextJS
    participant Keycloak
    participant PostgreSQL
    
    User->>NextJS: Click "Login with Google"
    NextJS->>Keycloak: Redirect to /auth
    Keycloak->>Google: OAuth Request
    Google->>User: Consent Screen
    User->>Google: Approve
    Google->>Keycloak: Auth Code
    Keycloak->>Keycloak: Validate Email (@millennia21.id)
    Keycloak->>PostgreSQL: Create user if new
    Keycloak->>NextJS: Redirect with code
    NextJS->>Keycloak: Exchange code for tokens
    Keycloak->>NextJS: ID Token + Access Token
    NextJS->>PostgreSQL: Fetch/create profile
    NextJS->>User: Redirect to dashboard
```

---

## 6. Next.js Integration Changes

### Dependencies

```json
{
  "dependencies": {
    "@keycloak/keycloak-admin-client": "^23.0.0",
    "keycloak-js": "^23.0.0",
    "next-auth": "^5.0.0"  // Alternative: Use NextAuth.js with Keycloak provider
  }
}
```

### Authentication Client

**Option 1: Direct Keycloak Integration**

```typescript
// lib/keycloak/client.ts
import Keycloak from 'keycloak-js';

export const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'https://auth.reads.mws.web.id',
  realm: 'reading-buddy',
  clientId: 'reading-buddy-app',
};

export const keycloak = new Keycloak(keycloakConfig);

export async function initKeycloak() {
  const authenticated = await keycloak.init({
    onLoad: 'check-sso',
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    pkceMethod: 'S256',
  });
  
  return authenticated;
}
```

**Option 2: NextAuth.js with Keycloak Provider (Recommended)**

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER, // https://auth.reads.mws.web.id/realms/reading-buddy
      
      // Profile mapping
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name || profile.preferred_username,
          role: profile.realm_access?.roles?.find(r => 
            ['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN'].includes(r)
          ) || 'STUDENT',
        };
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.role = profile.role;
      }
      return token;
    },
    
    async session({ session, token }) {
      session.user.role = token.role;
      session.accessToken = token.accessToken;
      return session;
    },
    
    async signIn({ user, account, profile }) {
      // Domain validation (replicate Supabase behavior)
      if (!user.email?.endsWith('@millennia21.id')) {
        return false; // Reject sign-in
      }
      
      // Create profile in database if first-time user
      await createOrUpdateProfile(user);
      
      return true;
    },
  },
  
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Database Client Changes

**Before (Supabase):**
```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server';

const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();
```

**After (Self-Hosted):**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

const session = await getServerSession(authOptions);
if (!session) redirect('/login');

// Set session context for RLS
await db.query('SET app.user_id = $1', [session.user.id]);

// Now queries respect RLS policies
const books = await db.query('SELECT * FROM books');
```

### Profile Creation Hook

**Keycloak Event Listener** (replaces `handle_new_user()` trigger)

```typescript
// lib/keycloak/hooks.ts
export async function createOrUpdateProfile(user: User) {
  const db = getDb();
  
  // Check if profile exists
  const existing = await db.query(
    'SELECT id FROM profiles WHERE keycloak_id = $1',
    [user.id]
  );
  
  if (existing.rows.length === 0) {
    // Create new profile (replicate Supabase trigger behavior)
    await db.query(`
      INSERT INTO profiles (
        id, keycloak_id, email, full_name, role, access_level,
        xp, level, reading_streak, longest_streak
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'STUDENT', 'lower_elementary',
        0, 1, 0, 0
      )
    `, [user.id, user.email, user.name]);
  }
}
```

---

## 7. RLS Policy Implementation

### Session Context Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  if (token) {
    // Set user context for RLS policies
    const response = NextResponse.next();
    response.headers.set('X-User-ID', token.sub!);
    response.headers.set('X-User-Role', token.role as string);
    return response;
  }
  
  return NextResponse.next();
}
```

### Database Connection Pool Configuration

```typescript
// lib/db/index.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'reading_buddy',
  user: process.env.DB_USER || 'reading_buddy',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper to execute queries with RLS context
export async function queryWithContext(
  userId: string,
  query: string,
  params: any[] = []
) {
  const client = await pool.connect();
  try {
    // Set session variables for RLS
    await client.query('SET app.user_id = $1', [userId]);
    
    // Execute query (RLS policies apply)
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}
```

---

## 8. Email Service Integration

### SMTP Configuration (Replaces Supabase Email)

```yaml
# docker-compose.yml
services:
  mailhog:  # For development
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
```

**Production Options:**
- **Postmark** (Recommended for SaaS)
- **SendGrid** (Popular choice)
- **Self-hosted Postfix** (Full control)
- **SMTP relay** (Google Workspace, etc.)

### Email Templates

```typescript
// lib/email/templates.ts
export const emailTemplates = {
  verification: (token: string, baseUrl: string) => ({
    subject: 'Verify your Reading Buddy account',
    html: `
      <p>Welcome to Reading Buddy!</p>
      <p>Click the link below to verify your email:</p>
      <a href="${baseUrl}/auth/verify?token=${token}">Verify Email</a>
    `,
  }),
  
  passwordReset: (token: string, baseUrl: string) => ({
    subject: 'Reset your Reading Buddy password',
    html: `
      <p>Click the link below to reset your password:</p>
      <a href="${baseUrl}/auth/reset-password?token=${token}">Reset Password</a>
      <p>If you didn't request this, ignore this email.</p>
    `,
  }),
};

// lib/email/sender.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@reads.mws.web.id',
    to,
    subject,
    html,
  });
}
```

**Keycloak Email Configuration:**
```properties
# Keycloak realm settings → Email
smtp.from=noreply@reads.mws.web.id
smtp.host=smtp.example.com
smtp.port=587
smtp.auth=true
smtp.user=smtp-user
smtp.password=smtp-password
smtp.starttls=true
```

---

## 9. Deployment Strategy

### Docker Compose Stack (Self-Hosted)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: reading_buddy
      POSTGRES_USER: reading_buddy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U reading_buddy"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - reading-buddy

  keycloak-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
    volumes:
      - keycloak_data:/var/lib/postgresql/data
    networks:
      - reading-buddy

  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://keycloak-db:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
      KC_HOSTNAME: ${KEYCLOAK_HOSTNAME:-auth.reads.mws.web.id}
      KC_PROXY: edge
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN:-admin}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    command: start --optimized
    ports:
      - "8080:8080"
    depends_on:
      keycloak-db:
        condition: service_started
    networks:
      - reading-buddy

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - reading-buddy

  app:
    build:
      context: ./web
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
        NEXT_PUBLIC_KEYCLOAK_URL: ${NEXT_PUBLIC_KEYCLOAK_URL}
    environment:
      # Database
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: reading_buddy
      DB_USER: reading_buddy
      DB_PASSWORD: ${DB_PASSWORD}
      
      # Keycloak
      KEYCLOAK_ISSUER: ${KEYCLOAK_ISSUER}
      KEYCLOAK_CLIENT_ID: reading-buddy-app
      KEYCLOAK_CLIENT_SECRET: ${KEYCLOAK_CLIENT_SECRET}
      
      # MinIO
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_USE_SSL: false
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      MINIO_BUCKET_NAME: reading-buddy
      
      # Email (optional)
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      
      # AI Provider
      AI_PROVIDER: ${AI_PROVIDER:-cloud}
      GOOGLE_GEMINI_API_KEY: ${GOOGLE_GEMINI_API_KEY}
      
      # NextAuth
      NEXTAUTH_URL: ${NEXT_PUBLIC_APP_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      keycloak:
        condition: service_started
      minio:
        condition: service_healthy
    networks:
      - reading-buddy

volumes:
  postgres_data:
  keycloak_data:
  minio_data:

networks:
  reading-buddy:
    driver: bridge
```

### Environment Variables

```bash
# .env.example

# ===========================
# Database Configuration
# ===========================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=reading_buddy
DB_USER=reading_buddy
DB_PASSWORD=your-secure-password-here

# ===========================
# Keycloak Configuration
# ===========================
KEYCLOAK_DB_PASSWORD=keycloak-db-password
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin-password
KEYCLOAK_HOSTNAME=auth.reads.mws.web.id
KEYCLOAK_ISSUER=https://auth.reads.mws.web.id/realms/reading-buddy
KEYCLOAK_CLIENT_ID=reading-buddy-app
KEYCLOAK_CLIENT_SECRET=your-keycloak-client-secret

# Public (for Next.js)
NEXT_PUBLIC_KEYCLOAK_URL=https://auth.reads.mws.web.id
NEXT_PUBLIC_APP_URL=https://reads.mws.web.id

# ===========================
# NextAuth Configuration
# ===========================
NEXTAUTH_URL=https://reads.mws.web.id
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# ===========================
# MinIO Configuration
# ===========================
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=reading-buddy

# ===========================
# Email Configuration (Optional)
# ===========================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@reads.mws.web.id

# ===========================
# AI Provider Configuration
# ===========================
AI_PROVIDER=cloud  # or 'local'
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_RAG_API_URL=http://localhost:8000

# ===========================
# OAuth Configuration (Optional)
# ===========================
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
```

---

## 10. Dual Deployment Strategy

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Reading Buddy Ecosystem                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │  Self-Hosted     │          │  Managed SaaS    │         │
│  │  (Open Source)   │          │  (Paid Version)  │         │
│  └──────────────────┘          └──────────────────┘         │
│           │                             │                    │
│    ┌──────┴──────┐              ┌──────┴──────┐            │
│    │ PostgreSQL  │              │  Supabase   │            │
│    │ Keycloak    │              │  (Managed)  │            │
│    │ MinIO       │              │             │            │
│    │ Next.js     │              │  Next.js    │            │
│    └─────────────┘              └─────────────┘            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Feature Comparison

| Feature | Self-Hosted (Free) | Managed SaaS (Paid) |
|---------|-------------------|---------------------|
| **Core Features** | ✅ Full access | ✅ Full access |
| **Database** | Self-managed PostgreSQL | Supabase (managed) |
| **Authentication** | Keycloak | Supabase Auth |
| **Storage** | Self-hosted MinIO | Managed MinIO/S3 |
| **AI Quizzes** | Cloud or Local RAG | Cloud (Gemini) |
| **Email** | Self-configured SMTP | Managed (Postmark) |
| **Backups** | Manual | Automated daily |
| **Support** | Community | Priority support |
| **Updates** | Self-managed | Auto-deployed |
| **Uptime SLA** | None | 99.9% guaranteed |
| **Multi-tenancy** | Single school | Multi-school support |
| **Custom domain** | ✅ | ✅ |
| **White-label** | ✅ | ✅ Premium tier |

### Code Abstraction Layer

**Database Abstraction:**
```typescript
// lib/db/adapter.ts
export interface DBAdapter {
  query(sql: string, params: any[]): Promise<QueryResult>;
  queryWithContext(userId: string, sql: string, params: any[]): Promise<QueryResult>;
}

// lib/db/postgres.ts (Self-hosted)
export class PostgresAdapter implements DBAdapter {
  async query(sql: string, params: any[]) {
    return pool.query(sql, params);
  }
  
  async queryWithContext(userId: string, sql: string, params: any[]) {
    const client = await pool.connect();
    await client.query('SET app.user_id = $1', [userId]);
    const result = await client.query(sql, params);
    client.release();
    return result;
  }
}

// lib/db/supabase.ts (Managed SaaS)
export class SupabaseAdapter implements DBAdapter {
  async query(sql: string, params: any[]) {
    return supabase.rpc('execute_sql', { query: sql, params });
  }
  
  async queryWithContext(userId: string, sql: string, params: any[]) {
    // Supabase handles RLS automatically via auth.uid()
    return this.query(sql, params);
  }
}

// lib/db/index.ts
export function getDBAdapter(): DBAdapter {
  if (process.env.DEPLOYMENT_MODE === 'self-hosted') {
    return new PostgresAdapter();
  } else {
    return new SupabaseAdapter();
  }
}
```

**Auth Abstraction:**
```typescript
// lib/auth/adapter.ts
export interface AuthAdapter {
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  signInWithOAuth(provider: string): Promise<void>;
}

// lib/auth/keycloak.ts (Self-hosted)
export class KeycloakAuthAdapter implements AuthAdapter {
  async signIn(email: string, password: string) {
    const result = await keycloak.login({ username: email, password });
    return { user: result.user, session: result.session };
  }
  
  async signInWithOAuth(provider: string) {
    keycloak.login({ idpHint: provider });
  }
}

// lib/auth/supabase.ts (Managed SaaS)
export class SupabaseAuthAdapter implements AuthAdapter {
  async signIn(email: string, password: string) {
    const result = await supabase.auth.signInWithPassword({ email, password });
    return { user: result.data.user, session: result.data.session };
  }
  
  async signInWithOAuth(provider: string) {
    await supabase.auth.signInWithOAuth({ provider });
  }
}

// lib/auth/index.ts
export function getAuthAdapter(): AuthAdapter {
  if (process.env.DEPLOYMENT_MODE === 'self-hosted') {
    return new KeycloakAuthAdapter();
  } else {
    return new SupabaseAuthAdapter();
  }
}
```

### Build Configuration

```typescript
// next.config.js
const isSelfHosted = process.env.DEPLOYMENT_MODE === 'self-hosted';

module.exports = {
  env: {
    DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || 'saas',
  },
  
  webpack: (config) => {
    if (isSelfHosted) {
      // Tree-shake Supabase dependencies
      config.resolve.alias['@/lib/supabase'] = '@/lib/db/postgres';
    }
    return config;
  },
};
```

---

## 11. Migration Roadmap

### Phase 1: Foundation (Week 1-2)

**Goals:**
- Set up PostgreSQL with schema migration
- Implement Keycloak deployment
- Create Docker Compose stack

**Tasks:**
1. ✅ Export Supabase schema and data
2. ✅ Transform RLS policies for PostgreSQL
3. ✅ Set up Keycloak realm and clients
4. ✅ Configure Google OAuth in Keycloak
5. ✅ Create database initialization scripts
6. ✅ Test Docker Compose deployment locally

**Deliverables:**
- `docker-compose.yml` for full stack
- SQL migration scripts
- Keycloak realm export (JSON)

### Phase 2: Authentication Integration (Week 3-4)

**Goals:**
- Replace Supabase Auth with Keycloak/NextAuth
- Implement profile synchronization
- Preserve session management

**Tasks:**
1. ✅ Install NextAuth.js with Keycloak provider
2. ✅ Implement auth callbacks (sign-in, JWT, session)
3. ✅ Create profile sync hooks
4. ✅ Migrate domain validation logic
5. ✅ Update all auth checks in codebase
6. ✅ Test OAuth flow end-to-end

**Deliverables:**
- Auth adapter pattern implementation
- Updated middleware for RLS context
- Migration guide for users

### Phase 3: Database Layer (Week 5-6)

**Goals:**
- Replace Supabase client with direct PostgreSQL
- Implement RLS with session context
- Preserve all database functions

**Tasks:**
1. ✅ Create database adapter interface
2. ✅ Implement PostgreSQL client with connection pooling
3. ✅ Update RLS policies for session variables
4. ✅ Test all gamification functions
5. ✅ Migrate all Supabase queries to adapters
6. ✅ Performance testing and optimization

**Deliverables:**
- Database adapter implementation
- Updated query patterns
- Performance benchmarks

### Phase 4: Testing & Documentation (Week 7-8)

**Goals:**
- Comprehensive testing of self-hosted version
- Create deployment documentation
- User migration guide

**Tasks:**
1. ✅ Unit tests for auth adapters
2. ✅ Integration tests for database layer
3. ✅ E2E tests for critical flows
4. ✅ Load testing (100+ concurrent users)
5. ✅ Write deployment guide
6. ✅ Create migration script for existing Supabase users

**Deliverables:**
- Test suite with >80% coverage
- Deployment documentation
- Migration automation scripts

### Phase 5: Dual Deployment (Week 9-10)

**Goals:**
- Maintain backward compatibility with Supabase
- Deploy self-hosted version to staging
- Soft launch for beta testers

**Tasks:**
1. ✅ Implement deployment mode switching
2. ✅ Test both self-hosted and SaaS modes
3. ✅ Deploy to staging environment
4. ✅ Beta testing with 10-20 users
5. ✅ Gather feedback and iterate
6. ✅ Prepare for public release

**Deliverables:**
- Dual-mode codebase
- Staging deployment
- Beta feedback report

### Phase 6: Public Release (Week 11-12)

**Goals:**
- Open source release
- Marketing launch
- Community building

**Tasks:**
1. ✅ Clean up repository, add LICENSE
2. ✅ Publish Docker images to GHCR
3. ✅ Create quick-start guide
4. ✅ Announce on social media, forums
5. ✅ Set up community channels (Discord, GitHub Discussions)
6. ✅ Monitor deployment issues

**Deliverables:**
- Public GitHub repository
- Quick-start documentation
- Community channels

---

## 12. Security Considerations

### Self-Hosted Security Checklist

- [ ] PostgreSQL password-protected with strong credentials
- [ ] Keycloak admin password changed from default
- [ ] All services behind reverse proxy (Nginx/Caddy)
- [ ] SSL/TLS certificates for all domains
- [ ] Firewall rules (allow only 80, 443, 22)
- [ ] Regular security updates (automated with Watchtower)
- [ ] Database backups encrypted and off-site
- [ ] Environment variables in secrets (not .env files in repo)
- [ ] Rate limiting on auth endpoints
- [ ] CORS policies restricted to app domain
- [ ] Content Security Policy (CSP) headers
- [ ] Regular penetration testing

### Keycloak Hardening

```yaml
# Production Keycloak configuration
services:
  keycloak:
    environment:
      # Database connection pooling
      KC_DB_POOL_INITIAL_SIZE: 10
      KC_DB_POOL_MAX_SIZE: 20
      KC_DB_POOL_MIN_SIZE: 5
      
      # Security headers
      KC_HTTP_HEADERS_STRICT_TRANSPORT_SECURITY: max-age=31536000; includeSubDomains
      KC_HTTP_HEADERS_X_FRAME_OPTIONS: DENY
      KC_HTTP_HEADERS_X_CONTENT_TYPE_OPTIONS: nosniff
      
      # Logging
      KC_LOG_LEVEL: info
      KC_LOG_CONSOLE_OUTPUT: json
      
      # Performance
      KC_CACHE: ispn
      KC_CACHE_STACK: kubernetes  # or tcp for Docker
```

---

## 13. Performance Optimization

### Database Optimization

```sql
-- Connection pooling (pgBouncer)
-- Add to docker-compose.yml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: reading_buddy
      DATABASES_PASSWORD: ${DB_PASSWORD}
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 1000
      PGBOUNCER_DEFAULT_POOL_SIZE: 25
```

### Caching Strategy

```typescript
// lib/cache/redis.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Cache user profiles for 5 minutes
export async function getUserProfile(userId: string) {
  const cached = await redis.get(`profile:${userId}`);
  if (cached) return JSON.parse(cached);
  
  const profile = await db.query('SELECT * FROM profiles WHERE id = $1', [userId]);
  await redis.setex(`profile:${userId}`, 300, JSON.stringify(profile));
  
  return profile;
}
```

---

## 14. Cost Analysis

### Self-Hosted Infrastructure (Estimate)

**Minimum Requirements:**
- **CPU:** 2 cores
- **RAM:** 4GB
- **Storage:** 50GB SSD
- **Bandwidth:** 1TB/month

**Hosting Options:**

| Provider | Specs | Monthly Cost |
|----------|-------|--------------|
| **DigitalOcean Droplet** | 2 vCPU, 4GB RAM, 80GB SSD | $24/month |
| **Hetzner Cloud** | 2 vCPU, 4GB RAM, 80GB SSD | €9/month (~$10) |
| **AWS Lightsail** | 2 vCPU, 4GB RAM, 80GB SSD | $24/month |
| **Self-hosted** | Old laptop/server | $0/month (electricity ~$5) |

**Additional Services:**
- **Domain:** $12/year (~$1/month)
- **SSL Certificate:** Free (Let's Encrypt)
- **Email (SendGrid):** Free tier (100 emails/day)
- **Backups (S3):** ~$5/month (100GB)

**Total Self-Hosted Cost:** ~$15-30/month

### Managed SaaS Infrastructure (Current)

- **Supabase Pro:** $25/month
- **MinIO (DigitalOcean Spaces):** $5/month
- **Hosting (Komodo):** $0 (self-managed VPS)
- **Domain:** $12/year
- **Email (Postmark):** $10/month (10,000 emails)

**Total SaaS Cost:** ~$40-50/month

**Savings with Self-Hosting:** ~$20-30/month

---

## 15. Backup and Disaster Recovery

### Automated Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup PostgreSQL
docker exec reading-buddy-postgres pg_dump -U reading_buddy reading_buddy > \
  $BACKUP_DIR/db_backup_$DATE.sql

# Backup MinIO data
docker exec reading-buddy-minio mc mirror /data $BACKUP_DIR/minio_$DATE/

# Compress and encrypt
tar -czf - $BACKUP_DIR/*_$DATE* | \
  gpg --symmetric --cipher-algo AES256 > $BACKUP_DIR/backup_$DATE.tar.gz.gpg

# Upload to S3/B2
aws s3 cp $BACKUP_DIR/backup_$DATE.tar.gz.gpg \
  s3://reading-buddy-backups/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "backup_*.tar.gz.gpg" -mtime +30 -delete
```

**Cron Job:**
```cron
0 2 * * * /usr/local/bin/backup.sh
```

---

## 16. Monitoring and Observability

### Health Checks

```typescript
// app/api/health/route.ts
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check database
    await db.query('SELECT 1');
    
    // Check MinIO
    const minio = getMinioClient();
    await minio.listBuckets();
    
    // Check Keycloak (optional)
    const keycloak = await fetch(`${process.env.KEYCLOAK_URL}/health`);
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        storage: 'up',
        auth: keycloak.ok ? 'up' : 'down',
      },
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message,
    }, { status: 503 });
  }
}
```

### Logging (Optional: Grafana + Loki)

```yaml
# docker-compose.monitoring.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
```

---

## 17. Documentation Structure

```
docs/
├── deployment/
│   ├── self-hosted/
│   │   ├── quick-start.md
│   │   ├── production-deployment.md
│   │   ├── docker-compose.md
│   │   ├── kubernetes.md (future)
│   │   └── troubleshooting.md
│   ├── managed-saas/
│   │   ├── supabase-setup.md
│   │   └── managed-deployment.md
│   └── migration/
│       ├── supabase-to-self-hosted.md
│       ├── self-hosted-to-saas.md
│       └── data-export-import.md
├── configuration/
│   ├── environment-variables.md
│   ├── keycloak-setup.md
│   ├── database-setup.md
│   └── email-configuration.md
├── development/
│   ├── local-development.md
│   ├── architecture.md
│   └── contributing.md
└── user-guides/
    ├── admin-guide.md
    ├── teacher-guide.md
    └── student-guide.md
```

---

## 18. Open Source Strategy

### License: MIT

```
MIT License

Copyright (c) 2024 Reading Buddy Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

**Why MIT:**
- Maximum permissiveness
- Allows commercial use
- Encourages adoption
- Compatible with paid SaaS offering

### Repository Structure

```
reading-buddy/
├── web/                  # Next.js application
├── sql/                  # Database migrations
├── docker/               # Docker configurations
│   ├── self-hosted/
│   └── development/
├── docs/                 # Documentation
├── scripts/              # Automation scripts
│   ├── backup.sh
│   ├── restore.sh
│   └── migrate-users.py
├── .github/
│   ├── workflows/        # CI/CD
│   └── ISSUE_TEMPLATE/
├── docker-compose.yml
├── docker-compose.prod.yml
├── LICENSE
├── README.md
├── CONTRIBUTING.md
└── CODE_OF_CONDUCT.md
```

### Contributing Guidelines

```markdown
# Contributing to Reading Buddy

We welcome contributions! Here's how you can help:

## Development Setup

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Run `docker-compose up -d`
4. Run migrations: `npm run db:migrate`
5. Start development: `npm run dev`

## Code Style

- Use TypeScript strict mode
- Follow existing patterns
- Write tests for new features
- Run `npm run lint` before committing

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request
```

---

## 19. Marketing & Positioning

### Value Proposition

**Self-Hosted (Free & Open Source):**
- "Full control over your data and infrastructure"
- "Deploy to your own servers in minutes"
- "No vendor lock-in, no monthly fees"
- "Perfect for schools, libraries, and homeschoolers"

**Managed SaaS (Paid):**
- "Zero maintenance, focus on teaching"
- "99.9% uptime SLA with automated backups"
- "Priority support and feature requests"
- "Multi-school management (coming soon)"
- "Advanced analytics and reporting"

### Pricing Tiers (Proposed)

| Tier | Price | Features |
|------|-------|----------|
| **Self-Hosted** | Free | All core features, community support |
| **Starter** | $29/month | Up to 100 students, basic support |
| **Professional** | $99/month | Up to 500 students, priority support, advanced analytics |
| **Enterprise** | Custom | Unlimited students, multi-tenant, SLA, custom integrations |

---

## 20. Next Steps

### Immediate Actions

1. **Decision Point:** Approve this architecture plan
2. **Resource Allocation:** Assign developer hours (estimated 10-12 weeks)
3. **Infrastructure:** Provision staging environment for testing
4. **Communication:** Announce roadmap to existing users

### Risk Mitigation

**Technical Risks:**
- ✅ RLS policy migration complexity → Phased rollout with extensive testing
- ✅ Auth migration user experience → Gradual migration with fallback
- ✅ Performance regression → Benchmark testing before launch

**Business Risks:**
- ✅ Existing users confused by dual offerings → Clear communication, migration guide
- ✅ Support burden increases → Community-driven support for self-hosted
- ✅ Revenue impact → Managed SaaS differentiation with premium features

### Success Metrics

**Technical:**
- [ ] 100% feature parity between self-hosted and SaaS
- [ ] <10ms latency increase from Supabase baseline
- [ ] 99.9% uptime for self-hosted reference deployment

**Business:**
- [ ] 1,000+ self-hosted deployments in first year
- [ ] 50+ managed SaaS customers
- [ ] 80%+ user satisfaction score

---

## Conclusion

This architecture plan provides a comprehensive roadmap to transform Reading Buddy into a fully self-hostable platform while maintaining a competitive managed SaaS offering. The dual-deployment strategy balances:

- **Open source accessibility** for individual schools and cost-conscious users
- **Managed convenience** for institutions wanting zero-maintenance solutions
- **Technical excellence** with PostgreSQL + Keycloak as a robust foundation
- **Business sustainability** through clear differentiation and premium tiers

**Recommendation:** Proceed with **PostgreSQL + Keycloak + NextAuth.js** architecture in phased rollout starting with Phase 1 (Foundation) immediately.

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-15  
**Next Review:** After Phase 1 completion (Week 2)  
**Author:** Development Team  
**Status:** Awaiting Approval

--- 
### Original File: notes//2024-12-14/development/SELF_HOSTED_NEXTAUTH_PLAN.md

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

--- 
### Original File: notes//2024-12-14/deployment/VERSIONING.md

# Image Versioning Strategy

## Overview

Our CI/CD pipeline creates multiple image tags for flexibility in deployment and rollback.

## Staging Tags

Every push to `staging` branch creates:

| Tag Pattern | Example | Purpose | Mutable |
|------------|---------|---------|---------|
| `latest` | `ghcr.io/mws-mad-labs/reading-companion-staging:latest` | Always latest staging | ✅ Yes |
| `build-{n}` | `ghcr.io/mws-mad-labs/reading-companion-staging:build-123` | Build number | ❌ No |
| `staging-{sha}` | `ghcr.io/mws-mad-labs/reading-companion-staging:staging-abc1234` | Git commit | ❌ No |
| `staging-{date}` | `ghcr.io/mws-mad-labs/reading-companion-staging:staging-2025-12-13-0930` | Timestamp | ❌ No |

## Production Tags

### From Branch Pushes

Every push to `main` branch creates:

| Tag Pattern | Example | Purpose | Mutable |
|------------|---------|---------|---------|
| `latest` | `ghcr.io/mws-mad-labs/reading-companion:latest` | Latest production | ✅ Yes |
| `build-{n}` | `ghcr.io/mws-mad-labs/reading-companion:build-456` | Build number | ❌ No |
| `main-{sha}` | `ghcr.io/mws-mad-labs/reading-companion:main-abc1234` | Git commit | ❌ No |
| `prod-{date}` | `ghcr.io/mws-mad-labs/reading-companion:prod-2025-12-13-1030` | Timestamp | ❌ No |

### From Git Tags (Semantic Versioning)

When you create a git tag like `v1.2.3`, it creates:

| Tag Pattern | Example | Purpose | Mutable |
|------------|---------|---------|---------|
| `v1.2.3` | `ghcr.io/mws-mad-labs/reading-companion:v1.2.3` | Exact version | ❌ No |
| `v1.2` | `ghcr.io/mws-mad-labs/reading-companion:v1.2` | Minor version | ✅ Yes |
| `v1` | `ghcr.io/mws-mad-labs/reading-companion:v1` | Major version | ✅ Yes |

## Usage in Komodo

### Staging (Current Deployment)

```yaml
image: ghcr.io/mws-mad-labs/reading-companion-staging:latest
```

**Deployment:** Manual redeploy after each build

### Staging (Pin to Specific Build)

```yaml
image: ghcr.io/mws-mad-labs/reading-companion-staging:build-123
```

**Use case:** Testing a specific build, preventing auto-updates

### Production (Latest)

```yaml
image: ghcr.io/mws-mad-labs/reading-companion:latest
```

**Deployment:** Manual redeploy

### Production (Semantic Version)

```yaml
image: ghcr.io/mws-mad-labs/reading-companion:v1.2
```

**Deployment:** Auto-updates to latest patch within v1.2.x  
**Recommended for:** Production with controlled updates

## Rollback Scenarios

### Scenario 1: Rollback Staging to Previous Build

```bash
# Check available builds
docker pull ghcr.io/mws-mad-labs/reading-companion-staging:build-122

# Update Komodo stack
image: ghcr.io/mws-mad-labs/reading-companion-staging:build-122

# Redeploy
```

### Scenario 2: Rollback to Specific Commit

```bash
# Use commit SHA tag
image: ghcr.io/mws-mad-labs/reading-companion-staging:staging-abc1234
```

### Scenario 3: Rollback Production to Previous Version

```bash
# Use semantic version
image: ghcr.io/mws-mad-labs/reading-companion:v1.1.0
```

## Creating Semantic Versions

For production releases with semantic versioning:

```bash
# 1. Ensure main is up to date
git checkout main
git pull

# 2. Create and push tag
git tag v1.2.0
git push origin v1.2.0

# 3. GitHub Actions automatically builds and pushes:
#    - :v1.2.0 (immutable)
#    - :v1.2 (updated)
#    - :v1 (updated)
#    - :latest (updated)

# 4. Deploy in Komodo
image: ghcr.io/mws-mad-labs/reading-companion:v1.2.0
```

## Tag Naming Convention

### Semantic Versioning (Production)

Follow [SemVer](https://semver.org/):

- **MAJOR**: Breaking changes (v2.0.0)
- **MINOR**: New features, backward compatible (v1.2.0)
- **PATCH**: Bug fixes, backward compatible (v1.2.1)

**Examples:**
- `v1.0.0` - Initial release
- `v1.1.0` - Added quiz feature
- `v1.1.1` - Fixed quiz bug
- `v2.0.0` - New authentication system (breaking)
tes
### Build Numbers (Auto-incremented)

GitHub Actions run number, starts at 1 and increments.

### Timestamps

Format: `YYYY-MM-DD-HHmm` (UTC)

## Viewing Available Tags

### Via GitHub Container Registry

https://github.com/orgs/MWS-MAD-Labs/packages/container/package/reading-companion-staging

### Via Docker CLI

```bash
# Staging
docker pull ghcr.io/mws-mad-labs/reading-companion-staging --all-tags

# Production  
docker pull ghcr.io/mws-mad-labs/reading-companion --all-tags
```

## Best Practices

### Staging

✅ Use `:latest` for normal development  
✅ Pin to `:build-{n}` when testing specific changes  
✅ Use `:staging-{sha}` for debugging specific commits  

### Production

✅ Use semantic versions (`:v1.2.0`) for releases  
✅ Pin to exact version (`:v1.2.0`) for stability  
✅ Use minor version (`:v1.2`) for auto-patch updates  
❌ Avoid `:latest` in production (too unpredictable)  

## Current Versions

To see what's currently deployed:

```bash
# Check running container
docker inspect reading-buddy-staging | grep Image

# Check for updates
docker pull ghcr.io/mws-mad-labs/reading-companion-staging:latest
docker images | grep reading-companion
```

--- 
### Original File: notes//2024-12-14/deployment/DOCKER.md

# Docker Deployment Guide

This guide explains how to deploy Reading Buddy using Docker, with the source code pulled directly from GitHub.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)
- Git repository: https://github.com/MWS-MAD-Labs/reading-buddy

## Quick Start

### 1. Create Environment File

Download the environment template and configure your credentials:

```bash
curl -O https://raw.githubusercontent.com/MWS-MAD-Labs/reading-buddy/main/.env.example
cp .env.example .env
nano .env  # Edit with your actual values
```

### 2. Download Docker Compose File

```bash
curl -O https://raw.githubusercontent.com/MWS-MAD-Labs/reading-buddy/main/docker-compose.yml
```

### 3. Deploy

```bash
docker-compose up --build -d
```

The application will be available at `http://localhost:3000`

## How It Works

### Deployment Architecture

The Docker setup is configured to:
- **Pull code directly from GitHub** - Ensures you always deploy the latest version
- **Build with no cache** - Forces fresh builds to avoid stale code
- **Use placeholder build args** - Allows building without real credentials
- **Override at runtime** - Real credentials from `.env` file are injected at runtime

### Build Process

1. Docker pulls latest code from `https://github.com/MWS-MAD-Labs/reading-buddy.git#main`
2. Builds Next.js application with placeholder environment variables
3. Creates standalone production build
4. Runs container with your actual credentials from `.env` file

## Environment Variables

All environment variables should be set in your `.env` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# MinIO Object Storage
MINIO_ENDPOINT=your-minio-endpoint.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
MINIO_BUCKET_NAME=reading-buddy

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# Optional: Custom Port
PORT=3000
```

**Note:** The application builds successfully with placeholder values but requires real credentials for full functionality.

## Docker Commands

### View Logs
```bash
docker-compose logs -f reading-buddy
```

### Stop Application
```bash
docker-compose down
```

### Restart Application
```bash
docker-compose restart
```

### Force Fresh Build
```bash
# Remove everything and rebuild
docker-compose down
docker rmi reading-buddy:latest -f
docker builder prune -af
docker-compose up --build -d
```

## Deployment Options

### Option 1: Deploy from GitHub (Recommended)

This is the default configuration in `docker-compose.yml`:

```yaml
services:
  reading-buddy:
    build:
      context: https://github.com/MWS-MAD-Labs/reading-buddy.git#main
      dockerfile: Dockerfile
      no_cache: true
      pull: true
```

**Advantages:**
- Always deploys latest code from GitHub
- No need to clone repository locally
- Ideal for production servers

### Option 2: Deploy from Local Files

If you want to test local changes before pushing to GitHub:

1. Clone the repository:
   ```bash
   git clone https://github.com/MWS-MAD-Labs/reading-buddy.git
   cd reading-companion
   ```

2. Edit `docker-compose.yml` and change the build context:
   ```yaml
   build:
     context: .  # Use local directory instead of GitHub
     dockerfile: Dockerfile
   ```

3. Deploy:
   ```bash
   docker-compose up --build -d
   ```

## Production Deployment

### Health Checks

The container includes automatic health monitoring:

```bash
# Check container health status
docker inspect reading-buddy --format='{{.State.Health.Status}}'
```

Health check verifies the application responds correctly on port 3000.

### Resource Limits

For production, consider adding resource limits to `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

### Reverse Proxy Setup

For production with SSL, use a reverse proxy (nginx, Caddy, Traefik):

**Nginx Example:**
```nginx
server {
    listen 443 ssl http2;
    server_name reading.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy Example:**
```
reading.yourdomain.com {
    reverse_proxy localhost:3000
}
```

## Updates and Maintenance

### Deploying Updates

To deploy the latest code from GitHub:

```bash
docker-compose up --build -d
```

The `no_cache: true` setting ensures you always get the latest code.

### Viewing Container Status

```bash
# List containers
docker ps

# View resource usage
docker stats reading-buddy

# Check logs
docker logs --tail 100 reading-buddy
```

### Clearing Docker Cache

If you encounter build issues:

```bash
# Clear all build cache
docker builder prune -af

# Remove dangling images
docker image prune -f

# Full cleanup (careful - removes all unused Docker data)
docker system prune -af
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill

# Or use a different port
PORT=3001 docker-compose up --build -d
```

### Build Fails

```bash
# Check logs for errors
docker-compose logs

# Try building without detached mode to see errors
docker-compose up --build

# Clear cache and retry
docker builder prune -af
docker-compose up --build -d
```

### Container Unhealthy

```bash
# Check health status
docker inspect reading-buddy --format='{{.State.Health.Status}}'

# View health check logs
docker inspect reading-buddy --format='{{range .State.Health.Log}}{{.Output}}{{end}}'

# Check application logs
docker logs reading-buddy
```

### OAuth/Authentication Issues

If you experience OAuth redirect issues:
- Ensure your Supabase site URL is configured correctly
- The application uses the `Host` header for redirects
- Check that your reverse proxy passes the correct headers

### Image Not Updating

If the Docker image doesn't reflect latest GitHub changes:

```bash
# Force complete rebuild
docker-compose down
docker rmi reading-buddy:latest -f
docker builder prune -af
docker-compose build --no-cache --pull
docker-compose up -d
```

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong credentials** - Generate secure keys for all services
3. **Keep images updated** - Regularly rebuild to get security patches
4. **Use SSL in production** - Always deploy behind HTTPS reverse proxy
5. **Restrict port access** - If using reverse proxy, bind container port to localhost only:
   ```yaml
   ports:
     - "127.0.0.1:3000:3000"
   ```

## Monitoring and Logs

### Real-time Logs
```bash
docker-compose logs -f
```

### Last N Lines
```bash
docker logs --tail 50 reading-buddy
```

### Search Logs
```bash
docker logs reading-buddy 2>&1 | grep -i error
```

### Export Logs
```bash
docker logs reading-buddy > logs.txt 2>&1
```

## Advanced Configuration

### Running Background Jobs

The PDF rendering worker needs to run separately. Options:

**Option 1: Manual Execution**
```bash
docker exec -it reading-buddy sh -c "cd web && npm run render:book-images"
```

**Option 2: Cron Job (Recommended)**
```bash
# Create script: /usr/local/bin/reading-buddy-render.sh
#!/bin/bash
docker exec reading-buddy sh -c "cd web && npm run render:book-images"

# Make executable
chmod +x /usr/local/bin/reading-buddy-render.sh

# Add to crontab (run every hour)
echo "0 * * * * /usr/local/bin/reading-buddy-render.sh >> /var/log/reading-buddy-render.log 2>&1" | crontab -
```

### Custom Domain Configuration

If deploying with a custom domain, update your Supabase redirect URLs:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your domain to "Site URL"
3. Add redirect URLs: `https://yourdomain.com/auth/callback`

## Support and Documentation

- **GitHub Repository**: https://github.com/MWS-MAD-Labs/reading-buddy
- **Issues**: Report problems via GitHub Issues
- **Next.js Docs**: https://nextjs.org/docs
- **Docker Docs**: https://docs.docker.com

--- 
### Original File: notes//2024-12-14/deployment/DATABASE_SETUP.md

# Database Setup Guide

This guide will help you set up the database for Reading Buddy.

## Overview

Reading Buddy uses **self-hosted PostgreSQL** for all data storage. The database schema includes:

- **20 tables** covering users, books, classes, quizzes, checkpoints, badges, login broadcasts, and weekly challenges
- **Row-level security** for secure multi-role access
- **20+ indexes** for optimal performance (including gamification and challenge indexes)
- **Triggers and functions** for automation (including auto-update timestamps)
- **6 default badges** for gamification
- **Full gamification system** with XP, levels, streaks, reading stats, and weekly challenges

## Prerequisites

- Docker and Docker Compose installed
- A running PostgreSQL container (see `docker-compose.selfhosted.yml`)

## Setup Instructions

### Step 1: Start PostgreSQL Container

If using the self-hosted Docker Compose setup:

```bash
docker-compose -f docker-compose.selfhosted.yml up -d postgres
```

This will start:
- PostgreSQL on port 5432 (mapped to host as needed)
- Database: `reading_buddy`
- User: `reading_buddy`

### Step 2: Run the Database Setup Script

1. Locate the database setup script in `sql/self-hosted/` or `sql/migrations/`
2. Apply the migrations to your PostgreSQL database:

```bash
# From project root
docker exec -i reading-buddy-postgres psql -U reading_buddy -d reading_buddy < sql/self-hosted/schema.sql
```

Or run individual migrations:

```bash
# Apply all migrations
for file in sql/migrations/*.sql; do
  docker exec -i reading-buddy-postgres psql -U reading_buddy -d reading_buddy < "$file"
done
```

### Step 3: Verify the Setup

1. Connect to the database:
```bash
docker exec -it reading-buddy-postgres psql -U reading_buddy -d reading_buddy
```

2. List tables:
```sql
\dt
```

You should see all tables:
- `profiles`
- `books`
- `book_access`
- `classes`
- `class_students`
- `class_books`
- `book_render_jobs`
- `student_books`
- `quizzes`
- `quiz_attempts`
- `achievements`
- `student_achievements`
- `quiz_checkpoints`
- `student_checkpoint_progress`
- `badges`
- `student_badges`
- `login_broadcasts`
- `weekly_challenge_completions`
- And more...

3. Check badges:
```sql
SELECT * FROM badges;
```

You should see 6 default badges.

### Step 4: Configure Environment Variables

Edit your `.env` file with database credentials:

```env
# Database (Self-hosted PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=reading_buddy
DB_USER=reading_buddy
DB_PASSWORD=your-secure-password

# Or use DATABASE_URL
DATABASE_URL=postgresql://reading_buddy:password@postgres:5432/reading_buddy
```

## Database Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with roles (STUDENT, TEACHER, LIBRARIAN, ADMIN) |
| `books` | Book metadata and file URLs |
| `book_access` | Access level controls per book |
| `classes` | Teacher classrooms |
| `class_students` | Student enrollment in classes |
| `class_books` | Book assignments to classes |

### Reading & Progress

| Table | Description |
|-------|-------------|
| `student_books` | Student reading progress (current page, completion) |
| `book_render_jobs` | PDF to image rendering jobs |

### Quizzes & Checkpoints

| Table | Description |
|-------|-------------|
| `quizzes` | Quiz definitions (classroom and checkpoint types) |
| `quiz_attempts` | Student quiz submissions and scores |
| `quiz_checkpoints` | Checkpoint definitions in books |
| `student_checkpoint_progress` | Student checkpoint completion tracking |

### Gamification

| Table | Description |
|-------|-------------|
| `badges` | Badge definitions |
| `student_badges` | Badges earned by students |
| `achievements` | Legacy achievement definitions |
| `student_achievements` | Legacy student achievements |
| `xp_transactions` | XP earning history and audit log |
| `weekly_challenge_completions` | Tracks completed weekly challenges and XP awards |

## Authentication

Reading Buddy uses NextAuth for authentication with PostgreSQL as the session store. See `SELF_HOSTED_NEXTAUTH_PLAN.md` for details.

## Row Level Security

The database can use RLS policies for secure access control. Key policies:

- **Students:** Can view their own progress, take quizzes, earn badges
- **Teachers:** Can view student progress, manage their classrooms
- **Librarians:** Can manage books, create quizzes, set up checkpoints
- **Admins:** Full access to all data and user management

## Creating Your First Admin User

After setup, you'll need at least one admin user:

1. **Sign up** through the app's signup page
2. Connect to the database:
```bash
docker exec -it reading-buddy-postgres psql -U reading_buddy -d reading_buddy
```
3. Update the user role:
```sql
UPDATE profiles SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

## Troubleshooting

### Connection refused

Make sure the PostgreSQL container is running:
```bash
docker ps | grep postgres
```

Check port mapping:
```bash
docker port reading-buddy-postgres
```

### Permission denied

Verify credentials in `.env` match the container's environment:
```bash
docker exec reading-buddy-postgres printenv | grep POSTGRES
```

### Table does not exist

Make sure you've run all migration scripts:
```bash
ls sql/migrations/
```

## Backup & Restore

### Backup

```bash
docker exec reading-buddy-postgres pg_dump -U reading_buddy reading_buddy > backup.sql
```

### Restore

```bash
docker exec -i reading-buddy-postgres psql -U reading_buddy reading_buddy < backup.sql
```

## Next Steps

After database setup:

1. ✅ Configure MinIO storage (see [DOCKER.md](DOCKER.md))
2. ✅ Set up AI provider (Gemini or local RAG)
3. ✅ Run the application locally or deploy with Docker
4. ✅ Create your first admin user
5. ✅ Start uploading books!

## Migration from Supabase

If you're migrating from Supabase to self-hosted PostgreSQL:

1. Export your Supabase data:
```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > supabase-backup.sql
```

2. Import to local PostgreSQL:
```bash
docker exec -i reading-buddy-postgres psql -U reading_buddy reading_buddy < supabase-backup.sql
```

See `MIGRATION_INSTRUCTIONS.md` for more details.

---

**Version:** 2.0.0 (Self-hosted)
**Last Updated:** February 10, 2026

--- 
### Original File: notes//2024-12-14/deployment/CI-CD.md

# CI/CD Pipeline - Complete Documentation

## Overview

This project uses a comprehensive CI/CD pipeline with automated testing, building, and deployment for both staging and production environments.

## Architecture

```
Local Development (Your PC)
    ↓
Pre-Commit Hook (Automatic)
    ├─ ESLint --fix
    ├─ Prettier
    └─ Blocks commit if fails ❌
    ↓
Commit & Push to GitHub
    ↓
┌─────────────────────────────────────────────────────────┐
│ GitHub Actions CI/CD                                    │
│  ├─ ESLint (code quality)                              │
│  ├─ TypeScript check (type safety)                     │
│  ├─ Vitest tests with coverage (unit tests)            │
│  ├─ Upload coverage to Codecov                         │
│  ├─ Playwright E2E tests (user flows)                  │
│  ├─ Build Next.js (for Lighthouse)                     │
│  ├─ Lighthouse CI (performance, a11y, SEO)             │
│  ├─ Build Docker image (only if all tests pass ✅)     │
│  ├─ Push to GHCR with multi-tags                       │
│  └─ Trigger Komodo Procedure webhook                   │
└─────────────────────────────────────────────────────────┘
    ↓
Komodo Procedure (Orchestration)
    ├─ Receives webhook from GitHub Actions
    ├─ Validates GitHub signature
    └─ Triggers Stack deployment
    ↓
Komodo Stack (Deployment)
    ├─ Pulls new image from GHCR
    ├─ Restarts container
    └─ Health check verification
    ↓
Live Application 🚀
```

## Environments

### Staging Environment
- **Branch:** `staging`
- **URL:** https://staging-reads.mws.web.id
- **Port:** 3001
- **Image:** `ghcr.io/mws-mad-labs/reading-companion-staging:latest`
- **Auto-deploy:** ✅ On every push to staging

### Production Environment
- **Branch:** `main`
- **URL:** https://reads.mws.web.id
- **Port:** 3000
- **Image:** `ghcr.io/mws-mad-labs/reading-companion:latest`
- **Auto-deploy:** ✅ On every push/merge to main
- **Protection:** Branch protection rules enabled

## Components

### 1. Local Pre-Commit Hooks (Husky + lint-staged)

**Location:** `web/.husky/pre-commit`

**What it does:**
- Runs automatically before every `git commit`
- Lints and formats only staged files
- Fixes auto-fixable issues
- **Blocks commit** if there are errors

**Installed Packages:**
- ✅ Husky (Git hooks manager)
- ✅ lint-staged (Run linters on staged files)

**Configuration in `web/package.json`:**
```json
{
  "scripts": {
    "prepare": "cd .. && husky web/.husky"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

**Usage:**
```bash
git add .
git commit -m "feat: new feature"
# → Pre-commit hook runs automatically
# → If ESLint passes, commit succeeds ✅
# → If ESLint fails, commit is blocked ❌
```

### 2. GitHub Actions Workflows

#### Staging Workflow

**File:** `.github/workflows/staging.yml`

**Triggers:** Push to `staging` branch

**Jobs:**
1. **Test and Build**
   - Checkout code
   - Setup Node.js 20
   - Install dependencies
   - Run ESLint
   - Run TypeScript type checking
   - Run Vitest unit tests
   - Login to GHCR (GitHub Container Registry)
   - Build Docker image with multi-tags
   - Push to GHCR
   - Trigger Komodo Procedure webhook (auto-deploy)

**Image Tags Created:**
```
ghcr.io/mws-mad-labs/reading-companion-staging:latest
ghcr.io/mws-mad-labs/reading-companion-staging:build-<run_number>
ghcr.io/mws-mad-labs/reading-companion-staging:staging-<sha>
ghcr.io/mws-mad-labs/reading-companion-staging:staging-<timestamp>
```

#### Production Workflow

**File:** `.github/workflows/production.yml`

**Triggers:** Push to `main` branch

**Jobs:** Same as staging, but with additional semantic versioning support

**Image Tags Created:**
```
ghcr.io/mws-mad-labs/reading-companion:latest
ghcr.io/mws-mad-labs/reading-companion:build-<run_number>
ghcr.io/mws-mad-labs/reading-companion:v1.0.0 (if tagged)
ghcr.io/mws-mad-labs/reading-companion:1.0
ghcr.io/mws-mad-labs/reading-companion:1
ghcr.io/mws-mad-labs/reading-companion:main-<sha>
ghcr.io/mws-mad-labs/reading-companion:prod-<timestamp>
```

### 3. Komodo Procedures (Webhook Automation)

**Purpose:** Orchestrate deployment after successful CI/CD build

#### Staging Procedure

**Name:** `Deploy Staging Stack`

**Configuration:**
- **Auth style:** GitHub
- **Listen on branch:** `staging`
- **Webhook Enabled:** ✅
- **Webhook Secret:** Custom secret (stored in GitHub Actions)
- **Webhook URL:** `https://komo.mws.web.id/listener/github/procedure/<id>`

**Action:**
- Deploy Stack → `reading-companion-staging`

#### Production Procedure

**Name:** `Deploy Production Stack`

**Configuration:**
- **Auth style:** GitHub
- **Listen on branch:** `main`
- **Webhook Enabled:** ✅
- **Webhook Secret:** Custom secret (separate from staging)
- **Webhook URL:** `https://komo.mws.web.id/listener/github/procedure/<id>`

**Action:**
- Deploy Stack → `reading-companion-prod`

### 4. Komodo Stacks (Deployment Configuration)

#### Staging Stack

**Name:** `reading-companion-staging`

**Docker Compose:**
```yaml
services:
  reading-buddy-staging:
    image: ghcr.io/mws-mad-labs/reading-companion-staging:latest
    container_name: reading-buddy-staging
    restart: unless-stopped
    pull_policy: always
    
    ports:
      - "3001:3000"
    
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_PUBLIC_APP_URL=https://staging-reads.mws.web.id
      - NEXT_PUBLIC_RAG_API_URL=https://rag.mws.web.id/
      - NEXT_PUBLIC_SUPABASE_URL=https://hbrosmlrvbkmcbyggriv.supabase.co
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      - SUPABASE_SERVICE_ROLE_KEY=<secret>
      - MINIO_ENDPOINT=minioapi.mws.web.id
      - MINIO_PORT=443
      - MINIO_USE_SSL=true
      - MINIO_ACCESS_KEY=<secret>
      - MINIO_SECRET_KEY=<secret>
      - MINIO_BUCKET_NAME=reading-buddy
      - AI_PROVIDER=local
      - GEMINI_API_KEY=<secret>
      - RAG_API_URL=http://172.16.0.65:8010
      - DIFFUSER_API_URL=http://172.16.0.165:8000
      - OLLAMA_API_URL=https://ollama.mws.web.id
    
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    networks:
      - reading-buddy-staging-network

networks:
  reading-buddy-staging-network:
    driver: bridge
```

#### Production Stack

**Name:** `reading-companion-prod`

**Docker Compose:** Same as staging with these changes:
- Image: `ghcr.io/mws-mad-labs/reading-companion:latest`
- Container: `reading-buddy-prod`
- Port: `3000:3000`
- App URL: `https://reads.mws.web.id`
- Network: `reading-buddy-prod-network`

## GitHub Secrets Configuration

Required secrets in GitHub repository settings:

| Secret Name | Purpose | Used In |
|-------------|---------|---------|
| `GITHUB_TOKEN` | Built-in GitHub Actions token used for GHCR push | Both workflows |
| `KOMODO_PROCEDURE_WEBHOOK_URL` | Staging procedure webhook URL | Staging workflow |
| `KOMODO_WEBHOOK_SECRET` | Staging webhook signature secret | Staging workflow |
| `KOMODO_PROD_PROCEDURE_WEBHOOK_URL` | Production procedure webhook URL | Production workflow |
| `KOMODO_PROD_WEBHOOK_SECRET` | Production webhook signature secret | Production workflow |
| `CODECOV_TOKEN` | Codecov upload token, only needed if you want coverage upload from production CI | Production workflow |
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub integration (optional) | Optional workflows only |

## Workflow Process

### Staging Deployment Flow

```bash
# 1. Developer makes changes
vim src/app/page.tsx

# 2. Stage and commit (pre-commit runs)
git add .
git commit -m "feat: add new feature"
# → ESLint + Prettier run automatically
# → Commit blocked if errors ❌

# 3. Push to staging
git push origin staging

# 4. GitHub Actions CI/CD (5-7 min)
# → ESLint ✅
# → TypeScript check ✅
# → Vitest tests ✅
# → Docker build ✅
# → Push to GHCR ✅
# → Webhook to Komodo ✅

# 5. Komodo auto-deploys (30 sec)
# → Procedure receives webhook
# → Validates signature
# → Triggers stack deployment
# → Pulls new image
# → Restarts container
# → Health check passes ✅

# 6. Live on staging!
# → https://staging-reads.mws.web.id
```

**Total Time:** ~8-12 minutes from push to live (including E2E and Lighthouse tests)

### Production Deployment Flow

```bash
# 1. Staging is tested and working ✅

# 2. Merge staging to main
git checkout main
git pull origin main
git merge staging --no-ff -m "chore: Release v1.2.0"
git push origin main

# 3. Same CI/CD process as staging
# → All tests run again
# → Production image built
# → Tagged with semver (if release tagged)
# → Auto-deployed to production

# 4. Live on production!
# → https://reads.mws.web.id
```

## Best Practices Implemented

### ✅ Quality Gates
- **Local:** Pre-commit hooks catch issues before commit
- **CI:** Automated tests must pass before build
- **Deployment:** Health checks verify successful deployment

### ✅ Environment Separation
- **Staging:** Test new features safely
- **Production:** Protected branch, requires review

### ✅ Image Versioning
- Multiple tags for flexibility
- Build numbers for tracking
- SHA for exact commit identification
- Timestamps for auditing
- Semantic versions for releases

### ✅ Security
- Webhook signatures for authentication
- Separate secrets per environment
- Service role keys stored as secrets
- No hardcoded credentials in code

### ✅ Automation
- Zero manual deployment steps
- Automatic rollback via health checks
- Consistent deployment process

### ✅ Observability
- GitHub Actions logs
- Komodo Procedure execution logs
- Container health monitoring
- Build numbers for tracking

## Branch Protection (Production)

**Recommended settings for `main` branch:**

Go to GitHub → Settings → Branches → Add rule for `main`

```
✅ Require a pull request before merging
   - Required approvals: 1
   
✅ Require status checks to pass before merging
   - Required checks: Test and Build
   - ✅ Require branches to be up to date
   
✅ Require conversation resolution before merging

❌ Allow force pushes (disabled)
❌ Allow deletions (disabled)
```

## Development Workflow

### Working on New Features

```bash
# 1. Create feature branch from staging
git checkout staging
git pull origin staging
git checkout -b feature/new-feature

# 2. Develop and test locally
npm run dev

# 3. Commit (pre-commit runs)
git add .
git commit -m "feat: implement new feature"

# 4. Push feature branch
git push origin feature/new-feature

# 5. Merge to staging via PR (or direct)
git checkout staging
git merge feature/new-feature
git push origin staging
# → Auto-deploys to staging

# 6. Test on staging
# → https://staging-reads.mws.web.id

# 7. When ready, merge staging to main
git checkout main
git merge staging
git push origin main
# → Auto-deploys to production
```

### Hotfixes

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix the issue
vim src/app/buggy-file.tsx

# 3. Commit and push
git add .
git commit -m "fix: critical bug in production"
git push origin hotfix/critical-bug

# 4. Merge to main
git checkout main
git merge hotfix/critical-bug
git push origin main
# → Auto-deploys to production

# 5. Also merge back to staging
git checkout staging
git merge main
git push origin staging
```

## Image Versioning Strategy

See [VERSIONING.md](./VERSIONING.md) for complete versioning documentation.

### Quick Reference

**Staging tags:**
```
:latest                    - Always newest staging build
:build-123                 - Specific build number
:staging-abc123            - Git commit SHA
:staging-2025-12-14-1530   - Timestamp
```

**Production tags:**
```
:latest                    - Always newest production build
:build-456                 - Specific build number
:v1.2.3                    - Semantic version (if tagged)
:1.2                       - Major.Minor version
:1                         - Major version only
:main-abc123               - Git commit SHA
:prod-2025-12-14-1530      - Timestamp
```

### Using Specific Versions

**In Komodo Stack, you can pin to specific versions:**

```yaml
# Use latest (auto-updates)
image: ghcr.io/mws-mad-labs/reading-companion:latest

# Pin to specific build (manual updates)
image: ghcr.io/mws-mad-labs/reading-companion:build-123

# Pin to release version
image: ghcr.io/mws-mad-labs/reading-companion:v1.2.3
```

## Monitoring and Troubleshooting

### Check CI/CD Status

**GitHub Actions:**
- View all workflows: https://github.com/MWS-MAD-Labs/reading-buddy/actions
- Check specific run for errors
- View build logs

**Komodo Procedures:**
- Go to Procedures → Select procedure
- View execution history
- Check logs for webhook triggers

**Komodo Stacks:**
- Go to Stacks → Select stack
- View deployment history
- Check container logs
- Monitor health checks

### Common Issues

#### Tests Failing in CI

```bash
# Run tests locally first
cd web
npm run test
npm run type-check
npm run lint
```

#### Webhook Not Triggering Deployment

**Check:**
1. Webhook URL is correct in GitHub secrets
2. Webhook secret matches between GitHub and Komodo
3. Komodo Procedure is enabled
4. Branch name matches (staging/main)
5. View webhook delivery in Komodo Procedure logs

#### Image Not Pulling

**Check:**
1. Image was successfully pushed to GHCR
2. Image tag is correct in Stack compose
3. GHCR authentication (should be public, no auth needed)
4. Network connectivity from Komodo to GHCR

#### Container Not Starting

**Check:**
1. Container logs in Komodo
2. Environment variables are set correctly
3. Health check is passing
4. Port conflicts

### Rollback Procedure

**Quick Rollback (use previous build):**

```yaml
# In Komodo Stack, change image tag
image: ghcr.io/mws-mad-labs/reading-companion:build-122  # previous build

# Then redeploy
```

**Full Rollback (revert code):**

```bash
# Find the commit to rollback to
git log --oneline

# Revert to previous commit
git revert <commit-sha>
git push origin main
# → CI/CD will build and deploy the reverted code
```

## Performance Metrics

**Typical Timeline:**

| Stage | Time |
|-------|------|
| Pre-commit hooks | 5-10 seconds |
| ESLint + TypeScript check | 30-60 seconds |
| Unit tests + coverage | 1-2 minutes |
| E2E tests (Playwright) | 2-3 minutes |
| Lighthouse CI | 2-3 minutes |
| Docker build | 2-3 minutes |
| Push to GHCR | 30 seconds |
| Webhook trigger | Instant |
| Komodo pull + deploy | 30-60 seconds |
| **Total** | **~10-15 minutes** |

## Cost Breakdown

| Component | Cost |
|-----------|------|
| Husky/lint-staged | FREE (local) |
| GitHub Actions | FREE (2,000 min/month) |
| GHCR | FREE (unlimited public images) |
| Komodo | Self-hosted (your server) |
| **Total** | **$0/month** 💰 |

## Benefits Summary

### ✅ Speed
- Fast local feedback (pre-commit)
- Automated deployment (no manual steps)
- 8-10 minutes from commit to live

### ✅ Quality
- Multiple testing layers
- Type safety enforced
- Code formatting automatic
- Can't deploy broken code

### ✅ Safety
- Staging environment for testing
- Branch protection on production
- Health checks verify deployment
- Easy rollback with versioned images

### ✅ Developer Experience
- One command to deploy: `git push`
- Clear workflow process
- Instant feedback on errors
- No context switching

### ✅ Cost Effective
- Completely free
- Uses GitHub's infrastructure
- Self-hosted deployment

## Quality Metrics and Monitoring

### Code Coverage (Codecov)

**What it does:**
- Tracks test coverage across the codebase
- Shows which code is tested and which isn't
- Provides coverage trends over time
- Generates detailed coverage reports

**Configuration:**
- Provider: Vitest with v8 coverage
- Reporters: Text, JSON, HTML
- Excluded: Config files, types, e2e tests
- Upload: Codecov (free for public repos)

**Coverage Thresholds:**
Current setup uses informational tracking (no hard failures).

**View Coverage:**
- Reports uploaded as GitHub Actions artifacts
- Codecov dashboard: https://codecov.io/gh/MWS-MAD-Labs/reading-buddy
- Trends and historical data available

**Setup Required:**
1. Sign up at https://codecov.io with GitHub
2. Add repository to Codecov
3. Get Codecov token
4. Add `CODECOV_TOKEN` to GitHub secrets

### Lighthouse CI (Performance Monitoring)

**What it does:**
- Measures performance, accessibility, best practices, and SEO
- Runs on every build before deployment
- Provides detailed performance reports
- Tracks performance regressions

**Configuration:** `web/lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "onlyCategories": ["performance", "accessibility", "best-practices", "seo"]
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", {"minScore": 0.8}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["warn", {"minScore": 0.8}],
        "categories:seo": ["warn", {"minScore": 0.8}]
      }
    }
  }
}
```

**Quality Thresholds:**
- **Performance:** ≥80% (warning if below)
- **Accessibility:** ≥90% (error if below, blocks deployment)
- **Best Practices:** ≥80% (warning if below)
- **SEO:** ≥80% (warning if below)

**Reports:**
- Uploaded as GitHub Actions artifacts
- Temporary public storage link provided
- View detailed metrics, suggestions, and screenshots

**Benefits:**
- Catch performance regressions early
- Ensure accessibility compliance (WCAG)
- Maintain SEO optimization
- Monitor Core Web Vitals

### E2E Test Coverage (Playwright)

**Tests Included:**
- `auth.spec.ts` - Authentication flows
- `homepage.spec.ts` - Homepage functionality
- `dashboard.spec.ts` - Dashboard features

**Browser Coverage:**
- Chromium (primary for CI speed)

**Reports:**
- HTML report generated on test failure
- Uploaded as GitHub Actions artifacts
- Screenshots and traces captured

## Future Enhancements

### Potential Additions

1. ~~**End-to-End Tests**~~ ✅ **IMPLEMENTED**
   - Playwright E2E tests running in CI
   - Test critical user flows

2. ~~**Code Coverage**~~ ✅ **IMPLEMENTED**
   - Vitest coverage tracking
   - Codecov integration

3. ~~**Performance Testing**~~ ✅ **IMPLEMENTED**
   - Lighthouse CI for performance metrics
   - Quality thresholds enforced

4. **Deployment Notifications**
   - Slack/Discord notifications
   - Email on deployment success/failure

5. **Automated Rollback**
   - Automatic rollback on health check failures
   - Canary deployments

6. **Database Migrations**
   - Automated migration running
   - Rollback support

## References

- [VERSIONING.md](./VERSIONING.md) - Image versioning strategy
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Komodo Documentation](https://komo.do/docs)
- [Docker Build Documentation](https://docs.docker.com/build/)

---

**Last Updated:** 2025-12-14
**Maintained By:** DevOps Team
**Status:** ✅ Production Ready
