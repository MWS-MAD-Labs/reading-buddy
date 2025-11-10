# Docker Deployment Guide

This guide explains how to deploy Reading Buddy using Docker and Docker Compose.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)

## Deployment Options

### Option 1: Deploy from GitHub (Recommended for Production)

Deploy directly from the GitHub repository without cloning. This ensures you always get the latest code.

**Quick Deploy (Automated):**

```bash
# Download deployment script
curl -O https://raw.githubusercontent.com/faisalnh/reading-companion/main/docker-deploy.sh
chmod +x docker-deploy.sh

# Download environment template
curl -O https://raw.githubusercontent.com/faisalnh/reading-companion/main/.env.example

# Configure your credentials
cp .env.example .env
nano .env  # Edit with your actual values

# Deploy!
./docker-deploy.sh
```

The deployment script will:
- ✓ Stop any existing containers
- ✓ Remove old images and build cache
- ✓ Pull latest code from GitHub
- ✓ Build fresh Docker image (no cache)
- ✓ Start the application
- ✓ Verify health status

**Manual Deploy:**

**1. Create environment file:**
```bash
curl -O https://raw.githubusercontent.com/faisalnh/reading-companion/main/.env.example
cp .env.example .env
nano .env  # Edit with your credentials
```

**2. Download compose file:**
```bash
curl -O https://raw.githubusercontent.com/faisalnh/reading-companion/main/docker-compose.github.yml
```

**3. Clean deploy:**
```bash
# Stop existing containers
docker-compose -f docker-compose.github.yml down

# Remove old images
docker images | grep reading-companion | awk '{print $3}' | xargs -r docker rmi -f

# Clean build cache
docker builder prune -f

# Deploy fresh
docker-compose -f docker-compose.github.yml up --build -d
```

The application will be available at `http://localhost:3000`

### Option 2: Deploy from Local Clone

**1. Clone the repository:**
```bash
git clone https://github.com/faisalnh/reading-companion.git
cd reading-companion
```

**2. Set up environment variables:**
```bash
cp .env.example .env
nano .env  # Edit with your actual credentials
```

**3. Deploy with Docker Compose:**
```bash
npm run docker:up
```

Or using docker-compose directly:
```bash
docker-compose up --build -d
```

The application will be available at `http://localhost:3000`

### 3. View Logs

```bash
npm run docker:logs
```

Or:

```bash
docker-compose logs -f
```

### 4. Stop the Application

```bash
npm run docker:down
```

Or:

```bash
docker-compose down
```

## Available Scripts

- `npm run docker:up` - Build and start containers in detached mode
- `npm run docker:down` - Stop and remove containers
- `npm run docker:logs` - View container logs
- `npm run docker:restart` - Restart containers

## Environment Variables

The following environment variables are required:

### Build-time Variables (for Next.js)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `MINIO_ENDPOINT` - MinIO server endpoint
- `MINIO_PORT` - MinIO port (usually 443 or 9000)
- `MINIO_USE_SSL` - Use SSL for MinIO (true/false)

### Runtime Variables
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations)
- `MINIO_ACCESS_KEY` - MinIO access key
- `MINIO_SECRET_KEY` - MinIO secret key
- `MINIO_BUCKET_NAME` - MinIO bucket name
- `GEMINI_API_KEY` - Google Gemini API key for AI features
- `PORT` - Optional: External port mapping (default: 3000)

## Production Deployment

### Using Docker Compose

For production deployments, ensure:

1. All environment variables are properly set in `.env`
2. SSL/TLS is configured (use a reverse proxy like nginx)
3. The `.env` file is kept secure and never committed to git

### Custom Port

To run on a different port, set the `PORT` variable:

```bash
PORT=8080 docker-compose up -d
```

Or modify the `PORT` variable in your `.env` file.

## Health Check

The container includes a health check that verifies the application is responding correctly. You can check the health status:

```bash
docker inspect reading-buddy --format='{{.State.Health.Status}}'
```

## Troubleshooting

### Container won't start
- Check logs: `npm run docker:logs`
- Verify all environment variables are set correctly
- Ensure no other service is using port 3000

### OAuth redirect issues
The application is configured to handle Docker networking correctly. OAuth redirects will use the `Host` header from the request.

### Build fails
- Ensure all environment variables are available during build
- Check that you're using Docker version 20.10 or higher
- Try clearing Docker cache: `docker-compose build --no-cache`

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique keys for all services
- Keep your Docker images updated
- Use docker-compose.override.yml for local development overrides (already in .gitignore)
