#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SetupTester {
  constructor() {
    this.testDir = path.join(process.cwd(), 'test-projects');
    this.errors = [];
  }

  log(message) {
    console.log(`🧪 ${message}`);
  }

  error(message) {
    const errorMsg = `❌ ${message}`;
    console.error(errorMsg);
    this.errors.push(errorMsg);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  async runTest() {
    this.log('Starting setup system tests...\n');

    try {
      // Clean up any existing test directory
      if (fs.existsSync(this.testDir)) {
        fs.rmSync(this.testDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.testDir, { recursive: true });

      // Test 1: Verify source rules exist
      await this.testSourceRulesExist();

      // Test 2: Test script permissions
      await this.testScriptPermissions();

      // Test 3: Test Node.js requirements
      await this.testNodeRequirements();

      // Test 4: Test rule flattening logic (without full project creation)
      await this.testRuleFlattening();

      // Report results
      this.reportResults();

    } catch (error) {
      this.error(`Test suite failed: ${error.message}`);
    } finally {
      // Clean up
      if (fs.existsSync(this.testDir)) {
        fs.rmSync(this.testDir, { recursive: true, force: true });
      }
    }
  }

  async testSourceRulesExist() {
    this.log('Testing source rule availability...');

    const sharedRulesPath = path.join(__dirname, 'rules', 'shared');
    const businessRulesPath = path.join(__dirname, 'rules', 'business');

    if (!fs.existsSync(sharedRulesPath)) {
      this.error(`Shared rules directory not found: ${sharedRulesPath}`);
      return;
    }

    const sharedFiles = fs.readdirSync(sharedRulesPath, { recursive: true })
      .filter(file => file.endsWith('.mdc'));

    if (sharedFiles.length === 0) {
      this.error('No shared rule files (.mdc) found');
      return;
    }

    this.success(`Found ${sharedFiles.length} shared rule files`);

    if (fs.existsSync(businessRulesPath)) {
      const businessFiles = fs.readdirSync(businessRulesPath, { recursive: true })
        .filter(file => file.endsWith('.mdc'));
      this.success(`Found ${businessFiles.length} business rule files`);
    } else {
      this.log('Business rules directory not found (optional)');
    }
  }

  async testScriptPermissions() {
    this.log('Testing script permissions...');

    const mainScript = path.join(__dirname, 'create-project.js');
    const wrapperScript = path.join(__dirname, 'new-project');

    try {
      fs.accessSync(mainScript, fs.constants.F_OK | fs.constants.R_OK);
      this.success('Main script exists and is readable');
    } catch (error) {
      this.error('Main script not accessible');
      return;
    }

    try {
      fs.accessSync(wrapperScript, fs.constants.F_OK | fs.constants.R_OK);
      this.success('Wrapper script exists and is readable');
    } catch (error) {
      this.error('Wrapper script not accessible');
    }

    // Check if scripts are executable (Unix-like systems)
    if (process.platform !== 'win32') {
      try {
        const mainStats = fs.statSync(mainScript);
        const wrapperStats = fs.statSync(wrapperScript);
        
        if (mainStats.mode & parseInt('111', 8)) {
          this.success('Main script is executable');
        } else {
          this.error('Main script is not executable');
        }

        if (wrapperStats.mode & parseInt('111', 8)) {
          this.success('Wrapper script is executable');
        } else {
          this.error('Wrapper script is not executable');
        }
      } catch (error) {
        this.error(`Could not check script permissions: ${error.message}`);
      }
    }
  }

  async testNodeRequirements() {
    this.log('Testing Node.js requirements...');

    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion >= 18) {
        this.success(`Node.js version ${nodeVersion} is supported`);
      } else {
        this.error(`Node.js version ${nodeVersion} is too old (need 18+)`);
      }
    } catch (error) {
      this.error(`Could not check Node.js version: ${error.message}`);
    }

    // Check required modules
    const requiredModules = ['fs', 'path', 'readline'];
    for (const module of requiredModules) {
      try {
        require(module);
        this.success(`Module '${module}' is available`);
      } catch (error) {
        this.error(`Module '${module}' is not available`);
      }
    }
  }

  async testRuleFlattening() {
    this.log('Testing rule flattening logic...');

    // Create test rules structure
    const testRulesDir = path.join(this.testDir, 'test-rules');
    fs.mkdirSync(testRulesDir, { recursive: true });

    // Create nested test structure
    const subDir = path.join(testRulesDir, 'subdir');
    fs.mkdirSync(subDir);
    
    fs.writeFileSync(path.join(testRulesDir, 'test1.mdc'), 'test content 1');
    fs.writeFileSync(path.join(subDir, 'test2.mdc'), 'test content 2');

    // Test the flattening function by importing and using it
    const ProjectSetup = require('./create-project.js');
    const setup = new ProjectSetup();
    
    const targetDir = path.join(this.testDir, 'flattened');
    fs.mkdirSync(targetDir);

    try {
      await setup.copyRulesFlat(testRulesDir, targetDir);
      
      const flattenedFiles = fs.readdirSync(targetDir);
      
      if (flattenedFiles.includes('test1.mdc')) {
        this.success('Top-level rule file copied correctly');
      } else {
        this.error('Top-level rule file not found');
      }

      if (flattenedFiles.includes('subdir-test2.mdc')) {
        this.success('Nested rule file flattened correctly');
      } else {
        this.error('Nested rule file not flattened correctly');
      }

    } catch (error) {
      this.error(`Rule flattening failed: ${error.message}`);
    }
  }

  reportResults() {
    console.log('\n' + '='.repeat(50));
    
    if (this.errors.length === 0) {
      this.success('All tests passed! Setup system is ready to use.');
      console.log('\n🚀 To create a new project, run:');
      console.log('   ./setup/new-project');
    } else {
      this.error(`${this.errors.length} test(s) failed:`);
      this.errors.forEach(error => console.log(`   ${error}`));
      console.log('\n🔧 Please fix the issues above before using the setup system.');
    }
    
    console.log('='.repeat(50));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SetupTester();
  tester.runTest();
}

module.exports = SetupTester; 