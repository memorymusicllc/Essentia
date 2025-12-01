#!/bin/bash

# Essentia Audio Analysis Service - Cloudflare Workers Deployment Script

set -e

echo "🚀 Starting Essentia Audio Analysis deployment to Cloudflare Workers"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler auth status &> /dev/null; then
    echo "⚠️  Not logged in to Cloudflare. Please run:"
    echo "wrangler auth login"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm test

# Deploy to production
echo "🌐 Deploying to Cloudflare Workers..."
wrangler deploy

# Get the deployed URL
DEPLOYED_URL=$(wrangler deploy --dry-run 2>/dev/null | grep "https://" | head -1)

if [ -n "$DEPLOYED_URL" ]; then
    echo "✅ Deployment successful!"
    echo "🔗 Service URL: $DEPLOYED_URL"
    echo "🏥 Health check: $DEPLOYED_URL/health"
    echo "📚 MCP endpoint: $DEPLOYED_URL/mcp"
else
    echo "✅ Deployment completed (URL not available in dry-run)"
fi

# Instructions for next steps
echo ""
echo "📋 Next steps:"
echo "1. Set up R2 bucket in Cloudflare dashboard:"
echo "   - Go to R2 in Cloudflare dashboard"
echo "   - Create bucket named 'essentiajs'"
echo "   - Note the bucket ID for wrangler.toml"
echo ""
echo "2. Configure environment variables:"
echo "   - Copy .env.example to .env"
echo "   - Set POWER_PASS_SECRET and other secrets"
echo "   - Use 'wrangler secret put SECRET_NAME' for sensitive values"
echo ""
echo "3. Test the deployment:"
echo "   curl -X GET $DEPLOYED_URL/health"
echo ""
echo "4. Register with config.superbots.link:"
echo "   - The service will auto-register on first request"
echo "   - Check /registry/status endpoint for registration status"

echo ""
echo "🎉 Essentia Audio Analysis Service deployment complete!"

