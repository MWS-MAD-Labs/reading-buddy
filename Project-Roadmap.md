# Reading Buddy: Project Roadmap

> **Current Version:** v1.3.0 ✅  
> **Last Updated:** December 4, 2025  
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
| v1.3.0 | Q1 2026 | Polish & Stability | 📋 Planned |
| v1.4.0 | Q2 2026 | UX & Gamification | 📋 Planned |
| v1.5.0 | Q3 2026 | AI Flexibility | 📋 Planned |
| v1.6.0 | Q4 2026 | Content & Competition | 📋 Planned |
| v1.7.0 | Q1 2027 | Additional Formats (CBZ/DOCX) | 📋 Planned |
| v2.0.0 | Q3 2027 | Major Architecture Changes | 💡 Proposed |

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

#### Full Self-Hosted Services
**Priority:** High | **Target:** v2.0.0+

**Current State:** Hybrid (Supabase cloud + MinIO self-hosted)

**Proposed Changes:** Replace Supabase with self-hosted alternatives

**Database:**
- Self-hosted PostgreSQL with Docker
- Maintain existing schema and RLS policies
- Optional PostgREST for REST API

**Authentication Options:**

| Option | Pros | Cons |
|--------|------|------|
| **Keycloak** | Industry-standard, OAuth 2.0/SAML/LDAP, MFA | Complex setup |
| **Authentik** | Modern UI, LDAP/SCIM, easy Docker deploy | Newer/less mature |
| **Custom** | Full control, lighter weight, JWT-based | Requires maintenance |

**Benefits:**
- Complete data sovereignty
- No cloud vendor lock-in
- Zero external API costs
- Enhanced privacy and security
- Can run entirely on-premises

**Migration Strategy:**
```
Phase 1: Database Migration
1. Export Supabase data to SQL dump
2. Set up PostgreSQL container
3. Import data and verify integrity
4. Update connection strings

Phase 2: Authentication Migration
1. Deploy Keycloak/Authentik
2. Configure auth providers (Google, email)
3. Migrate user accounts
4. Update auth client in app
5. Test all auth flows

Phase 3: Cutover
1. Run both systems in parallel (testing)
2. Gradual user migration
3. Monitor for issues
4. Full cutover after validation
```

---

### 6.3 AI Flexibility

#### Bring Your Own AI (BYOAI)
**Priority:** High | **Target:** v1.3.0+

**Current State:** Hard-coded to Google Gemini API

**Supported AI Providers:**

1. **OpenAI (GPT Models)**
   - GPT-4, GPT-4 Turbo, GPT-3.5 Turbo

2. **Anthropic (Claude Models)**
   - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku

3. **Google (Gemini Models)**
   - Gemini 2.5 Flash (current), Gemini 1.5 Pro, Gemini Ultra

4. **Local LLM (Self-hosted)**
   - Ollama (Llama 3.1, Mistral, Phi-3)
   - LM Studio, vLLM, LocalAI

**Configuration Example:**
```env
# AI Provider Selection
AI_PROVIDER=openai # or anthropic, gemini, ollama, localai

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

**Implementation:**
```typescript
// AI abstraction layer
interface AIProvider {
  generateQuiz(bookText: string, options: QuizOptions): Promise<Quiz>
  generateDescription(bookText: string): Promise<string>
  generateSummary(text: string): Promise<string>
}

class OpenAIProvider implements AIProvider { ... }
class AnthropicProvider implements AIProvider { ... }
class GeminiProvider implements AIProvider { ... }
class OllamaProvider implements AIProvider { ... }

// Factory pattern
const aiProvider = AIProviderFactory.create(process.env.AI_PROVIDER)
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
**Priority:** High | **Target:** v1.2.0

**Current State:**
- Basic badges table with 6 default badges
- Not fully integrated into student dashboard
- Uses legacy `achievements` table
- No progression tracking or leaderboards

**Expanded Badge Types:**

1. **Reading Badges:** Books Read, Pages Read, Reading Streak, Speed Reader, Night Owl, Early Bird, Weekend Warrior
2. **Quiz Badges:** Quiz Master, Perfect Score, Quiz Streak, Checkpoint Champion, Quick Thinker
3. **Subject/Genre Badges:** Science Explorer, History Buff, Fantasy Fan, Biography Reader, Poetry Lover
4. **Achievement Badges:** First Book, Book Finisher, Diverse Reader, Grade Challenger, Helpful Student
5. **Special Event Badges:** Summer Reading Challenge, Read-a-thon Participant, Book Fair Champion

**Badge Levels/Tiers:**
- Bronze, Silver, Gold, Platinum
- Progressive unlocking
- Visual distinction in UI

**Points & Leveling System:**

**XP Sources:**
- Complete a page: +1 XP
- Complete a chapter: +10 XP
- Finish a book: +100 XP
- Pass a quiz: +50 XP (+ bonus for high scores)
- Perfect quiz score: +100 XP bonus
- Daily reading streak: +25 XP/day
- Complete checkpoint: +75 XP

**Titles & Ranks:**
- Level 1-5: "Beginner Reader"
- Level 6-10: "Book Explorer"
- Level 11-20: "Avid Reader"
- Level 21-30: "Master Reader"
- Level 31+: "Reading Legend"

**Leaderboard Types:**
1. Global - All students, sorted by XP
2. Class - Same classroom competition
3. Grade Level - Fair peer comparison
4. Reading Streak - Longest current streak
5. Quiz Masters - Quiz performance based

**Database Schema Updates:**
```sql
-- Add XP and level to profiles
ALTER TABLE profiles
ADD COLUMN xp INTEGER DEFAULT 0,
ADD COLUMN level INTEGER DEFAULT 1,
ADD COLUMN reading_streak INTEGER DEFAULT 0,
ADD COLUMN last_read_date DATE;

-- Add badge tiers
ALTER TABLE badges
ADD COLUMN tier VARCHAR(20),
ADD COLUMN xp_reward INTEGER DEFAULT 0,
ADD COLUMN display_order INTEGER;

-- Reading challenges
CREATE TABLE reading_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(50),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  goal_criteria JSONB,
  reward_badge_id UUID REFERENCES badges(id),
  created_by_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true
);

-- Student challenge progress
CREATE TABLE student_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  challenge_id UUID REFERENCES reading_challenges(id),
  progress JSONB,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- XP audit trail
CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  source VARCHAR(100),
  reference_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 6.5 Enhanced Reading Experience

#### Reader Improvements
**Priority:** Medium | **Target:** v1.2.0+

- Audio narration (Text-to-speech or uploaded audio)
- Annotations & highlights (Student markup)
- Bookmarks (Visual bookmark system)
- Reading statistics (Time spent, pages per session)
- Dark mode reader
- Font controls (Size, family, spacing, margins)
- Read-along mode (TTS word highlighting)

---

### 6.6 Advanced AI Features

#### AI-Powered Learning
**Priority:** Medium | **Target:** v1.3.0+

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
**Priority:** Medium | **Target:** v1.4.0+

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
**Priority:** Medium | **Target:** v1.5.0+

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
**Priority:** High | **Target:** v1.1.0+

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
**Priority:** High | **Target:** v1.1.0+

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
**Priority:** High | **Target:** v1.1.0+

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
**Priority:** High | **Target:** v1.2.0+

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

**Next Steps for v1.4.0:**
- Gamification: badges/XP/levels plus reading streak tracking surfaced in dashboards
- Reader UX: bookmarks/annotations, improved resume cues, and dark mode
- Accessibility/performance: WCAG 2.1 AA keyboard/focus/contrast polish and reduced layout shift
- Quality gates: push coverage toward 80% (pdf-extractor, minio utils, file helpers) with server-action integration tests, authenticated E2E, and visual regression baselines
- CI/CD: automated Vitest + Playwright pipelines with coverage gating and reporting

### v1.4.0 (Q2 2026) - Enhanced UX & Gamification
- Badge/XP/level system with reading streak tracking on student dashboard
- Reader enhancements: bookmarks, annotations, and better resume cues
- Dark mode for reader and dashboard polish
- Accessibility upgrades toward WCAG 2.1 AA (keyboard/focus/contrast)
- Quality gates and CI: coverage toward 80%, server-action integration tests, authenticated E2E, visual regression baselines, and automated Vitest/Playwright pipelines

### v1.5.0 (Q3 2026) - AI Flexibility & Features
- BYOAI support (OpenAI, Anthropic, Ollama)
- Leaderboards (global, class, grade)
- Personalized quiz difficulty
- AI-generated summaries
- Advanced badge types
- Reading challenges system

### v1.6.0 (Q4 2026) - Content & Competition
- Class vs class competitions
- Bulk book upload
- Book series management
- Advanced search
- Reading lists/collections
- Analytics dashboard for teachers

### v1.7.0 (Q1 2027) - Additional Format Support
- ✅ EPUB support (completed in v1.0.0)
- ✅ MOBI/AZW/AZW3 support (completed in v1.1.0)
- ✅ Mobile responsive UI (completed in v1.2.0)
- CBZ/CBR comic book format support
- DOCX Word document support
- ODT OpenDocument support
- Enhanced upload workflow for bulk operations
- Improved text extraction for complex layouts

### v2.0.0 (Q3 2027) - Major Architectural Changes
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
