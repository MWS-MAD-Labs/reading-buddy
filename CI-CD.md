# CI/CD Setup - Option 1: Local Pre-Commit + GitHub Actions

## Architecture

```
Local Development (Your PC)
    ↓
Pre-Commit Hook (Automatic)
    ├─ ESLint --fix
    ├─ Prettier
    └─ Blocks commit if fails ❌
    ↓
Commit & Push to GitHub
    ↓
GitHub Actions CI/CD
    ├─ ESLint
    ├─ TypeScript check  
    ├─ Vitest tests
    ├─ Build Docker image (only if tests pass)
    └─ Push to GHCR
    ↓
Komodo Stack
    └─ Auto-deploy new image
```

## Components

### 1. Local Pre-Commit Hooks (Husky + lint-staged)

**What it does:**
- Runs automatically before every `git commit`
- Lints and formats only staged files
- Fixes auto-fixable issues
- **Blocks commit** if there are errors

**Installed:**
- ✅ Husky (Git hooks manager)
- ✅ lint-staged (Run linters on staged files)

**Configuration:**
- `.husky/pre-commit` - Hook script
- `package.json` - lint-staged config

**Usage:**
```bash
git add .
git commit -m "feat: new feature"
# → Pre-commit hook runs automatically
# → If ESLint passes, commit succeeds
# → If ESLint fails, commit is blocked
```

### 2. GitHub Actions CI/CD

**Workflow:** `.github/workflows/staging.yml`

**What it does:**
1. **Test Phase:**
   - ESLint (redundant but safe)
   - TypeScript check
   - Vitest tests

2. **Build Phase** (only if tests pass):
   - Build Docker image
   - Push to `ghcr.io/faisalnh/reading-companion-staging:latest`

**Triggers:** Every push to `staging` branch

### 3. Komodo Stack (Deployment Only)

**Configuration:**
```toml
[[stack]]
name = "reading-companion-staging"
[stack.config]
server = "Local"
poll_for_updates = true
auto_update = true
file_contents = """
services:
  reading-buddy-staging:
    image: ghcr.io/faisalnh/reading-companion-staging:latest
    pull_policy: always
    # ... environment variables
"""
```

**What it does:**
- Polls GHCR for new images
- Auto-pulls and redeploys
- **No building** - just deployment

## Workflow

### Developer Experience

```bash
# 1. Make changes
vim src/app/page.tsx

# 2. Stage changes
git add .

# 3. Commit (pre-commit hook runs)
git commit -m "feat: new feature"
# → ESLint runs automatically
# → Prettier formats code
# → If errors: commit blocked ❌
# → If success: commit created ✅

# 4. Push to GitHub
git push origin staging
# → GitHub Actions triggered
# → Tests run (2-3 min)
# → Image built (2-3 min)
# → Pushed to GHCR

# 5. Komodo auto-deploys (~30 sec)
# → Total: ~5-7 minutes
```

## Benefits

### ✅ Fast Local Feedback
- Catch errors **before** committing
- Auto-fix formatting issues
- Save time (no waiting for CI)

### ✅ Quality Gate
- Can't commit broken code
- All tests run in CI
- Only working code gets deployed

### ✅ Consistent Environment
- GitHub Actions = same environment every time
- No "works on my machine"

### ✅ Simple Deployment
- Komodo just deploys (no building)
- Faster, more reliable

### ✅ Free
- GitHub Actions: FREE
- GHCR: FREE
- Total cost: $0/month

## Komodo Setup

### Remove Komodo Build

You **no longer need** the Komodo Build:
- Delete `reading-companion-staging` build in Komodo
- GitHub Actions handles all building

### Updated Stack Config

```toml
[[stack]]
name = "reading-companion-staging"
[stack.config]
server = "Local"
poll_for_updates = true   # ← Auto-detect new images
auto_update = true         # ← Auto-deploy
file_contents = """
services:
  reading-buddy-staging:
    image: ghcr.io/faisalnh/reading-companion-staging:latest
    container_name: reading-buddy-staging
    restart: unless-stopped
    pull_policy: always
    
    ports:
      - "3001:3000"
    
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_PUBLIC_APP_URL=https://staging-reads.mws.web.id
      - NEXT_PUBLIC_RAG_API_URL=https://rag.mws.web.id/
      - NEXT_PUBLIC_SUPABASE_URL=https://hbrosmlrvbkmcbyggriv.supabase.co
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      - SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      - MINIO_ENDPOINT=minioapi.mws.web.id
      - MINIO_PORT=443
      - MINIO_USE_SSL=true
      - MINIO_ACCESS_KEY=mwsaccesskey
      - MINIO_SECRET_KEY=mwssecretkey
      - MINIO_BUCKET_NAME=reading-buddy
      - AI_PROVIDER=local
      - GEMINI_API_KEY=AIzaSyCUY_cwzoQ07qQuSu_ic63Zp6LF-ZZ0Z1s
      - RAG_API_URL=http://172.16.0.65:8010
      - DIFFUSER_API_URL=http://172.16.0.165:8000
      - OLLAMA_API_URL=https://ollama.mws.web.id
    
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    networks:
      - reading-buddy-staging-network

networks:
  reading-buddy-staging-network:
    driver: bridge
"""
```

## Troubleshooting

### Pre-commit hook not running?

```bash
cd web
npm run prepare
```

### Want to skip pre-commit hook (not recommended)?

```bash
git commit --no-verify -m "message"
```

### GitHub Actions failing?

Check: https://github.com/faisalnh/reading-companion/actions

## Timeline

```
Make change → Commit (instant) → Push → CI (5 min) → Deploy (30s)
              ↑
         Pre-commit runs
         (catches errors locally)
```

## Cost Breakdown

- **Husky/lint-staged:** FREE (local)
- **GitHub Actions:** FREE (2,000 min/month)
- **GHCR:** FREE (500MB public repos)
- **Komodo:** Self-hosted (your server)

**Total: $0/month** 💰
