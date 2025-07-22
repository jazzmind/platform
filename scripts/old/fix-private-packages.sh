#!/bin/bash
set -e

echo "🔧 Fixing private packages for publishing..."

# Check if we're in the platform directory
if [ ! -d "packages" ]; then
    echo "❌ Error: Run this script from the platform root directory"
    exit 1
fi

# Packages to fix
packages=("knowledgebase" "auth" "polysec" "r2dtax")

for package in "${packages[@]}"; do
    if [ -f "packages/$package/package.json" ]; then
        echo "📦 Fixing @jazzmind/$package..."
        
        # Remove private field from package.json
        # Use different sed syntax for different systems
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' '/"private": true,/d' "packages/$package/package.json"
            sed -i '' '/"private": true$/d' "packages/$package/package.json"
        else
            # Linux
            sed -i '/"private": true,/d' "packages/$package/package.json"
            sed -i '/"private": true$/d' "packages/$package/package.json"
        fi
        
        # Verify it was removed
        if grep -q '"private"' "packages/$package/package.json"; then
            echo "  ⚠️  Private field still present, manual removal needed"
        else
            echo "  ✅ Private field removed"
        fi
    else
        echo "  ❌ Package not found: packages/$package/package.json"
    fi
done

echo ""
echo "✅ Private field removal complete!"
echo ""
echo "📋 Next steps:"
echo "1. 🔄 Re-run publishing: ./scripts/publish-packages.sh"
echo "2. 🔍 Verify packages appear in GitHub: https://github.com/jazzmind/platform/packages"
echo "3. 🚀 Migrate intranet: cd ../intranet && ./scripts/migrate-to-github-packages.sh" 