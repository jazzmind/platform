# Platform Setup Tools

This directory contains tools for creating new projects with pre-configured cursor rules and development environments.

## 🚀 Quick Start

### Create a New Project

```bash
# From the platform repository root
./setup/new-project

# Or directly with Node.js
node setup/create-project.js
```

### Interactive Setup

The setup tool will guide you through:

1. **Project Name**: Choose your project name
2. **Project Type**: 
   - Business Documentation Project
   - Website/Development Project  
   - Both (Hybrid Project)
3. **Repository Structure** (for dev projects):
   - Standard Repository (single project)
   - Monorepo (multiple packages with Turbo)
4. **AI Integration**: Option to include Claude Code & claude-flow

## 📁 What Gets Created

### All Projects Include

- **Cursor Rules**: Flattened rules from `@/shared` and `@/business` (if selected)
- **Sync Script**: `npm run sync-rules` to update rules from GitHub
- **Package.json**: Appropriate configuration for project type
- **README.md**: Generated documentation with project details

### Development Projects Also Include

#### Standard Repository
- Next.js 15 setup with TypeScript
- Basic app structure in `src/app/`
- Development scripts (`dev`, `build`, `lint`)

#### Monorepo
- Turbo build system configuration
- Workspace setup for multiple packages
- Example web package with Next.js
- Coordinated development scripts

### Business Documentation Projects Include

- Documentation structure in `docs/`
- Business-focused cursor rules
- Minimal package.json for tooling

## 🔄 Sync Rules Feature

Every created project includes a sync script that:

1. **Downloads latest rules** from `jazzmind/platform` repository
2. **Flattens directory structure** into `.cursor/rules/`
3. **Updates sync script itself** to latest version
4. **Maintains rule consistency** across all projects

```bash
# In any created project
npm run sync-rules
```

## 🤖 Claude-Flow Integration

When enabled, projects include:

- **claude-flow**: AI development orchestration
- **Hive-mind coordination**: Multiple AI agents working together
- **Neural pattern recognition**: Smart code analysis
- **Auto-MCP setup**: Seamless Claude Code integration
- **Enterprise security**: Quantum-resistant architecture

Additional scripts:
- `npm run ai-init`: Initialize claude-flow
- `npm run ai-dev`: Start AI-enhanced development

## 📋 Cursor Rules

Projects automatically include rules for:

### Shared Rules (Always Included)
- **Architecture**: Planning and design patterns
- **Error Handling**: Systematic debugging approaches
- **Small Changes**: Incremental development methodology
- **Next.js**: Framework-specific patterns and best practices
- **Database**: Prisma ORM and multi-tenant patterns
- **Authentication**: Security and session management
- **UI Components**: Component architecture and styling
- **Documentation**: Markdown and API documentation standards
- **Testing**: QA and security testing procedures

### Business Rules (Optional)
- **Events**: Event planning and management
- **Presentations**: Technical, business, and coaching presentations
- **Grant Writing**: Funding proposals and impact documentation
- **RevealJS**: Technical presentation creation
- **Renewable Energy**: Industry-specific content and compliance

## 🛠 File Structure

```
setup/
├── create-project.js   # Main setup script (Node.js)
├── new-project         # Simple wrapper script (Bash)
├── rules/              # Source cursor rules
│   ├── shared/         # Core development rules
│   └── business/       # Business and presentation rules
└── README.md           # This documentation
```

## 🔧 Requirements

- **Node.js**: Version 18+ for project creation
- **npm**: For package management
- **Git**: For rule syncing from GitHub

## 🧪 Testing

Before using the setup tools, run the validation tests:

```bash
# From the platform repository
node setup/test-setup.js

# Or make it executable and run directly
./setup/test-setup.js
```

The test suite validates:
- **Source Rules**: Checks that all cursor rules are present
- **Script Permissions**: Verifies scripts are executable
- **Node.js Version**: Confirms compatible Node.js version
- **Rule Flattening**: Tests the directory flattening logic

All tests must pass before using the project creation tools.

## 🚀 Examples

### Create a Simple Website
```bash
./setup/new-project
# Choose: Website/Development Project > Standard Repository
```

### Create a Monorepo with AI Tools
```bash
./setup/new-project  
# Choose: Website/Development Project > Monorepo > Include Claude-Flow
```

### Create Business Documentation Project
```bash
./setup/new-project
# Choose: Business Documentation Project
```

### Create Hybrid Project
```bash
./setup/new-project
# Choose: Both (Hybrid Project) > Monorepo > Include Claude-Flow
```

## 🔄 Updating Projects

To update an existing project's cursor rules:

```bash
cd your-project
npm run sync-rules
```

This keeps your project in sync with the latest platform rules and patterns.

---

*Platform Setup Tools - Streamlined project creation with cursor rules* 