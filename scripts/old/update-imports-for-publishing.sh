#!/bin/bash
set -e

echo "🔄 Updating imports for published packages..."

# Check if we're in the platform directory
if [ ! -d "packages" ]; then
    echo "❌ Error: Run this script from the platform root directory"
    exit 1
fi

# Update polysec imports
echo "📦 Updating polysec imports..."

# Update document-service.ts
sed -i '' 's/@platform\/knowledgebase/@jazzmind\/knowledgebase/g' packages/polysec/src/lib/services/document-service.ts

# Update polysec.tsx - replace file imports with package imports
sed -i '' "s|import { DocumentUpload } from '../../../knowledgebase/src/components/DocumentUpload';|import { DocumentUpload, DocumentList, DocumentViewer } from '@jazzmind/knowledgebase';|g" packages/polysec/src/components/polysec.tsx
sed -i '' "s|import { DocumentList } from '../../../knowledgebase/src/components/DocumentList';||g" packages/polysec/src/components/polysec.tsx
sed -i '' "s|import { DocumentViewer } from '../../../knowledgebase/src/components/DocumentViewer';||g" packages/polysec/src/components/polysec.tsx
sed -i '' "s|import type { ProcessingResult } from '../../../knowledgebase/src/lib/types';|import type { ProcessingResult } from '@jazzmind/knowledgebase';|g" packages/polysec/src/components/polysec.tsx

# Update any other files that might import from knowledgebase
find packages/polysec/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "@platform/knowledgebase" | while read file; do
    echo "  🔧 Updating $file"
    sed -i '' 's/@platform\/knowledgebase/@jazzmind\/knowledgebase/g' "$file"
done

# Update r2dtax imports if it uses knowledgebase
if [ -d "packages/r2dtax" ]; then
    echo "📦 Checking r2dtax for knowledgebase imports..."
    find packages/r2dtax/src -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "@platform/knowledgebase" 2>/dev/null | while read file; do
        echo "  🔧 Updating $file"
        sed -i '' 's/@platform\/knowledgebase/@jazzmind\/knowledgebase/g' "$file"
    done
fi

# Update auth imports if it uses knowledgebase
if [ -d "packages/auth" ]; then
    echo "📦 Checking auth for knowledgebase imports..."
    find packages/auth/src -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "@platform/knowledgebase" 2>/dev/null | while read file; do
        echo "  🔧 Updating $file"
        sed -i '' 's/@platform\/knowledgebase/@jazzmind\/knowledgebase/g' "$file"
    done
fi

echo ""
echo "✅ Import updates complete!"
echo ""
echo "📋 Files updated:"
echo "   • polysec/src/lib/services/document-service.ts"
echo "   • polysec/src/components/polysec.tsx"
echo "   • Any other files importing @platform/knowledgebase"
echo ""
echo "💡 Run this script before publishing packages to ensure correct imports" 