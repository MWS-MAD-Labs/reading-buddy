#!/bin/bash

# Script to apply database migrations to Supabase
# Usage: ./apply-migration.sh [migration_file]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if .env.local exists
if [ ! -f "$SCRIPT_DIR/../web/.env.local" ]; then
    echo -e "${RED}Error: .env.local not found${NC}"
    echo "Please create web/.env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables
source "$SCRIPT_DIR/../web/.env.local"

# Check required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: Missing Supabase credentials${NC}"
    echo "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in web/.env.local"
    exit 1
fi

# Extract database connection details from Supabase URL
# Format: https://your-project.supabase.co -> postgres://postgres:[password]@db.your-project.supabase.co:5432/postgres
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Database Migration Helper${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Determine which migration to apply
if [ -z "$1" ]; then
    MIGRATION_FILE="$SCRIPT_DIR/001_quiz_enhancements.sql"
    echo -e "${YELLOW}No migration specified, using default: 001_quiz_enhancements.sql${NC}"
else
    MIGRATION_FILE="$SCRIPT_DIR/$1"
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}Migration file: $(basename $MIGRATION_FILE)${NC}"
echo ""

# Display instructions
echo -e "${YELLOW}To apply this migration, you have two options:${NC}"
echo ""
echo -e "${GREEN}Option 1: Supabase Dashboard (Recommended)${NC}"
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Copy the SQL from: $MIGRATION_FILE"
echo "3. Paste it into the SQL Editor"
echo "4. Click 'Run' or press Cmd/Ctrl + Enter"
echo ""
echo -e "${GREEN}Option 2: Direct Database Connection${NC}"
echo "You'll need your database password from Supabase Dashboard > Settings > Database"
echo ""
echo -e "${YELLOW}Would you like to see the migration file content? (y/n)${NC}"
read -r show_content

if [ "$show_content" = "y" ] || [ "$show_content" = "Y" ]; then
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Migration File Content:${NC}"
    echo -e "${YELLOW}========================================${NC}"
    cat "$MIGRATION_FILE"
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}End of Migration File${NC}"
    echo -e "${YELLOW}========================================${NC}"
fi

echo ""
echo -e "${YELLOW}Quick Copy Command:${NC}"
echo "cat $MIGRATION_FILE | pbcopy  # macOS"
echo "cat $MIGRATION_FILE | xclip -selection clipboard  # Linux"
echo ""

# Offer to open Supabase dashboard
echo -e "${YELLOW}Open Supabase SQL Editor in browser? (y/n)${NC}"
read -r open_browser

if [ "$open_browser" = "y" ] || [ "$open_browser" = "Y" ]; then
    DASHBOARD_URL="https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"

    # Try to open in browser
    if command -v open &> /dev/null; then
        # macOS
        open "$DASHBOARD_URL"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open "$DASHBOARD_URL"
    else
        echo "Please open this URL manually: $DASHBOARD_URL"
    fi

    echo -e "${GREEN}Dashboard opened!${NC}"
fi

echo ""
echo -e "${GREEN}Migration helper complete!${NC}"
