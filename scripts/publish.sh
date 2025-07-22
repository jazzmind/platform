#!/bin/bash
set -e

# Enhanced publish script with selective publishing, version increments, and build testing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Help function
show_help() {
    echo "🚀 Smart Package Publisher"
    echo ""
    echo "Usage: $0 [options] [package1] [package2] ..."
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -a, --all           Publish all packages"
    echo "  -t, --test-only     Only test builds, don't publish"
    echo "  -s, --skip-build    Skip build testing (faster but risky)"
    echo "  -v, --version TYPE  Version increment type (patch|minor|major)"
    echo "  -f, --force         Force publish even if build fails"
    echo ""
    echo "Examples:"
    echo "  $0 knowledgebase polysec          # Publish specific packages"
    echo "  $0 -a                             # Publish all packages"
    echo "  $0 -t knowledgebase               # Test build only"
    echo "  $0 -v minor auth                  # Increment minor version for auth"
    echo ""
    echo "Available packages: knowledgebase, auth, polysec, r2dtax"
}

# Default values
PUBLISH_ALL=false
TEST_ONLY=false
SKIP_BUILD=false
VERSION_TYPE="patch"
FORCE_PUBLISH=false
PACKAGES=()
ALL_PACKAGES=("knowledgebase" "auth" "polysec" "r2dtax")

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -a|--all)
            PUBLISH_ALL=true
            shift
            ;;
        -t|--test-only)
            TEST_ONLY=true
            shift
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -v|--version)
            VERSION_TYPE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_PUBLISH=true
            shift
            ;;
        -*|--*)
            echo "Unknown option $1"
            show_help
            exit 1
            ;;
        *)
            PACKAGES+=("$1")
            shift
            ;;
    esac
done

# Check if we're in the right directory
if [ ! -d "packages" ]; then
    echo -e "${RED}❌ Error: Run this script from the platform root directory${NC}"
    exit 1
fi

# Check GitHub token (only required for publishing)
if [ -z "$GITHUB_TOKEN" ] && [ "$TEST_ONLY" = false ]; then
    echo -e "${RED}❌ Error: GITHUB_TOKEN environment variable not set${NC}"
    echo -e "${YELLOW}💡 Create a token at: https://github.com/settings/personal-access-tokens/new${NC}"
    exit 1
fi

# Determine which packages to process
if [ "$PUBLISH_ALL" = true ]; then
    TARGET_PACKAGES=("${ALL_PACKAGES[@]}")
elif [ ${#PACKAGES[@]} -eq 0 ]; then
    echo -e "${RED}❌ Error: No packages specified${NC}"
    echo "Use -a for all packages or specify package names"
    show_help
    exit 1
else
    TARGET_PACKAGES=("${PACKAGES[@]}")
fi

# Validate package names
for package in "${TARGET_PACKAGES[@]}"; do
    if [[ ! " ${ALL_PACKAGES[@]} " =~ " ${package} " ]]; then
        echo -e "${RED}❌ Error: Unknown package '${package}'${NC}"
        echo "Available packages: ${ALL_PACKAGES[*]}"
        exit 1
    fi
    
    if [ ! -d "packages/$package" ]; then
        echo -e "${RED}❌ Error: Package directory not found: packages/$package${NC}"
        exit 1
    fi
done

echo -e "${BLUE}🚀 Smart Package Publisher${NC}"
echo -e "${BLUE}=========================${NC}"
echo ""
echo -e "${YELLOW}📦 Target packages: ${TARGET_PACKAGES[*]}${NC}"
echo -e "${YELLOW}🔧 Version increment: ${VERSION_TYPE}${NC}"
echo -e "${YELLOW}🧪 Test builds: $([ "$SKIP_BUILD" = true ] && echo "No" || echo "Yes")${NC}"
echo -e "${YELLOW}📤 Publish: $([ "$TEST_ONLY" = true ] && echo "No (test only)" || echo "Yes")${NC}"
echo ""

# Configure npm for GitHub Packages
if [ "$TEST_ONLY" = false ]; then
    echo -e "${BLUE}🔧 Configuring npm for GitHub Packages...${NC}"
    npm config set @jazzmind:registry https://npm.pkg.github.com
    npm config set //npm.pkg.github.com/:_authToken ${GITHUB_TOKEN}
    
    # Test authentication
    echo -e "${BLUE}🔍 Testing GitHub authentication...${NC}"
    if ! curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user > /dev/null; then
        echo -e "${RED}❌ Error: GitHub token authentication failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ GitHub authentication successful${NC}"
    echo ""
fi

# Track results
SUCCESSFUL_PACKAGES=()
FAILED_PACKAGES=()
SKIPPED_PACKAGES=()

# Process each package
for package in "${TARGET_PACKAGES[@]}"; do
    echo -e "${BLUE}📦 Processing $package...${NC}"
    
    cd "packages/$package"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Error: package.json not found in packages/$package${NC}"
        FAILED_PACKAGES+=("$package")
        cd ../..
        continue
    fi
    
    # Remove private field if exists
    if grep -q '"private"' package.json; then
        echo -e "${YELLOW}  🔧 Removing private field...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' '/"private": true,/d' package.json
            sed -i '' '/"private": true$/d' package.json
        else
            sed -i '/"private": true,/d' package.json
            sed -i '/"private": true$/d' package.json
        fi
    fi
    
    # Configure package for publishing
    echo -e "${YELLOW}  🔧 Configuring for GitHub Packages...${NC}"
    npm pkg set name="@jazzmind/$package"
    npm pkg set publishConfig.registry="https://npm.pkg.github.com"
    npm pkg set repository.type="git"
    npm pkg set repository.url="git+https://github.com/jazzmind/platform.git"
    npm pkg set repository.directory="packages/$package"
    
    # Increment version
    current_version=$(npm pkg get version | tr -d '"')
    echo -e "${YELLOW}  📈 Current version: $current_version${NC}"
    
    if [ "$TEST_ONLY" = false ]; then
        npm version $VERSION_TYPE --no-git-tag-version
        new_version=$(npm pkg get version | tr -d '"')
        echo -e "${GREEN}  ✅ New version: $new_version${NC}"
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}  📥 Installing dependencies...${NC}"
        npm install --silent
    fi
    
    # Test build (unless skipped)
    BUILD_SUCCESS=true
    if [ "$SKIP_BUILD" = false ]; then
        echo -e "${YELLOW}  🏗️  Testing build...${NC}"
        if npm run build --silent 2>/dev/null; then
            echo -e "${GREEN}  ✅ Build successful${NC}"
        else
            echo -e "${RED}  ❌ Build failed${NC}"
            BUILD_SUCCESS=false
            
            if [ "$FORCE_PUBLISH" = false ] && [ "$TEST_ONLY" = false ]; then
                echo -e "${YELLOW}  ⏭️  Skipping publish due to build failure${NC}"
                SKIPPED_PACKAGES+=("$package (build failed)")
                cd ../..
                continue
            fi
        fi
    fi
    
    # Publish (unless test-only or build failed without force)
    if [ "$TEST_ONLY" = false ] && ([ "$BUILD_SUCCESS" = true ] || [ "$FORCE_PUBLISH" = true ]); then
        echo -e "${YELLOW}  📤 Publishing to GitHub Packages...${NC}"
        if npm publish --silent; then
            package_version=$(npm pkg get version | tr -d '"')
            echo -e "${GREEN}  ✅ @jazzmind/$package@$package_version published successfully${NC}"
            SUCCESSFUL_PACKAGES+=("$package@$package_version")
        else
            echo -e "${RED}  ❌ Failed to publish @jazzmind/$package${NC}"
            echo -e "${YELLOW}     This might be because the version already exists${NC}"
            FAILED_PACKAGES+=("$package (publish failed)")
        fi
    elif [ "$TEST_ONLY" = true ]; then
        if [ "$BUILD_SUCCESS" = true ]; then
            echo -e "${GREEN}  ✅ Test passed - ready for publishing${NC}"
            SUCCESSFUL_PACKAGES+=("$package (test passed)")
        else
            echo -e "${RED}  ❌ Test failed - build issues need fixing${NC}"
            FAILED_PACKAGES+=("$package (test failed)")
        fi
    fi
    
    cd ../..
    echo ""
done

# Summary
echo -e "${BLUE}🎉 Processing Complete!${NC}"
echo -e "${BLUE}=====================${NC}"
echo ""

if [ ${#SUCCESSFUL_PACKAGES[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ Successful packages:${NC}"
    for pkg in "${SUCCESSFUL_PACKAGES[@]}"; do
        echo -e "${GREEN}   • $pkg${NC}"
    done
    echo ""
fi

if [ ${#SKIPPED_PACKAGES[@]} -gt 0 ]; then
    echo -e "${YELLOW}⏭️  Skipped packages:${NC}"
    for pkg in "${SKIPPED_PACKAGES[@]}"; do
        echo -e "${YELLOW}   • $pkg${NC}"
    done
    echo ""
fi

if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
    echo -e "${RED}❌ Failed packages:${NC}"
    for pkg in "${FAILED_PACKAGES[@]}"; do
        echo -e "${RED}   • $pkg${NC}"
    done
    echo ""
fi

# Next steps
if [ "$TEST_ONLY" = false ] && [ ${#SUCCESSFUL_PACKAGES[@]} -gt 0 ]; then
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo -e "${BLUE}1. 🔍 Check packages at: https://github.com/jazzmind/platform/packages${NC}"
    echo -e "${BLUE}2. 🔄 Update intranet: cd ../intranet && ./scripts/migrate-to-github-packages.sh${NC}"
    echo -e "${BLUE}3. 🧪 Test intranet build: npm run build${NC}"
fi

# Exit with appropriate code
if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
    exit 1
else
    exit 0
fi 