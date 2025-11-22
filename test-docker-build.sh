#!/bin/bash
set -e

echo "🐳 Reading Buddy - Docker Build Test Script"
echo "==========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "   Please start Docker Desktop and try again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo "   ⚠️  Please edit .env with your actual credentials before running!"
    echo ""
fi

echo "📦 Building Docker image..."
echo "   This may take 5-10 minutes on first build"
echo ""

# Build the image
docker build -t reading-buddy:test \
    --build-arg NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key \
    --build-arg MINIO_ENDPOINT=test.minio.com \
    --build-arg MINIO_PORT=443 \
    --build-arg MINIO_USE_SSL=true \
    .

echo ""
echo "✅ Build completed successfully!"
echo ""

# Test Calibre installation
echo "🔍 Verifying Calibre installation..."
docker run --rm reading-buddy:test sh -c "ebook-convert --version" || {
    echo "❌ Calibre not found in image"
    exit 1
}

echo ""
echo "✅ Calibre is installed and working!"
echo ""

# Show image info
echo "📊 Image Information:"
docker images reading-buddy:test --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

echo ""
echo "🎉 Docker build test completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual credentials"
echo "2. Run: docker-compose up -d"
echo "3. Access the app at http://localhost:3000"
echo ""
