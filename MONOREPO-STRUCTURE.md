# Monorepo Structure for Next.js 15+ Features

This document outlines the monorepo structure used to break features out of the main website into independently maintainable and runnable packages.

## Overview

The project is organized as a monorepo using Turborepo with the following structure:

```
sonnenreich-platforms/
├── packages/
│   ├── shared/            # Shared utilities, components, and types
│   ├── presentation-feature/  # Presentation functionality package
│   └── [other-features]/  # Other feature packages
└── website/               # Main Next.js website
```

## Key Technologies

- **Turborepo**: For monorepo management and build optimization
- **Next.js 15+**: For both the main application and feature packages
- **Prisma**: For database schema definitions and access
- **TypeScript**: For type-safe code across all packages

## Package Types

### Shared Package

The `packages/shared` directory contains common code that can be shared across all feature packages and the main website:

- Common types
- Utility functions
- Reusable React components

### Feature Packages

Each feature package (e.g., `packages/presentation-feature`) is a standalone Next.js application with:

- Its own `package.json` and dependencies
- Its own API routes
- Its own Prisma schema (with only the required models)
- Its own React components
- Independent development server that can be run on its own port

## Development Workflow

### Running Feature Packages Independently

Each feature package can be run independently for focused development:

```bash
cd packages/presentation-feature
npm run dev
```

This starts the feature on a separate port (e.g., 3001) for isolated development.

### Running the Main Website

The main website integrates all the features:

```bash
cd website
npm run dev
```

### Building Everything

From the root directory:

```bash
npm run build
```

This builds all packages and the main website in the correct order.

## Integration Patterns

### Using Feature Packages in the Main Website

Feature packages are imported and used in the main website through:

1. **Component Integration**: Import and use React components from feature packages
2. **API Route Delegation**: The main website can proxy API requests to feature packages
3. **Database Schema Integration**: The main Prisma schema includes or references models from feature packages

### Shared State and Authentication

Authentication and global state are managed by the main website and passed to feature packages through props or context. 