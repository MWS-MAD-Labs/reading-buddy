# Testing Guide - NextAuth.js Implementation

**Date:** 2024-12-15  
**Status:** Ready for Testing

---

## ✅ What's Been Implemented

### 1. Database Layer (Complete)
- ✅ PostgreSQL schema with 25 tables
- ✅ NextAuth tables (users, accounts, sessions, verification_tokens)
- ✅ Application tables (profiles, books, quizzes, badges, etc.)
- ✅ RLS policies (65 policies)
- ✅ Gamification functions
- ✅ Seed data (20 badges)

### 2. NextAuth.js Integration (Complete)
- ✅ Database client with connection pooling
- ✅ NextAuth configuration with Google OAuth + Credentials
- ✅ Signup API endpoint
- ✅ TypeScript types for session
- ✅ Automatic profile creation
- ✅ Session enrichment (role, XP, level, etc.)

---

## 🧪 How to Test

### Prerequisites

1. **Start Docker Desktop**
   - Open Docker Desktop application
   - Wait for it to be running

2. **Start PostgreSQL**
   ```bash
   cd /Users/faisalnurhidayat/reading-buddy
   docker compose -f docker-compose.selfhosted.yml up -d postgres
   
   # Wait for it to be ready (15 seconds)
   sleep 15
   ```

3. **Verify Database**
   ```bash
   ./scripts/test-database.sh
   ```
   
   Expected: ✅ 25 tables, 65 RLS policies, 20 badges

### Test 1: Start Next.js Application

```bash
cd web
npm run dev
```

Expected output:
```
✓ Ready in ~1s
- Local: http://localhost:3000
```

### Test 2: Test Authentication APIs

In a new terminal:

```bash
./scripts/test-auth.sh
```

This will:
1. ✅ Check PostgreSQL is running
2. ✅ Test database connection
3. ✅ Create a test user via signup API
4. ✅ Verify user in database
5. ✅ Verify profile created
6. ✅ Test NextAuth endpoints (CSRF, providers)

Expected output:
```
✅ PostgreSQL is running
✅ Database connection successful
✅ Signup successful
✅ User created in database
✅ Profile created in database
✅ CSRF endpoint working
✅ Providers endpoint working
```

### Test 3: Manual Signup Test

```bash
# Create a user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Account created successfully. Please sign in.",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

### Test 4: Verify in Database

```bash
docker compose -f docker-compose.selfhosted.yml exec postgres psql -U reading_buddy -d reading_buddy
```

Then run:
```sql
-- Check user was created
SELECT id, email, name, email_verified FROM users WHERE email = 'test@example.com';

-- Check profile was created
SELECT id, email, full_name, role, xp, level FROM profiles WHERE email = 'test@example.com';

-- Exit
\q
```

Expected:
- ✅ User exists with hashed password
- ✅ Profile exists with role='STUDENT', xp=0, level=1

### Test 5: NextAuth Endpoints

```bash
# Test CSRF token
curl http://localhost:3000/api/auth/csrf

# Test providers
curl http://localhost:3000/api/auth/providers

# Test session (should be null without login)
curl http://localhost:3000/api/auth/session
```

---

## 🔍 What to Look For

### Database
- ✅ Users table has entries
- ✅ Profiles table links to users via user_id
- ✅ Sessions table is empty (no one logged in yet)
- ✅ Password is hashed in users table

### API Responses
- ✅ Signup returns success message
- ✅ No errors in console
- ✅ Profile created automatically
- ✅ NextAuth endpoints respond correctly

### Next.js Logs
Check `/tmp/nextjs-test.log` for:
- ✅ No errors during startup
- ✅ Database connection successful
- ✅ Routes registered correctly

---

## ⚠️ Known Issues to Ignore

1. **Warning about `version` in docker-compose.yml**
   - This is cosmetic, doesn't affect functionality
   - Can be fixed by removing `version: '3.8'` line

2. **Warning about workspace root**
   - This is about monorepo detection
   - Doesn't affect authentication

3. **Google OAuth won't work yet**
   - `GOOGLE_CLIENT_ID` is empty in .env
   - This is expected - we're testing email/password first
   - Add credentials later for OAuth testing

---

## 🐛 Troubleshooting

### "Cannot connect to Docker daemon"
**Problem:** Docker Desktop isn't running  
**Solution:** 
```bash
# Open Docker Desktop
open -a Docker

# Wait for it to start, then retry
```

### "Port 3000 in use"
**Problem:** Another Next.js instance is running  
**Solution:**
```bash
# Kill all Next.js processes
pkill -f "next dev"

# Or use different port
PORT=3001 npm run dev
```

### "PostgreSQL connection failed"
**Problem:** Database not started or wrong port  
**Solution:**
```bash
# Check what's running
docker ps

# Restart PostgreSQL
docker compose -f docker-compose.selfhosted.yml restart postgres

# Check logs
docker compose -f docker-compose.selfhosted.yml logs postgres
```

### "User already exists"
**Problem:** Testing same email twice  
**Solution:**
```bash
# Use different email or clear database
docker compose -f docker-compose.selfhosted.yml exec postgres psql -U reading_buddy -d reading_buddy -c "DELETE FROM users WHERE email = 'test@example.com';"
```

---

## 📊 Expected Test Results

After running all tests, you should see:

**Database:**
```
✅ 25 tables created
✅ 4 NextAuth tables (users, accounts, sessions, verification_tokens)
✅ 21 application tables
✅ 65 RLS policies active
✅ 20 badges seeded
✅ Test users created successfully
```

**Authentication:**
```
✅ Signup API working
✅ Password hashing working
✅ Profile auto-creation working
✅ NextAuth endpoints responding
✅ Session enrichment ready
```

**Next Steps After Successful Tests:**
1. Create login UI components
2. Update existing auth calls to use NextAuth
3. Add middleware for protected routes
4. Test full login/logout flow
5. Test role-based access

---

## 🎯 Quick Test Checklist

- [ ] Docker Desktop running
- [ ] PostgreSQL container started
- [ ] Database has 25 tables
- [ ] Next.js dev server running on :3000
- [ ] Signup API creates users
- [ ] Profiles auto-created
- [ ] Password hashed in database
- [ ] NextAuth endpoints respond
- [ ] No errors in logs

---

## 📝 Test Results Template

Copy this and fill it out:

```
=== Test Results ===
Date: ___________
Tester: ___________

Database Tests:
[ ] PostgreSQL started: YES / NO
[ ] Tables created (25): YES / NO / Count: ___
[ ] RLS policies (65): YES / NO / Count: ___
[ ] Badges seeded (20): YES / NO / Count: ___

API Tests:
[ ] Signup API: SUCCESS / FAILED
[ ] User created in DB: YES / NO
[ ] Profile created: YES / NO
[ ] CSRF endpoint: WORKING / FAILED
[ ] Providers endpoint: WORKING / FAILED

Issues Found:
_______________________________________
_______________________________________
_______________________________________

Notes:
_______________________________________
_______________________________________
_______________________________________
```

---

**Ready to test!** Start Docker Desktop and follow the steps above. 🚀
