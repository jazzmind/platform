# Authorization System Architecture

## System Architecture
┌─────────────────┐ ┌──────────────────┐ ┌────────────────────┐
│ │ │ │ │ │
│ Package APIs │────▶│ Authorization │────▶│ Permission Engine │
│ (meetings, etc) │ │ Middleware │ │ │
│ │◀────│ │◀────│ │
└─────────────────┘ └──────────────────┘ └────────────────────┘
│ │
│ │
▼ ▼
┌──────────────────────────┐ ┌──────────────────────┐
│ │ │ │
│ Authorization DB │ │ Shared Auth Utils │
│ (Central Schema) │ │ (@sonnenreich/auth) │
│ │ │ │
└──────────────────────────┘ └──────────────────────┘


## Component Architecture

### Authorization Database (`@sonnenreich/auth`)
- **Purpose**: Central authorization schema shared across all packages
- **Implementation**: Prisma models for roles, permissions, and assignments
- **Key Responsibilities**:
  - Store user roles and permissions
  - Package registration and configuration
  - Resource-specific access control
  - Audit logging for authorization events

### Authorization Middleware
- **Purpose**: Standardized authorization checking for all packages
- **Implementation**: Express/Next.js middleware with configurable rules
- **Key Responsibilities**:
  - Authenticate user session
  - Load user permissions for package
  - Check resource-specific access
  - Cache permission results

### Permission Engine
- **Purpose**: Core logic for permission evaluation and inheritance
- **Implementation**: TypeScript service with caching layer
- **Key Responsibilities**:
  - Evaluate complex permission rules
  - Handle role inheritance and conflicts
  - Manage permission caching
  - Provide authorization APIs

### Shared Auth Utils (`@sonnenreich/shared`)
- **Purpose**: Common authorization utilities and React hooks
- **Implementation**: TypeScript utilities and React components
- **Key Responsibilities**:
  - Authorization checking hooks
  - Permission-aware UI components
  - API client authorization helpers
  - Type definitions for authorization

## Data Architecture

### Core Authorization Models

```prisma
// Enhanced User model (extends existing)
model User {
  id                String @id @default(cuid())
  email             String @unique
  // ... existing fields ...
  
  // Authorization relationships
  roleAssignments   RoleAssignment[]
  resourceAccess    ResourceAccess[]
  auditLogs         AuthAuditLog[]
}

// Package registry
model Package {
  id                String @id @default(cuid())
  name              String @unique
  displayName       String
  registrationType  RegistrationType
  isActive          Boolean @default(true)
  permissions       Permission[]
  roleAssignments   RoleAssignment[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// Flexible role system
model Role {
  id                String @id @default(cuid())
  name              String
  packageId         String?
  isSystemRole      Boolean @default(false)
  permissions       RolePermission[]
  assignments       RoleAssignment[]
  package           Package? @relation(fields: [packageId], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([name, packageId])
}

// Package-specific permissions (OAuth-style scopes)
model Permission {
  id                String @id @default(cuid())
  name              String
  description       String?
  packageId         String
  package           Package @relation(fields: [packageId], references: [id])
  rolePermissions   RolePermission[]
  createdAt         DateTime @default(now())
  
  @@unique([name, packageId])
}

// Many-to-many role assignments with context
model RoleAssignment {
  id                String @id @default(cuid())
  userId            String
  roleId            String
  packageId         String?
  resourceType      String?
  resourceId        String?
  grantedBy         String?
  expiresAt         DateTime?
  isActive          Boolean @default(true)
  
  user              User @relation(fields: [userId], references: [id])
  role              Role @relation(fields: [roleId], references: [id])
  package           Package? @relation(fields: [packageId], references: [id])
  grantedByUser     User? @relation("GrantedRoles", fields: [grantedBy], references: [id])
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([userId, roleId, packageId, resourceType, resourceId])
}

// Resource-specific access control
model ResourceAccess {
  id                String @id @default(cuid())
  userId            String
  packageId         String
  resourceType      String
  resourceId        String
  accessType        AccessType
  grantedBy         String?
  expiresAt         DateTime?
  isActive          Boolean @default(true)
  
  user              User @relation(fields: [userId], references: [id])
  package           Package @relation(fields: [packageId], references: [id])
  grantedByUser     User? @relation("GrantedAccess", fields: [grantedBy], references: [id])
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([userId, packageId, resourceType, resourceId, accessType])
}

enum RegistrationType {
  SELF_REGISTER
  APPROVAL_REQUIRED
  ADMIN_ONLY
}

enum AccessType {
  OWNER
  EDITOR
  VIEWER
  LIMITED_EDITOR
  CUSTOM
}
```

## Key Workflows

### Authorization Check Flow
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│             │ │             │ │             │ │             │
│ API Request │────▶│ Middleware │────▶│ Permission │────▶│ Allow/Deny │
│ │ │ Extract │ │ Engine │ │ Response │
│ │ │ Context │ │ Evaluate │ │ │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘


### Package Registration Flow
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ │ │ │ │ │ │ │
│ User │────▶│ Check │────▶│ Grant/Queue │────▶│ Notify │
│ Requests │ │ Package │ │ Access │ │ User │
│ Access │ │ Policy │ │ │ │ │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘


## Implementation Strategy

### Phase 1: Core Authorization Infrastructure
1. **Database Schema**: Implement authorization models in `@sonnenreich/auth`
2. **Permission Engine**: Create core authorization logic
3. **Middleware**: Build authorization middleware for API routes
4. **Basic UI**: Admin interfaces for role and permission management

### Phase 2: Meetings Package Integration
1. **Package Registration**: Register meetings package with permissions
2. **Resource Access**: Implement meeting-specific authorization
3. **UI Components**: Permission-aware meeting management interface
4. **Testing**: Comprehensive authorization testing for meetings

### Phase 3: Enhanced Features
1. **Caching Layer**: Implement Redis/memory caching for permissions
2. **Audit Logging**: Complete audit trail for authorization events
3. **Advanced Roles**: Role inheritance and hierarchical permissions
4. **Self-Service**: User interfaces for requesting package access

## Security Considerations

### Authentication Integration
- Leverage existing Next-Auth session management
- Maintain backward compatibility with current auth flows
- Secure token-based authorization for API requests

### Authorization Principles
- **Principle of Least Privilege**: Users get minimal necessary permissions
- **Fail Secure**: Default deny, explicit allow
- **Separation of Concerns**: Clear boundaries between packages
- **Audit Everything**: Log all authorization decisions

### Data Protection
- Encrypt sensitive authorization data
- Implement proper database access controls
- Regular security audits of permission assignments
- Protection against privilege escalation attacks

## Scalability and Performance

### Caching Strategy
- **User Permissions**: Cache user's effective permissions per package
- **Role Definitions**: Cache role and permission definitions
- **Resource Access**: Cache resource-specific access controls
- **TTL Management**: Appropriate cache expiration policies

### Database Optimization
- **Indexing**: Optimize queries with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Minimize N+1 queries in permission checks
- **Batch Operations**: Bulk permission updates when possible

### Monitoring and Observability
- **Authorization Metrics**: Track authorization check performance
- **Error Monitoring**: Alert on authorization failures
- **Audit Dashboards**: Visualize permission usage and changes
- **Performance Profiling**: Identify authorization bottlenecks

This architecture provides a comprehensive, scalable authorization system that integrates seamlessly with your existing authentication while providing the flexibility needed for package-specific permissions and resource-level access control.