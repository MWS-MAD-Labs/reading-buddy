#!/bin/bash

# ==========================================
# Reading Buddy - Database Backup Script
# ==========================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="reading-buddy-postgres"
DB_NAME="${DB_NAME:-reading_buddy}"
DB_USER="${DB_USER:-reading_buddy}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Reading Buddy Database Backup      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ PostgreSQL container is not running${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Creating backup...${NC}"

# Backup database
BACKUP_FILE="${BACKUP_DIR}/reading_buddy_${DATE}.sql"
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database backup created: ${BACKUP_FILE}${NC}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

# Compress backup
echo -e "${BLUE}🗜️  Compressing backup...${NC}"
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

if [ -f "$COMPRESSED_FILE" ]; then
    SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup compressed: ${COMPRESSED_FILE} (${SIZE})${NC}"
else
    echo -e "${RED}❌ Compression failed${NC}"
    exit 1
fi

# Backup MinIO data (optional)
echo ""
echo -e "${BLUE}📁 Backing up MinIO data...${NC}"
MINIO_BACKUP="${BACKUP_DIR}/minio_${DATE}.tar.gz"
docker exec reading-buddy-minio sh -c 'tar czf - /data' > "$MINIO_BACKUP"

if [ $? -eq 0 ]; then
    MINIO_SIZE=$(du -h "$MINIO_BACKUP" | cut -f1)
    echo -e "${GREEN}✅ MinIO backup created: ${MINIO_BACKUP} (${MINIO_SIZE})${NC}"
else
    echo -e "${YELLOW}⚠️  MinIO backup failed (non-critical)${NC}"
fi

# Cleanup old backups (keep last 30 days)
echo ""
echo -e "${BLUE}🧹 Cleaning up old backups...${NC}"
find "$BACKUP_DIR" -name "reading_buddy_*.sql.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "minio_*.tar.gz" -mtime +30 -delete
echo -e "${GREEN}✅ Old backups cleaned${NC}"

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    Backup completed successfully    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo "Backup files:"
echo "  • Database: ${COMPRESSED_FILE}"
echo "  • MinIO: ${MINIO_BACKUP}"
echo ""
echo "To restore:"
echo "  ./scripts/restore.sh ${COMPRESSED_FILE}"
echo ""
