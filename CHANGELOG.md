# Changelog

All notable changes to Reading Buddy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

### Planned for v1.1.0 (Q1 2026) - Polish & Stability

#### Planned
- Bug fixes based on v1.0.0 user feedback
- Address 19 TypeScript `any` types flagged by ESLint
- Implement automated testing (target: 60%+ coverage with Jest)
- Security hardening (rate limiting, CAPTCHA)
- Performance optimizations
- Improved error handling and user-friendly error messages
- Code quality improvements
- CI/CD pipeline setup with GitHub Actions

### Planned for v1.2.0 (Q2 2026) - Enhanced UX & Gamification

#### Planned
- Migrate from legacy `achievements` to `badges` system
- Enhanced student dashboard with XP, levels, and badges
- Reading streak tracking (daily reading consistency)
- Leaderboards (global, class, grade level)
- Enhanced reader features (bookmarks, annotations)
- Dark mode for PDF reader
- WCAG 2.1 AA accessibility compliance
- Mobile responsiveness improvements

### Planned for v1.3.0 (Q3 2026) - AI Flexibility & Features

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

### Planned for v1.4.0 (Q4 2026) - Content & Competition

#### Planned
- Class vs class competitions
- Bulk book upload functionality
- Book series management
- Advanced search and filtering
- Curated reading lists and collections
- Teacher analytics dashboard
- Enhanced reporting features

### Planned for v1.5.0 (Q1 2027) - Multi-Format Support

#### Planned
- EPUB file support
- MOBI/AZW (Kindle) format support
- DOCX (Word document) support
- CBZ/CBR (Comic book) format support
- ODT (OpenDocument) support
- Unified content storage in MinIO
- Format conversion pipeline

### Planned for v2.0.0 (Q3 2027) - Major Architecture Changes

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
**Last Updated:** November 20, 2025
