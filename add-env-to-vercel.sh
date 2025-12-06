#!/bin/bash

# Script to add environment variables from .env to Vercel
# Usage: ./add-env-to-vercel.sh

echo "🔧 Adding environment variables to Vercel..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your environment variables first."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed!"
    echo "Install it with: npm install -g vercel"
    exit 1
fi

# Read .env file and extract VITE_SUPABASE variables
VITE_SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
VITE_SUPABASE_PUBLISHABLE_KEY=$(grep "^VITE_SUPABASE_PUBLISHABLE_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

# Also check for alternative names
if [ -z "$VITE_SUPABASE_URL" ]; then
    VITE_SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    VITE_SUPABASE_PUBLISHABLE_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

# Check if variables are found
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo "❌ Could not find required environment variables in .env file!"
    echo "Required variables:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)"
    exit 1
fi

echo "✅ Found environment variables:"
echo "  VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:0:30}..."
echo "  VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY:0:30}..."
echo ""

# Add to Vercel
echo "📤 Adding to Vercel..."

vercel env add VITE_SUPABASE_URL production <<< "$VITE_SUPABASE_URL" || echo "⚠️  Failed to add VITE_SUPABASE_URL (might already exist)"
vercel env add VITE_SUPABASE_URL preview <<< "$VITE_SUPABASE_URL" || echo "⚠️  Failed to add VITE_SUPABASE_URL (might already exist)"
vercel env add VITE_SUPABASE_URL development <<< "$VITE_SUPABASE_URL" || echo "⚠️  Failed to add VITE_SUPABASE_URL (might already exist)"

vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production <<< "$VITE_SUPABASE_PUBLISHABLE_KEY" || echo "⚠️  Failed to add VITE_SUPABASE_PUBLISHABLE_KEY (might already exist)"
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY preview <<< "$VITE_SUPABASE_PUBLISHABLE_KEY" || echo "⚠️  Failed to add VITE_SUPABASE_PUBLISHABLE_KEY (might already exist)"
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY development <<< "$VITE_SUPABASE_PUBLISHABLE_KEY" || echo "⚠️  Failed to add VITE_SUPABASE_PUBLISHABLE_KEY (might already exist)"

echo ""
echo "✅ Done! Environment variables have been added to Vercel."
echo ""
echo "📝 Next steps:"
echo "1. Go to Vercel Dashboard and verify the variables are set"
echo "2. Redeploy your application"
echo "   - Go to Deployments → Latest deployment → ⋯ → Redeploy"
echo "   - Or make a new commit and push to trigger automatic deployment"

