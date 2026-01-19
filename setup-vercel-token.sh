#!/bin/bash

# Script to set up Vercel access token
# Usage: ./setup-vercel-token.sh

VERCEL_TOKEN="TIySKI61Vd2yme9Z5BERqjH4"

echo "🔧 Setting up Vercel access token..."
echo ""

# Method 1: Export as environment variable for current session
export VERCEL_TOKEN="$VERCEL_TOKEN"
echo "✅ Token set as VERCEL_TOKEN environment variable (for current session)"
echo ""

# Method 2: Add to .env file (if it exists and you want to use it locally)
if [ -f .env ]; then
    if grep -q "VERCEL_TOKEN=" .env; then
        echo "⚠️  VERCEL_TOKEN already exists in .env, updating..."
        sed -i "s|VERCEL_TOKEN=.*|VERCEL_TOKEN=$VERCEL_TOKEN|" .env
    else
        echo "" >> .env
        echo "# Vercel Access Token" >> .env
        echo "VERCEL_TOKEN=$VERCEL_TOKEN" >> .env
        echo "✅ Token added to .env file"
    fi
else
    echo "📝 Note: .env file not found, skipping .env update"
fi

# Method 3: Test with Vercel CLI using --token flag
echo ""
echo "🧪 Testing token with Vercel CLI..."
if vercel whoami --token "$VERCEL_TOKEN" 2>/dev/null; then
    echo "✅ Token is valid and working!"
else
    echo "⚠️  Token verification failed. The token might need to be verified in Vercel dashboard."
    echo "   You can still use it with: vercel <command> --token $VERCEL_TOKEN"
fi

echo ""
echo "📝 Usage examples:"
echo "   # Using environment variable:"
echo "   export VERCEL_TOKEN=\"$VERCEL_TOKEN\""
echo "   vercel whoami"
echo ""
echo "   # Using --token flag:"
echo "   vercel whoami --token \"$VERCEL_TOKEN\""
echo ""
echo "   # For CI/CD (GitHub Actions), add as secret:"
echo "   VERCEL_TOKEN: $VERCEL_TOKEN"
echo ""
