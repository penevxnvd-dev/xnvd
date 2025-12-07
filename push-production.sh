#!/bin/bash
# Safe push script that runs tests before pushing to production

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Production Push Script${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if we're on main branch
if [ "$BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  Warning: You're not on 'main' branch (current: $BRANCH)${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Push cancelled."
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    git status --short
    echo ""
    read -p "Commit changes first? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Please commit your changes first:"
        echo "  git add -A"
        echo "  git commit -m 'Your message'"
        exit 1
    fi
fi

# Run tests
echo -e "${BLUE}📋 Step 1: Running tests...${NC}"
echo ""

# Test 1: Lint
echo "  → Running ESLint..."
if npm run lint > /tmp/lint-output.txt 2>&1; then
    echo -e "  ${GREEN}✅ Lint passed${NC}"
else
    echo -e "  ${RED}❌ Lint failed${NC}"
    cat /tmp/lint-output.txt | grep -E "(error|Error)" | head -10
    echo ""
    echo -e "${RED}Push aborted. Please fix lint errors.${NC}"
    exit 1
fi

# Test 2: TypeScript
echo "  → Running TypeScript type check..."
if npx tsc --noEmit > /tmp/tsc-output.txt 2>&1; then
    echo -e "  ${GREEN}✅ TypeScript check passed${NC}"
else
    echo -e "  ${RED}❌ TypeScript check failed${NC}"
    cat /tmp/tsc-output.txt | head -20
    echo ""
    echo -e "${RED}Push aborted. Please fix TypeScript errors.${NC}"
    exit 1
fi

# Test 3: Build
echo "  → Building for production..."
if npm run build > /tmp/build-output.txt 2>&1; then
    echo -e "  ${GREEN}✅ Build successful${NC}"
    BUILD_SIZE=$(du -sh dist | cut -f1)
    echo -e "  ${BLUE}   Build size: $BUILD_SIZE${NC}"
else
    echo -e "  ${RED}❌ Build failed${NC}"
    cat /tmp/build-output.txt | tail -30
    echo ""
    echo -e "${RED}Push aborted. Please fix build errors.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""

# Show what will be pushed
echo -e "${BLUE}📋 Step 2: Review changes to be pushed...${NC}"
echo ""
git log origin/main..HEAD --oneline 2>/dev/null || git log --oneline -5
echo ""

# Confirm push
read -p "Push to origin/$BRANCH? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Push cancelled."
    exit 1
fi

# Push
echo ""
echo -e "${BLUE}📋 Step 3: Pushing to origin/$BRANCH...${NC}"
if git push origin "$BRANCH"; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Successfully pushed to origin/$BRANCH${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "🚀 CI/CD will automatically deploy to production"
else
    echo ""
    echo -e "${RED}❌ Push failed${NC}"
    exit 1
fi

