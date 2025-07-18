#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class ProjectSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async run() {
    console.log('🚀 Platform Project Setup');
    console.log('========================\n');

    try {
      // Get project details
      const projectName = await this.prompt('Project name: ');
      
      // Ask project type first to determine path
      console.log('\n📋 Project Type:');
      console.log('1. Standalone Project (complete independent project)');
      console.log('2. Package Project (for integration with monorepo platforms)');
      const projectTypeChoice = await this.prompt('Choose project type (1-2): ');

      let isPackageProject = false;
      let includeBusinessRules = false;
      let projectPath;

      switch (projectTypeChoice) {
        case '1':
          // Standalone project - create as sibling to platform directory
          projectPath = path.resolve(process.cwd(), '..', projectName);
          console.log('\n📋 Include Business Documentation Rules?');
          const includeBusiness = await this.prompt('Include business rules for presentations and documentation? (y/n): ');
          includeBusinessRules = includeBusiness.toLowerCase().startsWith('y');
          break;
        case '2':
          // Package project - create in packages subdirectory
          isPackageProject = true;
          projectPath = path.resolve(process.cwd(), 'packages', projectName);
          break;
        default:
          console.log('❌ Invalid choice');
          process.exit(1);
      }

      if (fs.existsSync(projectPath)) {
        console.log(`❌ Directory ${projectName} already exists!`);
        process.exit(1);
      }

      // Ask about Claude Code integration
      console.log('\n🤖 AI Development Tools:');
      const useClaudeFlow = await this.prompt('Include Claude Code & claude-flow integration? (y/n): ');
      const includeClaudeFlow = useClaudeFlow.toLowerCase().startsWith('y');

      // Create project
      await this.createProject({
        projectName,
        projectPath,
        isPackageProject,
        includeBusinessRules,
        includeClaudeFlow
      });

      console.log(`\n✅ Project ${projectName} created successfully!`);
      console.log(`📁 Location: ${projectPath}`);
      
      if (isPackageProject) {
        console.log('\n📦 Package Project Notes:');
        console.log('- Created in packages/ subdirectory');
        console.log('- Inherits cursor rules from platform project');
        console.log('- Configured for turbo monorepo integration');
        console.log('- Can run standalone: npm run dev');
        console.log('- Can be imported into composition platforms');
        console.log('- Uses dual-mode architecture pattern');
      } else {
        console.log('\n🚀 Standalone Project Notes:');
        console.log('- Created as sibling to platform directory');
        console.log('- Complete independent Next.js application');
        console.log('- Includes copy of platform cursor rules');
        console.log('- Ready for immediate development');
        console.log('\n🔄 To sync rules later, run: npm run sync-rules');
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      this.rl.close();
    }
  }

  async createProject(config) {
    const { projectPath, projectName, isPackageProject, includeBusinessRules, includeClaudeFlow } = config;

    // Ensure packages directory exists for package projects
    if (isPackageProject) {
      const packagesDir = path.dirname(projectPath);
      fs.mkdirSync(packagesDir, { recursive: true });
    }

    // Create project directory
    fs.mkdirSync(projectPath, { recursive: true });

    // Setup cursor rules (only for standalone projects - packages inherit from platform)
    if (!isPackageProject) {
      await this.setupCursorRules(projectPath, includeBusinessRules);
    }

    // Setup project structure
    if (isPackageProject) {
      await this.setupPackageProject(projectPath, projectName, includeClaudeFlow);
    } else {
      await this.setupStandaloneProject(projectPath, projectName, includeClaudeFlow);
    }

    // Create sync script (only for standalone projects - packages inherit from platform)
    if (!isPackageProject) {
      await this.createSyncScript(projectPath);
    }

    // Create README
    await this.createReadme(projectPath, config);
  }

  async setupCursorRules(projectPath, includeBusinessRules) {
    const rulesDir = path.join(projectPath, '.cursor', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });

    // Copy shared rules (always included)
    const sharedRulesPath = path.join(__dirname, 'rules', 'shared');
    await this.copyRulesFlat(sharedRulesPath, rulesDir);

    // Copy business rules if requested
    if (includeBusinessRules) {
      const businessRulesPath = path.join(__dirname, 'rules', 'business');
      await this.copyRulesFlat(businessRulesPath, rulesDir);
    }

    console.log('📋 Cursor rules installed');
  }

  async copyRulesFlat(sourceDir, targetDir, prefix = '') {
    if (!fs.existsSync(sourceDir)) return;

    const items = fs.readdirSync(sourceDir);
    
    for (const item of items) {
      const sourcePath = path.join(sourceDir, item);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        // Recurse into subdirectories
        await this.copyRulesFlat(sourcePath, targetDir, prefix + item + '-');
      } else if (item.endsWith('.mdc')) {
        // Copy rule file with flattened name
        const targetName = prefix + item;
        const targetPath = path.join(targetDir, targetName);
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  async setupPackageProject(projectPath, projectName, includeClaudeFlow) {
    // Create package.json for dual-mode package
    const packageJson = {
      name: projectName,
      version: "0.1.0",
      private: true,
      main: "src/index.ts",
      types: "src/index.ts",
      scripts: {
        "build": "next build",
        "dev": "next dev",
        "lint": "next lint",
        "start": "next start",
        "export": "npm run build"
      },
      dependencies: {
        "next": "15.1.4",
        "react": "^19.0.0",
        "react-dom": "^19.0.0"
      },
      devDependencies: {
        "@types/node": "^20",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "eslint": "^8",
        "eslint-config-next": "15.1.4",
        "typescript": "^5",
        "turbo": "^2.3.3"
      },
      peerDependencies: {
        "next": "15.x",
        "react": "^19.0.0",
        "react-dom": "^19.0.0"
      }
    };

    if (includeClaudeFlow) {
      packageJson.devDependencies["claude-flow"] = "^2.0.0-alpha.53";
      packageJson.scripts["ai-init"] = "npx claude-flow@alpha init --force";
      packageJson.scripts["ai-dev"] = "npx claude-flow@alpha dev";
    }

    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create package structure for dual-mode operation
    const srcDir = path.join(projectPath, 'src');
    const appDir = path.join(srcDir, 'app');
    const componentsDir = path.join(srcDir, 'components');
    const libDir = path.join(srcDir, 'lib');

    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.mkdirSync(libDir, { recursive: true });

    // Create main export file for composition mode
    fs.writeFileSync(
      path.join(srcDir, 'index.ts'),
      `// Main exports for composition mode
export * from './components';
export * from './lib';

// Default component for easy import
export { default } from './components/${projectName}';
`
    );

    // Create main component
    fs.writeFileSync(
      path.join(componentsDir, `${projectName}.tsx`),
      `export default function ${projectName}() {
  return (
    <div>
      <h1>${projectName} Package</h1>
      <p>This package supports both standalone and composition modes.</p>
    </div>
  );
}
`
    );

    // Create components barrel export
    fs.writeFileSync(
      path.join(componentsDir, 'index.ts'),
      `export { default as ${projectName} } from './${projectName}';
`
    );

    // Create standalone page for development
    fs.writeFileSync(
      path.join(appDir, 'page.tsx'),
      `import ${projectName} from '../components/${projectName}';

export default function Home() {
  return (
    <main className="p-8">
      <${projectName} />
      <div className="mt-8 text-sm text-gray-600">
        <h2>Development Mode</h2>
        <p>This page is for standalone development. The component can also be imported into composition platforms.</p>
      </div>
    </main>
  );
}
`
    );

    // Create layout for standalone mode
    fs.writeFileSync(
      path.join(appDir, 'layout.tsx'),
      `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${projectName} Package',
  description: 'Dual-mode package supporting standalone and composition use',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
    );

    // Create utility file
    fs.writeFileSync(
      path.join(libDir, 'utils.ts'),
      `// Utility functions for ${projectName}

export function formatTitle(title: string): string {
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export const config = {
  packageName: '${projectName}',
  version: '0.1.0',
  mode: 'dual' // supports both standalone and composition
};
`
    );

    // Create lib barrel export
    fs.writeFileSync(
      path.join(libDir, 'index.ts'),
      `export * from './utils';
`
    );

    // Create Next.js config for package mode
    fs.writeFileSync(
      path.join(projectPath, 'next.config.js'),
      `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Package-specific configuration
  transpilePackages: [], // Add any packages that need transpilation
  
  // Enable standalone mode for development
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  
  // Configure for both standalone and composition modes
  experimental: {
    // Enable app directory
    appDir: true,
  }
};

module.exports = nextConfig;
`
    );

    console.log('📦 Package project created with dual-mode support');
  }

  async setupStandaloneProject(projectPath, projectName, includeClaudeFlow) {
    const packageJson = {
      name: projectName,
      version: "0.1.0",
      private: true,
      scripts: {
        "build": "next build",
        "dev": "next dev",
        "lint": "next lint",
        "start": "next start",
        "sync-rules": "node scripts/sync-rules.js"
      },
      dependencies: {
        "next": "15.1.4",
        "react": "^19.0.0",
        "react-dom": "^19.0.0"
      },
      devDependencies: {
        "@types/node": "^20",
        "@types/react": "^19",
        "@types/react-dom": "^19",
        "eslint": "^8",
        "eslint-config-next": "15.1.4",
        "typescript": "^5"
      }
    };

    if (includeClaudeFlow) {
      packageJson.devDependencies["claude-flow"] = "^2.0.0-alpha.53";
      packageJson.scripts["ai-init"] = "npx claude-flow@alpha init --force";
      packageJson.scripts["ai-dev"] = "npx claude-flow@alpha dev";
    }

    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create basic Next.js structure
    const srcDir = path.join(projectPath, 'src');
    const appDir = path.join(srcDir, 'app');
    fs.mkdirSync(appDir, { recursive: true });

    // Create basic page
    fs.writeFileSync(
      path.join(appDir, 'page.tsx'),
      `export default function Home() {
  return (
    <main className="p-8">
      <h1>Welcome to ${projectName}</h1>
      <p>Your standalone Next.js project is ready!</p>
    </main>
  );
}
`
    );

    // Create layout
    fs.writeFileSync(
      path.join(appDir, 'layout.tsx'),
      `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'Generated by Platform Project Setup',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
    );

    console.log('🚀 Standalone Next.js project created');
  }



  async createSyncScript(projectPath) {
    const scriptsDir = path.join(projectPath, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });

    const syncScript = `#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_URL = 'https://api.github.com/repos/jazzmind/platform/contents/platform/setup/rules';
const RULES_DIR = path.join(__dirname, '..', '.cursor', 'rules');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const content = Buffer.concat(chunks).toString('base64');
          const decoded = Buffer.from(content, 'base64').toString('utf8');
          fs.writeFileSync(dest, decoded);
          resolve();
        });
      } else {
        reject(new Error(\`HTTP \${res.statusCode}\`));
      }
    }).on('error', reject);
  });
}

async function fetchGithubContents(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'platform-sync-script'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function syncRules(dirUrl, targetDir, prefix = '') {
  try {
    const contents = await fetchGithubContents(dirUrl);
    
    for (const item of contents) {
      if (item.type === 'dir') {
        await syncRules(item.url, targetDir, prefix + item.name + '-');
      } else if (item.name.endsWith('.mdc')) {
        const targetFile = path.join(targetDir, prefix + item.name);
        await downloadFile(item.download_url, targetFile);
        console.log(\`✅ Synced \${prefix}\${item.name}\`);
      }
    }
  } catch (error) {
    console.error(\`❌ Error syncing \${dirUrl}:\`, error.message);
  }
}

async function main() {
  console.log('🔄 Syncing cursor rules from platform repo...');
  
  // Clean existing rules
  if (fs.existsSync(RULES_DIR)) {
    const files = fs.readdirSync(RULES_DIR);
    files.forEach(file => {
      if (file.endsWith('.mdc')) {
        fs.unlinkSync(path.join(RULES_DIR, file));
      }
    });
  } else {
    fs.mkdirSync(RULES_DIR, { recursive: true });
  }

  // Sync shared rules
  await syncRules(\`\${REPO_URL}/shared\`, RULES_DIR);
  
  // Sync business rules (if they exist)
  try {
    await syncRules(\`\${REPO_URL}/business\`, RULES_DIR);
  } catch (error) {
    console.log('ℹ️ No business rules to sync');
  }

  // Update this sync script itself
  try {
    const scriptUrl = 'https://raw.githubusercontent.com/jazzmind/platform/main/platform/setup/create-project.js';
    const scriptPath = path.join(__dirname, 'sync-rules.js');
    await downloadFile(scriptUrl, scriptPath);
    console.log('✅ Sync script updated');
  } catch (error) {
    console.log('⚠️ Could not update sync script:', error.message);
  }

  console.log('✅ Rules sync complete!');
}

main().catch(console.error);
`;

    fs.writeFileSync(
      path.join(scriptsDir, 'sync-rules.js'),
      syncScript
    );

    // Make script executable
    fs.chmodSync(path.join(scriptsDir, 'sync-rules.js'), '755');

    console.log('🔄 Sync script created');
  }

  async createReadme(projectPath, config) {
    const { projectName, isPackageProject, includeBusinessRules, includeClaudeFlow } = config;

    let readmeContent = `# ${projectName}

Created with Platform Project Setup

## Project Type
`;

    if (isPackageProject) {
      readmeContent += '- **Package Project**: Located in `packages/` directory, dual-mode for monorepo integration\n';
    } else {
      readmeContent += '- **Standalone Project**: Located as sibling to platform, complete independent application\n';
    }

    if (includeBusinessRules) {
      readmeContent += '- **Business Rules**: Presentation, grant writing, and communication rules\n';
    }

    if (includeClaudeFlow) {
      readmeContent += '- **AI Tools**: Claude Code & claude-flow integration included\n';
    }

    readmeContent += `
## Features

`;

    if (isPackageProject) {
      readmeContent += '- 🤖 **Cursor AI Rules**: Inherits rules from platform project\n';
    } else {
      readmeContent += '- 🤖 **Cursor AI Rules**: Pre-configured rules for consistent development\n';
      readmeContent += '- 🔄 **Auto-sync**: Keep rules updated with `npm run sync-rules`\n';
    }

    if (includeBusinessRules) {
      readmeContent += '- 📋 **Business Rules**: Presentation, grant writing, and communication rules\n';
    }

    if (includeClaudeFlow) {
      readmeContent += '- 🚀 **Claude-Flow**: AI development orchestration with hive-mind coordination\n';
    }

    readmeContent += `
## Getting Started

### Installation
\`\`\`bash
npm install
\`\`\`

### Development
`;

    if (isPackageProject) {
      readmeContent += `\`\`\`bash
# Start development server for all packages
npm run dev

# Build all packages
npm run build
\`\`\`
`;
    } else {
      readmeContent += `\`\`\`bash
# Start development server
npm run dev

# Build for production
npm run build
\`\`\`
`;
    }

    if (includeClaudeFlow) {
      readmeContent += `
### AI Development with Claude-Flow

\`\`\`bash
# Initialize claude-flow
npm run ai-init

# Start AI-enhanced development
npm run ai-dev
\`\`\`

Claude-Flow provides:
- 🐝 **Hive-mind coordination**: Multiple AI agents working together
- 🧠 **Neural pattern recognition**: Smart code analysis and suggestions  
- 🔄 **Auto-MCP setup**: Seamless Claude Code integration
- 🛡️ **Enterprise security**: Quantum-resistant architecture

Learn more about Claude-Flow: https://github.com/ruvnet/claude-flow
`;
    }

    if (!isPackageProject) {
      readmeContent += `
### Sync Cursor Rules

\`\`\`bash
# Update to latest cursor rules from platform repo
npm run sync-rules
\`\`\`
`;
    }

    readmeContent += `
## Project Structure
`;

    if (isPackageProject) {
      readmeContent += `
**Location**: \`platform/packages/${projectName}/\`

\`\`\`
${projectName}/
  ├── src/               # Source code
  │   ├── app/           # Next.js app directory (standalone mode)
  │   ├── components/    # Exportable components
  │   ├── lib/           # Utilities and helpers
  │   └── index.ts       # Main export file (composition mode)
  ├── .cursor/           # Cursor AI configuration
  │   └── rules/         # AI development rules
  ├── scripts/           # Utility scripts
  └── package.json       # Package configuration
  \`\`\`

### Dual-Mode Architecture

**Standalone Mode**: Run \`npm run dev\` for independent development  
**Composition Mode**: Import components via \`import { ${projectName} } from '${projectName}'\`
`;
    } else {
      readmeContent += `
**Location**: \`../${projectName}/\` (sibling to platform directory)

\`\`\`
${projectName}/
├── src/               # Source code
│   └── app/           # Next.js app directory
├── .cursor/           # Cursor AI configuration
│   └── rules/         # AI development rules
├── scripts/           # Utility scripts
└── package.json       # Package configuration
\`\`\`
`;
    }

    readmeContent += `
## Cursor Rules

`;

    if (isPackageProject) {
      readmeContent += `This package inherits Cursor AI rules from the platform project, including:

- 🏗️ **Architecture**: Planning and design patterns
- 🔧 **Development**: Next.js, TypeScript, and best practices
- 🎯 **Error Handling**: Systematic debugging and fixes
- 📊 **Database**: Prisma ORM patterns and multi-tenancy
- 🔐 **Security**: Authentication and data protection
- 📦 **Package Development**: Dual-mode architecture for standalone and composition use

Rules are managed at the platform level and automatically apply to all packages.
`;
    } else {
      readmeContent += `This project includes pre-configured Cursor AI rules for:

- 🏗️ **Architecture**: Planning and design patterns
- 🔧 **Development**: Next.js, TypeScript, and best practices
- 🎯 **Error Handling**: Systematic debugging and fixes
- 📊 **Database**: Prisma ORM patterns and multi-tenancy
- 🔐 **Security**: Authentication and data protection
`;

      if (includeBusinessRules) {
        readmeContent += `- 📋 **Business**: Presentations, grant writing, and documentation
- 🎤 **Communication**: Technical and business presentations
- 💼 **Professional**: Events, coaching, and business development
`;
      }

      readmeContent += `
Rules are automatically synced from the [Platform repository](https://github.com/jazzmind/platform) to ensure consistency across all projects.
`;
    }

    readmeContent += `
---

*Generated by Platform Project Setup*
`;

    fs.writeFileSync(
      path.join(projectPath, 'README.md'),
      readmeContent
    );

    console.log('📖 README.md created');
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new ProjectSetup();
  setup.run();
}

module.exports = ProjectSetup; 