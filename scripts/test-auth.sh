#!/bin/bash

# ==========================================
# Test NextAuth.js Authentication
# ==========================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Testing Authentication System      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check PostgreSQL is running
echo -e "${BLUE}🔍 Checking database...${NC}"
if ! docker compose -f docker-compose.selfhosted.yml exec -T postgres pg_isready -U reading_buddy > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not running${NC}"
    echo "Start it with: docker compose -f docker-compose.selfhosted.yml up -d postgres"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Test database connection
echo ""
echo -e "${BLUE}🔌 Testing database connection...${NC}"
TABLES=$(docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -t -c "SELECT COUNT(*) FROM users;" 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    echo -e "   Users table has: ${TABLES} rows"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

# Test signup API
echo ""
echo -e "${BLUE}📝 Testing signup API...${NC}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="testpassword123"
TEST_NAME="Test User"

SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\"}" \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$SIGNUP_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$SIGNUP_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Signup successful${NC}"
    echo -e "   Response: $RESPONSE_BODY"

    # Verify user was created in database
    USER_COUNT=$(docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -t -c "SELECT COUNT(*) FROM users WHERE email = '$TEST_EMAIL';")
    if [ "$USER_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ User created in database${NC}"
    else
        echo -e "${RED}❌ User not found in database${NC}"
    fi

    # Verify profile was created
    PROFILE_COUNT=$(docker compose -f docker-compose.selfhosted.yml exec -T postgres psql -U reading_buddy -d reading_buddy -t -c "SELECT COUNT(*) FROM profiles WHERE email = '$TEST_EMAIL';")
    if [ "$PROFILE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Profile created in database${NC}"
    else
        echo -e "${RED}❌ Profile not found in database${NC}"
    fi
else
    echo -e "${RED}❌ Signup failed (HTTP $HTTP_CODE)${NC}"
    echo -e "   Response: $RESPONSE_BODY"
fi

# Test NextAuth endpoints
echo ""
echo -e "${BLUE}🔐 Testing NextAuth endpoints...${NC}"

# Test CSRF token endpoint
CSRF_RESPONSE=$(curl -s http://localhost:3000/api/auth/csrf)
if echo "$CSRF_RESPONSE" | grep -q "csrfToken"; then
    echo -e "${GREEN}✅ CSRF endpoint working${NC}"
else
    echo -e "${RED}❌ CSRF endpoint failed${NC}"
fi

# Test providers endpoint
PROVIDERS_RESPONSE=$(curl -s http://localhost:3000/api/auth/providers)
if echo "$PROVIDERS_RESPONSE" | grep -q "google"; then
    echo -e "${GREEN}✅ Providers endpoint working${NC}"
    echo -e "   Available providers: Google, Credentials"
else
    echo -e "${RED}❌ Providers endpoint failed${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    Authentication test complete!    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo "Test user created:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo ""
echo "Next steps:"
echo "  1. Visit http://localhost:3000/login"
echo "  2. Sign in with the test user"
echo "  3. Check session includes role, XP, level"
echo ""
