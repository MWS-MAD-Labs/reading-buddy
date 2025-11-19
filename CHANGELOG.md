# Changelog

All notable changes to Reading Buddy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-19

### MVP Complete - All 6 Phases Implemented

This is the first production-ready release of Reading Buddy, a comprehensive K-12 e-library platform with gamification and AI-powered features.

### Added

#### Phase 1-2: Core Infrastructure & Authentication
- Next.js 15+ application with App Router
- Supabase authentication with password and Google OAuth
- Role-based access control (Student, Teacher, Librarian, Admin)
- Route protection middleware
- User profile management

#### Phase 3: Book Management (Librarian)
- Book upload system with MinIO storage
- Presigned URL workflow for secure direct uploads
- PDF and cover image management
- Book metadata (ISBN, title, author, publisher, genre, etc.)
- Access level controls (Kindergarten, Lower/Upper Elementary, Junior High, Teachers/Staff)
- Book library gallery view
- Book editing and deletion capabilities

#### Phase 4: Student Features
- Student dashboard with assigned books
- PDF reader with react-pdf
- 3D flip-book reader with rendered page images
- Reading progress tracking (current page persistence)
- Classroom assignment view
- Quiz-taking interface with score tracking

#### Phase 5: AI Quiz Generation
- AI-powered quiz generation using Google Gemini
- Quiz generation from book summaries
- Quiz generation from extracted PDF text
- Checkpoint quiz system (quizzes at specific pages)
- Auto-checkpoint suggestion algorithm
- Configurable question counts and difficulty
- Page range support for targeted quizzes
- Quiz management (publish, unpublish, archive, delete)
- Quiz statistics and attempt tracking

#### Phase 6: Teacher & Admin Dashboards
- Teacher dashboard with student progress tracking
- Classroom creation and management
- Student assignment to classrooms
- Book assignment to classrooms
- Quiz assignment to classrooms
- Student reading progress monitoring
- Admin user management panel
- Role assignment and modification
- System-wide analytics

#### Additional Features
- PDF text extraction with pdfjs-dist
- AI-generated book descriptions
- Book page image rendering for flip-book mode
- Background job system for PDF processing
- Badge/achievement system
- Checkpoint progress tracking
- Top progress bar for navigation feedback
- Responsive design with Tailwind CSS
- Docker deployment support
- Comprehensive documentation

### Technical Stack
- **Frontend:** Next.js 16.0.1, React 19.2.0, TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui components
- **Backend:** Next.js Server Actions, Supabase PostgreSQL
- **Storage:** MinIO (self-hosted S3-compatible)
- **AI:** Google Gemini 2.5 Flash
- **PDF:** pdfjs-dist, react-pdf, canvas for rendering
- **Auth:** Supabase Auth with Google OAuth
- **Deployment:** Docker with multi-stage builds

### Fixed
- RLS recursion issues in quiz deletion (use admin client)
- Empty classroom display on student dashboard
- Teacher dashboard filtering to show only current user's classrooms
- Admin user management email retrieval
- OAuth redirect handling

### Documentation
- Project Roadmap (all phases complete)
- AI Development Guide
- Docker Deployment Guide
- Database Migration Guide
- Admin Panel Documentation
- Environment configuration examples

### Database
- Complete schema with RLS policies
- Quiz enhancements migration (text extraction, checkpoints, badges)
- User email function for admin queries
- Optimized indexes for performance

### Deployment
- Production-ready Docker configuration
- GitHub-based deployment workflow
- Automated deployment script
- Health checks and monitoring
- Reverse proxy support (Nginx, Caddy)

### Known Limitations
- PDF rendering worker requires manual or cron execution
- Database migrations require manual application via Supabase dashboard
- MinIO must be self-hosted (infrastructure requirement)

[1.0.0]: https://github.com/faisalnh/reading-companion/releases/tag/v1.0.0
