# Reading Buddy - Docker Deployment Guide

This guide covers deploying Reading Buddy with Docker, including support for EPUB file conversion using Calibre.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Supabase account and project
- MinIO or S3-compatible object storage
- Gemini API key (for AI features)

## Features Included in Docker Build

- ✅ Next.js 16 application
- ✅ PDF rendering with pdf2pic
- ✅ **EPUB to PDF conversion with Calibre**
- ✅ Image processing with Canvas
- ✅ MinIO object storage integration
- ✅ Supabase authentication and database
- ✅ AI-powered quiz generation

**Base Image:** `node:20-slim` (Debian-based for Calibre support)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/faisalnh/reading-companion.git
cd reading-companion
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Application URL (important for EPUB conversion API calls)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# MinIO Configuration
MINIO_ENDPOINT=minio.your-domain.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=reading-buddy

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Port (optional)
PORT=3000
```

### 3. Build and Run

**Option A: Using Docker Compose (Recommended)**

```bash
docker-compose up -d
```

This will:
- Pull the latest code from GitHub
- Build the image with Calibre support
- Start the container
- Expose on port 3000 (or your configured PORT)

**Option B: Build from Local Files**

Edit `docker-compose.yml` and uncomment the local context:

```yaml
build:
  # context: https://github.com/faisalnh/reading-companion.git#main
  context: .  # Use local files
  dockerfile: Dockerfile
```

Then run:

```bash
docker-compose up -d
```

**Option C: Manual Docker Build**

```bash
docker build -t reading-buddy:latest .
docker run -d \
  --name reading-buddy \
  -p 3000:3000 \
  --env-file .env \
  reading-buddy:latest
```

### 4. Verify Deployment

Check container status:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f reading-buddy
```

Health check:
```bash
curl http://localhost:3000
```

## EPUB Support

The Docker image includes **Calibre** for EPUB to PDF conversion.

### How It Works

1. User uploads EPUB file via librarian dashboard
2. File is validated client-side (magic numbers, structure)
3. EPUB uploaded to MinIO storage
4. Backend API calls Calibre's `ebook-convert`
5. Converted PDF stored at `books/converted/{bookId}.pdf`
6. PDF rendering pipeline generates page images
7. Book ready to read in the reader

### Calibre Configuration

Current conversion settings (in `web/src/app/api/convert-epub/route.ts`):

```bash
ebook-convert input.epub output.pdf \
  --paper-size a4 \
  --pdf-default-font-size 18 \
  --margin-left 20 \
  --margin-right 20 \
  --margin-top 20 \
  --margin-bottom 20
```

You can adjust these settings for your needs:
- Font size: `--pdf-default-font-size` (default: 18pt)
- Margins: `--margin-*` (default: 20pt)
- Paper size: `--paper-size` (default: a4)

## Database Setup

Before using the application, apply the database migration:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration file: `migrations/add-file-format-support.sql`

This adds columns for multi-format support:
- `file_format` (pdf/epub)
- `original_file_url` (original file location)
- `file_size_bytes` (file size)

## Updating

**Pull latest changes and rebuild:**

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Or with GitHub auto-pull (default config):**

```bash
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### EPUB Conversion Fails

**Check Calibre installation:**
```bash
docker exec reading-buddy ebook-convert --version
```

Expected output: `ebook-convert (calibre X.X.X)`

**View conversion logs:**
```bash
docker-compose logs -f reading-buddy | grep -i calibre
```

### PDF URL Shows "undefined"

Make sure `NEXT_PUBLIC_APP_URL` is set in your `.env` file:
```env
NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
```

### Out of Memory

EPUB conversion can be memory-intensive. Increase container memory:

```yaml
# In docker-compose.yml
services:
  reading-buddy:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Font Issues

If converted PDFs have font problems, you may need to install additional fonts:

```dockerfile
# In Dockerfile, add to the apt-get install command:
RUN apt-get update && apt-get install -y \
    # ... existing packages ...
    fonts-dejavu \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
```

### Image Size

The Debian-based image is larger than Alpine (~300MB more) but provides:
- Native Calibre support from apt repositories
- Better compatibility with EPUB conversion
- Easier troubleshooting and debugging

Expected final image size: **~700-800MB**

## Performance Optimization

### Build Cache

For faster rebuilds, disable `no_cache` in docker-compose.yml:

```yaml
build:
  no_cache: false  # Enable build cache
```

### Multi-stage Build

The Dockerfile uses multi-stage builds to minimize image size:
- `base`: System dependencies
- `deps`: Node dependencies
- `builder`: Build application
- `runner`: Production runtime

Final image size: ~400-500MB

## Security Notes

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use strong passwords** for MinIO and Supabase
3. **Enable HTTPS** in production
4. **Restrict MinIO bucket access** - Configure proper CORS and policies
5. **Regular updates** - Keep Docker images and dependencies updated

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | - | Application base URL for API calls |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | - | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Supabase service role key (admin) |
| `MINIO_ENDPOINT` | Yes | - | MinIO server endpoint |
| `MINIO_PORT` | No | 443 | MinIO server port |
| `MINIO_USE_SSL` | No | true | Use HTTPS for MinIO |
| `MINIO_ACCESS_KEY` | Yes | - | MinIO access key |
| `MINIO_SECRET_KEY` | Yes | - | MinIO secret key |
| `MINIO_BUCKET_NAME` | Yes | - | MinIO bucket name |
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `PORT` | No | 3000 | Application port |

## Support

For issues and questions:
- GitHub Issues: https://github.com/faisalnh/reading-companion/issues
- Documentation: Check README.md

## License

See LICENSE file in the repository.
