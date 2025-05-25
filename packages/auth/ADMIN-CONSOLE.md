# Admin Console for Authorization System

## Overview

The Admin Console provides a comprehensive interface for managing the authorization system, including:

- ✅ **Auto-initialization** of the authorization system if not already set up
- 📦 **Package Management** - View registered packages and their settings
- 👥 **User Management** - View, ban/unban users, and grant package access
- 🔐 **Role Management** - View system and package-specific roles
- 📊 **System Overview** - Dashboard with statistics and status

## Setup Instructions

### 1. Environment Configuration

Add admin user emails to your environment variables:

```bash
# .env.local or .env
ADMIN_USERS=admin@example.com,another-admin@example.com
```

Multiple admin emails should be comma-separated.

### 2. Database Schema Update

First, ensure your database schema includes the authorization tables:

```bash
cd packages/auth
npx prisma db push
npx prisma generate
```

### 3. Install Dependencies

Make sure the shared package dependency is installed:

```bash
npm install
```

## Usage

### Accessing the Admin Console

1. **Sign in** to the auth package as an admin user (email must be in `ADMIN_USERS`)
2. **Navigate** to `/admin` or click the "Admin Console" button on the home page
3. **Initialize** the authorization system if prompted (first-time setup)

### Admin Console Features

#### 🏠 Overview Tab
- System statistics and health status
- Package overview with registration types
- Quick system information

#### 📦 Packages Tab
- View all registered packages
- See package registration types:
  - **Self Register**: Users can automatically access
  - **Approval Required**: Admin approval needed
  - **Admin Only**: Only admins can grant access
- Package statistics and status

#### 👥 Users Tab
- View all registered users
- User status (Active/Banned, Email Verified/Unverified)
- **Ban/Unban** users functionality
- **Grant Package Access** to specific users
- User management modal with detailed controls

#### 🔐 Roles Tab
- View system roles (global permissions)
- View package-specific roles
- Role statistics and organization by package

## Authorization System Initialization

When you first access the admin console, it will check if the authorization system is initialized. If not, you'll see a setup screen that will:

1. **Create default packages**:
   - `meetings` (Approval Required)
   - `presentations` (Self Register)
   - `events` (Self Register)

2. **Create system roles**:
   - `ADMIN` (System Administrator)
   - `USER` (Basic User)

3. **Set up meeting-specific permissions and roles**:
   - Permissions: `meeting:read`, `meeting:write`, `meeting:delete`, `meeting:manage`, `meeting:book`
   - Roles: `ADMIN`, `USER`, `ORGANIZER` with appropriate permissions

## API Endpoints

The admin console uses these API endpoints:

- `GET /api/admin/status` - Check initialization status
- `POST /api/admin/initialize` - Initialize authorization system
- `GET /api/admin/packages` - Fetch packages
- `GET /api/admin/roles` - Fetch roles
- `GET /api/admin/users` - Fetch users
- `POST /api/admin/users/[userId]/ban` - Ban user
- `POST /api/admin/users/[userId]/unban` - Unban user
- `POST /api/admin/users/[userId]/grant-access` - Grant package access

## Security Features

- **Admin-only access** - Only users in `ADMIN_USERS` can access
- **Session validation** - Requires active authentication
- **Audit logging** - All admin actions are logged (when authorization system is active)
- **Error handling** - Graceful degradation when authorization tables don't exist

## Troubleshooting

### "Access Denied" Error
- Ensure your email is in the `ADMIN_USERS` environment variable
- Restart the development server after adding admin users
- Check that you're signed in with the correct email

### Database Errors
- Run `npx prisma db push` to apply the authorization schema
- Ensure your `DATABASE_URL` is correctly configured
- Check database connection

### "Authorization system not initialized"
- Click the "Initialize System" button in the admin console
- This is normal for first-time setup
- The initialization is safe to run multiple times

### Prisma Errors in Development
- Run `npx prisma generate` after schema changes
- The Prisma client needs to be regenerated when the schema changes
- Some TypeScript errors are expected until the schema is applied

## Development Notes

The admin console components are located in:
- `src/components/admin/AdminDashboard.tsx` - Main dashboard
- `src/components/admin/SystemStatus.tsx` - Overview tab
- `src/components/admin/PackagesManager.tsx` - Package management
- `src/components/admin/UsersManager.tsx` - User management
- `src/components/admin/RolesManager.tsx` - Role management

The API routes are in:
- `src/app/api/admin/` directory

## Next Steps

After setting up the admin console:

1. **Initialize the authorization system** through the UI
2. **Test user management** features with test accounts
3. **Configure package access** for your platform packages
4. **Set up the meetings package** authorization if using meetings
5. **Review audit logs** for admin actions

The admin console provides a solid foundation for managing the authorization system and can be extended with additional features as needed. 