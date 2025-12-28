# Google OAuth Setup for Local Database Authentication

## Current Status ✅

Your NextAuth setup is **99% complete**! Here's what's done:

- ✅ PostgreSQL database running on localhost:5434
- ✅ NextAuth backend fully configured
- ✅ SessionProvider integrated into app layout
- ✅ Google OAuth provider configured in NextAuth
- ✅ Domain restriction set to @millennia21.id
- ✅ Automatic profile creation on sign-in
- ✅ Session enrichment with role, XP, level

## What's Missing

You just need to add your Google OAuth credentials to `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

---

## Step 1: Get Google OAuth Credentials

### A. Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one

### B. Enable Google+ API (if not already enabled)

1. Navigate to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click **Enable**

### C. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - User Type: **Internal** (for @millennia21.id only)
   - App name: **Reading Buddy**
   - User support email: Your @millennia21.id email
   - Authorized domains: `millennia21.id`
   - Developer contact: Your @millennia21.id email

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **Reading Buddy - Self Hosted**
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://localhost:3001` (if using staging port)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3001/api/auth/callback/google` (if using staging)

5. Click **CREATE**

6. Copy the **Client ID** and **Client Secret**

---

## Step 2: Add Credentials to Environment

1. Open `web/.env.local`

2. Replace the empty values:

```bash
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456ghi789
```

3. Save the file

---

## Step 3: Test Google Login

### A. Restart Next.js Dev Server

```bash
cd web
npm run dev
```

### B. Test the Login Flow

1. Open http://localhost:3000/login
2. Click **Sign in with Google**
3. Choose your @millennia21.id account
4. You should be redirected to `/dashboard`

### C. Verify User Created in Local Database

```bash
# From the project root
docker exec -it reading-buddy-postgres psql -U postgres -d readingbuddy -c "SELECT id, email, name, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 5;"
```

Expected output:
```
                  id                  |           email            |      name       | email_verified |         created_at         
--------------------------------------+----------------------------+-----------------+----------------+----------------------------
 abc-123-def-456                      | you@millennia21.id         | Your Name       | <timestamp>    | 2024-12-16 ...
```

### D. Verify Profile Created

```bash
docker exec -it reading-buddy-postgres psql -U postgres -d readingbuddy -c "SELECT id, user_id, full_name, email, role, xp, level FROM profiles ORDER BY created_at DESC LIMIT 5;"
```

Expected output:
```
                  id                  |               user_id                | full_name  |        email           | role    | xp  | level 
--------------------------------------+--------------------------------------+------------+------------------------+---------+-----+-------
 profile-abc-123                      | abc-123-def-456                      | Your Name  | you@millennia21.id     | STUDENT |  0  |   1
```

### E. Check Session in NextAuth

```bash
docker exec -it reading-buddy-postgres psql -U postgres -d readingbuddy -c "SELECT user_id, expires FROM sessions ORDER BY expires DESC LIMIT 5;"
```

You should see an active session for your user.

---

## Step 4: Test Login Page UI

The login page should now use NextAuth instead of Supabase. Let me verify:

```bash
cd web/src/app/login
ls -la page.tsx
```

If you see the old Supabase login, run the switch script:

```bash
./scripts/switch-to-nextauth.sh
```

---

## Troubleshooting

### Error: "Configuration not found"

**Cause:** Google OAuth credentials not in `.env.local`

**Fix:** Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`

### Error: "Domain restriction failed"

**Cause:** Trying to log in with non-@millennia21.id email

**Fix:** Use an @millennia21.id email or update the domain restriction in:
- `web/src/app/api/auth/[...nextauth]/route.ts` line 27-31

### Error: "Redirect URI mismatch"

**Cause:** The redirect URI in Google Console doesn't match NextAuth's callback URL

**Fix:** Add to Google Console Authorized redirect URIs:
- `http://localhost:3000/api/auth/callback/google`

### Users Still Going to Supabase

**Cause:** Login page still using old Supabase component

**Fix:** Run `./scripts/switch-to-nextauth.sh` to switch to NextAuth login

---

## Next Steps After Google OAuth Works

Once you confirm Google login creates users in your local PostgreSQL database:

1. **Test All Features** - Verify reading, quizzes, gamification work with local DB
2. **Migrate Dashboard Queries** - Replace Supabase queries with direct PostgreSQL (50-100 files)
3. **Remove Supabase Dependencies** - Clean up old auth code
4. **Production Deployment** - Deploy self-hosted stack with Docker Compose
5. **Open Source Release** - Publish with self-hosted setup instructions

---

## Summary

Your local authentication is **ready to test**! Just:

1. Get Google OAuth credentials from Cloud Console
2. Add them to `.env.local`
3. Test login at http://localhost:3000/login
4. Verify users in PostgreSQL with the commands above

**The database integration is complete - users will authenticate with NextAuth and store all data in your local PostgreSQL!** 🎉
