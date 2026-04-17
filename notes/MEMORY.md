# Reading Buddy - Documentation Index

AI agents working on this project should reference these documents for context.

## Architecture & Migration

- [Hybrid Migration Plan](./2025-04-17/architecture/HYBRID_MIGRATION_PLAN.md) — **READ FIRST** - Plan for migrating text processing and pagination to NestJS backend

## Archive

- [ARCHIVE_2024.md](./ARCHIVE_2024.md) — Historical documentation (deployment, development notes, roadmap)

## Quick Reference

**Current Branch:** `staging`
**Main Branch:** `main`
**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, MinIO

**Key Directories:**
- `web/src/` - Next.js app source
- `web/src/app/api/` - API routes (heavy processing being migrated)
- `web/src/components/dashboard/` - Reader components (need refactoring)
- `web/src/lib/` - Utilities and services
- `notes/` - Project documentation

**AI Agents:** Always check HYBRID_MIGRATION_PLAN.md before making architectural changes.
