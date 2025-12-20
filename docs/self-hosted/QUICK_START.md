# Reading Buddy Self-Hosted - Quick Start Guide

**Version:** 2.0.0  
**Last Updated:** 2024-12-15  
**Estimated Setup Time:** 15-30 minutes

---

## Prerequisites

### Required

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **2GB RAM** minimum (4GB recommended)
- **50GB disk space** for books and data
- **Linux, macOS, or Windows** with WSL2

### Optional but Recommended

- **Domain name** with SSL certificate (for production)
- **Google OAuth credentials** (for easy sign-in)
- **Gemini API key** (for AI quiz generation)
- **SMTP server** (for password reset emails)

---

## Quick Start (5 Minutes)

### 1. Clone or Download

```bash
git clone https://github.com/yourusername/reading-buddy.git
cd reading-buddy
```

### 2. Create Configuration

```bash
cp .env.selfhosted.example .env
```

### 3. Generate Secrets

```bash
# Generate strong passwords and secrets
export DB_PASSWORD=$(openssl rand -base64 24)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export MINIO_SECRET_KEY=$(openssl rand -base64 24)

# Update .env file (macOS)
sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
sed -i '' "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" .env
sed -i '' "s/MINIO_SECRET_KEY=.*/MINIO_SECRET_KEY=$MINIO_SECRET_KEY/" .env

# Update .env file (Linux)
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" .env
sed -i "s/MINIO_SECRET_KEY=.*/MINIO_SECRET_KEY=$MINIO_SECRET_KEY/" .env
```

### 4. Start Services

```bash
./scripts/quick-start.sh
```

Or manually:

```bash
docker compose -f docker-compose.selfhosted.yml up -d
```

### 5. Access Application

Open your browser: **http://localhost:3000**

---

## Configuration

### Required Environment Variables

Edit `.env` file:

```bash
# Database
DB_PASSWORD=your-secure-password-here

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-nextauth-secret-here

# MinIO
MINIO_SECRET_KEY=your-minio-password-here
```

### Optional Configuration

#### Google OAuth (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy credentials to `.env`:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### AI Quiz Generation

Get a free Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey):

```bash
AI_PROVIDER=cloud
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
```

#### Email (Password Reset)

Configure SMTP server:

```bash
# Gmail example (use App Password)
EMAIL_SERVER=smtp://your-email@gmail.com:your-app-password@smtp.gmail.com:587
EMAIL_FROM=noreply@yourdomain.com
```

---

## First Steps

### 1. Create Admin Account

1. Visit http://localhost:3000
2. Sign up with your email
3. Connect to database and promote yourself to admin:

```bash
docker compose -f docker-compose.selfhosted.yml exec postgres psql -U reading_buddy -d reading_buddy

UPDATE profiles SET role = 'ADMIN' WHERE email = 'your-email@example.com';
\q
```

### 2. Configure MinIO Bucket

1. Visit MinIO Console: http://localhost:9001
2. Login with credentials from `.env`
3. Create bucket named `reading-buddy`
4. Set public read policy on bucket (for book covers)

Or via CLI:

```bash
docker compose -f docker-compose.selfhosted.yml exec minio mc alias set local http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
docker compose -f docker-compose.selfhosted.yml exec minio mc mb local/reading-buddy
docker compose -f docker-compose.selfhosted.yml exec minio mc anonymous set download local/reading-buddy
```

### 3. Upload Your First Book

1. Login as admin
2. Navigate to Books → Add Book
3. Upload PDF and cover image
4. Set access level and metadata
5. Start reading!

---

## Production Deployment

### Domain and SSL

#### Option 1: Caddy (Recommended)

Create `Caddyfile`:

```caddy
reads.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Run Caddy:

```bash
docker run -d \
  --name caddy \
  --network reading-buddy-network \
  -p 80:80 \
  -p 443:443 \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy
```

Update `.env`:

```bash
NEXT_PUBLIC_APP_URL=https://reads.yourdomain.com
NEXTAUTH_URL=https://reads.yourdomain.com
```

#### Option 2: Nginx

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name reads.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name reads.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/reads.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/reads.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Automated Backups

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/reading-buddy/scripts/backup.sh >> /var/log/reading-buddy-backup.log 2>&1
```

### Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

---

## Common Tasks

### View Logs

```bash
# All services
docker compose -f docker-compose.selfhosted.yml logs -f

# Specific service
docker compose -f docker-compose.selfhosted.yml logs -f app
docker compose -f docker-compose.selfhosted.yml logs -f postgres
docker compose -f docker-compose.selfhosted.yml logs -f minio
```

### Restart Services

```bash
# All services
docker compose -f docker-compose.selfhosted.yml restart

# Specific service
docker compose -f docker-compose.selfhosted.yml restart app
```

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose -f docker-compose.selfhosted.yml up -d --build
```

### Backup Database

```bash
./scripts/backup.sh
```

Backups are stored in `./backups/` directory.

### Restore Database

```bash
# Stop application
docker compose -f docker-compose.selfhosted.yml stop app

# Restore backup
gunzip -c backups/reading_buddy_20241215_120000.sql.gz | \
  docker compose -f docker-compose.selfhosted.yml exec -T postgres \
  psql -U reading_buddy -d reading_buddy

# Restart application
docker compose -f docker-compose.selfhosted.yml start app
```

### Access Database

```bash
docker compose -f docker-compose.selfhosted.yml exec postgres psql -U reading_buddy -d reading_buddy
```

### Clean Up Volumes

**WARNING: This deletes all data!**

```bash
docker compose -f docker-compose.selfhosted.yml down -v
```

---

## Troubleshooting

### Application Won't Start

**Check logs:**

```bash
docker compose -f docker-compose.selfhosted.yml logs app
```

**Common issues:**
- Missing environment variables → Check `.env` file
- Database not ready → Wait 30 seconds after starting
- Port 3000 in use → Change `APP_PORT` in `.env`

### Database Connection Error

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.selfhosted.yml ps postgres

# Check connection
docker compose -f docker-compose.selfhosted.yml exec postgres pg_isready -U reading_buddy
```

### MinIO Upload Fails

```bash
# Check MinIO is running
docker compose -f docker-compose.selfhosted.yml ps minio

# Check bucket exists
docker compose -f docker-compose.selfhosted.yml exec minio mc ls local/
```

### Google OAuth Not Working

1. Check redirect URI in Google Console matches:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://reads.yourdomain.com/api/auth/callback/google`

2. Verify credentials in `.env`:
   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRET
   ```

### "Cannot find module" Errors

Rebuild application:

```bash
docker compose -f docker-compose.selfhosted.yml up -d --build --force-recreate app
```

---

## Resource Usage

### Minimum Requirements

- **RAM:** 2GB total
  - PostgreSQL: 256MB
  - MinIO: 256MB
  - App: 512MB

- **CPU:** 2 cores
- **Disk:** 50GB (grows with book collection)

### Recommended Specifications

- **RAM:** 4GB+
- **CPU:** 4 cores
- **Disk:** 100GB+ SSD
- **Network:** 100 Mbps+

### Performance Tuning

Edit `docker-compose.selfhosted.yml` to increase limits:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G  # Increase from 1G
```

---

## Security Best Practices

### ✅ Do

- Use strong passwords (20+ characters)
- Enable HTTPS in production
- Keep Docker images updated
- Regular backups (daily recommended)
- Limit SSH access to specific IPs
- Use firewall rules
- Monitor logs for suspicious activity

### ❌ Don't

- Use default passwords
- Expose database port (5432) publicly
- Run as root user
- Skip SSL certificates
- Share credentials
- Disable firewall

---

## Getting Help

### Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Architecture Overview](../../notes/2024-12-14/development/SELF_HOSTED_ARCHITECTURE.md)

### Community

- GitHub Issues: [Report bugs](https://github.com/yourusername/reading-buddy/issues)
- Discussions: [Ask questions](https://github.com/yourusername/reading-buddy/discussions)

### Logs

Always include logs when asking for help:

```bash
docker compose -f docker-compose.selfhosted.yml logs > logs.txt
```

---

## Next Steps

1. ✅ Complete [Production Deployment](#production-deployment)
2. ✅ Set up [Automated Backups](#automated-backups)
3. ✅ Configure [Google OAuth](#google-oauth-recommended)
4. ✅ Add your book collection
5. ✅ Invite students and teachers

---

**Enjoy Reading Buddy! 📚✨**
