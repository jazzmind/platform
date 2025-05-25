# Presentations Repository

This repository contains various presentations organized by category.

## Categories

- **Technical** - Deep dives into technical topics, code walkthroughs, and architecture discussions.
- **Business** - Business strategies, market analyses, and investment opportunities.
- **Education** - Learning materials, tutorials, and educational resources.

## Viewing Presentations

The presentations in this repository can be viewed through our NextJS web application, which organizes and displays them with a user-friendly interface.

### Running Locally

To run the presentation viewer locally:

1. Clone this repository
2. Navigate to the website directory:
   ```bash
   cd website
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000`

### Contributing New Presentations

To add a new presentation:

1. Create a directory for your presentation in the appropriate category folder (technical, business, education)
2. Place your presentation files in the directory
3. If your presentation is a standalone HTML presentation, make sure there's an `index.html` file
4. The presentation will automatically appear in the web interface

## Deployment

The website is automatically deployed to GitHub Pages when changes are pushed to the main branch.

## License

See the [LICENSE](LICENSE) file for details.

---

## Monorepo Structure

This repository is a monorepo managed with npm workspaces and Turborepo. It contains several Next.js applications and shared packages.

- **`website/`**: The main Next.js application for viewing presentations and other content.
- **`packages/*`**: Contains reusable packages and smaller, standalone Next.js applications. Each Next.js application within `packages/` (e.g., `@sonnenreich/contact`) manages its own `next`, `react`, and `react-dom` dependencies.
- **`@sonnenreich/shared`** (planned): A future package for shared React components, hooks, utilities, and types across different Next.js applications in this monorepo. Packages consuming shared components will list `react` as a `peerDependency`.

### Key Development Scripts (run from the root):

- `npm run dev`: Runs all applications in development mode (via `turbo dev`).
- `npm run build`: Builds all applications and packages (via `turbo build`).
- `npm run lint`: Lints all code (via `turbo lint`).

To run a specific application (e.g., the main website):

```bash
cd website
npm run dev
```

Or for a package like the contact form app:

```bash
cd packages/contact
npm run dev
```

It's recommended to run `npm install` from the root of the monorepo to ensure all workspace dependencies are correctly installed and hoisted.

# AI Tinkerers

**Sept. 23, 2024:** [Hands on with the OpenAI Assistant API](/presentations/ai-tinkerers/sept-24) 

**Feb. 25, 2025:** [Hands on with Cursor](/presentations/ai-tinkerers/feb-25/cursor) 