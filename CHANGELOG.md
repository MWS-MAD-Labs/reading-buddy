# Changelog

All notable changes to Reading Buddy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for v1.3.0 - Polish & Stability

#### Planned Features
- Address TypeScript `any` types flagged by ESLint
- Implement automated testing (target: 60%+ coverage)
- Security hardening (rate limiting, input validation)
- Performance optimizations for large libraries
- CI/CD pipeline setup with GitHub Actions
- Enhanced mobile reading experience improvements
- Accessibility improvements (WCAG 2.1 AA compliance progress)
- Reader enhancements (bookmarks, annotations)
- Reading analytics and insights

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
