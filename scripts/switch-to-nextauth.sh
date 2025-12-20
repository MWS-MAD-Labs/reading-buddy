#!/bin/bash

# ==========================================
# Switch Login to NextAuth (Self-Hosted)
# ==========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Switching to NextAuth Login        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

cd /Users/faisalnurhidayat/reading-buddy/web/src

# Backup current LoginForm
echo -e "${BLUE}📦 Backing up current LoginForm...${NC}"
cp components/auth/LoginForm.tsx components/auth/LoginForm.supabase.backup.tsx

# Replace with NextAuth version
echo -e "${BLUE}🔄 Switching to NextAuth LoginForm...${NC}"
cp components/auth/LoginForm.nextauth.tsx components/auth/LoginForm.tsx

echo -e "${GREEN}✅ Login switched to NextAuth!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Add Google OAuth credentials to web/.env.local:"
echo "   GOOGLE_CLIENT_ID=your-client-id"
echo "   GOOGLE_CLIENT_SECRET=your-secret"
echo ""
echo "2. Restart Next.js:"
echo "   cd web && npm run dev"
echo ""
echo "3. Test login at:"
echo "   http://localhost:3000/login"
echo ""
echo "To revert back to Supabase:"
echo "   cp components/auth/LoginForm.supabase.backup.tsx components/auth/LoginForm.tsx"
echo ""
