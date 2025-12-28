#!/bin/bash

# ==========================================
# Reading Buddy - Self-Hosted Quick Start
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║  Reading Buddy Self-Hosted Setup    ║"
echo "║  Version 2.0.0                       ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not available${NC}"
    echo "Please install Docker Compose"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"
echo -e "${GREEN}✅ Docker Compose is available${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file from template...${NC}"
    if [ -f .env.selfhosted.example ]; then
        cp .env.selfhosted.example .env
        echo -e "${GREEN}✅ Created .env file${NC}"
    else
        echo -e "${RED}❌ .env.selfhosted.example not found${NC}"
        exit 1
    fi

    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Configure your .env file${NC}"
    echo ""
    echo "Required changes:"
    echo "  1. DB_PASSWORD - Set a strong database password"
    echo "  2. NEXTAUTH_SECRET - Generate with: openssl rand -base64 32"
    echo "  3. MINIO_SECRET_KEY - Set a strong MinIO password"
    echo ""
    echo "Optional (but recommended):"
    echo "  4. GOOGLE_CLIENT_ID - Google OAuth credentials"
    echo "  5. GOOGLE_CLIENT_SECRET - Google OAuth secret"
    echo "  6. GOOGLE_GEMINI_API_KEY - For AI quiz generation"
    echo ""
    echo -e "${BLUE}After editing .env, run this script again.${NC}"
    exit 0
fi

echo -e "${GREEN}✅ Configuration file found${NC}"
echo ""

# Load and validate environment
source .env

REQUIRED_VARS=("DB_PASSWORD" "NEXTAUTH_SECRET" "MINIO_SECRET_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    value="${!var}"
    if [ -z "$value" ] || [[ "$value" == *"change-this"* ]] || [[ "$value" == *"NOW"* ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing or invalid required variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "  ${YELLOW}- $var${NC}"
    done
    echo ""
    echo "Please edit .env file and set these variables."
    echo ""
    echo "Quick fix:"
    echo "  export DB_PASSWORD=\$(openssl rand -base64 24)"
    echo "  export NEXTAUTH_SECRET=\$(openssl rand -base64 32)"
    echo "  export MINIO_SECRET_KEY=\$(openssl rand -base64 24)"
    exit 1
fi

echo -e "${GREEN}✅ All required variables are set${NC}"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}This will:${NC}"
echo "  • Pull Docker images (~500MB)"
echo "  • Create PostgreSQL database"
echo "  • Initialize MinIO storage"
echo "  • Start Reading Buddy application"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Pull images
echo ""
echo -e "${BLUE}📥 Pulling Docker images...${NC}"
docker compose -f docker-compose.selfhosted.yml pull

# Build application
echo ""
echo -e "${BLUE}🔨 Building application...${NC}"
docker compose -f docker-compose.selfhosted.yml build --no-cache

# Start services
echo ""
echo -e "${BLUE}🚀 Starting services...${NC}"
docker compose -f docker-compose.selfhosted.yml up -d

# Wait for services
echo ""
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 15

# Check health
echo ""
echo -e "${BLUE}🏥 Checking service health...${NC}"

# Check PostgreSQL
if docker compose -f docker-compose.selfhosted.yml exec -T postgres pg_isready -U reading_buddy > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not ready${NC}"
    echo "Check logs: docker compose -f docker-compose.selfhosted.yml logs postgres"
fi

# Check MinIO
if curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MinIO is ready${NC}"
else
    echo -e "${YELLOW}⚠️  MinIO is starting...${NC}"
fi

# Check App
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Application is starting (this may take a minute)${NC}"
fi

# Success message
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════╗"
echo "║   🎉 Reading Buddy is running!      ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}📍 Access Points:${NC}"
echo "  • Application:     http://localhost:3000"
echo "  • MinIO Console:   http://localhost:9001"
echo "  • Database:        localhost:5432"
echo ""
echo -e "${BLUE}🔐 Default Credentials:${NC}"
echo "  • MinIO Console:"
echo "    - Username: ${MINIO_ACCESS_KEY}"
echo "    - Password: ${MINIO_SECRET_KEY}"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo "  • View logs:       docker compose -f docker-compose.selfhosted.yml logs -f"
echo "  • Stop:            docker compose -f docker-compose.selfhosted.yml down"
echo "  • Restart:         docker compose -f docker-compose.selfhosted.yml restart"
echo "  • Rebuild:         docker compose -f docker-compose.selfhosted.yml up -d --build"
echo "  • Database backup: ./scripts/backup.sh"
echo ""
echo -e "${BLUE}📚 Next Steps:${NC}"
echo "  1. Visit http://localhost:3000"
echo "  2. Sign up for an account"
echo "  3. Upload your first book (if you're a librarian/admin)"
echo "  4. Start reading!"
echo ""
echo -e "${YELLOW}⚠️  Production Deployment:${NC}"
echo "  • Use a reverse proxy (nginx/caddy) with SSL"
echo "  • Set up automated backups"
echo "  • Configure firewall rules"
echo "  • See docs/deployment.md for details"
echo ""
