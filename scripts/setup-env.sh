#!/bin/bash

# ==========================================
# Setup Environment Variables for Testing
# ==========================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Environment Setup for Testing      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Generate secure passwords
echo -e "${BLUE}🔐 Generating secure passwords...${NC}"
DB_PASSWORD=$(openssl rand -base64 24)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
MINIO_SECRET_KEY=$(openssl rand -base64 24)

# Create .env file for testing
cat > .env << EOF
# ==========================================
# Reading Buddy - Self-Hosted Configuration
# Auto-generated for testing
# ==========================================

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_PORT=3000

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=reading_buddy
DB_USER=reading_buddy
DB_PASSWORD=${DB_PASSWORD}

# NextAuth Configuration
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=http://localhost:3000

# OAuth Configuration (optional - leave empty for now)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# MinIO Storage Configuration
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
MINIO_BUCKET_NAME=reading-buddy

# AI Provider Configuration
AI_PROVIDER=cloud
GOOGLE_GEMINI_API_KEY=

# Email Configuration (Optional)
EMAIL_SERVER=
EMAIL_FROM=noreply@localhost

# Deployment Mode
DEPLOYMENT_MODE=selfhosted
EOF

echo -e "${GREEN}✅ .env file created${NC}"
echo ""
echo -e "${YELLOW}📝 Generated Credentials:${NC}"
echo "  DB_PASSWORD: ${DB_PASSWORD}"
echo "  NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}"
echo "  MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}"
echo ""
echo -e "${GREEN}✅ Environment is ready for testing${NC}"
echo ""
echo "Next steps:"
echo "  1. Review .env file if needed: cat .env"
echo "  2. Start services: docker compose -f docker-compose.selfhosted.yml up -d postgres"
echo "  3. Test database: ./scripts/test-database.sh"
echo ""
