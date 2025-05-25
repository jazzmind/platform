# Template Package

This is a standalone package that can be used independently or integrated into the main application.

## Features

## Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The development server will start on port 3001 by default.

## Integration with Main Application

To use this package in the main application:

1. Import components from the package in your main application:

```tsx
import { TemplateComponent } from '@sonnenreich/template/src/components/TemplateComponent';

// Then use in your application
function MyComponent() {
  return <TemplateComponent />;
}
```

2. Configure your main application's `next.config.js` to include this package in the transpilation:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sonnenreich/template"],
  // other config
};
```

## Database Setup

This package requires the following database tables:


These are included in the package's Prisma schema. Make sure your main application's database includes these tables or extend your schema to include them. 