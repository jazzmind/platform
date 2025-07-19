# Database Management for Platform Monorepo

## Overview

This monorepo uses a **schema consolidation approach** that allows:
- ✅ **Independent package development** - Each package has its own Prisma schema
- ✅ **Standalone package operation** - Packages can run independently with their own schemas
- ✅ **Shared database in production** - All packages share a single database via consolidated schema

## How It Works

### Package-Level Schemas
Each package maintains its own `prisma/schema.prisma` with only the models it needs:
```
packages/
├── knowledgebase/prisma/schema.prisma  # FileData, Vector, Document models
├── polysec/prisma/schema.prisma        # PolicyDocument, SecurityQuestion models  
├── auth/prisma/schema.prisma           # User, Account, Session models
└── meetings/prisma/schema.prisma       # MeetingEvent, UserAvailability models
```

### Schema Consolidation Script
The `scripts/consolidate-schemas.js` script automatically:
1. Scans all package schemas
2. Extracts models and enums
3. Deduplicates identical models
4. Generates a consolidated schema at `prisma/schema.prisma`

## Setup & Usage

### 1. Environment Variables
Create a `.env` file in the platform root:
```bash
# Required for consolidated database operations
DATABASE_URL="postgresql://username:password@localhost:5432/platform_db"

# Optional: For packages using AI features
OPENAI_API_KEY=your_openai_api_key_here

# Optional: For packages using file storage  
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

### 2. Database Operations

#### Consolidate & Push Schema
```bash
# Consolidate all package schemas and push to database
npm run db:push
```

#### Generate Prisma Client
```bash
# Consolidate schemas and generate client
npm run db:generate
```

#### Create Migration
```bash
# Consolidate schemas and create migration
npm run db:migrate
```

#### Database Studio
```bash
# Open Prisma Studio with consolidated schema
npm run db:studio
```

#### Manual Consolidation
```bash
# Just consolidate schemas without database operations
npm run db:consolidate
```

### 3. Package Development Workflow

#### Standalone Package Development
```bash
cd packages/knowledgebase
npm run dev                    # Runs on localhost:3000
npm run db:push               # Uses package-specific schema
npm run db:generate           # Generates package-specific client
```

#### Monorepo Development
```bash
# From platform root
npm run dev:knowledgebase     # Runs knowledgebase package
npm run dev:polysec           # Runs polysec package
npm run db:push               # Uses consolidated schema for all packages
```

## Schema Consolidation Details

### Duplicate Handling
The consolidation script automatically handles duplicates:
- **Identical models**: Keeps the first occurrence, warns about duplicates
- **Model conflicts**: Manual resolution required (script will report conflicts)

### Package Isolation
Each package:
- Uses its own models in development
- Shares database tables in production  
- Maintains organizational isolation via `organizationId` fields

### Example Output
```bash
$ npm run db:consolidate

🔧 Consolidating Prisma schemas from all packages...
📦 Processing knowledgebase/prisma schema...
📦 Processing polysec/prisma schema...
📦 Processing auth/prisma schema...
⚠️  Duplicate model 'User' found in auth/prisma (keeping first)
✅ Consolidated schema written to /platform/prisma/schema.prisma
📊 Total models/enums: 44
📦 Packages processed: 6
```

## Benefits

### For Package Authors
- ✅ **Independent development** - Work on packages in isolation
- ✅ **Simple schemas** - Only include models you need
- ✅ **Standalone testing** - Test packages without full monorepo setup

### For Platform Operators  
- ✅ **Single database** - Easier to manage, backup, and scale
- ✅ **Cross-package queries** - Query across package boundaries when needed
- ✅ **Unified migrations** - Single migration history for all packages

### For Deployment
- ✅ **Production simplicity** - One database, one schema, one migration process
- ✅ **Package reusability** - Packages can be extracted and used elsewhere
- ✅ **Incremental adoption** - Add packages without breaking existing ones

## Troubleshooting

### Prisma Installation Issues
If you get errors during `npm install` about Prisma generation failing:
1. Run the Prisma fix script: `npm run db:fix`
2. Clean install: `npm install`
3. Generate client: `npm run db:generate`

This removes Prisma dependencies from individual packages to prevent auto-generation conflicts.

### Schema Conflicts
If the consolidation script reports model conflicts:
1. Review the conflicting models
2. Decide which version to keep
3. Update package schemas to resolve conflicts
4. Re-run consolidation

### Enum Value Errors
If you get "default value is not valid" errors:
1. Check that enum values match between packages
2. Ensure default values exist in the enum definition
3. Update package schemas to use consistent enum values

### Missing Tables
If a package can't find its tables:
1. Ensure package schema is correct
2. Run `npm run db:consolidate` to regenerate consolidated schema
3. Run `npm run db:push` to sync with database

### Development vs Production
- **Development**: Use package-specific schemas (`cd package && npm run db:push`)
- **Production**: Use consolidated schema (`npm run db:push` from root)

## Migration Guide

### From Separate Databases
1. Export data from individual package databases
2. Create consolidated schema: `npm run db:consolidate`  
3. Push to new database: `npm run db:push`
4. Import data into consolidated database
5. Update package connection strings to use shared `DATABASE_URL`

### Adding New Packages
1. Create package with its own `prisma/schema.prisma`
2. Develop and test package independently
3. Run `npm run db:consolidate` to include in shared schema
4. Run `npm run db:push` to update shared database 