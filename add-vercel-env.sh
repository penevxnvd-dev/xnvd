#!/bin/bash

# Quick script to add environment variables to Vercel
# Usage: ./add-vercel-env.sh

echo "🔧 Adding environment variables to Vercel project: prj_RT8Q5sx6F4mQx6Rdi2SJMvNUu85b"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed!"
    echo "Install it with: npm install -g vercel"
    exit 1
fi

echo "Please enter your Supabase credentials:"
echo ""

# Prompt for VITE_SUPABASE_URL
read -p "Enter VITE_SUPABASE_URL: " SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ VITE_SUPABASE_URL is required!"
    exit 1
fi

# Prompt for VITE_SUPABASE_PUBLISHABLE_KEY
read -p "Enter VITE_SUPABASE_PUBLISHABLE_KEY: " SUPABASE_KEY
if [ -z "$SUPABASE_KEY" ]; then
    echo "❌ VITE_SUPABASE_PUBLISHABLE_KEY is required!"
    exit 1
fi

echo ""
echo "📤 Adding environment variables to Vercel..."

# Add to all environments
echo "$SUPABASE_URL" | vercel env add VITE_SUPABASE_URL production
echo "$SUPABASE_URL" | vercel env add VITE_SUPABASE_URL preview
echo "$SUPABASE_URL" | vercel env add VITE_SUPABASE_URL development

echo "$SUPABASE_KEY" | vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
echo "$SUPABASE_KEY" | vercel env add VITE_SUPABASE_PUBLISHABLE_KEY preview
echo "$SUPABASE_KEY" | vercel env add VITE_SUPABASE_PUBLISHABLE_KEY development

echo ""
echo "✅ Done! Environment variables have been added."
echo ""
echo "📝 Next steps:"
echo "1. Go to https://vercel.com/dashboard and verify the variables"
echo "2. Redeploy: Deployments → Latest → ⋯ → Redeploy"

