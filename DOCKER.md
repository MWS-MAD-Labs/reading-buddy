# Docker Deployment Guide

This guide explains how to deploy Reading Buddy using Docker and Docker Compose.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)

## Quick Start

### 1. Set Up Environment Variables

Copy the example environment file and fill in your actual values:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
- Supabase URL and keys
- MinIO configuration
- Gemini API key

### 2. Deploy with Docker Compose

Build and start the container:

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
