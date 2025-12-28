# Authentication Architecture: Detailed Comparison

**Date:** 2024-12-15  
**Purpose:** Compare authentication strategies for self-hosted Reading Buddy

---

## The Confusion: Keycloak vs NextAuth.js

**They're not competitors - they serve different roles:**

| Component | Role | Layer |
|-----------|------|-------|
| **Keycloak** | Identity Provider (IdP) | Backend authentication server |
| **NextAuth.js** | Authentication library | Next.js integration layer |

Think of it like this:
- **Keycloak** = Your own "Supabase Auth server"
- **NextAuth.js** = The client library that talks to it (like `@supabase/auth-helpers`)

---

## Architecture Options Compared

### Option 1: NextAuth.js + Keycloak (Recommended in Original Plan)

```
User → Next.js App → NextAuth.js → Keycloak → PostgreSQL
                                      ↓
                                  Google OAuth
```

**Pros:**
- ✅ Separation of concerns (auth server separate from app)
- ✅ Keycloak handles: password hashing, OAuth, email verification, MFA
- ✅ NextAuth.js handles: session management, JWT, cookies
- ✅ Multi-application support (future mobile app, admin panel)
- ✅ Advanced features: User federation, SSO, custom auth flows
- ✅ Admin UI for user management (non-technical admins)

**Cons:**
- ❌ Additional container to run (~512MB RAM)
- ❌ More complex architecture (3 services: DB, Keycloak, App)
- ❌ Learning curve for Keycloak configuration

**Best For:**
- Schools wanting centralized user management
- Future multi-app deployments (mobile, admin portal)
- Enterprises needing SSO/LDAP integration
- Non-technical admins managing users

---

### Option 2: NextAuth.js Alone (Simpler Alternative) ⭐ RECOMMENDED

```
User → Next.js App → NextAuth.js → PostgreSQL
                          ↓
                      Google OAuth
                      Email Provider
```

**How it works:**
- NextAuth.js stores users directly in PostgreSQL
- Built-in OAuth providers (Google, GitHub, etc.)
- Built-in email/password with credential provider
- Session management with JWT or database sessions

**Pros:**
- ✅ **Much simpler** - Only 2 containers (DB + App)
- ✅ **Lower resource usage** - Save ~512MB RAM
- ✅ **Faster deployment** - No Keycloak configuration
- ✅ **Native Next.js integration** - Built for App Router
- ✅ **All core features** - OAuth, email/password, sessions
- ✅ **Email verification** - Built-in with email provider
- ✅ **Password reset** - Built-in token-based flow

**Cons:**
- ❌ No admin UI (manage users via SQL or custom admin panel)
- ❌ No advanced features (user federation, SSO, LDAP)
- ❌ Single application focus

**Best For:**
- Individual schools self-hosting
- Simple deployments
- Resource-constrained environments
- 90% of use cases

---

### Option 3: Custom Auth (Not Recommended)

```
User → Next.js App → Custom Auth Code → PostgreSQL
```

**Pros:**
- ✅ Full control
- ✅ No dependencies

**Cons:**
- ❌ **Security risks** - DIY crypto is dangerous
- ❌ **2-4 weeks development time**
- ❌ **Ongoing maintenance burden**
- ❌ **Missing features** - OAuth, email verification, password reset
- ❌ **No MFA support**

**Verdict:** Don't do this. Use NextAuth.js at minimum.

---

## Detailed Comparison Table

| Feature | Keycloak + NextAuth | NextAuth Alone | Custom Auth |
|---------|---------------------|----------------|-------------|
| **Setup Complexity** | High | Low | Medium |
| **Resource Usage** | High (1.5-2GB RAM) | Low (700MB RAM) | Low |
| **OAuth (Google, etc.)** | ✅ Advanced | ✅ Built-in | ❌ DIY (2-3 days) |
| **Email/Password** | ✅ | ✅ | ❌ DIY (1 week) |
| **Password Hashing** | ✅ bcrypt | ✅ bcrypt | ❌ DIY (risky) |
| **Email Verification** | ✅ | ✅ | ❌ DIY (2 days) |
| **Password Reset** | ✅ | ✅ | ❌ DIY (2 days) |
| **Session Management** | ✅ | ✅ | ❌ DIY (3 days) |
| **Admin UI** | ✅ Beautiful | ❌ None | ❌ None |
| **User Management** | ✅ No-code | 🟡 SQL/API | 🟡 SQL/API |
| **MFA/2FA** | ✅ Built-in | 🟡 Manual integration | ❌ |
| **SSO** | ✅ SAML, OIDC | ❌ | ❌ |
| **LDAP/AD Integration** | ✅ | ❌ | ❌ |
| **User Federation** | ✅ | ❌ | ❌ |
| **Custom Auth Flows** | ✅ | 🟡 Limited | ✅ |
| **Multi-Tenancy** | ✅ Realms | 🟡 DIY | 🟡 DIY |
| **Audit Logs** | ✅ Built-in | 🟡 DIY | 🟡 DIY |
| **Role Management** | ✅ UI | 🟡 Database | 🟡 Database |
| **Production Ready** | ✅ Enterprise-grade | ✅ Battle-tested | ❌ |
| **Development Time** | 2 weeks | 3-5 days | 3-4 weeks |
| **Maintenance** | Medium | Low | High |

---

## NextAuth.js Deep Dive (Recommended Approach)

### Why NextAuth.js is Sufficient

NextAuth.js v5 (Auth.js) provides everything Supabase Auth does:

#### 1. OAuth Providers (20+ built-in)
```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Domain restriction (like Supabase)
      authorization: {
        params: {
          prompt: "select_account",
          hd: "millennia21.id" // Google Workspace domain
        }
      }
    })
  ]
})
```

#### 2. Email/Password (Credentials Provider)
```typescript
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"

export default NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await db.query(
          'SELECT * FROM auth_users WHERE email = $1',
          [credentials.email]
        )
        
        if (!user) return null
        
        const valid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        )
        
        if (!valid) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    })
  ]
})
```

#### 3. Email Verification
```typescript
import Resend from '@auth/core/providers/resend'

export default NextAuth({
  providers: [
    Resend({
      from: "noreply@reads.mws.web.id",
      // Automatically sends magic links for verification
    })
  ],
  
  callbacks: {
    async signIn({ user, account }) {
      // Check if email is verified
      const dbUser = await db.query(
        'SELECT email_verified FROM auth_users WHERE email = $1',
        [user.email]
      )
      
      if (!dbUser.email_verified && account.provider === 'credentials') {
        // Send verification email
        await sendVerificationEmail(user.email)
        return '/verify-email?email=' + user.email
      }
      
      return true
    }
  }
})
```

#### 4. Password Reset
```typescript
// app/api/auth/reset-password/route.ts
import { randomBytes } from 'crypto'
import { sendEmail } from '@/lib/email'

export async function POST(req: Request) {
  const { email } = await req.json()
  
  // Generate reset token
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 3600000) // 1 hour
  
  // Store token
  await db.query(
    'INSERT INTO password_reset_tokens (email, token, expires) VALUES ($1, $2, $3)',
    [email, token, expires]
  )
  
  // Send email
  await sendEmail(email, 'Reset Password', `
    Click here to reset your password:
    ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}
  `)
  
  return Response.json({ success: true })
}
```

#### 5. Session Management
```typescript
export default NextAuth({
  session: {
    strategy: "database", // or "jwt"
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  callbacks: {
    async session({ session, user }) {
      // Add custom fields to session
      const profile = await db.query(
        'SELECT role, grade, access_level FROM profiles WHERE id = $1',
        [user.id]
      )
      
      session.user.role = profile.role
      session.user.grade = profile.grade
      
      return session
    }
  }
})
```

#### 6. Database Schema (NextAuth Tables)

```sql
-- NextAuth required tables
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image TEXT,
  password_hash TEXT, -- for credentials provider
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link to existing profiles table
ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES users(id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

---

## Revised Recommendation: NextAuth.js Only ⭐

### Why This is Better for Most Users

1. **Simplicity**
   - 1 fewer container to manage
   - Faster deployment (30 minutes vs 2 hours)
   - Less configuration

2. **Cost**
   - Saves ~512MB RAM = smaller VPS = $5-10/month savings
   - Recommended VPS: 2GB RAM instead of 4GB

3. **Maintenance**
   - No Keycloak updates to manage
   - Fewer moving parts = fewer failures
   - Simpler backup strategy

4. **Feature Parity with Supabase**
   - ✅ OAuth (Google, GitHub, etc.)
   - ✅ Email/password
   - ✅ Email verification
   - ✅ Password reset
   - ✅ Session management
   - ✅ Role-based access

### Docker Compose (Simplified)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: reading_buddy
      POSTGRES_USER: reading_buddy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U reading_buddy"]
      interval: 10s

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s

  app:
    build: ./web
    environment:
      # Database
      DATABASE_URL: postgresql://reading_buddy:${DB_PASSWORD}@postgres:5432/reading_buddy
      
      # NextAuth
      NEXTAUTH_URL: ${NEXT_PUBLIC_APP_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      
      # OAuth
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      
      # MinIO
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      
      # Email (optional - for password reset)
      EMAIL_SERVER: smtp://user:pass@smtp.gmail.com:587
      EMAIL_FROM: noreply@reads.mws.web.id
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy

volumes:
  postgres_data:
  minio_data:
```

**Total Containers: 3** (was 4 with Keycloak)  
**Total RAM: ~1GB** (was ~2GB with Keycloak)

---

## When to Use Keycloak Instead

### Use Keycloak if you need:

1. **Admin UI for User Management**
   - Non-technical staff managing users
   - Bulk user operations
   - User import/export

2. **Enterprise Features**
   - SSO (Single Sign-On) across multiple apps
   - LDAP/Active Directory integration
   - SAML authentication
   - User federation

3. **Multi-Application Architecture**
   - Mobile app + web app + admin panel
   - All sharing same user base
   - Centralized auth server

4. **Advanced Security**
   - Custom authentication flows
   - Step-up authentication
   - Passwordless authentication (WebAuthn)
   - Device management

5. **Compliance Requirements**
   - GDPR user data export
   - Detailed audit logs
   - Fine-grained access control

### Realistic Assessment

**For Reading Buddy self-hosted:**
- 90% of users: **NextAuth.js is sufficient**
- 10% of users: **Keycloak adds value** (large schools, districts)

**For Reading Buddy SaaS (your managed offering):**
- Consider Keycloak for **multi-tenant architecture**
- Each school = separate Keycloak realm
- Centralized user management for support team

---

## Hybrid Approach (Best of Both Worlds)

### Start with NextAuth.js, Keep Keycloak Optional

```typescript
// lib/auth/adapter.ts
export interface AuthAdapter {
  signIn(email: string, password: string): Promise<AuthResult>
  signOut(): Promise<void>
  getSession(): Promise<Session | null>
}

// Default: NextAuth implementation
export class NextAuthAdapter implements AuthAdapter {
  async signIn(email: string, password: string) {
    return signIn("credentials", { email, password })
  }
}

// Optional: Keycloak implementation (for enterprise users)
export class KeycloakAdapter implements AuthAdapter {
  async signIn(email: string, password: string) {
    return keycloak.login({ username: email, password })
  }
}

// Factory pattern
export function getAuthAdapter(): AuthAdapter {
  const authProvider = process.env.AUTH_PROVIDER || 'nextauth'
  
  if (authProvider === 'keycloak') {
    return new KeycloakAdapter()
  }
  
  return new NextAuthAdapter() // Default
}
```

**Configuration:**
```bash
# .env
AUTH_PROVIDER=nextauth  # or 'keycloak' for enterprise deployments
```

---

## Final Recommendation

### For Your Use Case:

**Self-Hosted (Open Source):**
```
✅ Use NextAuth.js only
- Simpler for end users
- Lower resource requirements
- Faster deployment
- 90% feature parity with Supabase Auth
```

**Managed SaaS:**
```
🤔 Consider Keycloak for multi-tenancy
- Centralized user management across schools
- Admin UI for support team
- Advanced features for enterprise customers
- OR stick with Supabase Auth (already working)
```

### Revised Architecture

```
┌─────────────────────────────────────────────┐
│          Reading Buddy Ecosystem             │
├─────────────────────────────────────────────┤
│                                               │
│  Self-Hosted (Free)      Managed SaaS (Paid) │
│  ─────────────────       ─────────────────   │
│  PostgreSQL              Supabase            │
│  NextAuth.js       OR    Supabase Auth       │
│  MinIO                   MinIO/S3            │
│  Next.js                 Next.js             │
│                                               │
│  Optional Add-on:                             │
│  Keycloak (for enterprise self-hosted users) │
│                                               │
└─────────────────────────────────────────────┘
```

---

## Implementation Complexity

### NextAuth.js Migration (3-5 days)

**Day 1:**
- Install NextAuth.js
- Set up database adapter
- Configure Google OAuth

**Day 2:**
- Implement credentials provider (email/password)
- Add email verification flow
- Test authentication flows

**Day 3:**
- Implement password reset
- Add session management
- Update middleware for RLS

**Day 4:**
- Migrate existing users from Supabase
- Test all auth flows end-to-end

**Day 5:**
- Documentation
- Deployment testing

### Keycloak Migration (2 weeks)

**Week 1:**
- Deploy Keycloak
- Configure realm and clients
- Set up Google OAuth
- Configure email settings
- User migration scripts

**Week 2:**
- NextAuth.js + Keycloak integration
- Testing all flows
- Admin UI customization
- Documentation

---

## Cost Comparison

### Self-Hosted Infrastructure

**NextAuth.js Stack:**
- VPS: 2GB RAM, 2 CPU, 50GB SSD = **$12-18/month**
- Domain: $12/year
- Email (SendGrid free tier)
- **Total: ~$15-20/month**

**Keycloak Stack:**
- VPS: 4GB RAM, 2 CPU, 80GB SSD = **$24-40/month**
- Domain: $12/year
- Email (SendGrid free tier)
- **Total: ~$27-45/month**

**Savings with NextAuth.js: $12-25/month**

---

## Conclusion

### The Answer to "Why Keycloak?"

**Short Answer:** You probably don't need it. Use **NextAuth.js only** for 90% of use cases.

**Long Answer:**
- **Keycloak** = Enterprise features most users won't use
- **NextAuth.js** = All the features Supabase Auth provides
- **Keycloak** makes sense for large deployments, multi-app ecosystems, or SSO requirements

### Updated Recommendation

**Self-Hosted Version:**
```
PostgreSQL + NextAuth.js + MinIO
- Simpler
- Cheaper  
- Faster to deploy
- Sufficient for 90% of users
```

**Optional Enterprise Add-on:**
```
Add Keycloak for schools needing:
- Admin UI
- SSO/LDAP
- Multi-app architecture
```

---

**Document Version:** 1.0  
**Recommendation:** NextAuth.js as default, Keycloak as optional enterprise add-on  
**Author:** Development Team  
**Status:** Final Recommendation
