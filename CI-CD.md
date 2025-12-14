# CI/CD Pipeline - Complete Documentation

## Overview

This project uses a comprehensive CI/CD pipeline with automated testing, building, and deployment for both staging and production environments.

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
┌─────────────────────────────────────────────────────────┐
│ GitHub Actions CI/CD                                    │
│  ├─ ESLint (code quality)                              │
│  ├─ TypeScript check (type safety)                     │
│  ├─ Vitest tests with coverage (unit tests)            │
│  ├─ Upload coverage to Codecov                         │
│  ├─ Playwright E2E tests (user flows)                  │
│  ├─ Build Next.js (for Lighthouse)                     │
│  ├─ Lighthouse CI (performance, a11y, SEO)             │
│  ├─ Build Docker image (only if all tests pass ✅)     │
│  ├─ Push to GHCR with multi-tags                       │
│  └─ Trigger Komodo Procedure webhook                   │
└─────────────────────────────────────────────────────────┘
    ↓
Komodo Procedure (Orchestration)
    ├─ Receives webhook from GitHub Actions
    ├─ Validates GitHub signature
    └─ Triggers Stack deployment
    ↓
Komodo Stack (Deployment)
    ├─ Pulls new image from GHCR
    ├─ Restarts container
    └─ Health check verification
    ↓
Live Application 🚀
```

## Environments

### Staging Environment
- **Branch:** `staging`
- **URL:** https://staging-reads.mws.web.id
- **Port:** 3001
- **Image:** `ghcr.io/faisalnh/reading-companion-staging:latest`
- **Auto-deploy:** ✅ On every push to staging

### Production Environment
- **Branch:** `main`
- **URL:** https://reads.mws.web.id
- **Port:** 3000
- **Image:** `ghcr.io/faisalnh/reading-companion:latest`
- **Auto-deploy:** ✅ On every push/merge to main
- **Protection:** Branch protection rules enabled

## Components

### 1. Local Pre-Commit Hooks (Husky + lint-staged)

**Location:** `web/.husky/pre-commit`

**What it does:**
- Runs automatically before every `git commit`
- Lints and formats only staged files
- Fixes auto-fixable issues
- **Blocks commit** if there are errors

**Installed Packages:**
- ✅ Husky (Git hooks manager)
- ✅ lint-staged (Run linters on staged files)

**Configuration in `web/package.json`:**
```json
{
  "scripts": {
    "prepare": "cd .. && husky web/.husky"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

**Usage:**
```bash
git add .
git commit -m "feat: new feature"
# → Pre-commit hook runs automatically
# → If ESLint passes, commit succeeds ✅
# → If ESLint fails, commit is blocked ❌
```

### 2. GitHub Actions Workflows

#### Staging Workflow

**File:** `.github/workflows/staging.yml`

**Triggers:** Push to `staging` branch

**Jobs:**
1. **Test and Build**
   - Checkout code
   - Setup Node.js 20
   - Install dependencies
   - Run ESLint
   - Run TypeScript type checking
   - Run Vitest unit tests
   - Login to GHCR (GitHub Container Registry)
   - Build Docker image with multi-tags
   - Push to GHCR
   - Trigger Komodo Procedure webhook (auto-deploy)

**Image Tags Created:**
```
ghcr.io/faisalnh/reading-companion-staging:latest
ghcr.io/faisalnh/reading-companion-staging:build-<run_number>
ghcr.io/faisalnh/reading-companion-staging:staging-<sha>
ghcr.io/faisalnh/reading-companion-staging:staging-<timestamp>
```

#### Production Workflow

**File:** `.github/workflows/production.yml`

**Triggers:** Push to `main` branch

**Jobs:** Same as staging, but with additional semantic versioning support

**Image Tags Created:**
```
ghcr.io/faisalnh/reading-companion:latest
ghcr.io/faisalnh/reading-companion:build-<run_number>
ghcr.io/faisalnh/reading-companion:v1.0.0 (if tagged)
ghcr.io/faisalnh/reading-companion:1.0
ghcr.io/faisalnh/reading-companion:1
ghcr.io/faisalnh/reading-companion:main-<sha>
ghcr.io/faisalnh/reading-companion:prod-<timestamp>
```

### 3. Komodo Procedures (Webhook Automation)

**Purpose:** Orchestrate deployment after successful CI/CD build

#### Staging Procedure

**Name:** `Deploy Staging Stack`

**Configuration:**
- **Auth style:** GitHub
- **Listen on branch:** `staging`
- **Webhook Enabled:** ✅
- **Webhook Secret:** Custom secret (stored in GitHub Actions)
- **Webhook URL:** `https://komo.mws.web.id/listener/github/procedure/<id>`

**Action:**
- Deploy Stack → `reading-companion-staging`

#### Production Procedure

**Name:** `Deploy Production Stack`

**Configuration:**
- **Auth style:** GitHub
- **Listen on branch:** `main`
- **Webhook Enabled:** ✅
- **Webhook Secret:** Custom secret (separate from staging)
- **Webhook URL:** `https://komo.mws.web.id/listener/github/procedure/<id>`

**Action:**
- Deploy Stack → `reading-companion-prod`

### 4. Komodo Stacks (Deployment Configuration)

#### Staging Stack

**Name:** `reading-companion-staging`

**Docker Compose:**
```yaml
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
      - SUPABASE_SERVICE_ROLE_KEY=<secret>
      - MINIO_ENDPOINT=minioapi.mws.web.id
      - MINIO_PORT=443
      - MINIO_USE_SSL=true
      - MINIO_ACCESS_KEY=<secret>
      - MINIO_SECRET_KEY=<secret>
      - MINIO_BUCKET_NAME=reading-buddy
      - AI_PROVIDER=local
      - GEMINI_API_KEY=<secret>
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
```

#### Production Stack

**Name:** `reading-companion-prod`

**Docker Compose:** Same as staging with these changes:
- Image: `ghcr.io/faisalnh/reading-companion:latest`
- Container: `reading-buddy-prod`
- Port: `3000:3000`
- App URL: `https://reads.mws.web.id`
- Network: `reading-buddy-prod-network`

## GitHub Secrets Configuration

Required secrets in GitHub repository settings:

| Secret Name | Purpose | Used In |
|-------------|---------|---------|
| `GHCR_PAT` | GitHub Personal Access Token for GHCR push | Both workflows |
| `KOMODO_PROCEDURE_WEBHOOK_URL` | Staging procedure webhook URL | Staging workflow |
| `KOMODO_WEBHOOK_SECRET` | Staging webhook signature secret | Staging workflow |
| `KOMODO_PROD_PROCEDURE_WEBHOOK_URL` | Production procedure webhook URL | Production workflow |
| `KOMODO_PROD_WEBHOOK_SECRET` | Production webhook signature secret | Production workflow |
| `CODECOV_TOKEN` | Codecov upload token (optional for public repos) | Both workflows |
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub integration (optional) | Both workflows |

## Workflow Process

### Staging Deployment Flow

```bash
# 1. Developer makes changes
vim src/app/page.tsx

# 2. Stage and commit (pre-commit runs)
git add .
git commit -m "feat: add new feature"
# → ESLint + Prettier run automatically
# → Commit blocked if errors ❌

# 3. Push to staging
git push origin staging

# 4. GitHub Actions CI/CD (5-7 min)
# → ESLint ✅
# → TypeScript check ✅
# → Vitest tests ✅
# → Docker build ✅
# → Push to GHCR ✅
# → Webhook to Komodo ✅

# 5. Komodo auto-deploys (30 sec)
# → Procedure receives webhook
# → Validates signature
# → Triggers stack deployment
# → Pulls new image
# → Restarts container
# → Health check passes ✅

# 6. Live on staging!
# → https://staging-reads.mws.web.id
```

**Total Time:** ~8-12 minutes from push to live (including E2E and Lighthouse tests)

### Production Deployment Flow

```bash
# 1. Staging is tested and working ✅

# 2. Merge staging to main
git checkout main
git pull origin main
git merge staging --no-ff -m "chore: Release v1.2.0"
git push origin main

# 3. Same CI/CD process as staging
# → All tests run again
# → Production image built
# → Tagged with semver (if release tagged)
# → Auto-deployed to production

# 4. Live on production!
# → https://reads.mws.web.id
```

## Best Practices Implemented

### ✅ Quality Gates
- **Local:** Pre-commit hooks catch issues before commit
- **CI:** Automated tests must pass before build
- **Deployment:** Health checks verify successful deployment

### ✅ Environment Separation
- **Staging:** Test new features safely
- **Production:** Protected branch, requires review

### ✅ Image Versioning
- Multiple tags for flexibility
- Build numbers for tracking
- SHA for exact commit identification
- Timestamps for auditing
- Semantic versions for releases

### ✅ Security
- Webhook signatures for authentication
- Separate secrets per environment
- Service role keys stored as secrets
- No hardcoded credentials in code

### ✅ Automation
- Zero manual deployment steps
- Automatic rollback via health checks
- Consistent deployment process

### ✅ Observability
- GitHub Actions logs
- Komodo Procedure execution logs
- Container health monitoring
- Build numbers for tracking

## Branch Protection (Production)

**Recommended settings for `main` branch:**

Go to GitHub → Settings → Branches → Add rule for `main`

```
✅ Require a pull request before merging
   - Required approvals: 1
   
✅ Require status checks to pass before merging
   - Required checks: Test and Build
   - ✅ Require branches to be up to date
   
✅ Require conversation resolution before merging

❌ Allow force pushes (disabled)
❌ Allow deletions (disabled)
```

## Development Workflow

### Working on New Features

```bash
# 1. Create feature branch from staging
git checkout staging
git pull origin staging
git checkout -b feature/new-feature

# 2. Develop and test locally
npm run dev

# 3. Commit (pre-commit runs)
git add .
git commit -m "feat: implement new feature"

# 4. Push feature branch
git push origin feature/new-feature

# 5. Merge to staging via PR (or direct)
git checkout staging
git merge feature/new-feature
git push origin staging
# → Auto-deploys to staging

# 6. Test on staging
# → https://staging-reads.mws.web.id

# 7. When ready, merge staging to main
git checkout main
git merge staging
git push origin main
# → Auto-deploys to production
```

### Hotfixes

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix the issue
vim src/app/buggy-file.tsx

# 3. Commit and push
git add .
git commit -m "fix: critical bug in production"
git push origin hotfix/critical-bug

# 4. Merge to main
git checkout main
git merge hotfix/critical-bug
git push origin main
# → Auto-deploys to production

# 5. Also merge back to staging
git checkout staging
git merge main
git push origin staging
```

## Image Versioning Strategy

See [VERSIONING.md](./VERSIONING.md) for complete versioning documentation.

### Quick Reference

**Staging tags:**
```
:latest                    - Always newest staging build
:build-123                 - Specific build number
:staging-abc123            - Git commit SHA
:staging-2025-12-14-1530   - Timestamp
```

**Production tags:**
```
:latest                    - Always newest production build
:build-456                 - Specific build number
:v1.2.3                    - Semantic version (if tagged)
:1.2                       - Major.Minor version
:1                         - Major version only
:main-abc123               - Git commit SHA
:prod-2025-12-14-1530      - Timestamp
```

### Using Specific Versions

**In Komodo Stack, you can pin to specific versions:**

```yaml
# Use latest (auto-updates)
image: ghcr.io/faisalnh/reading-companion:latest

# Pin to specific build (manual updates)
image: ghcr.io/faisalnh/reading-companion:build-123

# Pin to release version
image: ghcr.io/faisalnh/reading-companion:v1.2.3
```

## Monitoring and Troubleshooting

### Check CI/CD Status

**GitHub Actions:**
- View all workflows: https://github.com/faisalnh/reading-companion/actions
- Check specific run for errors
- View build logs

**Komodo Procedures:**
- Go to Procedures → Select procedure
- View execution history
- Check logs for webhook triggers

**Komodo Stacks:**
- Go to Stacks → Select stack
- View deployment history
- Check container logs
- Monitor health checks

### Common Issues

#### Tests Failing in CI

```bash
# Run tests locally first
cd web
npm run test
npm run type-check
npm run lint
```

#### Webhook Not Triggering Deployment

**Check:**
1. Webhook URL is correct in GitHub secrets
2. Webhook secret matches between GitHub and Komodo
3. Komodo Procedure is enabled
4. Branch name matches (staging/main)
5. View webhook delivery in Komodo Procedure logs

#### Image Not Pulling

**Check:**
1. Image was successfully pushed to GHCR
2. Image tag is correct in Stack compose
3. GHCR authentication (should be public, no auth needed)
4. Network connectivity from Komodo to GHCR

#### Container Not Starting

**Check:**
1. Container logs in Komodo
2. Environment variables are set correctly
3. Health check is passing
4. Port conflicts

### Rollback Procedure

**Quick Rollback (use previous build):**

```yaml
# In Komodo Stack, change image tag
image: ghcr.io/faisalnh/reading-companion:build-122  # previous build

# Then redeploy
```

**Full Rollback (revert code):**

```bash
# Find the commit to rollback to
git log --oneline

# Revert to previous commit
git revert <commit-sha>
git push origin main
# → CI/CD will build and deploy the reverted code
```

## Performance Metrics

**Typical Timeline:**

| Stage | Time |
|-------|------|
| Pre-commit hooks | 5-10 seconds |
| ESLint + TypeScript check | 30-60 seconds |
| Unit tests + coverage | 1-2 minutes |
| E2E tests (Playwright) | 2-3 minutes |
| Lighthouse CI | 2-3 minutes |
| Docker build | 2-3 minutes |
| Push to GHCR | 30 seconds |
| Webhook trigger | Instant |
| Komodo pull + deploy | 30-60 seconds |
| **Total** | **~10-15 minutes** |

## Cost Breakdown

| Component | Cost |
|-----------|------|
| Husky/lint-staged | FREE (local) |
| GitHub Actions | FREE (2,000 min/month) |
| GHCR | FREE (unlimited public images) |
| Komodo | Self-hosted (your server) |
| **Total** | **$0/month** 💰 |

## Benefits Summary

### ✅ Speed
- Fast local feedback (pre-commit)
- Automated deployment (no manual steps)
- 8-10 minutes from commit to live

### ✅ Quality
- Multiple testing layers
- Type safety enforced
- Code formatting automatic
- Can't deploy broken code

### ✅ Safety
- Staging environment for testing
- Branch protection on production
- Health checks verify deployment
- Easy rollback with versioned images

### ✅ Developer Experience
- One command to deploy: `git push`
- Clear workflow process
- Instant feedback on errors
- No context switching

### ✅ Cost Effective
- Completely free
- Uses GitHub's infrastructure
- Self-hosted deployment

## Quality Metrics and Monitoring

### Code Coverage (Codecov)

**What it does:**
- Tracks test coverage across the codebase
- Shows which code is tested and which isn't
- Provides coverage trends over time
- Generates detailed coverage reports

**Configuration:**
- Provider: Vitest with v8 coverage
- Reporters: Text, JSON, HTML
- Excluded: Config files, types, e2e tests
- Upload: Codecov (free for public repos)

**Coverage Thresholds:**
Current setup uses informational tracking (no hard failures).

**View Coverage:**
- Reports uploaded as GitHub Actions artifacts
- Codecov dashboard: https://codecov.io/gh/faisalnh/reading-companion
- Trends and historical data available

**Setup Required:**
1. Sign up at https://codecov.io with GitHub
2. Add repository to Codecov
3. Get Codecov token
4. Add `CODECOV_TOKEN` to GitHub secrets

### Lighthouse CI (Performance Monitoring)

**What it does:**
- Measures performance, accessibility, best practices, and SEO
- Runs on every build before deployment
- Provides detailed performance reports
- Tracks performance regressions

**Configuration:** `web/lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "onlyCategories": ["performance", "accessibility", "best-practices", "seo"]
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", {"minScore": 0.8}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["warn", {"minScore": 0.8}],
        "categories:seo": ["warn", {"minScore": 0.8}]
      }
    }
  }
}
```

**Quality Thresholds:**
- **Performance:** ≥80% (warning if below)
- **Accessibility:** ≥90% (error if below, blocks deployment)
- **Best Practices:** ≥80% (warning if below)
- **SEO:** ≥80% (warning if below)

**Reports:**
- Uploaded as GitHub Actions artifacts
- Temporary public storage link provided
- View detailed metrics, suggestions, and screenshots

**Benefits:**
- Catch performance regressions early
- Ensure accessibility compliance (WCAG)
- Maintain SEO optimization
- Monitor Core Web Vitals

### E2E Test Coverage (Playwright)

**Tests Included:**
- `auth.spec.ts` - Authentication flows
- `homepage.spec.ts` - Homepage functionality
- `dashboard.spec.ts` - Dashboard features

**Browser Coverage:**
- Chromium (primary for CI speed)

**Reports:**
- HTML report generated on test failure
- Uploaded as GitHub Actions artifacts
- Screenshots and traces captured

## Future Enhancements

### Potential Additions

1. ~~**End-to-End Tests**~~ ✅ **IMPLEMENTED**
   - Playwright E2E tests running in CI
   - Test critical user flows

2. ~~**Code Coverage**~~ ✅ **IMPLEMENTED**
   - Vitest coverage tracking
   - Codecov integration

3. ~~**Performance Testing**~~ ✅ **IMPLEMENTED**
   - Lighthouse CI for performance metrics
   - Quality thresholds enforced

4. **Deployment Notifications**
   - Slack/Discord notifications
   - Email on deployment success/failure

5. **Automated Rollback**
   - Automatic rollback on health check failures
   - Canary deployments

6. **Database Migrations**
   - Automated migration running
   - Rollback support

## References

- [VERSIONING.md](./VERSIONING.md) - Image versioning strategy
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Komodo Documentation](https://komo.do/docs)
- [Docker Build Documentation](https://docs.docker.com/build/)

---

**Last Updated:** 2025-12-14
**Maintained By:** DevOps Team
**Status:** ✅ Production Ready
