# Demo: Using 00SaaS with Cursor Agent

## Initial Project Setup Prompt

```
I want to create a multi-tenant SaaS application with the following features:

1. User authentication with next-auth
2. Multi-tenant database design using Prisma
3. Edge-compatible API routes
4. Dashboard for each tenant
5. Admin portal for managing tenants

The application will be a simple task management system where each tenant can manage their own tasks and users.

Please create the initial project structure and core files following best practices for multi-tenant architectures.
```

## Add Feature Prompt

```
Now I need to add a feature to allow tenants to create and manage teams within their organization. 

Each team should:
- Have a name and description
- Have members (users from the same tenant)
- Be associated with specific tasks

Create the necessary database schema, API endpoints, and UI components for this feature.
```

## Database Query Prompt

```
Show me how to properly query tasks for the current user, ensuring proper tenant isolation and security. 

The user should only see tasks that:
1. Belong to their tenant
2. Are either assigned to them directly
3. Or belong to a team they are a member of
```

## Authentication Flow Prompt

```
Implement the authentication flow with the following requirements:

1. Support for multiple authentication providers (email/password, Google, GitHub)
2. Custom tenant resolution based on subdomain or path
3. Edge-compatible session handling
4. Role-based access control within each tenant
```

## Component Creation Prompt

```
Create a reusable component for displaying task statistics that:

1. Shows tasks by status (pending, in-progress, completed)
2. Displays recent activity
3. Shows team performance metrics
4. Adapts to both mobile and desktop views

The component should follow our established UI patterns and be optimized for edge delivery.
``` 