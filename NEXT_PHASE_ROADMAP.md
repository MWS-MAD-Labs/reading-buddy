# Reading Buddy: PostgreSQL Migration - Next Phase Roadmap

**Date:** December 17, 2024  
**Current Branch:** `local-db`  
**Status:** Phase 1 Complete ✅ | Phase 2 Starting 🚀

---

## Phase 1: COMPLETED ✅

### What We Achieved
- ✅ Full data migration from Supabase (16 users, 14 tables, 300+ records)
- ✅ Dashboard overview fully migrated and working
- ✅ Admin, Student, Teacher dashboards migrated
- ✅ Gamification system (XP, levels, badges) working with PostgreSQL
- ✅ Leaderboards displaying correct data
- ✅ User account merging on OAuth login
- ✅ Data integrity verified (XP totals match perfectly)

### Current State
**Working with Local PostgreSQL:**
- Login/OAuth (NextAuth)
- Dashboard overview
- Admin page
- Student page (partial - reading progress working)
- Teacher page (classrooms, analytics)
- Staff leaderboard

**Still Using Supabase (Needs Migration):**
- Librarian page and actions
- Library page
- Student dashboard actions (some)
- ~38 other files

---

## Phase 2: Surface Check All Pages (Current Phase)

**Goal:** Visit every page in local environment and compare with production to ensure visual parity

### 2.1 Page-by-Page Surface Check

Create checklist of all pages and verify they display correctly:

#### Admin Pages
- [x] `/dashboard` - Overview (Working ✅)
- [ ] `/dashboard/admin` - Admin panel
- [ ] `/dashboard/admin/badges` - Badge management
- [ ] `/dashboard/admin/broadcasts` - Login broadcasts

#### Student Pages
- [x] `/dashboard/student` - Student dashboard (Partial ✅)
- [ ] `/dashboard/student/quiz/[quizId]` - Quiz taking
- [ ] `/dashboard/library` - Browse books

#### Teacher Pages
- [x] `/dashboard/teacher` - Teacher overview (Working ✅)
- [ ] `/dashboard/teacher/classrooms` - Classroom list
- [ ] `/dashboard/teacher/classrooms/[classId]` - Classroom detail
- [ ] `/dashboard/teacher/students/[studentId]` - Student detail

#### Librarian Pages
- [ ] `/dashboard/librarian` - Librarian dashboard
- [ ] `/dashboard/librarian/badges` - Badge creation
- [ ] `/dashboard/librarian/books/[bookId]` - Book detail

#### Shared Pages
- [ ] `/dashboard/library` - Book library
- [ ] `/dashboard/leaderboard` - Full leaderboard
- [ ] Book reader pages

### 2.2 Visual Comparison Checklist

For each page, verify:
- ✅ Page loads without errors
- ✅ All cards/sections display
- ✅ Data shows correctly (not empty/null)
- ✅ Matches production layout
- ✅ No console errors
- ✅ No missing images/icons

### 2.3 Files Requiring Migration Priority

**High Priority (Core Features):**
1. `app/(dashboard)/dashboard/librarian/page.tsx`
2. `app/(dashboard)/dashboard/librarian/actions.ts`
3. `app/(dashboard)/dashboard/library/page.tsx`
4. `app/(dashboard)/dashboard/student/quiz/actions.ts`
5. `app/(dashboard)/dashboard/student/quiz/[quizId]/page.tsx`

**Medium Priority (Supporting Features):**
6. `app/(dashboard)/dashboard/admin/badges/page.tsx`
7. `app/(dashboard)/dashboard/admin/badge-actions.ts`
8. `app/(dashboard)/dashboard/admin/broadcasts/actions.ts`
9. `app/(dashboard)/dashboard/teacher/classrooms/page.tsx`
10. `app/(dashboard)/dashboard/teacher/classrooms/[classId]/page.tsx`

**Lower Priority (Can be migrated last):**
- Background job scripts
- Utility scripts
- Admin tools

---

## Phase 3: Detailed Flow Testing

**Goal:** Test every user action and function works end-to-end with PostgreSQL

### 3.1 Student Flows
- [ ] Login → Dashboard loads with correct stats
- [ ] Browse library → View books
- [ ] Start reading book → Progress tracked
- [ ] Take quiz → Submit answers → XP awarded
- [ ] Complete book → Badge earned
- [ ] View leaderboard → See ranking

### 3.2 Teacher Flows
- [ ] Create classroom
- [ ] Add students to classroom
- [ ] Assign book to classroom
- [ ] Assign quiz to classroom
- [ ] View student progress
- [ ] View classroom analytics

### 3.3 Librarian Flows
- [ ] Upload new book (PDF)
- [ ] Add book metadata
- [ ] Generate AI quiz
- [ ] Create manual quiz
- [ ] Create badges
- [ ] View library stats

### 3.4 Admin Flows
- [ ] View system stats
- [ ] Manage user roles
- [ ] Create badges
- [ ] Manage broadcasts
- [ ] View all analytics

---

## Phase 4: Remove Supabase Dependencies

**Goal:** Complete transition to PostgreSQL-only system

### 4.1 Code Cleanup
- [ ] Remove all `@supabase/supabase-js` imports
- [ ] Remove all `@supabase/ssr` imports
- [ ] Delete `lib/supabase/` directory
- [ ] Delete `components/providers/SupabaseProvider.tsx`
- [ ] Update all remaining files to use PostgreSQL

### 4.2 Package Cleanup
```bash
npm uninstall @supabase/supabase-js @supabase/ssr
```

### 4.3 Environment Cleanup
Remove from `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 4.4 Documentation Updates
- [ ] Update README.md - Remove Supabase references
- [ ] Update QUICK_START.md - PostgreSQL setup only
- [ ] Update deployment docs
- [ ] Create migration guide for other developers

---

## Phase 5: Production Deployment

**Goal:** Deploy self-hosted Reading Buddy to production

### 5.1 Pre-Deployment Checklist
- [ ] All pages migrated and tested
- [ ] No Supabase dependencies remain
- [ ] All tests passing
- [ ] Performance benchmarks acceptable
- [ ] Security audit complete
- [ ] Backups configured

### 5.2 Deployment Steps
1. Set up production PostgreSQL server
2. Set up production MinIO server
3. Run database migrations
4. Configure Google OAuth for production domain
5. Deploy Next.js application
6. Test production environment
7. Set up monitoring and alerts

### 5.3 Rollback Plan
- Keep Supabase credentials for 2 weeks as backup
- Document rollback procedure
- Test rollback in staging

---

## Current Sprint: Phase 2 Tasks

### Week 1 (Current)
**Objective:** Surface check all pages, migrate librarian & library pages

**Day 1-2:**
- [x] Surface check dashboard overview ✅
- [ ] Surface check librarian page
- [ ] Surface check library page
- [ ] Migrate librarian page queries to PostgreSQL
- [ ] Migrate library page queries to PostgreSQL

**Day 3-4:**
- [ ] Surface check student quiz pages
- [ ] Surface check teacher classroom pages
- [ ] Migrate quiz submission actions
- [ ] Migrate classroom detail actions

**Day 5:**
- [ ] Surface check admin pages (badges, broadcasts)
- [ ] Complete any remaining surface checks
- [ ] Document findings and blockers

### Week 2
**Objective:** Complete remaining page migrations

**Day 1-3:**
- [ ] Migrate remaining high-priority pages
- [ ] Migrate medium-priority pages
- [ ] Test each migrated page

**Day 4-5:**
- [ ] Migrate low-priority pages
- [ ] Complete all code migrations
- [ ] Comprehensive testing

### Week 3
**Objective:** Detailed flow testing and cleanup

**Day 1-2:**
- [ ] Test all student flows
- [ ] Test all teacher flows

**Day 3-4:**
- [ ] Test all librarian flows
- [ ] Test all admin flows

**Day 5:**
- [ ] Remove Supabase dependencies
- [ ] Final cleanup and documentation

---

## Success Metrics

### Phase 2 Success Criteria
- ✅ All pages load without errors
- ✅ All pages match production visually
- ✅ No missing data or empty sections
- ✅ All high-priority pages migrated to PostgreSQL

### Phase 3 Success Criteria
- ✅ All user flows complete successfully
- ✅ No broken features
- ✅ Data consistency maintained
- ✅ Performance acceptable (< 2s page loads)

### Phase 4 Success Criteria
- ✅ Zero Supabase imports in codebase
- ✅ All packages removed
- ✅ All tests passing
- ✅ Documentation updated

### Phase 5 Success Criteria
- ✅ Production deployment successful
- ✅ All features working in production
- ✅ Monitoring configured
- ✅ Backup/restore procedures tested

---

## Risk Management

### High Risks
1. **Data Migration Errors** - Mitigated by backups and validation scripts ✅
2. **Missing Features** - Mitigated by comprehensive testing plan
3. **Performance Issues** - Need to benchmark PostgreSQL vs Supabase
4. **Production Downtime** - Mitigated by staging environment testing

### Medium Risks
1. **User Session Management** - Users need to re-login (acceptable)
2. **File URL Changes** - MinIO URLs different from Supabase Storage
3. **Schema Drift** - Keep schemas in sync between environments

### Low Risks
1. **TypeScript Errors** - Caught at compile time
2. **UI Bugs** - Visual testing catches most issues

---

## Notes

### Important Reminders
- ⚠️ **Don't simplify pages** - Keep all functionality exactly as production
- ⚠️ **Test with production data** - Migration already complete with real data
- ⚠️ **Document all changes** - Update CHANGELOG.md
- ⚠️ **Keep backups** - Database backups before major changes

### Helpful Commands
```bash
# Start local environment
docker-compose up -d
cd web && npm run dev

# Run migration script (if needed)
npx tsx scripts/migrate-from-supabase.ts

# Database backup
docker exec reading-buddy-postgres pg_dump -U reading_buddy -d reading_buddy > backup.sql

# Check migration status
grep -r "createSupabase" web/src/app --include="*.tsx" --include="*.ts"
```

---

**Last Updated:** December 17, 2024  
**Next Review:** December 18, 2024  
**Maintained By:** Development Team
