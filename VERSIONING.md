# Image Versioning Strategy

## Overview

Our CI/CD pipeline creates multiple image tags for flexibility in deployment and rollback.

## Staging Tags

Every push to `staging` branch creates:

| Tag Pattern | Example | Purpose | Mutable |
|------------|---------|---------|---------|
| `latest` | `ghcr.io/faisalnh/reading-companion-staging:latest` | Always latest staging | ✅ Yes |
| `build-{n}` | `ghcr.io/faisalnh/reading-companion-staging:build-123` | Build number | ❌ No |
| `staging-{sha}` | `ghcr.io/faisalnh/reading-companion-staging:staging-abc1234` | Git commit | ❌ No |
| `staging-{date}` | `ghcr.io/faisalnh/reading-companion-staging:staging-2025-12-13-0930` | Timestamp | ❌ No |

## Production Tags

### From Branch Pushes

Every push to `main` branch creates:

| Tag Pattern | Example | Purpose | Mutable |
|------------|---------|---------|---------|
| `latest` | `ghcr.io/faisalnh/reading-companion:latest` | Latest production | ✅ Yes |
| `build-{n}` | `ghcr.io/faisalnh/reading-companion:build-456` | Build number | ❌ No |
| `main-{sha}` | `ghcr.io/faisalnh/reading-companion:main-abc1234` | Git commit | ❌ No |
| `prod-{date}` | `ghcr.io/faisalnh/reading-companion:prod-2025-12-13-1030` | Timestamp | ❌ No |

### From Git Tags (Semantic Versioning)

When you create a git tag like `v1.2.3`, it creates:

| Tag Pattern | Example | Purpose | Mutable |
|------------|---------|---------|---------|
| `v1.2.3` | `ghcr.io/faisalnh/reading-companion:v1.2.3` | Exact version | ❌ No |
| `v1.2` | `ghcr.io/faisalnh/reading-companion:v1.2` | Minor version | ✅ Yes |
| `v1` | `ghcr.io/faisalnh/reading-companion:v1` | Major version | ✅ Yes |

## Usage in Komodo

### Staging (Current Deployment)

```yaml
image: ghcr.io/faisalnh/reading-companion-staging:latest
```

**Deployment:** Manual redeploy after each build

### Staging (Pin to Specific Build)

```yaml
image: ghcr.io/faisalnh/reading-companion-staging:build-123
```

**Use case:** Testing a specific build, preventing auto-updates

### Production (Latest)

```yaml
image: ghcr.io/faisalnh/reading-companion:latest
```

**Deployment:** Manual redeploy

### Production (Semantic Version)

```yaml
image: ghcr.io/faisalnh/reading-companion:v1.2
```

**Deployment:** Auto-updates to latest patch within v1.2.x  
**Recommended for:** Production with controlled updates

## Rollback Scenarios

### Scenario 1: Rollback Staging to Previous Build

```bash
# Check available builds
docker pull ghcr.io/faisalnh/reading-companion-staging:build-122

# Update Komodo stack
image: ghcr.io/faisalnh/reading-companion-staging:build-122

# Redeploy
```

### Scenario 2: Rollback to Specific Commit

```bash
# Use commit SHA tag
image: ghcr.io/faisalnh/reading-companion-staging:staging-abc1234
```

### Scenario 3: Rollback Production to Previous Version

```bash
# Use semantic version
image: ghcr.io/faisalnh/reading-companion:v1.1.0
```

## Creating Semantic Versions

For production releases with semantic versioning:

```bash
# 1. Ensure main is up to date
git checkout main
git pull

# 2. Create and push tag
git tag v1.2.0
git push origin v1.2.0

# 3. GitHub Actions automatically builds and pushes:
#    - :v1.2.0 (immutable)
#    - :v1.2 (updated)
#    - :v1 (updated)
#    - :latest (updated)

# 4. Deploy in Komodo
image: ghcr.io/faisalnh/reading-companion:v1.2.0
```

## Tag Naming Convention

### Semantic Versioning (Production)

Follow [SemVer](https://semver.org/):

- **MAJOR**: Breaking changes (v2.0.0)
- **MINOR**: New features, backward compatible (v1.2.0)
- **PATCH**: Bug fixes, backward compatible (v1.2.1)

**Examples:**
- `v1.0.0` - Initial release
- `v1.1.0` - Added quiz feature
- `v1.1.1` - Fixed quiz bug
- `v2.0.0` - New authentication system (breaking)

### Build Numbers (Auto-incremented)

GitHub Actions run number, starts at 1 and increments.

### Timestamps

Format: `YYYY-MM-DD-HHmm` (UTC)

## Viewing Available Tags

### Via GitHub Container Registry

https://github.com/faisalnh/reading-companion/pkgs/container/reading-companion-staging

### Via Docker CLI

```bash
# Staging
docker pull ghcr.io/faisalnh/reading-companion-staging --all-tags

# Production  
docker pull ghcr.io/faisalnh/reading-companion --all-tags
```

## Best Practices

### Staging

✅ Use `:latest` for normal development  
✅ Pin to `:build-{n}` when testing specific changes  
✅ Use `:staging-{sha}` for debugging specific commits  

### Production

✅ Use semantic versions (`:v1.2.0`) for releases  
✅ Pin to exact version (`:v1.2.0`) for stability  
✅ Use minor version (`:v1.2`) for auto-patch updates  
❌ Avoid `:latest` in production (too unpredictable)  

## Current Versions

To see what's currently deployed:

```bash
# Check running container
docker inspect reading-buddy-staging | grep Image

# Check for updates
docker pull ghcr.io/faisalnh/reading-companion-staging:latest
docker images | grep reading-companion
```
