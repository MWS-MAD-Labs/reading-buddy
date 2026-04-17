# Hybrid Migration Plan: Next.js → NestJS Backend

**Status:** Planning Phase
**Created:** 2025-04-17
**Target Completion:** ~14 weeks
**Decision:** HYBRID (Next.js frontend + NestJS backend)

---

## Executive Summary

After comprehensive architectural audit, the Reading Buddy codebase shows **high complexity (4.4/5)** due to:
- Business logic scattered across 1,738-line `actions.ts` and React components
- Heavy processing in Next.js API routes (conversions blocking server)
- No unified pagination or text processing layer
- Format-specific logic duplicated across readers

**Decision:** Hybrid migration — keep Next.js for UI, move heavy services to NestJS.

---

## Audit Findings Reference

### Current Architecture Issues

| Issue | Location | Severity |
|-------|----------|----------|
| EPUB parsing in React component | `EpubFlipReader.tsx` lines 181-235 | 🔴 HIGH |
| 1,738-line action file | `actions.ts` | 🔴 HIGH |
| No unified pagination interface | All reader components | 🟡 MEDIUM |
| Text chunking hardcoded | `EpubFlipReader.tsx` | 🟡 MEDIUM |
| Progress saving duplicated | Multiple readers | 🟢 LOW |

### Files to Watch

**Large files needing refactoring:**
- `web/src/app/(dashboard)/dashboard/librarian/actions.ts` — 1,738 lines
- `web/src/components/dashboard/EpubFlipReader.tsx` — 730 lines (contains parsing logic)
- `web/src/components/dashboard/FlipBookReader.tsx` — 700 lines
- `web/src/components/dashboard/UnifiedBookReader.tsx` — 454 lines

**Services to migrate:**
- `web/src/lib/pdf-extractor.ts` — 183 lines
- `web/src/lib/text-storage.ts` — 120 lines

---

## Migration Scope

### ✅ Moving to NestJS

| Service | Priority | Complexity | Weeks |
|---------|----------|------------|-------|
| Text Processing Pipeline | 1st | Medium | 4 |
| Unified Pagination Service | 2nd | Medium | 3 |
| Quiz Generation (AI) | 3rd | Low | 3 |

### 🔄 Keeping in Next.js

- Page routing and layout
- UI components (readers as presentational)
- Light Server Actions (auth, simple CRUD)
- Real-time UI state

### ❌ Out of Scope

- EPUB/MOBI to PDF conversion (will use native e-reader support)
- User authentication (stays in Next.js)
- Database queries (Supabase direct access from Next.js)

---

## NestJS Backend Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── text-processing/
│   │   │   ├── text-processing.service.ts
│   │   │   ├── text-processing.controller.ts
│   │   │   ├── dto/
│   │   │   │   ├── extract.dto.ts
│   │   │   │   └── content.dto.ts
│   │   │   └── strategies/
│   │   │       ├── pdf.strategy.ts
│   │   │       ├── epub.strategy.ts
│   │   │       └── text.strategy.ts
│   │   ├── pagination/
│   │   │   ├── pagination.service.ts
│   │   │   ├── pagination.controller.ts
│   │   │   └── dto/
│   │   │       └── pagination.dto.ts
│   │   ├── quiz-generation/
│   │   │   ├── quiz-generation.service.ts
│   │   │   ├── quiz-generation.controller.ts
│   │   │   └── dto/
│   │   └── storage/
│   │       ├── storage.service.ts
│   │       └── minio.service.ts
│   ├── common/
│   │   ├── interfaces/
│   │   │   └── book-content.interface.ts
│   │   ├── filters/
│   │   ├── guards/
│   │   └── decorators/
│   ├── config/
│   │   └── configuration.ts
│   └── main.ts
├── Dockerfile
├── nest-cli.json
└── tsconfig.json
```

---

## Core Interfaces

```typescript
// backend/src/common/interfaces/book-content.interface.ts
export interface BookContent {
  bookId: string;
  format: 'pdf' | 'epub' | 'text';
  totalPages: number;
  pages: Page[];
  metadata: BookMetadata;
}

export interface Page {
  number: number;
  content: string;
  images?: PageImage[];
}

export interface PageImage {
  src: string;
  alt?: string;
  width: number;
  height: number;
}

export interface BookMetadata {
  title: string;
  author?: string;
  language?: string;
  coverUrl?: string;
}

export interface PaginationRequest {
  bookId: string;
  pageSize?: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
}

export interface PaginatedContent {
  pages: Page[];
  metadata: BookMetadata;
  total: number;
}
```

---

## Phase 1: Text Processing Service (Weeks 1-4)

### Goal
Extract all text processing logic from frontend into dedicated NestJS service.

### Strategy Pattern Implementation

```typescript
// backend/src/modules/text-processing/strategies/pdf.strategy.ts
@Injectable()
export class PdfStrategy {
  constructor(private minio: MinioService) {}

  async extract(bookId: string, minioPath: string): Promise<BookContent> {
    // 1. Download PDF from MinIO
    // 2. Extract text using pdfjs-dist
    // 3. Link to pre-rendered images
    // 4. Return unified BookContent format
  }
}

// backend/src/modules/text-processing/strategies/epub.strategy.ts
@Injectable()
export class EpubStrategy {
  constructor(private minio: MinioService) {}

  async extract(bookId: string, minioPath: string): Promise<BookContent> {
    // 1. Download EPUB from MinIO
    // 2. Parse EPUB using epub2
    // 3. Extract chapters, images, metadata
    // 4. Create semantic page breaks (chapter boundaries)
    // 5. Return unified BookContent format
  }
}
```

### API Endpoints

```
POST   /api/v1/books/:id/extract      # Trigger extraction, returns job ID
GET    /api/v1/books/:id/content      # Get extracted content (cached)
GET    /api/v1/jobs/:id               # Poll extraction job status
```

### Tasks Checklist

- [ ] Create NestJS project with CLI
- [ ] Set up module structure
- [ ] Implement `BookContent` interface
- [ ] Implement PDF strategy (migrate `pdf-extractor.ts`)
- [ ] Implement EPUB strategy (extract from `EpubFlipReader.tsx`)
- [ ] Add Redis caching for extracted content
- [ ] Error handling and retry logic
- [ ] Unit tests for each strategy
- [ ] Integration tests

### Success Criteria
- PDF extraction working via API
- EPUB extraction working via API
- Cached responses returned in <100ms
- All tests passing

---

## Phase 2: Unified Pagination Service (Weeks 5-7)

### Goal
Provide server-side pagination that works consistently across all formats.

### Service Implementation

```typescript
// backend/src/modules/pagination/pagination.service.ts
@Injectable()
export class PaginationService {
  constructor(
    private textProcessing: TextProcessingService,
    private cache: CacheService
  ) {}

  async getPages(request: PaginationRequest): Promise<PaginatedContent> {
    // Check cache for computed pages
    const cacheKey = this.getCacheKey(request);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Get base content
    const content = await this.textProcessing.getContent(request.bookId);

    // Apply customization (re-chunk if needed)
    const pages = this.applyCustomization(content.pages, request);

    const result = { pages, metadata: content.metadata, total: pages.length };
    await this.cache.set(cacheKey, result, 3600); // 1 hour

    return result;
  }

  private applyCustomization(pages: Page[], config: PaginationConfig): Page[] {
    // Re-chunk based on fontSize, lineHeight settings
    // Enables stable pagination
  }
}
```

### API Endpoints

```
GET    /api/v1/books/:id/pages           # Get all pages (with customizations)
GET    /api/v1/books/:id/pages/:number   # Get single page
```

### Tasks Checklist

- [ ] Create pagination module
- [ ] Implement customization logic
- [ ] Add cache key generation
- [ ] Handle edge cases (empty books, corrupted data)
- [ ] Unit tests
- [ ] Load testing

### Success Criteria
- Same settings = same page numbers (stable pagination)
- Customization applied correctly
- Cache hit rate >80%

---

## Phase 3: Frontend Integration (Weeks 8-11)

### Goal
Update Next.js readers to consume NestJS APIs instead of doing local processing.

### Component Refactoring

```typescript
// Before: Each reader does its own parsing
// After: Readers fetch from NestJS service

// web/src/components/dashboard/UnifiedBookReader.tsx
async function loadBookContent(bookId: string, settings: ReaderSettings) {
  const response = await fetch(
    `${BACKEND_URL}/api/v1/books/${bookId}/pages?` +
    `fontSize=${settings.fontSize}&lineHeight=${settings.lineHeight}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.json();
}
```

### Simplified Reader Structure

```
UnifiedBookReader (orchestrator + state)
├── PdfReader (presentational only)
├── EpubReader (presentational only)
└── TextReader (presentational only)
```

### Tasks Checklist

- [ ] Create backend API client
- [ ] Update `UnifiedBookReader` to fetch from NestJS
- [ ] Remove parsing logic from `EpubFlipReader`
- [ ] Remove `pdf-extractor.ts` (moved to NestJS)
- [ ] Update progress saving (keep in Next.js)
- [ ] E2E tests for all readers
- [ ] Performance testing

### Success Criteria
- All readers working with NestJS backend
- Old parsing code removed
- No performance regression
- E2E tests passing

---

## Phase 4: Quiz Generation Service (Weeks 12-14)

### Goal
Move AI quiz generation from frontend to backend service.

### Service Implementation

```typescript
// backend/src/modules/quiz-generation/quiz-generation.service.ts
@Injectable()
export class QuizGenerationService {
  constructor(
    private ai: AiService,
    private queue: QueueService
  ) {}

  async generateQuiz(bookId: string, pages: number[]): Promise<JobDto> {
    // Add to queue for async processing
    const job = await this.queue.add('generate-quiz', { bookId, pages });
    return { jobId: job.id };
  }

  async processQuizGeneration(job: Job) {
    const content = await this.textProcessing.getContent(job.data.bookId);
    const text = this.extractRelevantText(content, job.data.pages);
    const quiz = await this.ai.generateQuiz(text);
    await this.saveQuiz(job.data.bookId, quiz);
  }
}
```

### API Endpoints

```
POST   /api/v1/books/:id/quizzes        # Generate quiz (async), returns job ID
GET    /api/v1/jobs/:id                 # Poll quiz generation status
GET    /api/v1/books/:id/quizzes        # List generated quizzes
```

### Tasks Checklist

- [ ] Extract quiz generation from `actions.ts`
- [ ] Set up Bull Queue for async jobs
- [ ] Implement AI service wrapper
- [ ] Add job status tracking
- [ ] Frontend integration
- [ ] Tests

### Success Criteria
- Quiz generation async and non-blocking
- Job status pollable
- Frontend updated to use new API

---

## Deployment Strategy

### Development (Docker Compose)

```yaml
services:
  nextjs:
    build: ./web
    ports: ["3000:3000"]
    environment:
      - BACKEND_URL=http://backend:3001
    depends_on:
      - backend

  backend:
    build: ./backend
    ports: ["3001:3001"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - MINIO_ENDPOINT=${MINIO_ENDPOINT}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis

  redis:
    image: redis:alpine
    ports: ["6379:6379"]
```

### Production Migration

1. Deploy NestJS backend separately (new container)
2. Run both in parallel with feature flag
3. Migrate traffic gradually per endpoint
4. Deprecate old routes after validation

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://...
MINIO_ENDPOINT=minio.example.com
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
REDIS_URL=redis://redis:6379
JWT_SECRET=...
AI_PROVIDER=cloud  # or 'local'
GEMINI_API_KEY=...  # if using cloud

# Frontend (Next.js)
NEXT_PUBLIC_BACKEND_URL=https://api.reads.mws.web.id
```

---

## Success Criteria

| Phase | Criteria | Target |
|-------|----------|--------|
| 1 | NestJS service running | `localhost:3001` responding |
| 1 | PDF extraction working | API returns parsed content |
| 1 | EPUB extraction working | API returns parsed content |
| 2 | Pagination stable | Same settings = same pages |
| 2 | Cache effective | >80% hit rate |
| 3 | Frontend integrated | All readers using NestJS |
| 3 | Old code removed | `actions.ts` <500 lines |
| 4 | Quiz async | Non-blocking generation |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking changes | Medium | High | Version API (`/api/v1/`), keep old routes |
| Data loss | Low | Critical | Backup MinIO before migration |
| Performance regression | Medium | Medium | Load testing, Redis caching |
| Deployment downtime | Low | Medium | Blue-green deployment |
| Team context switching | High | Medium | Clear documentation, pair programming |

---

## Rollback Plan

If migration fails at any phase:

1. **Phase 1-2**: Disable NestJS, continue using frontend logic
2. **Phase 3**: Revert frontend commits, keep NestJS running
3. **Phase 4**: Revert to frontend quiz generation

All rollback points are git commits with clear tags.

---

## Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/bull": "^10.0.0",
    "bull": "^4.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "minio": "^7.0.0",
    "pdfjs-dist": "^3.0.0",
    "epub2": "^3.0.0",
    "ioredis": "^5.0.0",
    "zod": "^3.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0"
  }
}
```

---

## References

- **Original Audit**: See architectural analysis dated 2025-04-17
- **Current Codebase**: `/web/src/`
- **Actions File**: `web/src/app/(dashboard)/dashboard/librarian/actions.ts`
- **Readers**: `web/src/components/dashboard/*Reader.tsx`

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-04-17 | Initial migration plan created | AI Assistant |
| 2025-04-17 | Removed EPUB/MOBI conversion (native e-reader) | User Request |

---

**Next Step:** Begin Phase 1 by creating NestJS project structure.
