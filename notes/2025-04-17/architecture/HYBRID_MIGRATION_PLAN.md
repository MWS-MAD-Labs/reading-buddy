# Hybrid Migration Plan: Premium Flip-Book E-Reader

**Status:** Planning Phase
**Created:** 2025-04-17
**Updated:** 2025-04-17
**Target Completion:** ~16 weeks
**Goal:** Apple Books / Kindle Premium-style reading experience

---

## Executive Summary

Current EPUB implementation fails to deliver a premium reading experience:
- Extracts plain text only (`body.textContent` at `EpubFlipReader.tsx:152`)
- Creates fake pages via character counting (`CHARS_PER_PAGE = 1500`)
- No stable locators for reading position
- No true pagination or spread-based navigation

**Target Experience:** Premium flip-book e-reader with:
- Clean EPUB package data delivery from backend
- Isolated rendition surfaces (iframe-based) per chapter
- True pagination into discrete page boundaries
- Flip animations on paginated spreads
- Stable locators (CFI) for reading state persistence
- Fast rendering with intelligent prefetch

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NestJS Backend                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   EPUB      │    │   Asset     │    │  Locator    │    │   Cache     │  │
│  │   Package   │───▶│   Proxy     │───▶│   Service   │───▶│   Layer     │  │
│  │   Service   │    │   Service   │    │  (CFI)      │    │  (Redis)    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                                     │          │
│         ▼                  ▼                                     ▼          │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    EPUB Package Data (Clean)                            ││
│  │  • container.xml • package.opf (manifest, spine, guide)                ││
│  │  • TOC (nested, with labels and hrefs)                                 ││
│  │  • Resources (HTML, CSS, images, fonts) via proxy                      ││
│  │  • CFI resolution (stable locators)                                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Next.js Frontend                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         FlipBook Reader                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │  TOC Nav    │  │  Settings   │  │  Metadata   │  │  Progress   │  │ │
│  │  │  Panel      │  │  Panel      │  │  Display    │  │  Tracker    │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        Pagination Engine                               │ │
│  │  • Rendition Surface (iframe per chapter/spread)                       │ │
│  │  • Page Boundary Calculator (measures content)                        │ │
│  │  • Repaginator (handles settings changes)                             │ │
│  │  • Spread Manager (two-page layout)                                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        Flip Animation Layer                            │ │
│  │  • 3D CSS transforms for page turn effect                              │ │
│  │  • Shadows and perspective for realistic feel                          │ │
│  │  • Gesture handling (swipe, tap, drag)                                │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Stable Locators (CFI)

EPUB Canonical Fragment Identifiers (CFI) provide stable, resolution-independent locators:

```
epubcfi(/6/4[chap1ref]!/4/2/1:3[2])
│       │  │            │  │ │    └─ Character offset
│       │  │            │  │ └─────── Element assertion
│       │  │            │  └───────── Step (6th child)
│       │  │            └─────────── Path to text node
│       │  └──────────────────────── Spine item reference
│       └────────────────────────────── Path to spine
└─────────────────────────────────────── Root
```

Benefits:
- Survives repagination when settings change
- Device-independent
- Supports fine-grained positioning

### 2. Rendition Surface

Isolated rendering context per chapter using iframes:

```
Chapter Rendition (iframe)
├── Shadow DOM root
├── EPUB CSS (scoped)
├── Chapter HTML content
├── Reader settings CSS (overlay)
└── Pagination markers (invisible)
```

Benefits:
- CSS isolation from main app
- Precise measurement for pagination
- No global style conflicts

### 3. Pagination Algorithm

Convert flowable HTML into discrete page boundaries:

```
1. Load chapter HTML into hidden rendition surface
2. Apply reader settings (font size, margins, etc.)
3. Render and measure content height
4. Calculate page boundaries:
   - viewportHeight / lineHeight = linesPerPage
   - Find natural break points (paragraph, sentence)
   - Insert page break markers
5. Cache page boundaries for this settings hash
6. Render first page spread to visible surface
```

### 4. Spread-Based Navigation

Two-page spreads for flip animation:

```
┌─────────────────────────────────────────────────────────┐
│                    Page N-1 (Left)                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │  [Chapter content...]                             │ │
│  │  flowing from previous page                       │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │  SPINE    │  ← Flip animation axis
                    └─────┬─────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                    Page N (Right)                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │  [Continued content...]                           │ │
│  │  [More content...]                                │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## NestJS Backend Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── epub/
│   │   │   ├── epub.service.ts              # EPUB package parsing
│   │   │   ├── epub.controller.ts           # REST endpoints
│   │   │   ├── asset-proxy.controller.ts    # Asset streaming
│   │   │   ├── locator.service.ts           # CFI resolution
│   │   │   ├── dto/
│   │   │   │   ├── package.dto.ts
│   │   │   │   ├── locator.dto.ts
│   │   │   │   └── resource.dto.ts
│   │   │   └── entities/
│   │   │       ├── package.entity.ts
│   │   │       ├── toc.entity.ts
│   │   │       └── resource.entity.ts
│   │   ├── pdf/
│   │   │   ├── pdf.service.ts               # PDF image serving
│   │   │   └── pdf.controller.ts
│   │   ├── storage/
│   │   │   ├── storage.service.ts
│   │   │   └── minio.service.ts
│   │   └── cache/
│   │       ├── cache.service.ts
│   │       └── cache.module.ts
│   ├── common/
│   │   ├── interfaces/
│   │   │   ├── epub-package.interface.ts
│   │   │   ├── locator.interface.ts
│   │   │   └── reader-settings.interface.ts
│   │   ├── filters/
│   │   └── guards/
│   ├── config/
│   │   └── configuration.ts
│   └── main.ts
├── Dockerfile
├── nest-cli.json
└── tsconfig.json
```

---

## Core Interfaces

### EPUB Package Structure

```typescript
// backend/src/common/interfaces/epub-package.interface.ts

/**
 * Complete EPUB package data for client-side rendition
 */
export interface EpubPackage {
  bookId: string;
  metadata: EpubMetadata;
  manifest: Manifest;
  spine: Spine;
  toc: TableOfContents;
  guide?: Guide;
  resources: ResourceMap;
}

export interface EpubMetadata {
  title: string;
  author: string;
  language?: string;
  publisher?: string;
  description?: string;
  coverId?: string;  // Reference to manifest item
  identifier?: string;
}

/**
 * Manifest: All resources in the EPUB
 */
export interface Manifest {
  items: ManifestItem[];
}

export interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string[];  // 'nav', 'cover-image', 'scripted', etc.
  fallback?: string;
  overlay?: string;
  /**
   * Absolute URL for fetching this resource from backend
   */
  absoluteUrl: string;
}

/**
 * Spine: Reading order
 */
export interface Spine {
  items: SpineItem[];
  pageProgressionDirection?: 'ltr' | 'rtl' | 'default';
}

export interface SpineItem {
  idref: string;  // References manifest item id
  linear: boolean;
  properties?: string[];
}

/**
 * Table of Contents (from EPUB3 nav or EPUB2 NCX)
 */
export interface TableOfContents {
  type: 'epub3-nav' | 'epub2-ncx';
  items: TocItem[];
}

export interface TocItem {
  label: string;
  href: string;
  /**
   * CFI to this item
   */
  cfi?: string;
  children: TocItem[];
}

/**
 * Resource map for quick lookup
 */
export interface ResourceMap {
  [itemId: string]: {
    href: string;
    mediaType: string;
    absoluteUrl: string;
  };
}

/**
 * Canonical Fragment Identifier
 * EPUB standard for stable locators
 */
export interface CFI {
  raw: string;           // e.g., "epubcfi(/6/4[chap1]!/4/2/1:3)"
  path: CFIComponent[];
  characterOffset?: number;
}

export interface CFIComponent {
  index: number;
  assertion?: string;    // ID assertion for validation
}

/**
 * Reading location for persistence
 */
export interface ReadingLocation {
  bookId: string;
  cfi: string;           // Stable locator
  timestamp: number;
  progress: number;      // Estimated 0-1 for UI display only
}

/**
 * Reader settings (affects pagination)
 */
export interface ReaderSettings {
  fontSize: number;         // 80-200%
  lineHeight: number;       // 1.0-2.0
  fontFamily: 'serif' | 'sans-serif' | 'monospace' | 'original';
  theme: 'light' | 'dark' | 'sepia' | 'night';
  margin: 'narrow' | 'medium' | 'wide';
  textAlign: 'left' | 'justify' | 'original';
  columnCount: 1 | 2;       // Single or double page spread
  spreadMode: 'landscape' | 'portrait' | 'auto';
}
```

---

## Phase 1: EPUB Package Service (Weeks 1-4)

### Goal
Create NestJS service that delivers clean EPUB package data without modification.

### Service Implementation

```typescript
// backend/src/modules/epub/epub.service.ts
import { Injectable } from '@nestjs/common';
import { MinioService } from '../storage/minio.service';
import { CacheService } from '../cache/cache.service';
import { JSZip } from 'jszip';
import { XMLParser } from 'fast-xml-parser';

@Injectable()
export class EpubService {
  constructor(
    private minio: MinioService,
    private cache: CacheService,
  ) {}

  /**
   * Get complete EPUB package data
   * Returns structure with absolute URLs for all resources
   */
  async getPackage(bookId: string): Promise<EpubPackage> {
    const cacheKey = `epub:${bookId}:package`;
    const cached = await this.cache.get<EpubPackage>(cacheKey);
    if (cached) return cached;

    // Download EPUB from MinIO
    const epubBuffer = await this.minio.downloadFile(
      this.getEpubPath(bookId),
    );

    // Parse EPUB (it's a ZIP file)
    const zip = await JSZip.loadAsync(epubBuffer);

    // Parse container.xml to find OPF
    const opfPath = await this.parseContainer(zip);

    // Parse OPF (package.opf)
    const opfContent = await zip.file(opfPath)?.async('string');
    const parser = new XMLParser();
    const opf = parser.parse(opfContent);

    // Extract metadata
    const metadata = this.extractMetadata(opf);

    // Extract manifest
    const manifest = this.extractManifest(opf, zip, bookId);

    // Extract spine
    const spine = this.extractSpine(opf);

    // Extract TOC (from nav or NCX)
    const toc = await this.extractToc(zip, manifest, opf);

    const pkg: EpubPackage = {
      bookId,
      metadata,
      manifest,
      spine,
      toc,
      resources: this.buildResourceMap(manifest),
    };

    await this.cache.set(cacheKey, pkg, 86400);
    return pkg;
  }

  /**
   * Get a resource (HTML, CSS, image, font)
   * Streams directly from EPUB without modification
   */
  async getResource(bookId: string, href: string): Promise<Streamable> {
    const cacheKey = `epub:${bookId}:resource:${href}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Stream from MinIO (or extract from cached EPUB)
    const epubBuffer = await this.minio.downloadFile(
      this.getEpubPath(bookId),
    );
    const zip = await JSZip.loadAsync(epubBuffer);
    const file = zip.file(href);

    if (!file) {
      throw new NotFoundException(`Resource not found: ${href}`);
    }

    const content = await file.async('nodebuffer');
    await this.cache.set(cacheKey, content, 3600);
    return content;
  }

  /**
   * Parse TOC from EPUB3 nav or EPUB2 NCX
   */
  private async extractToc(
    zip: JSZip,
    manifest: Manifest,
    opf: any,
  ): Promise<TableOfContents> {
    // Try EPUB3 nav first
    const navItem = manifest.items.find(i =>
      i.properties?.includes('nav'),
    );

    if (navItem) {
      return this.parseEpub3Nav(zip, navItem.href);
    }

    // Fall back to EPUB2 NCX
    const ncxId = opf.package.spine?.toc;
    if (ncxId) {
      const ncxItem = manifest.items.find(i => i.id === ncxId);
      if (ncxItem) {
        return this.parseEpub2Ncx(zip, ncxItem.href);
      }
    }

    // Generate from spine as last resort
    return this.generateTocFromSpine(opf, manifest);
  }
}
```

### Asset Proxy Controller

```typescript
// backend/src/modules/epub/asset-proxy.controller.ts
import { Controller, Get, Param, Response, Header } from '@nestjs/common';
import { EpubService } from './epub.service';

@Controller('api/v1/epub/:bookId/resource')
export class AssetProxyController {
  constructor(private epubService: EpubService) {}

  /**
   * Proxy EPUB resources (HTML, CSS, images, fonts)
   * Adds CORS headers and caching
   */
  @Get('*')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=3600')
  async getResource(
    @Param('bookId') bookId: string,
    @Param('0') href: string,
    @Response() res,
  ) {
    try {
      const content = await this.epubService.getResource(bookId, href);

      // Set content type based on file extension
      const contentType = getContentType(href);
      res.setHeader('Content-Type', contentType);

      res.send(content);
    } catch (error) {
      res.status(404).send('Resource not found');
    }
  }
}

function getContentType(href: string): string {
  if (href.endsWith('.html') || href.endsWith('.xhtml')) {
    return 'application/xhtml+xml';
  }
  if (href.endsWith('.css')) {
    return 'text/css';
  }
  if (href.endsWith('.jpg') || href.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (href.endsWith('.png')) {
    return 'image/png';
  }
  if (href.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  if (href.endsWith('.woff') || href.endsWith('.woff2')) {
    return 'font/woff2';
  }
  return 'application/octet-stream';
}
```

### API Endpoints

```
GET    /api/v1/epub/:id/package          # Get complete EPUB package data
GET    /api/v1/epub/:id/resource/*       # Proxy EPUB resources (HTML, CSS, images)
GET    /api/v1/epub/:id/cover            # Get cover image
```

### Tasks Checklist

- [ ] Create NestJS project with CLI
- [ ] Set up EPUB module with jszip and fast-xml-parser
- [ ] Implement EPUB container parsing
- [ ] Implement OPF parsing (metadata, manifest, spine)
- [ ] Implement TOC parsing (EPUB3 nav + EPUB2 NCX)
- [ ] Build resource map with absolute URLs
- [ ] Implement asset proxy with CORS headers
- [ ] Add Redis caching for package and resources
- [ ] Unit tests for EPUB parsing
- [ ] Integration tests

### Success Criteria
- EPUB package returned as clean JSON structure
- All resources accessible via absolute URLs
- TOC reflects original hierarchy with CFIs
- Asset proxy handles HTML, CSS, images, fonts
- Cached package returned in <100ms

---

## Phase 2: Locator Service (Weeks 5-6)

### Goal
Implement CFI generation and resolution for stable reading positions.

### Service Implementation

```typescript
// backend/src/modules/epub/locator.service.ts
import { Injectable } from '@nestjs/common';
import { EpubService } from './epub.service';
import { JSZip } from 'jszip';

/**
 * Canonical Fragment Identifier service
 * Generates and resolves stable locators
 */
@Injectable()
export class LocatorService {
  constructor(private epubService: EpubService) {}

  /**
   * Generate CFI for a given location
   * @param bookId - Book identifier
   * @param spineIndex - Position in spine
   * @param elementPath - DOM path to element (array of child indices)
   * @param charOffset - Character offset within text node
   */
  async generateCFI(
    bookId: string,
    spineIndex: number,
    elementPath: number[],
    charOffset?: number,
  ): Promise<string> {
    const pkg = await this.epubService.getPackage(bookId);

    // Build CFI string: epubcfi(/6/4[chap1]!/4/2/1:3)
    let cfi = `epubcfi(/6/${spineIndex + 2}`;

    // Add ID assertion if available
    const spineItem = pkg.spine.items[spineIndex];
    const manifestItem = pkg.manifest.items.find(
      i => i.id === spineItem.idref,
    );
    if (manifestItem?.properties?.includes('nav')) {
      cfi += `[${manifestItem.id}]`;
    }
    cfi += '!';

    // Add path to element
    cfi += elementPath.map(i => `/${i}`).join('');

    // Add character offset
    if (charOffset !== undefined) {
      cfi += `:${charOffset}`;
    }

    cfi += ')';

    return cfi;
  }

  /**
   * Resolve CFI to location
   * Returns spine index, element path, and character offset
   */
  async resolveCFI(bookId: string, cfi: string): Promise<ResolvedLocation> {
    // Parse CFI string
    // epubcfi(/6/4[chap1]!/4/2/1:3)
    //         │ │      │  │ │ │  └─ char offset
    //         │ │      │  │ │ └───── text node index
    //         │ │      │  │ └─────── element index
    //         │ │      │  └───────── path step
    //         │ │      └──────────── path separator (!)
    //         │ └──────────────────── spine item index (adjusted)
    //         └─────────────────────── root path

    const match = cfi.match(/epubcfi\((.+)\)$/);
    if (!match) {
      throw new BadRequestException('Invalid CFI format');
    }

    const parts = match[1].split('!');
    const spinePart = parts[0];
    const contentPart = parts[1] || '';

    // Parse spine index
    const spineMatch = spinePart.match(/\/6\/(\d+)/);
    if (!spineMatch) {
      throw new BadRequestException('Invalid CFI: cannot parse spine index');
    }
    const spineIndex = parseInt(spineMatch[1], 10) - 2; // Adjust for EPUB indexing

    // Parse content path
    const elementPath: number[] = [];
    let charOffset: number | undefined;

    if (contentPart) {
      const pathSteps = contentPart.split('/');
      for (const step of pathSteps.slice(1)) {
        // Handle step with optional char offset: "1:3"
        const stepMatch = step.match(/(\d+):?(\d+)?/);
        if (stepMatch) {
          elementPath.push(parseInt(stepMatch[1], 10));
          if (stepMatch[2]) {
            charOffset = parseInt(stepMatch[2], 10);
          }
        }
      }
    }

    return {
      spineIndex,
      elementPath,
      charOffset,
    };
  }

  /**
   * Generate CFI for TOC items
   */
  async generateTocCFIs(bookId: string): Promise<TableOfContents> {
    const pkg = await this.epubService.getPackage(bookId);

    // Traverse TOC and generate CFI for each item
    const itemsWithCfi = await Promise.all(
      pkg.toc.items.map(async (item) => {
        // Find spine index for this href
        const spineIndex = pkg.spine.items.findIndex(
          spineItem => {
            const manifestItem = pkg.manifest.items.find(
              i => i.id === spineItem.idref,
            );
            return manifestItem?.href === item.href;
          },
        );

        const cfi = await this.generateCFI(
          bookId,
          spineIndex,
          [0], // Start of chapter
        );

        return {
          ...item,
          cfi,
        };
      }),
    );

    return {
      ...pkg.toc,
      items: itemsWithCfi,
    };
  }
}

interface ResolvedLocation {
  spineIndex: number;
  elementPath: number[];
  charOffset?: number;
}
```

### API Endpoints

```
GET    /api/v1/epub/:id/toc-with-cfi     # Get TOC with CFI locators
POST   /api/v1/epub/:id/resolve-cfi      # Resolve CFI to location
```

### Tasks Checklist

- [ ] Implement CFI parser
- [ ] Implement CFI generator
- [ ] Implement CFI resolver
- [ ] Generate CFIs for TOC items
- [ ] Unit tests for CFI operations

### Success Criteria
- CFIs generated for all TOC items
- CFI resolution returns accurate spine index and path
- CFIs are stable across sessions

---

## Phase 3: Frontend Rendition Layer (Weeks 7-10)

### Goal
Build isolated rendition surfaces with pagination engine.

### Component Architecture

```typescript
// web/src/components/dashboard/FlipBookReader/types.ts

/**
 * Paginated chapter data
 */
export interface PaginatedChapter {
  chapterId: string;
  totalPages: number;
  pages: PageBoundary[];
  cfiStart: string;
  cfiEnd: string;
}

/**
 * Page boundary for rendering
 */
export interface PageBoundary {
  pageIndex: number;
  cfiStart: string;      // CFI at start of page
  cfiEnd: string;        // CFI at end of page
  estimatedCharCount: number;
}

/**
 * Spread (two pages for flip animation)
 */
export interface PageSpread {
  leftPage?: PageBoundary;
  rightPage: PageBoundary;
  spreadIndex: number;
}

/**
 * Reading state with stable locator
 */
export interface ReadingState {
  bookId: string;
  currentCfi: string;
  currentSpreadIndex: number;
  settings: ReaderSettings;
}
```

### Rendition Surface Component

```typescript
// web/src/components/dashboard/FlipBookReader/RenditionSurface.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReaderSettings } from './types';

interface RenditionSurfaceProps {
  bookId: string;
  chapterHref: string;
  settings: ReaderSettings;
  onPaginated: (pages: PageBoundary[]) => void;
  onPageRender: (pageIndex: number) => void;
}

/**
 * Isolated rendition surface for chapter content
 * Uses iframe for CSS isolation and precise measurement
 */
export function RenditionSurface({
  bookId,
  chapterHref,
  settings,
  onPaginated,
  onPageRender,
}: RenditionSurfaceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Build absolute URL for chapter HTML
  const chapterUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/epub/${bookId}/resource/${chapterHref}`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;

      switch (event.data.type) {
        case 'rendition-ready':
          setIsReady(true);
          break;
        case 'content-measured':
          // Content measured, calculate pagination
          calculatePagination(event.data.height);
          break;
        case 'page-rendered':
          onPageRender(event.data.pageIndex);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPaginated, onPageRender]);

  useEffect(() => {
    // Update settings when they change
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !isReady) return;

    iframe.contentWindow.postMessage({
      type: 'update-settings',
      settings,
    }, '*');
  }, [settings, isReady]);

  const calculatePagination = (contentHeight: number) => {
    // Calculate page boundaries based on viewport
    // This is a simplified version
    const viewportHeight = 600; // Will be actual viewport height
    const pageHeight = viewportHeight - (settings.margin === 'wide' ? 80 : 40);

    const totalPages = Math.ceil(contentHeight / pageHeight);
    const pages: PageBoundary[] = [];

    for (let i = 0; i < totalPages; i++) {
      pages.push({
        pageIndex: i,
        cfiStart: generateCFIForPage(i),
        cfiEnd: generateCFIForPage(i + 1),
        estimatedCharCount: Math.floor((contentHeight / totalPages) * 10),
      });
    }

    onPaginated(pages);
  };

  return (
    <iframe
      ref={iframeRef}
      src={getRenditionUrl(chapterUrl, settings)}
      className="absolute inset-0 w-full h-full border-0"
      sandbox="allow-same-origin allow-scripts"
      title={`Chapter: ${chapterHref}`}
    />
  );
}

/**
 * Get rendition URL with injected scripts
 */
function getRenditionUrl(chapterUrl: string, settings: ReaderSettings): string {
  // In production, this would be a dedicated rendition endpoint
  // that injects the pagination script
  return `${chapterUrl}?rendition=true&fontSize=${settings.fontSize}`;
}
```

### Rendition Script (Injected into Chapter HTML)

```typescript
// web/src/components/dashboard/FlipBookReader/rendition-script.ts

/**
 * This script is injected into chapter HTML
 * Handles measurement and pagination
 */

(function() {
  'use strict';

  let isReady = false;
  let currentSettings: ReaderSettings | null = null;

  // Apply reader settings
  function applySettings(settings: ReaderSettings) {
    currentSettings = settings;

    // Create or update style element
    let styleEl = document.getElementById('reader-settings');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'reader-settings';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      :root {
        --reader-font-size: ${settings.fontSize}%;
        --reader-line-height: ${settings.lineHeight};
        --reader-font-family: ${getFontFamily(settings.fontFamily)};
        --reader-text-align: ${settings.textAlign};
        --reader-margin: ${getMarginSize(settings.margin)};
      }

      body {
        font-size: var(--reader-font-size) !important;
        line-height: var(--reader-line-height) !important;
        font-family: var(--reader-font-family) !important;
        text-align: var(--reader-text-align) !important;
        padding: var(--reader-margin) !important;
        box-sizing: border-box !important;
      }

      /* Preserve original EPUB styles where important */
      * {
        box-sizing: border-box !important;
      }

      /* Handle images in flow */
      img {
        max-width: 100% !important;
        height: auto !important;
        display: inline-block !important;
      }

      /* Handle tables */
      table {
        max-width: 100% !important;
        overflow-wrap: break-word !important;
      }
    `;

    // Notify parent that content needs re-measurement
    requestAnimationFrame(() => {
      measureContent();
    });
  }

  function measureContent() {
    const height = document.body.scrollHeight;
    window.parent.postMessage({
      type: 'content-measured',
      height,
    }, '*');
  }

  function renderPage(pageIndex: number, viewportHeight: number) {
    // Scroll to page position
    const pageHeight = viewportHeight - 40; // Account for margins
    const scrollTop = pageIndex * pageHeight;

    window.scrollTo({
      top: scrollTop,
      behavior: 'smooth',
    });

    window.parent.postMessage({
      type: 'page-rendered',
      pageIndex,
    }, '*');
  }

  // Listen for messages from parent
  window.addEventListener('message', (event) => {
    switch (event.data.type) {
      case 'init':
        applySettings(event.data.settings);
        isReady = true;
        window.parent.postMessage({ type: 'rendition-ready' }, '*');
        break;
      case 'update-settings':
        applySettings(event.data.settings);
        break;
      case 'render-page':
        renderPage(event.data.pageIndex, event.data.viewportHeight);
        break;
    }
  });

  // Notify parent when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.parent.postMessage({ type: 'dom-ready' }, '*');
    });
  } else {
    window.parent.postMessage({ type: 'dom-ready' }, '*');
  }
})();
```

### Pagination Engine

```typescript
// web/src/components/dashboard/FlipBookReader/PaginationEngine.ts

'use client';

import { useState, useCallback, useRef } from 'react';
import type { PaginatedChapter, PageBoundary, ReaderSettings } from './types';
import { RenditionSurface } from './RenditionSurface';

interface PaginationEngineProps {
  bookId: string;
  initialCfi: string;
  settings: ReaderSettings;
  onLocationChange: (cfi: string) => void;
}

/**
 * Manages chapter pagination and page boundaries
 */
export function PaginationEngine({
  bookId,
  initialCfi,
  settings,
  onLocationChange,
}: PaginationEngineProps) {
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [pages, setPages] = useState<PageBoundary[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isPaginating, setIsPaginating] = useState(false);

  const settingsHashRef = useRef(computeSettingsHash(settings));

  // Re-paginate when settings change
  useCallback(() => {
    const newHash = computeSettingsHash(settings);
    if (newHash !== settingsHashRef.current) {
      settingsHashRef.current = newHash;
      // Find current CFI in new pages
      const newPageIndex = findPageForCfi(initialCfi, pages);
      setCurrentPageIndex(newPageIndex);
    }
  }, [settings, initialCfi, pages]);

  const handlePaginated = useCallback((newPages: PageBoundary[]) => {
    setPages(newPages);
    setIsPaginating(false);

    // Save to cache
    cachePagination(bookId, currentChapter!, settings, newPages);
  }, [bookId, currentChapter, settings]);

  const handlePageChange = useCallback((direction: 'next' | 'prev') => {
    const newIndex = direction === 'next'
      ? currentPageIndex + 1
      : currentPageIndex - 1;

    if (newIndex >= 0 && newIndex < pages.length) {
      setCurrentPageIndex(newPageIndex);
      onLocationChange(pages[newIndex].cfiStart);
    }
  }, [currentPageIndex, pages, onLocationChange]);

  const goToCfi = useCallback((cfi: string) => {
    // Find spine index from CFI
    // Load appropriate chapter
    // Find page within chapter
    // Navigate to page
  }, []);

  return (
    <div className="pagination-engine">
      {isPaginating && <PaginationProgress />}

      {currentChapter && (
        <>
          <RenditionSurface
            bookId={bookId}
            chapterHref={currentChapter}
            settings={settings}
            onPaginated={handlePaginated}
            onPageRender={(index) => setCurrentPageIndex(index)}
          />

          <PaginationControls
            currentPage={currentPageIndex + 1}
            totalPages={pages.length}
            onPrev={() => handlePageChange('prev')}
            onNext={() => handlePageChange('next')}
            hasPrev={currentPageIndex > 0}
            hasNext={currentPageIndex < pages.length - 1}
          />
        </>
      )}
    </div>
  );
}

function computeSettingsHash(settings: ReaderSettings): string {
  return JSON.stringify(settings);
}

function cachePagination(
  bookId: string,
  chapter: string,
  settings: ReaderSettings,
  pages: PageBoundary[],
): void {
  const cacheKey = `pagination:${bookId}:${chapter}:${computeSettingsHash(settings)}`;
  // Cache in localStorage or IndexedDB
}

function findPageForCfi(cfi: string, pages: PageBoundary[]): number {
  // Binary search for page containing CFI
  return 0;
}
```

### Tasks Checklist

- [ ] Create RenditionSurface component with iframe
- [ ] Implement rendition script injection
- [ ] Build measurement and pagination logic
- [ ] Implement settings application in iframe
- [ ] Create PaginationEngine for state management
- [ ] Add caching for computed page boundaries
- [ ] Handle repagination on settings change
- [ ] Implement CFI-based navigation
- [ ] Tests for pagination accuracy

### Success Criteria
- Chapter content renders with original formatting
- Page boundaries calculated accurately
- Settings changes trigger re-pagination
- Current position restored after repagination
- Images in content display correctly

---

## Phase 4: Flip Animation Layer (Weeks 11-13)

### Goal
Implement 3D flip animation on paginated spreads.

### Component Architecture

```typescript
// web/src/components/dashboard/FlipBookReader/FlipBook.tsx

'use client';

import { useState, useRef, useCallback } from 'react';
import { PageSpread } from './PageSpread';
import type { PageBoundary, PaginatedChapter } from './types';

interface FlipBookProps {
  chapters: PaginatedChapter[];
  initialCfi: string;
  onLocationChange: (cfi: string) => void;
}

/**
 * Flip book with 3D page turn animation
 * Renders two-page spreads with realistic page flip
 */
export function FlipBook({
  chapters,
  initialCfi,
  onLocationChange,
}: FlipBookProps) {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [flipping, setFlipping] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSpreads = Math.ceil(chapters.reduce(
    (sum, ch) => sum + ch.totalPages,
    0,
  ) / 2);

  const handleNext = useCallback(() => {
    if (currentSpread >= totalSpreads - 1) return;
    setFlipping('right');
    setTimeout(() => {
      setCurrentSpread(s => s + 1);
      setFlipping(null);
    }, 400); // Match animation duration
  }, [currentSpread, totalSpreads]);

  const handlePrev = useCallback(() => {
    if (currentSpread <= 0) return;
    setFlipping('left');
    setTimeout(() => {
      setCurrentSpread(s => s - 1);
      setFlipping(null);
    }, 400);
  }, [currentSpread]);

  const getCurrentSpread = useCallback((): PageSpread => {
    // Get left and right pages for current spread
    const globalPageIndex = currentSpread * 2;
    const chapterAndPage = findChapterAndPage(chapters, globalPageIndex);

    return {
      leftPage: chapterAndPage.leftPage,
      rightPage: chapterAndPage.rightPage,
      spreadIndex: currentSpread,
    };
  }, [currentSpread, chapters]);

  return (
    <div
      ref={containerRef}
      className="flip-book-container"
      style={{
        perspective: '2000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Book spine/center */}

      {/* Current spread */}
      <PageSpread
        spread={getCurrentSpread()}
        isFlipping={flipping !== null}
        flipDirection={flipping}
      />

      {/* Navigation controls */}
      <FlipControls
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={currentSpread > 0}
        hasNext={currentSpread < totalSpreads - 1}
      />

      {/* Touch/swipe gestures */}
      <SwipeGestures
        onSwipeLeft={handleNext}
        onSwipeRight={handlePrev}
      />
    </div>
  );
}
```

### Page Spread Component

```typescript
// web/src/components/dashboard/FlipBookReader/PageSpread.tsx

'use client';

import { useMemo } from 'react';
import type { PageSpread as PageSpreadType, PageBoundary } from './types';

interface PageSpreadProps {
  spread: PageSpreadType;
  isFlipping: boolean;
  flipDirection: 'left' | 'right' | null;
}

/**
 * Renders a two-page spread with flip animation
 */
export function PageSpread({ spread, isFlipping, flipDirection }: PageSpreadProps) {
  const { leftPage, rightPage } = spread;

  const pageWidth = 450;
  const pageHeight = 650;

  return (
    <div
      className="flex justify-center items-center"
      style={{ height: `${pageHeight}px` }}
    >
      {/* Left Page */}
      {leftPage && (
        <FlipPage
          page={leftPage}
          width={pageWidth}
          height={pageHeight}
          side="left"
          isFlipping={isFlipping && flipDirection === 'left'}
        />
      )}

      {/* Spine shadow */}
      <div
        className="w-4 bg-gradient-to-r from-black/20 to-black/5"
        style={{ height: `${pageHeight}px` }}
      />

      {/* Right Page */}
      <FlipPage
        page={rightPage}
        width={pageWidth}
        height={pageHeight}
        side="right"
        isFlipping={isFlipping && flipDirection === 'right'}
      />
    </div>
  );
}

interface FlipPageProps {
  page: PageBoundary;
  width: number;
  height: number;
  side: 'left' | 'right';
  isFlipping: boolean;
}

function FlipPage({ page, width, height, side, isFlipping }: FlipPageProps) {
  const flipStyle = useMemo(() => {
    if (!isFlipping) return {};

    const transformOrigin = side === 'left'
      ? 'right center'
      : 'left center';

    const rotateY = side === 'left' ? '-10deg' : '10deg';

    return {
      transform: `rotateY(${rotateY})`,
      transformOrigin,
      transition: 'transform 0.4s ease-in-out',
    };
  }, [isFlipping, side]);

  return (
    <div
      className="relative bg-white shadow-xl overflow-hidden"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        ...flipStyle,
      }}
    >
      {/* Page content from rendition surface */}
      <PageContent page={page} width={width} height={height} />

      {/* Page number */}
      <div className="absolute bottom-4 right-4 text-sm text-gray-400">
        {page.pageIndex + 1}
      </div>

      {/* Paper texture effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/0 via-white/0 to-gray-100/10" />

      {/* Edge shadow for depth */}
      <div
        className={`absolute top-0 bottom-0 w-2 pointer-events-none ${
          side === 'left'
            ? 'right-0 bg-gradient-to-l from-black/10'
            : 'left-0 bg-gradient-to-r from-black/10'
        }`}
      />
    </div>
  );
}

/**
 * Page content renderer
 * Connects to rendition surface for actual content
 */
function PageContent({ page, width, height }: { page: PageBoundary; width: number; height: number }) {
  // This would connect to the RenditionSurface
  // to render the specific page range
  return (
    <div
      className="w-full h-full overflow-hidden p-8"
      style={{
        fontSize: '16px',
        lineHeight: '1.6',
      }}
    >
      {/* Content would be rendered here via connection to RenditionSurface */}
      <div className="prose max-w-none">
        <p>Page {page.pageIndex + 1} content</p>
        <p>CFI start: {page.cfiStart}</p>
        <p>CFI end: {page.cfiEnd}</p>
      </div>
    </div>
  );
}
```

### Swipe Gestures

```typescript
// web/src/components/dashboard/FlipBookReader/SwipeGestures.tsx

'use client';

import { useEffect, useRef } from 'react';

interface SwipeGesturesProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export function SwipeGestures({ onSwipeLeft, onSwipeRight }: SwipeGesturesProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const start = touchStartRef.current;
      if (!start) return;

      const end = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };

      const deltaX = end.x - start.x;
      const deltaY = Math.abs(end.y - start.y);

      // Only trigger swipe if horizontal movement dominates
      if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          onSwipeRight(); // Swipe right = previous page
        } else {
          onSwipeLeft(); // Swipe left = next page
        }
      }

      touchStartRef.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight]);

  return null;
}
```

### Tasks Checklist

- [ ] Build FlipBook container with 3D perspective
- [ ] Create PageSpread component with two-page layout
- [ ] Implement flip animation with CSS transforms
- [ ] Add paper texture and shadows
- [ ] Implement swipe gestures
- [ ] Add tap zones for navigation
- [ ] Implement keyboard navigation
- [ ] Add drag-to-flip gesture
- [ ] Performance optimization (GPU acceleration)
- [ ] Tests for animation smoothness

### Success Criteria
- 60fps flip animation
- Smooth page transitions
- Responsive to gestures
- Keyboard navigation works
- Animations respect reduced motion preference

---

## Phase 5: Reading State & Progress (Weeks 14-15)

### Goal
Implement stable reading state persistence using CFIs.

### State Manager

```typescript
// web/src/lib/reading-state.ts

interface ReadingStateManager {
  saveLocation(bookId: string, cfi: string): Promise<void>;
  getLocation(bookId: string): Promise<string | null>;
  saveSettings(bookId: string, settings: ReaderSettings): Promise<void>;
  getSettings(bookId: string): Promise<ReaderSettings | null>;
  getProgress(bookId: string): Promise<number>;
}

class SupabaseReadingStateManager implements ReadingStateManager {
  async saveLocation(bookId: string, cfi: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    await supabase
      .from('reading_progress')
      .upsert({
        user_id: user.id,
        book_id: bookId,
        cfi,
        updated_at: new Date().toISOString(),
      });
  }

  async getLocation(bookId: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('reading_progress')
      .select('cfi')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single();

    return data?.cfi || null;
  }

  async getProgress(bookId: string): Promise<number> {
    // Calculate progress based on CFI position in spine
    const cfi = await this.getLocation(bookId);
    if (!cfi) return 0;

    // Resolve CFI to get spine index
    // Calculate percentage: (spineIndex / totalSpineItems) * 100
    return 0;
  }
}
```

### Database Migration

```sql
-- Add CFI column to reading_progress
ALTER TABLE reading_progress
ADD COLUMN cfi TEXT,
ADD COLUMN settings JSONB DEFAULT '{"fontSize":100,"lineHeight":1.6,"fontFamily":"serif","theme":"light","margin":"medium","textAlign":"justify","columnCount":2,"spreadMode":"auto"}'::jsonb;

-- Create index for fast lookups
CREATE INDEX idx_reading_progress_user_book
ON reading_progress(user_id, book_id);
```

### Tasks Checklist

- [ ] Add CFI column to reading_progress table
- [ ] Implement reading state manager
- [ ] Save reading position on page turn
- [ ] Restore reading position on book open
- [ ] Calculate progress percentage for UI
- [ ] Sync settings across devices

### Success Criteria
- Reading position persists across sessions
- Position stable after settings change
- Progress bar updates accurately
- Settings sync across devices

---

## Performance Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Page Render | <500ms | Time from book open to first content visible |
| Repagination Speed | <200ms | Time after settings change to re-pagination complete |
| Next Spread Prefetch | <100ms | Time to prefetch next spread while viewing current |
| Flip Animation | 60fps | Smooth animation without jank |
| Memory per Chapter | <50MB | Including rendition surface and cached pages |

### Optimization Strategies

1. **Prefetch Next Chapter**
   - Load next chapter HTML when approaching end of current
   - Pre-calculate pagination for next chapter
   - Cache in IndexedDB for instant access

2. **Lazy Load Images**
   - Use IntersectionObserver for images in current spread
   - Load images for adjacent spreads
   - Defer off-screen images

3. **Pagination Caching**
   - Cache computed page boundaries by settings hash
   - Store in IndexedDB for persistence
   - Invalidate on settings change

4. **Virtual Rendering**
   - Only render current + adjacent spreads
   - Unmount distant spreads
   - Reuse rendition surfaces

---

## Phase 6: PDF Reader Integration (Week 16)

### Goal
Integrate PDF reader with same flip-book experience.

PDFs are fixed-layout, so pagination is simpler:
- Each PDF page = one book page
- No re-pagination needed
- Same flip animation on top

```typescript
// Simplified PDF integration
const pdfSpread = {
  leftPage: pdfPages[currentSpread * 2],
  rightPage: pdfPages[currentSpread * 2 + 1],
};

// Same FlipBook component works
<FlipBook spread={pdfSpread} />
```

---

## Deployment Strategy

### Docker Compose Development

```yaml
services:
  nextjs:
    build: ./web
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_BACKEND_URL=http://backend:3001
    depends_on:
      - backend

  backend:
    build: ./backend
    ports: ["3001:3001"]
    environment:
      - MINIO_ENDPOINT=minio:9000
      - REDIS_URL=redis://redis:6379
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    depends_on:
      - redis
      - minio

  redis:
    image: redis:alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  minio_data:
```

---

## Migration Comparison

| Aspect | Old Plan | New Plan (Flip-Book) |
|--------|----------|---------------------|
| EPUB Content | Plain text extraction | HTML preservation |
| Pagination | Fake (char count) | True (measured) |
| Navigation | Chapter-based | Page-based with TOC |
| Reading State | Percentages | Stable CFIs |
| Animation | Basic flip | Premium 3D flip |
| Settings Impact | Lost position | Position preserved |
| Rendering | Direct HTML | Iframe rendition |

---

## Success Criteria Summary

| Phase | Criteria | Target |
|-------|----------|--------|
| 1 | EPUB package API | Clean structure + resource URLs |
| 1 | Asset proxy | All resources accessible |
| 2 | CFI generation | Stable locators for all content |
| 3 | Rendition surface | HTML renders in iframe |
| 3 | Pagination | Accurate page boundaries |
| 3 | Repagination | Position preserved after settings change |
| 4 | Flip animation | 60fps, realistic 3D effect |
| 5 | State persistence | CFIs saved and restored |
| 6 | PDF integration | Same flip experience |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Iframe blocking | Medium | High | Sandbox with minimal restrictions |
| Pagination accuracy | Medium | High | Extensive testing with diverse EPUBs |
| Performance on mobile | Medium | Medium | Virtual rendering, lazy loading |
| CFI implementation | Low | High | Use epub.js CFI library |
| Cross-origin issues | Medium | Medium | Proper CORS on asset proxy |

---

## Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "jszip": "^3.0.0",
    "fast-xml-parser": "^4.0.0",
    "ioredis": "^5.0.0",
    "minio": "^7.0.0",
    "zod": "^3.0.0",
    "class-validator": "^0.14.0",
    "react-pageflip": "^2.0.0",
    "use-swipe": "^1.0.0"
  }
}
```

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-04-17 | Initial migration plan | AI Assistant |
| 2025-04-17 | Revised for flip-book architecture | User Request |

---

**Next Step:** Begin Phase 1 by creating NestJS EPUB package service.
