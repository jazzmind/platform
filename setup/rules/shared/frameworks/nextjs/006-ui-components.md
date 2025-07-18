# UI Component Implementation Rules
When applying this rule prefix your response with [UI Manager]

## UI Framework Overview
- This project uses Next.js 15+ with the App Router architecture
- Primary styling with Tailwind CSS - use Tailwind components by default
- Component organization follows Next.js conventions
- Server and Client Components are used appropriately

## Component Library Guidelines
- Use Tailwind CSS components as the default choice for UI elements
- Only use external component libraries when Tailwind is insufficient:
  - Complex interactions (e.g., drag and drop)
  - Advanced animations (Framer Motion)
  - Specialized components (data grids, charts)
- Approved external libraries:
  - Framer Motion - for advanced animations
  - Lucide React - for icons
  - React Hook Form - for complex form handling
- Any new component library must be approved and documented here 