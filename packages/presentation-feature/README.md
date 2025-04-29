# Presentation Feature Package

This is a standalone package for the presentation feature that can be used independently or integrated into the main application.

## Features

- Remote presentation control with pairing system
- Real-time slide synchronization
- API routes for handling presentation pairing and control

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
import { PresentationController } from '@sonnenreich/presentation-feature/src/components/PresentationController';

// Then use in your application
function MyComponent() {
  return <PresentationController pairingCode="abc123" />;
}
```

2. Configure your main application's `next.config.js` to include this package in the transpilation:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sonnenreich/presentation-feature"],
  // other config
};
```

## Database Setup

This package requires the following database tables:
- PresentationPairing
- SignalingMessage

These are included in the package's Prisma schema. Make sure your main application's database includes these tables or extend your schema to include them. 