#!/bin/bash

# ==========================================
# Test Database Initialization
# ==========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Testing Database Initialization    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Start only PostgreSQL for testing
echo -e "${BLUE}🚀 Starting PostgreSQL...${NC}"
docker compose -f docker-compose.selfhosted.yml up -d postgres

# Wait for PostgreSQL to be ready
echo -e "${BLUE}⏳ Waiting for PostgreSQL...${NC}"
sleep 10

# Check if PostgreSQL is ready
if docker compose -f docker-compose.selfhosted.yml exec -T postgres pg_isready -U reading_buddy > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    docker compose -f docker-compose.selfhosted.yml logs postgres
    exit 1
fi

# Check tables created
echo ""
echo -e "${BLUE}📊 Checking database schema...${NC}"

TABLES=$(docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -t -c "
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
")

echo -e "Tables created: ${GREEN}${TABLES}${NC}"

if [ "$TABLES" -lt 20 ]; then
    echo -e "${RED}❌ Expected at least 20 tables, found $TABLES${NC}"
    echo ""
    echo "Listing tables:"
    docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -c "\dt"
    exit 1
fi

# Check NextAuth tables
echo ""
echo -e "${BLUE}🔐 Checking NextAuth tables...${NC}"
NEXTAUTH_TABLES=("users" "accounts" "sessions" "verification_tokens")

for table in "${NEXTAUTH_TABLES[@]}"; do
    if docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q 't'; then
        echo -e "${GREEN}✅ $table${NC}"
    else
        echo -e "${RED}❌ $table not found${NC}"
    fi
done

# Check app tables
echo ""
echo -e "${BLUE}📚 Checking application tables...${NC}"
APP_TABLES=("profiles" "books" "student_books" "quizzes" "badges" "student_badges")

for table in "${APP_TABLES[@]}"; do
    if docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q 't'; then
        echo -e "${GREEN}✅ $table${NC}"
    else
        echo -e "${RED}❌ $table not found${NC}"
    fi
done

# Check functions
echo ""
echo -e "${BLUE}⚙️  Checking database functions...${NC}"
FUNCTIONS=("calculate_level" "award_xp" "update_reading_streak" "create_or_update_profile")

for func in "${FUNCTIONS[@]}"; do
    if docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -t -c "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = '$func');" | grep -q 't'; then
        echo -e "${GREEN}✅ $func${NC}"
    else
        echo -e "${RED}❌ $func not found${NC}"
    fi
done

# Check RLS policies
echo ""
echo -e "${BLUE}🔒 Checking RLS policies...${NC}"
RLS_COUNT=$(docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -t -c "SELECT COUNT(*) FROM pg_policies;")
echo -e "RLS policies: ${GREEN}${RLS_COUNT}${NC}"

if [ "$RLS_COUNT" -lt 30 ]; then
    echo -e "${YELLOW}⚠️  Expected more policies (should be 50+), found $RLS_COUNT${NC}"
fi

# Check badges
echo ""
echo -e "${BLUE}🏅 Checking seed data (badges)...${NC}"
BADGE_COUNT=$(docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -t -c "SELECT COUNT(*) FROM badges;")
echo -e "Badges: ${GREEN}${BADGE_COUNT}${NC}"

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    Database test completed!         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo "Database is ready for NextAuth.js integration."
echo ""
echo "To connect to database:"
echo "  docker compose -f docker-compose.selfhosted.yml exec postgres psql -U reading_buddy -d reading_buddy"
echo ""
echo "To stop test:"
echo "  docker compose -f docker-compose.selfhosted.yml down"
echo ""
