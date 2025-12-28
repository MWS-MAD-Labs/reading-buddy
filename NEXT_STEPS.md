# Reading Buddy Self-Hosted - Next Steps to Complete

**Date:** 2024-12-15  
**Status:** Backend Complete, Ready to Switch Frontend  
**Time to Complete:** 10-15 minutes

---

## 🎯 What We've Built

✅ **Fully functional local PostgreSQL database** (25 tables, 65 RLS policies)  
✅ **NextAuth.js authentication backend** (Google OAuth + email/password)  
✅ **User creation API** working with local database  
✅ **Profile auto-creation** with gamification  
✅ **New NextAuth LoginForm** component ready  
✅ **SessionProvider** created  

---

## 🚀 How to Complete the Switch (3 Steps)

### Step 1: Get Google OAuth Credentials (5 minutes)

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials

2. **Create OAuth Client:**
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Reading Buddy Self-Hosted"

3. **Add Redirect URI:**
   ```
   http://localhost:3000/api/auth/callback/google
   ```

4. **Copy Credentials** and add to `web/.env.local`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   ```

📖 **Full guide:** `docs/self-hosted/GOOGLE_OAUTH_SETUP.md`

---

### Step 2: Switch Login to NextAuth (1 minute)

Run this script:

```bash
./scripts/switch-to-nextauth.sh
```

This will:
- ✅ Backup current Supabase LoginForm
- ✅ Replace with NextAuth LoginForm
- ✅ Keep Supabase version as backup

**Or manually:**
```bash
cd web/src
cp components/auth/LoginForm.nextauth.tsx components/auth/LoginForm.tsx
```

---

### Step 3: Restart and Test (2 minutes)

```bash
# Restart Next.js
cd web
pkill -f "next dev"
npm run dev
```

**Test:**
1. Visit: http://localhost:3000/login
2. Click "Continue with Google"
3. Sign in with @millennia21.id account
4. Verify in database:

```bash
docker compose -f docker-compose.selfhosted.yml exec postgres \
  psql -U reading_buddy -d reading_buddy \
  -c "SELECT email, name, role FROM profiles ORDER BY created_at DESC LIMIT 1;"
```

You should see your Google account in **local PostgreSQL**! 🎉

---

## ✅ Verification Checklist

After switching:

- [ ] Google OAuth credentials added to `.env.local`
- [ ] LoginForm switched to NextAuth version
- [ ] Next.js restarted
- [ ] Login page loads at http://localhost:3000/login
- [ ] "Continue with Google" button appears
- [ ] Click button redirects to Google sign-in
- [ ] After sign-in, redirected to dashboard
- [ ] User appears in local PostgreSQL database
- [ ] Profile auto-created with role=STUDENT

---

## 🎊 What Will Work After Switch

**Using Local Database:**
- ✅ Google OAuth sign-in
- ✅ User creation in local PostgreSQL
- ✅ Profile auto-creation
- ✅ Session management
- ✅ Domain validation (@millennia21.id)

**Still Using Supabase (temporary):**
- ⚠️ Dashboard data queries
- ⚠️ Book management
- ⚠️ Quiz functionality

This is expected! Authentication will use local DB, but app data still uses Supabase until we migrate those queries.

---

## 🔄 Rollback Plan

If something doesn't work, easily revert:

```bash
cd web/src
cp components/auth/LoginForm.supabase.backup.tsx components/auth/LoginForm.tsx
```

Then restart Next.js. You'll be back to Supabase auth.

---

## 📊 Progress After This

| Component | Before | After Switch |
|-----------|--------|--------------|
| **Database** | Local PostgreSQL ✅ | Local PostgreSQL ✅ |
| **Auth Backend** | NextAuth ready ✅ | NextAuth ready ✅ |
| **Google Login** | Supabase ❌ | NextAuth + Local DB ✅ |
| **User Storage** | Supabase cloud ❌ | Local PostgreSQL ✅ |
| **Sessions** | Supabase ❌ | Local PostgreSQL ✅ |
| **Dashboard** | Supabase ⚠️ | Supabase ⚠️ (migration later) |

**Overall Progress:** 45% → **60%** after switch

---

## 🐛 Troubleshooting

### "Google OAuth not working"

**Check credentials:**
```bash
cat web/.env.local | grep GOOGLE_
```

Should show:
```
GOOGLE_CLIENT_ID=XXX.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-XXX
```

**Check redirect URI** in Google Console matches:
```
http://localhost:3000/api/auth/callback/google
```

### "User not in local database"

**Verify PostgreSQL running:**
```bash
docker compose -f docker-compose.selfhosted.yml ps postgres
```

**Check database connection:**
```bash
cat web/.env.local | grep DB_
```

Should show `DB_PORT=5434` and valid password.

### "Error: Cannot find module 'next-auth/react'"

**Install dependencies:**
```bash
cd web
npm install next-auth@beta
```

### "Page keeps loading"

**Check Next.js logs:**
```bash
tail -f /tmp/nextjs-final.log
```

Look for errors related to NextAuth or database connection.

---

## 📝 Summary of Created Files

**New Files Created:**
```
web/src/
├── lib/db/
│   └── index.ts                          ✅ PostgreSQL client
├── app/api/auth/
│   ├── [...nextauth]/route.ts            ✅ NextAuth config
│   └── signup/route.ts                   ✅ Signup API
├── components/
│   ├── auth/LoginForm.nextauth.tsx       ✅ NextAuth login
│   └── providers/NextAuthProvider.tsx    ✅ Session provider
└── types/
    └── next-auth.d.ts                    ✅ TypeScript types

docs/self-hosted/
└── GOOGLE_OAUTH_SETUP.md                 ✅ OAuth setup guide

scripts/
├── switch-to-nextauth.sh                 ✅ Switch script
├── test-auth.sh                          ✅ Test script
└── test-database.sh                      ✅ DB test script
```

**Configuration Files:**
```
sql/self-hosted/                          ✅ 7 SQL files (complete)
docker-compose.selfhosted.yml             ✅ Docker stack
.env.selfhosted.example                   ✅ Env template
```

**Documentation:**
```
SELFHOSTED_STATUS.md                      ✅ Complete status
TESTING_GUIDE.md                          ✅ Test guide
IMPLEMENTATION_STATUS.md                  ✅ Implementation details
NEXT_STEPS.md                             ✅ This file
```

---

## 🎯 After You're Done

Once Google login works with local database, the next phase is:

**Phase 4: Migrate Dashboard Queries (2-4 weeks)**
- Replace Supabase queries with direct PostgreSQL
- Update all `supabase.from()` calls
- Add middleware for RLS context
- Migrate ~50-100 files

But that's for later! **Right now, focus on getting Google login working.** 🚀

---

## 💡 Quick Reference

**Check if PostgreSQL is running:**
```bash
docker compose -f docker-compose.selfhosted.yml ps
```

**Check database has users:**
```bash
docker compose -f docker-compose.selfhosted.yml exec postgres \
  psql -U reading_buddy -d reading_buddy -c "SELECT COUNT(*) FROM users;"
```

**Check Google OAuth credentials:**
```bash
cat web/.env.local | grep GOOGLE_CLIENT_ID
```

**View Next.js logs:**
```bash
tail -100 /tmp/nextjs-final.log
```

**Test NextAuth endpoint:**
```bash
curl http://localhost:3000/api/auth/providers
```

---

## 🎉 Ready to Go!

You're **3 steps away** from having Google login work with your local database:

1. ✅ Get Google OAuth credentials (5 min)
2. ✅ Run switch script (1 min)
3. ✅ Test login (2 min)

Total time: **~10 minutes**

Let me know when you're ready, and I'll help you test it! 🚀

---

**Questions?** Check:
- `SELFHOSTED_STATUS.md` - Detailed status
- `TESTING_GUIDE.md` - How to test
- `docs/self-hosted/GOOGLE_OAUTH_SETUP.md` - OAuth setup

**Need help?** I'm here to assist! 😊
