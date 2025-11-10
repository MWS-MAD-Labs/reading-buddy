#!/bin/bash
# Deploy Reading Buddy from GitHub with clean build
# This script ensures fresh deployment every time

set -e  # Exit on error

echo "🚀 Deploying Reading Buddy from GitHub..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with your environment variables."
    echo "You can use .env.example as a template:"
    echo ""
    echo "  curl -O https://raw.githubusercontent.com/faisalnh/reading-companion/main/.env.example"
    echo "  cp .env.example .env"
    echo "  nano .env  # Edit with your credentials"
    echo ""
    exit 1
fi

echo "✓ Environment file found"
echo ""

# Stop and remove existing container
echo "🛑 Stopping existing container (if any)..."
docker-compose -f docker-compose.github.yml down --remove-orphans 2>/dev/null || true
echo ""

# Remove old images to force fresh build
echo "🗑️  Removing old images..."
docker rmi reading-buddy:latest 2>/dev/null || true
docker images | grep reading-companion | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
echo ""

# Prune build cache to avoid using broken builds
echo "🧹 Cleaning Docker build cache..."
docker builder prune -f
echo ""

# Build and deploy
echo "🔨 Building fresh image from GitHub..."
docker-compose -f docker-compose.github.yml build --no-cache --pull
echo ""

echo "🚀 Starting container..."
docker-compose -f docker-compose.github.yml up -d
echo ""

# Wait for health check
echo "⏳ Waiting for application to be healthy..."
sleep 5

# Check if container is running
if docker ps | grep -q reading-buddy; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📊 Container status:"
    docker ps --filter "name=reading-buddy" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "🌐 Application is running at: http://localhost:3000"
    echo ""
    echo "📝 View logs with:"
    echo "   docker-compose -f docker-compose.github.yml logs -f"
else
    echo ""
    echo "❌ Deployment failed! Container is not running."
    echo ""
    echo "📝 Check logs with:"
    echo "   docker-compose -f docker-compose.github.yml logs"
    exit 1
fi
