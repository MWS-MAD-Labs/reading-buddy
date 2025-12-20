# Google OAuth Setup for Self-Hosted NextAuth

## Quick Setup Guide

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/apis/credentials
2. Select your project (or create a new one)

### Step 2: Create OAuth 2.0 Client ID

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Application type: **"Web application"**
3. Name: `Reading Buddy Self-Hosted`

### Step 3: Configure Authorized Redirect URIs

Add these URIs:

**For Development (localhost):**
```
http://localhost:3000/api/auth/callback/google
```

**For Production (when deploying):**
```
https://reads.mws.web.id/api/auth/callback/google
https://staging-reads.mws.web.id/api/auth/callback/google
```

### Step 4: Get Credentials

After creating, you'll see:
- **Client ID**: `XXXXXX.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-XXXXXX`

### Step 5: Add to Environment

Add to `web/.env.local`:

```bash
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret-here
```

### Step 6: Configure Domain Restriction (Optional)

If you want to restrict to @millennia21.id only:

1. In Google Cloud Console
2. Go to **OAuth consent screen**
3. Under **"Authorized domains"**, add: `millennia21.id`

The NextAuth configuration already has domain validation built-in!

---

## Using Existing Credentials

**If you already have Google OAuth credentials** from Supabase:

You can **create a new OAuth client** in the same project, or **add the new redirect URI** to existing credentials:

1. Go to your existing OAuth client
2. Under **"Authorized redirect URIs"**, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
3. Save changes
4. Use the same Client ID and Secret

---

## Testing

After adding credentials to `.env.local`:

1. Restart Next.js: `npm run dev`
2. Visit: http://localhost:3000/api/auth/signin
3. Click Google provider
4. Sign in with @millennia21.id account
5. Check local database:
   ```bash
   docker compose -f docker-compose.selfhosted.yml exec postgres \
     psql -U reading_buddy -d reading_buddy \
     -c "SELECT email, name FROM users ORDER BY created_at DESC LIMIT 1;"
   ```

You should see the user in **local PostgreSQL**! 🎉
