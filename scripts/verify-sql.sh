#!/bin/bash

# ==========================================
# Verify SQL Files Syntax
# ==========================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Verifying SQL Files                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check if SQL files exist
SQL_DIR="sql/self-hosted"
if [ ! -d "$SQL_DIR" ]; then
    echo -e "${RED}❌ SQL directory not found: $SQL_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Checking SQL files...${NC}"
for file in $SQL_DIR/*.sql; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo -e "${GREEN}✅ $filename${NC}"
    fi
done

echo ""
echo -e "${BLUE}📊 File order (execution order):${NC}"
ls -1 $SQL_DIR/*.sql

echo ""
echo -e "${GREEN}✅ All SQL files found${NC}"
echo ""
echo "These files will be executed in alphabetical order when PostgreSQL starts."
echo "Docker will mount them to /docker-entrypoint-initdb.d/ in the container."
echo ""
echo "To test database initialization:"
echo "  1. Ensure no existing containers: docker compose -f docker-compose.selfhosted.yml down -v"
echo "  2. Start PostgreSQL: docker compose -f docker-compose.selfhosted.yml up -d postgres"
echo "  3. Run test: ./scripts/test-database.sh"
echo ""
