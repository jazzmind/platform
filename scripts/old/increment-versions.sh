#!/bin/bash
set -e

echo "📈 Incrementing package versions for republishing..."

# Check if we're in the platform directory
if [ ! -d "packages" ]; then
    echo "❌ Error: Run this script from the platform root directory"
    exit 1
fi

# Packages to increment
packages=("knowledgebase" "auth" "polysec" "r2dtax")

for package in "${packages[@]}"; do
    if [ -f "packages/$package/package.json" ]; then
        echo "📦 Incrementing @jazzmind/$package version..."
        
        cd "packages/$package"
        
        # Get current version
        current_version=$(npm pkg get version | tr -d '"')
        echo "  Current version: $current_version"
        
        # Increment patch version
        npm version patch --no-git-tag-version
        
        # Get new version
        new_version=$(npm pkg get version | tr -d '"')
        echo "  ✅ New version: $new_version"
        
        cd ../..
    else
        echo "  ❌ Package not found: packages/$package/package.json"
    fi
done

echo ""
echo "✅ Version increments complete!"
echo ""
echo "📋 Next steps:"
echo "1. 🔄 Re-run publishing: ./scripts/publish-packages.sh"
echo "2. 🔍 Verify packages appear in GitHub: https://github.com/jazzmind/platform/packages" 