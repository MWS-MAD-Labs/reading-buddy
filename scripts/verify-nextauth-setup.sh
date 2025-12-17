#!/bin/bash

# Verification script for NextAuth setup completion
# This script checks if all components are properly configured

echo "🔍 Verifying NextAuth Setup..."
echo ""

# Check 1: Database running
echo "1️⃣ Checking PostgreSQL database..."
if docker ps | grep -q reading-buddy-postgres; then
  echo "   ✅ PostgreSQL container is running"
else
  echo "   ❌ PostgreSQL container is not running"
  echo "   Run: cd web && docker compose -f ../docker-compose.selfhosted.yml up -d postgres"
  exit 1
fi

# Check 2: Database tables
echo ""
echo "2️⃣ Checking database tables..."
TABLE_COUNT=$(docker exec reading-buddy-postgres psql -U reading_buddy -d reading_buddy -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)
if [ "$TABLE_COUNT" -ge 25 ]; then
  echo "   ✅ Database has $TABLE_COUNT tables (expected 25+)"
else
  echo "   ❌ Database has only $TABLE_COUNT tables"
  echo "   Run: ./scripts/init-local-database.sh"
  exit 1
fi

# Check 3: NextAuth environment variables
echo ""
echo "3️⃣ Checking environment variables..."
cd web
if grep -q "NEXTAUTH_SECRET=" .env.local && [ -n "$(grep "NEXTAUTH_SECRET=" .env.local | cut -d'=' -f2)" ]; then
  echo "   ✅ NEXTAUTH_SECRET is set"
else
  echo "   ❌ NEXTAUTH_SECRET is missing"
  exit 1
fi

if grep -q "NEXTAUTH_URL=" .env.local && [ -n "$(grep "NEXTAUTH_URL=" .env.local | cut -d'=' -f2)" ]; then
  echo "   ✅ NEXTAUTH_URL is set"
else
  echo "   ❌ NEXTAUTH_URL is missing"
  exit 1
fi

# Check 4: Google OAuth credentials
echo ""
echo "4️⃣ Checking Google OAuth credentials..."
GOOGLE_CLIENT_ID=$(grep "GOOGLE_CLIENT_ID=" .env.local | cut -d'=' -f2)
GOOGLE_CLIENT_SECRET=$(grep "GOOGLE_CLIENT_SECRET=" .env.local | cut -d'=' -f2)

if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  echo "   ✅ Google OAuth credentials are configured"
  READY_TO_TEST=true
else
  echo "   ⚠️  Google OAuth credentials are EMPTY"
  echo "   📝 You need to add your Google OAuth credentials to test login"
  echo "   📖 See: GOOGLE_OAUTH_SETUP.md for instructions"
  READY_TO_TEST=false
fi

# Check 5: LoginForm component
echo ""
echo "5️⃣ Checking LoginForm component..."
if grep -q "next-auth/react" src/components/auth/LoginForm.tsx; then
  echo "   ✅ LoginForm is using NextAuth"
else
  echo "   ❌ LoginForm is still using Supabase"
  echo "   Run: cp src/components/auth/LoginForm.nextauth.tsx src/components/auth/LoginForm.tsx"
  exit 1
fi

# Check 6: SessionProvider in layout
echo ""
echo "6️⃣ Checking SessionProvider integration..."
if grep -q "NextAuthProvider" src/app/layout.tsx; then
  echo "   ✅ NextAuthProvider is in root layout"
else
  echo "   ❌ NextAuthProvider is missing from layout"
  exit 1
fi

# Check 7: NextAuth API route
echo ""
echo "7️⃣ Checking NextAuth API route..."
if [ -f "src/app/api/auth/[...nextauth]/route.ts" ]; then
  echo "   ✅ NextAuth API route exists"
else
  echo "   ❌ NextAuth API route is missing"
  exit 1
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SETUP STATUS SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ PostgreSQL Database: Ready"
echo "✅ Database Schema: Initialized (${TABLE_COUNT} tables)"
echo "✅ NextAuth Configuration: Complete"
echo "✅ SessionProvider: Integrated"
echo "✅ LoginForm Component: Using NextAuth"
echo "✅ API Routes: Configured"
echo ""

if [ "$READY_TO_TEST" = true ]; then
  echo "🎉 READY TO TEST! 🎉"
  echo ""
  echo "Next steps:"
  echo "1. Start dev server: npm run dev"
  echo "2. Open: http://localhost:3000/login"
  echo "3. Click 'Sign in with Google'"
  echo "4. Login with your @millennia21.id account"
  echo ""
  echo "To verify users are in local database:"
  echo "docker exec -it reading-buddy-postgres psql -U postgres -d readingbuddy -c \"SELECT email, name FROM users;\""
else
  echo "⚠️  ALMOST READY - Google OAuth Credentials Needed"
  echo ""
  echo "To complete setup:"
  echo "1. Follow instructions in: GOOGLE_OAUTH_SETUP.md"
  echo "2. Get credentials from: https://console.cloud.google.com/"
  echo "3. Add to web/.env.local:"
  echo "   GOOGLE_CLIENT_ID=your-client-id-here"
  echo "   GOOGLE_CLIENT_SECRET=your-client-secret-here"
  echo "4. Run this script again to verify"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
