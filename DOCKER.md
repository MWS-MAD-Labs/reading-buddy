# Docker Deployment Guide

This guide explains how to deploy Reading Buddy using Docker, with the source code pulled directly from GitHub.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)
- Git repository: https://github.com/faisalnh/reading-companion

## Quick Start

### 1. Create Environment File

Download the environment template and configure your credentials:

```bash
curl -O https://raw.githubusercontent.com/faisalnh/reading-companion/main/.env.example
cp .env.example .env
nano .env  # Edit with your actual values
```

### 2. Download Docker Compose File

```bash
curl -O https://raw.githubusercontent.com/faisalnh/reading-companion/main/docker-compose.yml
```

### 3. Deploy

```bash
docker-compose up --build -d
```

The application will be available at `http://localhost:3000`

## How It Works

### Deployment Architecture

The Docker setup is configured to:
- **Pull code directly from GitHub** - Ensures you always deploy the latest version
- **Build with no cache** - Forces fresh builds to avoid stale code
- **Use placeholder build args** - Allows building without real credentials
- **Override at runtime** - Real credentials from `.env` file are injected at runtime

### Build Process

1. Docker pulls latest code from `https://github.com/faisalnh/reading-companion.git#main`
2. Builds Next.js application with placeholder environment variables
3. Creates standalone production build
4. Runs container with your actual credentials from `.env` file

## Environment Variables

All environment variables should be set in your `.env` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# MinIO Object Storage
MINIO_ENDPOINT=your-minio-endpoint.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
MINIO_BUCKET_NAME=reading-buddy

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# Optional: Custom Port
PORT=3000
```

**Note:** The application builds successfully with placeholder values but requires real credentials for full functionality.

## Docker Commands

### View Logs
```bash
docker-compose logs -f reading-buddy
```

### Stop Application
```bash
docker-compose down
```

### Restart Application
```bash
docker-compose restart
```

### Force Fresh Build
```bash
# Remove everything and rebuild
docker-compose down
docker rmi reading-buddy:latest -f
docker builder prune -af
docker-compose up --build -d
```

## Deployment Options

### Option 1: Deploy from GitHub (Recommended)

This is the default configuration in `docker-compose.yml`:

```yaml
services:
  reading-buddy:
    build:
      context: https://github.com/faisalnh/reading-companion.git#main
      dockerfile: Dockerfile
      no_cache: true
      pull: true
```

**Advantages:**
- Always deploys latest code from GitHub
- No need to clone repository locally
- Ideal for production servers

### Option 2: Deploy from Local Files

If you want to test local changes before pushing to GitHub:

1. Clone the repository:
   ```bash
   git clone https://github.com/faisalnh/reading-companion.git
   cd reading-companion
   ```

2. Edit `docker-compose.yml` and change the build context:
   ```yaml
   build:
     context: .  # Use local directory instead of GitHub
     dockerfile: Dockerfile
   ```

3. Deploy:
   ```bash
   docker-compose up --build -d
   ```

## Production Deployment

### Health Checks

The container includes automatic health monitoring:

```bash
# Check container health status
docker inspect reading-buddy --format='{{.State.Health.Status}}'
```

Health check verifies the application responds correctly on port 3000.

### Resource Limits

For production, consider adding resource limits to `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

### Reverse Proxy Setup

For production with SSL, use a reverse proxy (nginx, Caddy, Traefik):

**Nginx Example:**
```nginx
server {
    listen 443 ssl http2;
    server_name reading.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy Example:**
```
reading.yourdomain.com {
    reverse_proxy localhost:3000
}
```

## Updates and Maintenance

### Deploying Updates

To deploy the latest code from GitHub:

```bash
docker-compose up --build -d
```

The `no_cache: true` setting ensures you always get the latest code.

### Viewing Container Status

```bash
# List containers
docker ps

# View resource usage
docker stats reading-buddy

# Check logs
docker logs --tail 100 reading-buddy
```

### Clearing Docker Cache

If you encounter build issues:

```bash
# Clear all build cache
docker builder prune -af

# Remove dangling images
docker image prune -f

# Full cleanup (careful - removes all unused Docker data)
docker system prune -af
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill

# Or use a different port
PORT=3001 docker-compose up --build -d
```

### Build Fails

```bash
# Check logs for errors
docker-compose logs

# Try building without detached mode to see errors
docker-compose up --build

# Clear cache and retry
docker builder prune -af
docker-compose up --build -d
```

### Container Unhealthy

```bash
# Check health status
docker inspect reading-buddy --format='{{.State.Health.Status}}'

# View health check logs
docker inspect reading-buddy --format='{{range .State.Health.Log}}{{.Output}}{{end}}'

# Check application logs
docker logs reading-buddy
```

### OAuth/Authentication Issues

If you experience OAuth redirect issues:
- Ensure your Supabase site URL is configured correctly
- The application uses the `Host` header for redirects
- Check that your reverse proxy passes the correct headers

### Image Not Updating

If the Docker image doesn't reflect latest GitHub changes:

```bash
# Force complete rebuild
docker-compose down
docker rmi reading-buddy:latest -f
docker builder prune -af
docker-compose build --no-cache --pull
docker-compose up -d
```

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong credentials** - Generate secure keys for all services
3. **Keep images updated** - Regularly rebuild to get security patches
4. **Use SSL in production** - Always deploy behind HTTPS reverse proxy
5. **Restrict port access** - If using reverse proxy, bind container port to localhost only:
   ```yaml
   ports:
     - "127.0.0.1:3000:3000"
   ```

## Monitoring and Logs

### Real-time Logs
```bash
docker-compose logs -f
```

### Last N Lines
```bash
docker logs --tail 50 reading-buddy
```

### Search Logs
```bash
docker logs reading-buddy 2>&1 | grep -i error
```

### Export Logs
```bash
docker logs reading-buddy > logs.txt 2>&1
```

## Advanced Configuration

### Running Background Jobs

The PDF rendering worker needs to run separately. Options:

**Option 1: Manual Execution**
```bash
docker exec -it reading-buddy sh -c "cd web && npm run render:book-images"
```

**Option 2: Cron Job (Recommended)**
```bash
# Create script: /usr/local/bin/reading-buddy-render.sh
#!/bin/bash
docker exec reading-buddy sh -c "cd web && npm run render:book-images"

# Make executable
chmod +x /usr/local/bin/reading-buddy-render.sh

# Add to crontab (run every hour)
echo "0 * * * * /usr/local/bin/reading-buddy-render.sh >> /var/log/reading-buddy-render.log 2>&1" | crontab -
```

### Custom Domain Configuration

If deploying with a custom domain, update your Supabase redirect URLs:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your domain to "Site URL"
3. Add redirect URLs: `https://yourdomain.com/auth/callback`

## Support and Documentation

- **GitHub Repository**: https://github.com/faisalnh/reading-companion
- **Issues**: Report problems via GitHub Issues
- **Next.js Docs**: https://nextjs.org/docs
- **Docker Docs**: https://docs.docker.com
