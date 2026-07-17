#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Consolidates all package Prisma schemas into a single schema
 * This allows packages to remain standalone while sharing a database
 */

const PACKAGES_DIR = path.join(__dirname, '..', 'packages');
const WEBSITE_DIR = path.join(__dirname, '..', 'website');
const OUTPUT_SCHEMA = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function extractModelsAndEnums(schemaContent, packageName) {
  const lines = schemaContent.split('\n');
  const models = [];
  const enums = [];
  let currentBlock = null;
  let currentContent = [];
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip generator and datasource blocks
    if (trimmed.startsWith('generator ') || trimmed.startsWith('datasource ')) {
      // Skip until closing brace
      let skipBraces = 0;
      while (i < lines.length) {
        const skipLine = lines[i];
        if (skipLine.includes('{')) skipBraces++;
        if (skipLine.includes('}')) {
          skipBraces--;
          if (skipBraces === 0) break;
        }
        i++;
      }
      continue;
    }

    // Detect model or enum start
    if (trimmed.startsWith('model ') || trimmed.startsWith('enum ')) {
      if (currentBlock) {
        // Save previous block
        const blockContent = currentContent.join('\n');
        if (currentBlock === 'model') {
          models.push({ content: blockContent, package: packageName });
        } else if (currentBlock === 'enum') {
          enums.push({ content: blockContent, package: packageName });
        }
      }

      currentBlock = trimmed.startsWith('model ') ? 'model' : 'enum';
      currentContent = [line];
      braceCount = 0;
    } else if (currentBlock && line.trim()) {
      currentContent.push(line);
    }

    // Track braces
    if (currentBlock && line.includes('{')) braceCount++;
    if (currentBlock && line.includes('}')) {
      braceCount--;
      if (braceCount === 0) {
        // Block complete
        const blockContent = currentContent.join('\n');
        if (currentBlock === 'model') {
          models.push({ content: blockContent, package: packageName });
        } else if (currentBlock === 'enum') {
          enums.push({ content: blockContent, package: packageName });
        }
        currentBlock = null;
        currentContent = [];
      }
    }
  }

  return { models, enums };
}

// Legacy NextAuth-era models that no longer exist in the auth package after
// the better-auth migration. If any other package's schema still defines
// them, they are dropped during consolidation.
const LEGACY_AUTH_MODELS = new Set([
  'Authenticator',
  'PasskeyChallenge',
  'VerificationToken',
]);

// Lowercase models from knowledgebase that are superseded by PascalCase
// versions with @@map in polysec/r2dtax. Keeping both causes @@map/pkey
// collisions in Prisma 7+.
const SUPERSEDED_KB_MODELS = new Set([
  'policy_documents',
  'security_questions',
  'compliance_frameworks',
  'projects',
  'rd_activities',
  'time_entries',
  'rd_narratives',
  'evidence',
]);

function deduplicateModels(allModels) {
  const seen = new Map();
  const deduplicated = [];

  for (const model of allModels) {
    // Extract model name
    const match = model.content.match(/^(model|enum)\s+(\w+)/);
    if (!match) continue;

    const type = match[1];
    const name = match[2];
    const key = `${type}:${name}`;

    if (type === 'model' && LEGACY_AUTH_MODELS.has(name) && model.package !== 'auth/prisma') {
      console.log(`⚠️  Dropping legacy NextAuth model '${name}' from ${model.package}`);
      continue;
    }

    if (type === 'model' && SUPERSEDED_KB_MODELS.has(name)) {
      console.log(`⚠️  Dropping superseded lowercase model '${name}' from ${model.package}`);
      continue;
    }

    if (seen.has(key)) {
      console.log(`⚠️  Duplicate ${type} '${name}' found in ${model.package} (keeping first from ${seen.get(key).package})`);
      continue;
    }

    seen.set(key, model);
    deduplicated.push(model);
  }

  return deduplicated;
}

async function consolidateSchemas() {
  console.log('🔧 Consolidating Prisma schemas from all packages...');

  // Find all package schema files
  const packageSchemas = glob.sync('*/prisma/schema.prisma', { cwd: PACKAGES_DIR });
  const websiteSchema = path.join(WEBSITE_DIR, 'prisma', 'schema.prisma');

  // Process the auth package first so its canonical definitions of User,
  // Session, Account, Package, Role, Permission, RoleAssignment,
  // ResourceAccess, AuthAuditLog and the related enums win deduplication.
  // Any other package that redefines these models is a legacy copy and will
  // be dropped by the dedupe pass.
  packageSchemas.sort((a, b) => {
    const aAuth = a.startsWith('auth/') ? -1 : 0;
    const bAuth = b.startsWith('auth/') ? -1 : 0;
    if (aAuth !== bAuth) return aAuth - bAuth;
    return a.localeCompare(b);
  });

  let allModels = [];
  let allEnums = [];

  // Process package schemas
  for (const schemaPath of packageSchemas) {
    const fullPath = path.join(PACKAGES_DIR, schemaPath);
    const packageName = path.dirname(schemaPath);
    
    if (!fs.existsSync(fullPath)) continue;

    console.log(`📦 Processing ${packageName} schema...`);
    const content = fs.readFileSync(fullPath, 'utf8');
    const { models, enums } = extractModelsAndEnums(content, packageName);
    
    allModels.push(...models);
    allEnums.push(...enums);
  }

  // Process website schema
  if (fs.existsSync(websiteSchema)) {
    console.log('🌐 Processing website schema...');
    const content = fs.readFileSync(websiteSchema, 'utf8');
    const { models, enums } = extractModelsAndEnums(content, 'website');
    
    allModels.push(...models);
    allEnums.push(...enums);
  }

  // Deduplicate models and enums
  const uniqueModels = deduplicateModels([...allModels, ...allEnums]);

  // Generate consolidated schema
  const header = `// CONSOLIDATED PRISMA SCHEMA FOR PLATFORM MONOREPO
// Generated automatically by scripts/consolidate-schemas.js
// DO NOT EDIT MANUALLY - This file is auto-generated
//
// This schema combines models from all packages to enable shared database usage
// while keeping packages independent for standalone operation.

generator client {
  provider = "prisma-client"
  output   = "../packages/auth/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

`;

  const modelsByPackage = new Map();
  for (const model of uniqueModels) {
    if (!modelsByPackage.has(model.package)) {
      modelsByPackage.set(model.package, []);
    }
    modelsByPackage.get(model.package).push(model.content);
  }

  let consolidatedContent = header;

  // Add models grouped by package
  for (const [packageName, models] of modelsByPackage) {
    consolidatedContent += `// ============================================================================\n`;
    consolidatedContent += `// ${packageName.toUpperCase()} PACKAGE MODELS\n`;
    consolidatedContent += `// ============================================================================\n\n`;

    for (const modelContent of models) {
      consolidatedContent += modelContent + '\n\n';
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_SCHEMA);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write consolidated schema
  fs.writeFileSync(OUTPUT_SCHEMA, consolidatedContent);

  console.log(`✅ Consolidated schema written to ${OUTPUT_SCHEMA}`);
  console.log(`📊 Total models/enums: ${uniqueModels.length}`);
  console.log(`📦 Packages processed: ${modelsByPackage.size}`);

  return OUTPUT_SCHEMA;
}

// Run if called directly
if (require.main === module) {
  consolidateSchemas()
    .then(schemaPath => {
      console.log('🎉 Schema consolidation complete!');
      console.log(`\nNext steps:`);
      console.log(`1. Review the consolidated schema: ${schemaPath}`);
      console.log(`2. Run: npm run db:push`);
      console.log(`3. Or run: npm run db:migrate`);
    })
    .catch(error => {
      console.error('❌ Error consolidating schemas:', error);
      process.exit(1);
    });
}

module.exports = { consolidateSchemas }; 