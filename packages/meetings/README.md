---
title: "@sonnenreich/meetings - Meeting Scheduler"
description: "A Next.js package for individual and group meeting scheduling with calendar integration and AI-powered optimization."
---

# @sonnenreich/meetings - Meeting Scheduler

`@sonnenreich/meetings` is a comprehensive Next.js package designed to simplify meeting scheduling for both individuals and groups. It functions as a standalone application and offers advanced features like calendar integration (e.g., Google Calendar), availability sharing, and AI-powered optimization to find the best meeting times. This package aims to provide a user-friendly experience similar to Calendly, but with enhanced capabilities for complex group coordination.

> 💡 **Tip:** This package can be run as a standalone Next.js application or potentially integrated as a module into a larger monorepo structure if adapted for library usage.

## Key Features

-   **Event Creation**: Organizers can create new meeting events specifying details like title, objective, duration, preferred time windows, and date ranges.
-   **Availability Sharing**: Participants can view event details and submit their availability by selecting time slots or connecting their calendars.
-   **Calendar Integration**: Supports integration with Google Calendar (and can be extended for others) to automatically fetch busy times and suggest available slots.
-   **AI-Powered Optimization**: For group events, an AI assistant (using OpenAI) can analyze all participants' availability to suggest optimal meeting times that maximize attendance.
-   **User-Friendly Interface**: Provides a clean and intuitive UI for both organizers and participants.

## Package Structure & Main Components

The package follows a standard Next.js App Router structure:

-   `src/app/`: Contains the main application pages and UI components.
    -   `/`: (Implicit) Root page, could be a landing or dashboard.
    -   `/create`: Page for organizers to create new meeting events.
    -   `/[eventId]`: Dynamic page for participants to view a specific event, connect their calendar, and submit their availability.
    -   `/auth-error`: Page displayed if calendar authentication fails.
-   `src/app/api/meetings/`: Backend API routes built with Next.js Route Handlers.
    -   `/events`:
        -   `POST`: Create a new meeting event.
        -   `GET`: List all meeting events (admin).
    -   `/events/[eventId]`:
        -   `GET`: Fetch details for a specific meeting event.
        -   `POST`: Submit availability for a specific event.
    -   `/events/[eventId]/optimize`:
        -   `POST`: Trigger AI optimization for a group event's schedule.
        -   `GET`: Fetch the optimized schedule for an event.
    -   `/calendar/google`: Handles Google Calendar OAuth and data fetching.
    -   `/connection`: Manages user calendar connection details.
-   `src/components/`: Reusable React components used across different pages (e.g., `CalendarView`, `CalendarWeekView`).
-   `src/models/`: TypeScript interfaces defining data structures (e.g., `MeetingEvent`, `UserAvailability`).
-   `public/`: Static assets.
-   `prisma/`: Prisma schema and client for database interactions (if direct database access is used within this package).

## Development

To run this package in standalone development mode:

```bash
# Navigate to the package directory
cd packages/meetings

# Install dependencies
npm install

# Start the development server (typically on port 3003 as per package.json)
npm run dev
```

## Environment Variables

The following environment variables are crucial for the package's functionality:

-   `OPENAI_API_KEY`: Required for the AI-powered meeting optimization feature. The application can build without it, but optimization will be disabled.
-   `MEETINGS_ACCESS_CODE`: A secret code used to protect certain admin-level API endpoints (e.g., creating events, listing all events).
-   `GOOGLE_CLIENT_ID`: For Google Calendar integration.
-   `GOOGLE_CLIENT_SECRET`: For Google Calendar integration.
-   `NEXTAUTH_URL`: The canonical URL of your deployment, used for OAuth callbacks.
-   `NEXTAUTH_SECRET`: A secret key for NextAuth.js.
-   `DATABASE_URL`: If Prisma or another ORM is used directly within this package for data persistence beyond Vercel Blob storage.

> ℹ️ **Note:** Ensure these variables are present in your `.env.local` file for local development or configured in your deployment environment.

## Usage as a Standalone App

When run as a standalone app, users can:
1.  Navigate to `/create` to set up a new meeting event.
2.  Share the unique event link (`/[eventId]`) with participants.
3.  Participants open the link, provide their availability (manually or via calendar sync).
4.  The organizer can then trigger the optimization (if it's a group event) and view suggested times.

## Future Enhancements / Integration as a Library

While currently structured as a Next.js application, this package could be refactored into a reusable library. This would involve:
-   Clearly defining an external API for its components and server actions.
-   Using `tsup` or a similar bundler to create distributable formats.
-   Managing peer dependencies (like `react`, `next`) appropriately.

This refactor would allow other Next.js applications within the monorepo (or even external projects) to import and use its scheduling components and logic.

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