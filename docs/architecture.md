# Architecture Overview

## 1. Monorepo Structure

This project utilizes a monorepo structure managed by **npm workspaces** and orchestrated with **Turborepo**. This setup allows for managing multiple JavaScript/TypeScript projects (applications and libraries) within a single repository.

- **Root Directory (`/`)**:
    - Contains the main `package.json` defining workspaces and root-level development scripts (e.g., `turbo dev`, `turbo build`).
    - Houses global configuration files (e.g., `tsconfig.json` for shared TypeScript settings, `.gitignore`).
- **Applications**:
    - **`website/`**: The primary Next.js application serving the main public-facing website.
    - **`packages/*/`**: This directory contains other independent Next.js applications or JavaScript/TypeScript packages. Each sub-directory within `packages/` that is a Next.js app (e.g., `packages/contact`) is a self-contained Next.js project.
- **Shared Packages**:
    - **`@sonnenreich/shared`** (conceptual, to be created): This package is intended to house shared React components, hooks, utility functions, and TypeScript types that can be consumed by any of the Next.js applications within the monorepo.

## 2. Next.js Application Strategy

Each distinct Next.js application (e.g., `website/`, `packages/contact/`) is treated as an independent project with its own Next.js setup.

- **Dependencies**:
    - Each Next.js application explicitly declares `next`, `react`, and `react-dom` as direct dependencies in its own `package.json`. This is crucial for the Next.js CLI and build system to function correctly within the context of that specific application.
    - While these dependencies are declared per-project, `npm` workspaces will hoist common versions to the root `node_modules` directory, creating symlinks in the individual project `node_modules` folders. This minimizes disk space usage while maintaining project isolation.
- **Configuration**:
    - Each Next.js application has its own `next.config.js` (or `.ts`), `tailwind.config.js`, `postcss.config.js`, `tsconfig.json` (which may extend a root `tsconfig.json`), and other necessary configuration files. This allows for app-specific settings, plugins, and build customizations.
- **Running Applications**:
    - Applications can be run individually (e.g., `cd website && npm run dev`) or concurrently using Turborepo from the root (e.g., `npm run dev`).

## 3. Dependency Management

- **Workspaces**: `npm` workspaces are defined in the root `package.json` to link local packages.
- **Application Dependencies**: As stated above, core Next.js dependencies (`next`, `react`, `react-dom`) are project-local.
- **Shared Code (`@sonnenreich/shared`)**:
    - This package will export common UI components, hooks, and utilities.
    - It will list `react` and `react-dom` as `peerDependencies` to avoid version conflicts with the consuming Next.js applications. Consuming applications must have `react` and `react-dom` as direct dependencies.
- **Development Dependencies**: Common development tools like `typescript`, `eslint`, `prettier`, and global type definitions (e.g., `@types/node`) can be defined in the root `package.json`'s `devDependencies` section to ensure consistency. Project-specific types (e.g., `@types/nodemailer` for a package using nodemailer) should be in that package's `devDependencies`.

## 4. Build and Development Workflow

- **Turborepo**: Used to manage and optimize build, test, and development tasks across the monorepo.
    - `turbo.json` at the root defines the pipeline for tasks like `build`, `dev`, `lint`.
- **Scripts**:
    - Root `package.json` contains scripts like `dev`, `build`, `lint` that invoke `turbo`.
    - Individual application/package `package.json` files contain scripts specific to that project (e.g., `next dev`, `next build`).

## 5. Key Principles

- **Isolation**: Each Next.js app should be buildable and runnable independently.
- **Explicitness**: Dependencies critical to an application's core functionality (like `next`) are declared directly by that application.
- **De-duplication**: Leverages npm workspaces for hoisting and symlinking to reduce disk footprint of common dependencies.
- **Scalability**: The structure allows for adding more applications or shared packages as the project grows.

This architecture aims to balance the benefits of a monorepo (code sharing, unified tooling) with the specific requirements of Next.js for project isolation and build context. 