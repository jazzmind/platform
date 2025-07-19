#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Fixes Prisma dependencies in monorepo by:
 * 1. Removing @prisma/client and prisma from individual packages
 * 2. Modifying package scripts to prevent auto-generation
 * 3. Ensuring only root level has Prisma dependencies
 */

const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

function updatePackageJson(packagePath) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const packageName = path.basename(packagePath);
  
  let modified = false;

  // Remove Prisma dependencies
  if (packageJson.dependencies) {
    if (packageJson.dependencies['@prisma/client']) {
      console.log(`📦 Removing @prisma/client from ${packageName}`);
      delete packageJson.dependencies['@prisma/client'];
      modified = true;
    }
    if (packageJson.dependencies['prisma']) {
      console.log(`📦 Removing prisma from ${packageName}`);
      delete packageJson.dependencies['prisma'];
      modified = true;
    }
  }

  if (packageJson.devDependencies) {
    if (packageJson.devDependencies['@prisma/client']) {
      console.log(`📦 Removing @prisma/client from ${packageName} devDependencies`);
      delete packageJson.devDependencies['@prisma/client'];
      modified = true;
    }
    if (packageJson.devDependencies['prisma']) {
      console.log(`📦 Removing prisma from ${packageName} devDependencies`);
      delete packageJson.devDependencies['prisma'];
      modified = true;
    }
  }

  // Update scripts to prevent auto-generation during install
  if (packageJson.scripts) {
    // Remove postinstall prisma generate if it exists
    if (packageJson.scripts.postinstall && packageJson.scripts.postinstall.includes('prisma generate')) {
      console.log(`📦 Removing prisma generate from ${packageName} postinstall`);
      delete packageJson.scripts.postinstall;
      modified = true;
    }

    // Modify db:generate to warn about using root-level command
    if (packageJson.scripts['db:generate']) {
      packageJson.scripts['db:generate'] = 'echo "⚠️  Use root-level: npm run db:generate (from platform root)" && exit 1';
      console.log(`📦 Modified db:generate script in ${packageName}`);
      modified = true;
    }

    // Add root-level database commands as aliases
    if (packageJson.scripts['db:push']) {
      packageJson.scripts['db:push'] = 'echo "⚠️  Use root-level: npm run db:push (from platform root)" && exit 1';
      console.log(`📦 Modified db:push script in ${packageName}`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated ${packageName}/package.json`);
  }
}

function cleanNodeModules(packagePath) {
  const nodeModulesPath = path.join(packagePath, 'node_modules');
  const packageName = path.basename(packagePath);
  
  if (fs.existsSync(nodeModulesPath)) {
    console.log(`🧹 Cleaning node_modules in ${packageName}`);
    try {
      execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'inherit' });
    } catch (error) {
      console.warn(`⚠️  Could not clean node_modules in ${packageName}:`, error.message);
    }
  }
}

function updateRootPackageJson() {
  const rootPackageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
  
  let modified = false;

  // Ensure root has the necessary Prisma dependencies
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }

  // Add Prisma to root dependencies
  if (!packageJson.dependencies['@prisma/client']) {
    packageJson.dependencies['@prisma/client'] = '^5.0.0';
    modified = true;
    console.log('📦 Added @prisma/client to root dependencies');
  }

  if (!packageJson.devDependencies['prisma']) {
    packageJson.devDependencies['prisma'] = '^5.0.0';
    modified = true;
    console.log('📦 Added prisma to root devDependencies');
  }

  if (modified) {
    fs.writeFileSync(rootPackageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('✅ Updated root package.json');
  }
}

function updatePackageDbImports(packagePath) {
  const dbPath = path.join(packagePath, 'src', 'lib', 'db.ts');
  const packageName = path.basename(packagePath);
  
  if (fs.existsSync(dbPath)) {
    let content = fs.readFileSync(dbPath, 'utf8');
    
    // Update import to use the workspace root client
    const oldImport = "import { PrismaClient } from '@prisma/client';";
    const newImport = "import { PrismaClient } from '../../../../../node_modules/@prisma/client';";
    
    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      fs.writeFileSync(dbPath, content);
      console.log(`✅ Updated Prisma client import in ${packageName}/src/lib/db.ts`);
    }
  }
}

async function fixPrismaSetup() {
  console.log('🔧 Fixing Prisma dependencies in monorepo...\n');

  // Update root package.json first
  updateRootPackageJson();

  // Get all package directories
  const packages = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(PACKAGES_DIR, dirent.name));

  // Process each package
  for (const packagePath of packages) {
    const packageName = path.basename(packagePath);
    console.log(`\n📦 Processing ${packageName}...`);
    
    updatePackageJson(packagePath);
    updatePackageDbImports(packagePath);
    cleanNodeModules(packagePath);
  }

  console.log('\n🎉 Prisma monorepo fix complete!');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm run db:consolidate');
  console.log('3. Run: npm run db:generate');
  console.log('4. Test individual packages');
}

// Run if called directly
if (require.main === module) {
  fixPrismaSetup().catch(error => {
    console.error('❌ Error fixing Prisma setup:', error);
    process.exit(1);
  });
}

module.exports = { fixPrismaSetup }; 