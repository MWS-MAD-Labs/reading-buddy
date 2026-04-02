# Simple PostgreSQL Deployment - Komodo

**Simplified approach: Just paste SQL, no file uploads needed!**

---

## Prerequisites

✅ Have these ready:
- `local-postgres-backup.sql` file (database backup)
- Two generated passwords:
  ```bash
  openssl rand -base64 32  # DB_PASSWORD
  openssl rand -base64 32  # NEXTAUTH_SECRET
  ```

---

## Step 1: Create Docker Network

SSH into Komodo server:
```bash
docker network create reading-buddy-staging-network
```

---

## Step 2: Create PostgreSQL Stack in Komodo

### 2.1 Create New Stack
- **Name:** `reading-buddy-postgres-staging`
- **Type:** Docker Compose

### 2.2 Paste docker-compose.yml

Copy and paste this into Komodo's docker-compose editor:

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

In Komodo stack settings:
```
DB_PASSWORD=<your-generated-password>
```

### 2.4 Deploy Stack

Click "Deploy" and wait for health check to pass (green).

---

## Step 3: Run Database Setup SQL

### 3.1 Open SQL Editor

In Komodo or via psql, connect to the PostgreSQL container:

```bash
# Option A: Via Komodo SQL editor (if available)
# Connection details:
# Host: localhost or your-komodo-ip
# Port: 5433
# Database: reading_buddy
# User: reading_buddy
# Password: <your-db-password>

# Option B: Via psql command
docker exec -it reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy
```

### 3.2 Copy Complete SQL

Go to: `komodo-deployment/complete-database-setup.sql`

**Option 1: Direct copy-paste (Recommended)**
1. Open `complete-database-setup.sql` in your editor
2. Copy all content (Ctrl+A, Ctrl+C)
3. Paste into Komodo SQL editor or psql
4. Execute

**Option 2: Via psql command line**
```bash
# SSH into Komodo
docker exec -i reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy < complete-database-setup.sql
```

**Option 3: Upload and execute**
```bash
# Upload file to server
scp complete-database-setup.sql your-server:/tmp/

# Execute on server
docker exec -i reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy < /tmp/complete-database-setup.sql
```

### 3.3 Verify Setup Completed

Run in SQL editor:
```sql
-- Check tables were created
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should return: table_count = 20+

-- Check specific tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Expected tables:
```
accounts
achievements
badges
books
book_access
book_render_jobs
class_books
class_students
classes
login_broadcasts
profiles
quiz_attempts
quiz_checkpoints
quizzes
reading_challenges
sessions
student_achievements
student_badges
student_books
student_challenge_progress
users
verification_tokens
weekly_challenge_completions
```

---

## Step 4: Import Your Data Backup

### 4.1 Import Local Database Backup

```bash
# Option 1: Direct import via psql
docker exec -i reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy < local-postgres-backup.sql

# Option 2: Upload then import
scp local-postgres-backup.sql your-server:/tmp/
docker exec -i reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy < /tmp/local-postgres-backup.sql
```

### 4.2 Verify Data Import

Run in SQL editor:
```sql
SELECT COUNT(*) as profile_count FROM profiles;
SELECT COUNT(*) as book_count FROM books;
SELECT COUNT(*) as quiz_count FROM quizzes;
SELECT COUNT(*) as user_count FROM users;
```

You should see your data counts (non-zero values).

---

## Step 5: Update Application Stack

### 5.1 Edit Existing Stack

Go to Komodo → `reading-companion-staging` → Edit

### 5.2 Paste New docker-compose.yml

Replace with:
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
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_PUBLIC_APP_URL=https://staging-reads.mws.web.id
      - NEXT_PUBLIC_RAG_API_URL=https://rag.mws.web.id/
      - DB_HOST=reading-buddy-postgres-staging
      - DB_PORT=5432
      - DB_NAME=reading_buddy
      - DB_USER=reading_buddy
      - DB_PASSWORD=<same-password-as-postgres-stack>
      - DATABASE_URL=postgresql://reading_buddy:<same-password>@reading-buddy-postgres-staging:5432/reading_buddy
      - NEXTAUTH_SECRET=<your-nextauth-secret>
      - NEXTAUTH_URL=https://staging-reads.mws.web.id
      - MINIO_ENDPOINT=minioapi.mws.web.id
      - MINIO_PORT=443
      - MINIO_USE_SSL=true

If Komodo later reports an orphan container like `reading-companion-staging-app-1`, that container came from an older compose service name in the same project. Once `reading-buddy-staging` is confirmed healthy, clean it up with `docker compose ... up -d --remove-orphans` or remove the old container explicitly.
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
    external: true
```

### 5.3 Deploy

Click "Redeploy" and wait for health check.

---

## Step 6: Merge to Staging Branch

```bash
git checkout staging
git merge local-db
git push origin staging
```

This triggers CI/CD pipeline.

---

## Step 7: Verify Everything Works

### 7.1 Check Site
```bash
curl https://staging-reads.mws.web.id
# Should return HTML (200 status)
```

### 7.2 Test Login
1. Go to https://staging-reads.mws.web.id
2. Login with existing account (from your backup)
3. Verify you see your books and data

### 7.3 Check Logs
```bash
docker logs reading-buddy-staging -f --tail 50
docker logs reading-buddy-postgres-staging -f --tail 50
```

Look for: ✅ Connected to database, ✅ No errors

---

## That's It! 🎉

Your PostgreSQL staging environment is deployed!

---

## Quick Reference Commands

```bash
# Connect to PostgreSQL
docker exec -it reading-buddy-postgres-staging psql -U reading_buddy -d reading_buddy

# View logs
docker logs reading-buddy-postgres-staging -f
docker logs reading-buddy-staging -f

# Check network
docker network inspect reading-buddy-staging-network

# Restart stack
docker-compose restart

# Generate passwords
openssl rand -base64 32
```

---

## Troubleshooting

**Issue: Container won't start**
```bash
docker logs reading-buddy-postgres-staging
```

**Issue: Can't connect to database**
- Check DB_PASSWORD matches in both stacks
- Check container name: `reading-buddy-postgres-staging`
- Verify network: `docker network inspect reading-buddy-staging-network`

**Issue: SQL import failed**
- Check file exists
- Check permissions
- Try running SQL piece by piece

**Issue: App can't connect to database**
- Check logs: `docker logs reading-buddy-staging`
- Verify DB_HOST is correct (container name)
- Test connection: `docker exec -it reading-buddy-postgres-staging psql -U reading_buddy`

---

**Total Time: ~30 minutes**
