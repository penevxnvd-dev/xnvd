#!/bin/bash

# Local Backup Script
# Backs up important data locally before any operations

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${HOME}/.xnvd-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo -e "${BLUE}📦 Starting Local Backup...${NC}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_PATH}"

# Function to backup file or directory
backup_item() {
    local source=$1
    local dest=$2
    local description=$3
    
    if [ -e "$source" ]; then
        echo -e "${BLUE}📋 Backing up: ${description}${NC}"
        if [ -d "$source" ]; then
            cp -r "$source" "$dest" 2>/dev/null || {
                echo -e "${YELLOW}⚠️  Warning: Could not backup directory ${source}${NC}"
            }
        else
            cp "$source" "$dest" 2>/dev/null || {
                echo -e "${YELLOW}⚠️  Warning: Could not backup file ${source}${NC}"
            }
        fi
        echo -e "${GREEN}✅ ${description} backed up${NC}"
    else
        echo -e "${YELLOW}⚠️  ${description} not found, skipping...${NC}"
    fi
}

# Backup accounts export
echo -e "${BLUE}📊 Backing up accounts data...${NC}"
backup_item "accounts-export.json" "${BACKUP_PATH}/accounts-export.json" "Accounts JSON"
backup_item "accounts-export.csv" "${BACKUP_PATH}/accounts-export.csv" "Accounts CSV"
backup_item "accounts-export.md" "${BACKUP_PATH}/accounts-export.md" "Accounts Markdown"
backup_item "ACCOUNTS_EXTRACTED.md" "${BACKUP_PATH}/ACCOUNTS_EXTRACTED.md" "Accounts Report"

# Backup environment files (if they exist and are readable)
echo ""
echo -e "${BLUE}🔐 Backing up environment configuration...${NC}"
if [ -f ".env" ] && [ -r ".env" ]; then
    backup_item ".env" "${BACKUP_PATH}/.env" "Environment variables"
else
    echo -e "${YELLOW}⚠️  .env file not accessible, skipping...${NC}"
fi

if [ -f ".env.example" ]; then
    backup_item ".env.example" "${BACKUP_PATH}/.env.example" "Environment example"
fi

# Backup configuration files
echo ""
echo -e "${BLUE}⚙️  Backing up configuration files...${NC}"
backup_item "supabase/config.toml" "${BACKUP_PATH}/supabase-config.toml" "Supabase config"
backup_item "package.json" "${BACKUP_PATH}/package.json" "Package configuration"
backup_item "vite.config.ts" "${BACKUP_PATH}/vite.config.ts" "Vite configuration"
backup_item "tsconfig.json" "${BACKUP_PATH}/tsconfig.json" "TypeScript configuration"

# Backup important documentation
echo ""
echo -e "${BLUE}📚 Backing up documentation...${NC}"
backup_item "README.md" "${BACKUP_PATH}/README.md" "README"
backup_item "SUPABASE_CONNECTION.md" "${BACKUP_PATH}/SUPABASE_CONNECTION.md" "Supabase connection docs"
backup_item "ACCOUNT_TESTING_SUMMARY.md" "${BACKUP_PATH}/ACCOUNT_TESTING_SUMMARY.md" "Account testing docs"

# Create backup manifest
echo ""
echo -e "${BLUE}📝 Creating backup manifest...${NC}"
cat > "${BACKUP_PATH}/BACKUP_MANIFEST.txt" << EOF
Backup Manifest
===============
Created: $(date)
Backup Name: ${BACKUP_NAME}
Backup Path: ${BACKUP_PATH}

Contents:
$(ls -lh "${BACKUP_PATH}" | tail -n +2)

System Information:
- OS: $(uname -s)
- Hostname: $(hostname)
- User: $(whoami)
- Git Branch: $(git branch --show-current 2>/dev/null || echo "N/A")
- Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")

EOF
echo -e "${GREEN}✅ Manifest created${NC}"

# Create symlink to latest backup
echo ""
echo -e "${BLUE}🔗 Creating latest backup symlink...${NC}"
ln -sfn "${BACKUP_NAME}" "${BACKUP_DIR}/latest"
echo -e "${GREEN}✅ Latest backup link created${NC}"

# Clean old backups (keep last 10)
echo ""
echo -e "${BLUE}🧹 Cleaning old backups (keeping last 10)...${NC}"
cd "${BACKUP_DIR}"
backup_count=$(ls -d backup_* 2>/dev/null | wc -l)
if [ "$backup_count" -gt 10 ]; then
    ls -dt backup_* | tail -n +11 | xargs rm -rf
    removed=$((backup_count - 10))
    echo -e "${GREEN}✅ Removed ${removed} old backup(s)${NC}"
else
    echo -e "${GREEN}✅ No old backups to remove (${backup_count} backups total)${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Local Backup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Backup Location: ${BACKUP_PATH}${NC}"
echo -e "${BLUE}Latest Backup: ${BACKUP_DIR}/latest${NC}"
echo -e "${BLUE}Total Backups: $(ls -d ${BACKUP_DIR}/backup_* 2>/dev/null | wc -l)${NC}"
echo ""

