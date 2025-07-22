#!/bin/bash
set -e

echo "🚀 Publishing platform packages to GitHub Packages..."

# Check if we're in the right directory
if [ ! -d "packages" ]; then
    echo "❌ Error: Run this script from the platform root directory"
    exit 1
fi

# Check GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN environment variable not set"
    echo "💡 Create a token at: https://github.com/settings/personal-access-tokens/new"
    echo "   Required permissions: Contents (read/write), Packages (write), Metadata (read)"
    exit 1
fi

# Configure npm
echo "🔧 Configuring npm for GitHub Packages..."
npm config set @jazzmind:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken ${GITHUB_TOKEN}

# Test authentication
echo "🔍 Testing GitHub authentication..."
if ! curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user > /dev/null; then
    echo "❌ Error: GitHub token authentication failed"
    echo "💡 Check your token permissions and expiration"
    exit 1
fi
echo "✅ GitHub authentication successful"

# Packages to publish
packages=("knowledgebase" "auth" "polysec" "r2dtax" "shared")

for package in "${packages[@]}"; do
    echo ""
    echo "📦 Publishing @jazzmind/$package..."
    
    cd packages/$package
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo "❌ Error: package.json not found in packages/$package"
        cd ../..
        continue
    fi
    
    # Update package configuration
    echo "  🔧 Configuring package for publishing..."
    npm pkg set name="@jazzmind/$package"
    npm pkg set publishConfig.registry="https://npm.pkg.github.com"
    npm pkg set repository.type="git"
    npm pkg set repository.url="git+https://github.com/jazzmind/platform.git"
    npm pkg set repository.directory="packages/$package"
    
    # Set version if not exists
    if [ "$(npm pkg get version)" = "\"\"" ]; then
        npm pkg set version="1.0.0"
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "  📥 Installing dependencies..."
        npm install
    fi
    
    # Build if build script exists
    if npm run --silent build 2>/dev/null; then
        echo "  🏗️  Building package..."
    fi
    
    # Publish package
    echo "  📤 Publishing to GitHub Packages..."
    if npm publish; then
        echo "  ✅ @jazzmind/$package published successfully"
        
        # Show package info
        package_version=$(npm pkg get version | tr -d '"')
        echo "     Version: $package_version"
        echo "     Registry: https://npm.pkg.github.com"
    else
        echo "  ❌ Failed to publish @jazzmind/$package"
        echo "     This might be because the version already exists"
        echo "     Try incrementing the version with: npm version patch"
    fi
    
    cd ../..
done

echo ""
echo "🎉 Package publishing complete!"
echo ""
echo "📦 Published packages:"
for package in "${packages[@]}"; do
    echo "   • @jazzmind/$package"
done
echo ""
echo "📋 Next steps:"
echo "1. 🔄 Update your intranet dependencies to use @jazzmind/* packages"
echo "2. 📄 Create .npmrc in your intranet project"
echo "3. 🧪 Test installation with: npm install"
echo "4. ☁️  Deploy to production"
echo ""
echo "💡 To update intranet, run: cd ../intranet && ./scripts/migrate-to-github-packages.sh" 