# Platform

A comprehensive master repository of cursor rules and project setup tools for consistent AI-assisted development.

## 🚀 Quick Start

### Create a New Project

```bash
# Clone the platform repository
git clone https://github.com/jazzmind/platform.git
cd platform

# Test the setup system (recommended first run)
node setup/test-setup.js

# Create a new project with cursor rules
./create-project
# or
./setup/new-project
```

The setup tool will guide you through creating:
- **Business Documentation Projects**: For presentations, grants, and business content
- **Development Projects**: Next.js applications with TypeScript  
- **Hybrid Projects**: Both development and business capabilities
- **Monorepos**: Multi-package projects with Turbo build system
- **Claude-Flow Integration**: AI development orchestration

## 📋 Cursor Rules System

This repository contains a centralized collection of cursor rules organized for maximum reusability:

### Core Philosophy
- **Centralized Management**: All rules maintained in one master repository
- **Automatic Sync**: Projects stay updated with latest rule improvements
- **Generalized Patterns**: Rules work for both monorepo and standalone patterns
- **AI-Optimized**: Designed for efficient AI context usage

### Rule Categories

#### 🏗️ Shared Rules (Always Included)
Essential rules for any development project:

- **Architecture** (`001-architect.mdc`): Planning and design patterns
- **Error Handling** (`007-error-handling.mdc`): Systematic debugging approaches  
- **Small Changes** (`008-small-changes.mdc`): Incremental development methodology
- **Next.js** (`005-nextjs.mdc`): Framework-specific patterns and best practices
- **Database** (`003-database.mdc`): Prisma ORM and multi-tenant patterns
- **Authentication** (`004-authentication.mdc`): Security and session management
- **UI Components** (`006-ui-components.mdc`): Component architecture and styling
- **Documentation** (`400-md.mdc`, `401-documentation.mdc`): Standards and templates
- **Testing** (`300-qa-testing.mdc`, `302-security-testing.mdc`): Quality assurance

#### 💼 Business Rules (Optional)
Specialized rules for business and presentation work:

- **Events** (`600-events.mdc`): Event planning and management
- **Presentations**: Technical (`700`), business (`701`), coaching (`702`), RevealJS (`703`)
- **Grant Writing** (`750-grant-writing.mdc`): Funding proposals and impact documentation  
- **Renewable Energy** (`760-renewable-energy.mdc`): Industry-specific content and compliance

## 🛠 Project Setup Features

### Automated Project Creation
The setup tool creates fully configured projects with:

- **Cursor Rules**: Automatically installed and flattened for easy access
- **Development Environment**: Next.js 15, TypeScript, Tailwind CSS
- **Build Tools**: Turbo (monorepos) or standard Next.js build
- **Sync Scripts**: Keep rules updated from this master repository
- **AI Integration**: Optional Claude Code and claude-flow setup

### Monorepo Support
For complex projects with multiple packages:

```
your-project/
├── packages/           # Individual packages
│   ├── web/           # Frontend application  
│   ├── api/           # Backend services
│   └── shared/        # Shared utilities
├── .cursor/           # Cursor AI configuration
│   └── rules/         # All rules flattened
├── turbo.json         # Turbo build system
└── package.json       # Root configuration
```

### Standalone Project Support  
For focused single-purpose projects:

```
your-project/
├── src/               # Source code
│   └── app/           # Next.js app directory
├── .cursor/           # Cursor AI configuration  
│   └── rules/         # All rules flattened
└── package.json       # Project configuration
```

## 🔄 Rule Synchronization

### Automatic Updates
Every created project includes a sync script:

```bash
# In any project created with platform setup
npm run sync-rules
```

This script:
1. Downloads latest rules from `jazzmind/platform` repository
2. Flattens directory structure into `.cursor/rules/`  
3. Updates the sync script itself to latest version
4. Maintains consistency across all your projects

### Rule Evolution
As rules improve in the master repository, all projects can benefit:
- **Bug fixes** in rule logic
- **New patterns** and best practices
- **Framework updates** (Next.js 15, new TypeScript features)
- **Enhanced AI guidance** based on real-world usage

## 🤖 AI Development Integration

### Claude Code Support
All development projects are optimized for Claude Code with:
- Pre-configured cursor rules for consistent AI guidance
- Proper file structure for AI navigation
- Documentation templates for AI understanding

### Claude-Flow Integration (Optional)
Advanced AI development orchestration with:
- **Hive-mind coordination**: Multiple AI agents working together
- **Neural pattern recognition**: Smart code analysis and suggestions
- **Auto-MCP setup**: Seamless Claude Code integration  
- **Enterprise security**: Quantum-resistant architecture

Learn more: [claude-flow repository](https://github.com/ruvnet/claude-flow)

## 📖 Usage Examples

### Create a Simple Website
```bash
./setup/new-project
# Choose: Website/Development Project > Standard Repository
```

### Create a Multi-Package Monorepo
```bash
./setup/new-project
# Choose: Website/Development Project > Monorepo > Include Claude-Flow  
```

### Create Business Documentation Project  
```bash
./setup/new-project
# Choose: Business Documentation Project
```

### Create Hybrid Development + Business Project
```bash
./setup/new-project
# Choose: Both (Hybrid Project) > Monorepo
```

## 🏛 Architecture Principles

### Generalization Strategy
Rules support both usage patterns:
- **Monorepo**: Projects with packages in `@/packages`
- **Standalone**: Projects with code in `@/website` or `@/src`

### Glob Patterns
Rules use flexible glob patterns that work in both contexts:
```mdc
globs: src/**/*,website/src/**/*,packages/**/src/**/*
```

### Technology Agnostic
While optimized for Next.js and TypeScript, rules maintain technology independence where appropriate, focusing on patterns and principles rather than specific implementations.

## 🤝 Contributing

### Rule Development
When developing new rules:

1. **Start specific**: Create rules for your current project
2. **Test thoroughly**: Ensure rules work with AI assistants
3. **Generalize**: Remove project-specific details
4. **Document**: Add clear examples and context
5. **Sync back**: Contribute improvements to shared rules

### Rule Quality Standards
- **AI-optimized**: Efficient token usage and clear guidance
- **Action-oriented**: Focus on what to do, not just what to avoid
- **Context-aware**: Include when and why to apply rules
- **Example-rich**: Provide both good and bad examples

## 📚 Documentation

- **Setup Guide**: `setup/README.md` - Detailed setup tool documentation
- **Rule Examples**: Each `.mdc` file contains usage examples
- **Architecture**: `docs/architecture.md` - System design principles
- **How Rules Work**: `setup/rules/shared/how-cursor-rules-work.md`

## 🔗 Related Projects

- [Claude Code](https://claude.ai/code) - AI code editor integration
- [claude-flow](https://github.com/ruvnet/claude-flow) - AI development orchestration
- [Cursor](https://cursor.sh) - AI-first code editor
- [Next.js 15](https://nextjs.org) - React framework

---

*Platform - Streamlined AI development with centralized cursor rules*

