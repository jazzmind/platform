# Package Architecture Guide

## 🏗️ How PolySec & Knowledgebase Work Together

### Development (Monorepo) vs Production (Published Packages)

## **Current Development Setup (Monorepo)**

```
platform/
├── packages/
│   ├── knowledgebase/           # @jazzmind/knowledgebase
│   │   ├── package.json         # "name": "@jazzmind/knowledgebase"
│   │   └── src/
│   └── polysec/                 # @jazzmind/polysec  
│       ├── package.json         # "name": "@jazzmind/polysec"
│       └── src/
```

**PolySec dependency:**
```json
{
  "dependencies": {
    "@jazzmind/knowledgebase": "workspace:*"  // Monorepo reference
  }
}
```

## **Production Deployment Scenarios**

### Scenario 1: Published NPM Packages

**Step 1: Publish knowledgebase**
```bash
cd packages/knowledgebase
npm publish  # Publishes @jazzmind/knowledgebase@1.0.0
```

**Step 2: Update PolySec dependency**
```json
{
  "dependencies": {
    "@jazzmind/knowledgebase": "^1.0.0"  // Published package
  }
}
```

**Step 3: Publish PolySec**
```bash
cd packages/polysec  
npm publish  # Publishes @jazzmind/polysec@1.0.0
```

### Scenario 2: End User Integration

**End user installs PolySec:**
```bash
npm install @jazzmind/polysec
# Automatically installs @jazzmind/knowledgebase as dependency
```

**End user uses PolySec:**
```tsx
import { PolySec, SecurityQuestionnaire } from '@jazzmind/polysec';

export default function MyApp() {
  return (
    <div>
      <h1>My Security Platform</h1>
      <PolySec organizationId="my-org" />
    </div>
  );
}
```

### Scenario 3: Corporate Internal Packages

**Private registry setup:**
```json
{
  "name": "@jazzmind/platform",
  "dependencies": {
    "@jazzmind/polysec": "^1.0.0",
    "@jazzmind/knowledgebase": "^1.0.0"
  }
}
```

## **Import Strategies**

### Current Issue & Solution

**❌ Problem:** Direct file imports don't work across packages
```tsx
// This breaks in production
import { DocumentService } from '../../../knowledgebase/src/lib/services/DocumentService';
```

**✅ Solution 1:** Proper package imports (when ready)
```tsx
import { DocumentService, SearchService } from '@jazzmind/knowledgebase';
```

**✅ Solution 2:** Current working approach (development)
```tsx
// Mock implementation in PolySec for immediate functionality
// Replace with real knowledgebase integration later
export class PolicyDocumentService {
  // Mock functionality that works now
}
```

## **Migration Path**

### Phase 1: Working Mock (Current) ✅
- PolySec has mock AI features
- Everything works standalone
- No complex dependencies

### Phase 2: Package Integration 🔄
- Import knowledgebase services properly
- Replace mocks with real functionality
- Enhanced AI capabilities

### Phase 3: Production Ready 🚀
- Published npm packages
- Full semantic search
- Real AI processing

## **Development Workflow**

### For Monorepo Development:
```bash
# Terminal 1: Knowledgebase (if needed)
cd packages/knowledgebase && npm run dev

# Terminal 2: PolySec
cd packages/polysec && npm run dev
```

### For Package Testing:
```bash
# Build knowledgebase
cd packages/knowledgebase && npm run build

# Link locally
npm link

# Link in polysec
cd ../polysec
npm link @jazzmind/knowledgebase
```

## **Current Status**

✅ **Working Now:**
- PolySec uploads, lists, and manages documents
- Security questionnaire with mock AI
- All UI components functional
- File upload/download working

🔄 **Next Steps:**
- Integrate real knowledgebase services
- Replace mocks with AI processing
- Add semantic search capabilities 