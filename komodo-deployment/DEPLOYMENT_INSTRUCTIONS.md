# PostgreSQL Deployment Instructions for Komodo Staging

## Prerequisites

✅ Local PostgreSQL database backup created: `local-postgres-backup.sql`  
✅ Code changes committed and pushed to `local-db` branch  
✅ Two secure passwords generated:
```bash
openssl rand -base64 32  # DB_PASSWORD
openssl rand -base64 32  # NEXTAUTH_SECRET
```

---

## Step 1: Create Docker Network

Before deploying any stacks, create the shared network:

```bash
docker network create reading-buddy-staging-network
```

Or via Komodo server SSH:
```bash
ssh your-komodo-server
docker network create reading-buddy-staging-network
```

---

## Step 2: Deploy PostgreSQL Stack

### 2.1 Create New Stack in Komodo

1. Go to Komodo → Stacks → Create New Stack
2. **Stack Name:** `reading-buddy-postgres-staging`
3. **Stack Type:** Docker Compose

### 2.2 Upload Files

**Upload these files to the stack directory on Komodo server:**

📁 **Root directory:**
- `docker-compose.yml` (content below)

📁 **init-scripts/ subdirectory:**
- `01-extensions.sql`
- `02-nextauth-schema.sql`
- `03-app-schema.sql`
- `04-functions.sql`
- `05-triggers.sql`
- `06-rls-policies.sql`
- `07-seed-data.sql`

**docker-compose.yml content:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: reading-buddy-postgres-staging
    restart: unless-stopped
    
    environment:
      POSTGRES_DB: reading_buddy
      POSTGRES_USER: reading_buddy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    
    ports:
      - "5433:5432"
    
    networks:
      - reading-buddy-staging-network
    
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U reading_buddy -d reading_buddy"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  postgres_data:
    driver: local

networks:
  reading-buddy-staging-network:
    external: true
```

### 2.3 Set Environment Variable

In Komodo stack configuration, add:
```
DB_PASSWORD=<your-generated-password>
```

### 2.4 Deploy Stack

Click "Deploy" in Komodo. Wait for health check to pass (green status).

### 2.5 Verify Deployment

SSH into Komodo server and verify PostgreSQL is running:
```bash
docker exec reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy -c '\dt'
```

You should see all tables created (profiles, books, quizzes, etc.)

---

## Step 3: Import Database Backup

### 3.1 Upload Backup File

Copy `local-postgres-backup.sql` to Komodo server:
```bash
scp local-postgres-backup.sql your-komodo-server:/tmp/
```

Or use Komodo file upload feature.

### 3.2 Import into PostgreSQL Container

SSH into Komodo server and run:
```bash
# Copy backup into container
docker cp /tmp/local-postgres-backup.sql reading-buddy-postgres-staging:/tmp/

# Import the backup
docker exec reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy -f /tmp/local-postgres-backup.sql
```

### 3.3 Verify Data Import

Check that data was imported:
```bash
docker exec reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy -c "SELECT COUNT(*) FROM profiles;"
docker exec reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy -c "SELECT COUNT(*) FROM books;"
docker exec reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy -c "SELECT COUNT(*) FROM quizzes;"
```

---

## Step 4: Update Application Stack

### 4.1 Update Existing Stack Configuration

Go to Komodo → `reading-companion-staging` stack → Edit

**Replace the docker-compose.yml with:**
```yaml
services:
  reading-buddy-staging:
    image: ghcr.io/mws-mad-labs/reading-companion-staging:latest
    container_name: reading-buddy-staging
    restart: unless-stopped
    pull_policy: always
    
    ports:
      - "3001:3000"
    
    environment:
      # Node Configuration
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      
      # Application URLs
      - NEXT_PUBLIC_APP_URL=https://staging-reads.mws.web.id
      - NEXT_PUBLIC_RAG_API_URL=https://rag.mws.web.id/
      
      # PostgreSQL Database
      - DB_HOST=reading-buddy-postgres-staging
      - DB_PORT=5432
      - DB_NAME=reading_buddy
      - DB_USER=reading_buddy
      - DB_PASSWORD=<same-password-as-postgres-stack>
      - DATABASE_URL=postgresql://reading_buddy:<password>@reading-buddy-postgres-staging:5432/reading_buddy
      
      # NextAuth Configuration
      - NEXTAUTH_SECRET=<your-nextauth-secret>
      - NEXTAUTH_URL=https://staging-reads.mws.web.id
      
      # MinIO Storage
      - MINIO_ENDPOINT=minioapi.mws.web.id
      - MINIO_PORT=443
      - MINIO_USE_SSL=true
      - MINIO_ACCESS_KEY=mwsaccesskey
      - MINIO_SECRET_KEY=mwssecretkey
      - MINIO_BUCKET_NAME=reading-buddy
      
      # AI Provider
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
    external: true
```

### 4.2 Deploy Application Stack

Click "Redeploy" in Komodo. The application will:
1. Pull latest image (current version with Supabase still works)
2. Connect to PostgreSQL instead of Supabase
3. Start serving requests

---

## Step 5: Merge to Staging Branch

### 5.1 Create Pull Request

Go to GitHub:
```
https://github.com/MWS-MAD-Labs/reading-buddy/compare/staging...local-db
```

1. Click "Create Pull Request"
2. Title: "PostgreSQL Migration - Remove Supabase Dependencies"
3. Review all changes
4. Merge PR

### 5.2 Merge via Command Line (Alternative)

```bash
git checkout staging
git pull origin staging
git merge local-db
git push origin staging
```

---

## Step 6: Monitor Auto-Deployment

### 6.1 Watch GitHub Actions

1. Go to repository → Actions tab
2. Watch the "Staging CI/CD" workflow
3. Verify all steps pass:
   - ✅ Lint and type check
   - ✅ Unit tests
   - ✅ E2E tests (without Supabase env vars)
   - ✅ Docker build (without Supabase build args)
   - ✅ Push to GHCR
   - ✅ Trigger Komodo webhook

### 6.2 Verify Komodo Deployment

1. Komodo will pull new image: `ghcr.io/mws-mad-labs/reading-companion-staging:latest`
2. Container restarts with new code
3. Health check passes
4. Application accessible at: https://staging-reads.mws.web.id

---

## Step 7: Post-Deployment Testing

### 7.1 Health Check

```bash
curl https://staging-reads.mws.web.id/api/health
# Should return 200 OK
```

### 7.2 Login Test

1. Go to https://staging-reads.mws.web.id
2. Login with existing credentials (data migrated from local DB)
3. Verify user profile loads

### 7.3 Functionality Tests

- [ ] Books page loads correctly
- [ ] Can upload a new book
- [ ] Can generate quiz for a book
- [ ] Can submit quiz answers
- [ ] Student dashboard displays progress
- [ ] Librarian can manage books

### 7.4 Monitor Logs

```bash
# Application logs
docker logs reading-buddy-staging -f --tail 100

# PostgreSQL logs
docker logs reading-buddy-postgres-staging -f --tail 100
```

Look for:
- ✅ Database connection successful
- ✅ No Supabase-related errors
- ✅ NextAuth sessions working
- ❌ Any database connection errors

---

## Rollback Plan

If issues occur:

### Option 1: Revert Git Branch
```bash
git checkout staging
git revert HEAD
git push origin staging
```
CI/CD will auto-deploy previous version.

### Option 2: Restore Database
```bash
docker exec reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy < /tmp/local-postgres-backup.sql
docker restart reading-buddy-staging
```

### Option 3: Temporarily Restore Supabase
Re-add Supabase env vars to application stack and redeploy.

---

## Success Criteria

✅ PostgreSQL container running and healthy  
✅ Application container running and healthy  
✅ HTTPS site accessible: https://staging-reads.mws.web.id  
✅ Users can login with existing accounts  
✅ All CRUD operations work (books, quizzes, progress)  
✅ No errors in application logs for 24 hours  
✅ CI/CD pipeline runs successfully without Supabase  

---

## Troubleshooting

### Issue: Container won't start
```bash
docker logs reading-buddy-postgres-staging
docker logs reading-buddy-staging
```

### Issue: Database connection failed
Check:
- DB_HOST matches container name: `reading-buddy-postgres-staging`
- DB_PASSWORD matches in both stacks
- Network exists: `docker network ls | grep reading-buddy-staging`
- Containers on same network: `docker network inspect reading-buddy-staging-network`

### Issue: Init scripts not running
```bash
# Check if scripts are mounted
docker exec reading-buddy-postgres-staging ls -la /docker-entrypoint-initdb.d/

# Manually run scripts
docker exec reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy -f /docker-entrypoint-initdb.d/01-extensions.sql
```

### Issue: Data not imported
```bash
# Check table counts
docker exec reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy -c "SELECT schemaname, tablename, (SELECT COUNT(*) FROM pg_class WHERE relname=tablename) as count FROM pg_tables WHERE schemaname='public';"
```

---

## Next Steps After Staging Success

1. Monitor staging for 1 week
2. Repeat process for production environment
3. Deploy `reading-buddy-postgres-prod` stack
4. Update `reading-companion-prod` stack
5. Decommission Supabase projects after 2 weeks

---

**Deployment Date:** _________________  
**Deployed By:** _________________  
**DB_PASSWORD (encrypted):** _________________  
**NEXTAUTH_SECRET (encrypted):** _________________
