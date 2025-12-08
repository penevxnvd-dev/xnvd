# Unified Dashboard Component

A permission-based unified dashboard component system that provides consistent UI and functionality across all user roles.

## Features

- **Permission-based rendering**: Components and features are shown/hidden based on user permissions
- **Consistent UI**: Shared header, navigation, and user menu across all dashboards
- **Role-based access control**: Automatic permission checking based on user role
- **Reusable components**: PermissionGate, ResourceView, and ResourceActions helpers

## Usage

### Basic Usage

```tsx
import { UnifiedDashboard } from '@/components/dashboard/UnifiedDashboard';
import { useUserRole } from '@/hooks/useUserRole';

const MyDashboard = () => {
  const { role, userId } = useUserRole();
  
  return (
    <UnifiedDashboard
      userId={userId!}
      role={role!}
      customBreadcrumb={['Начало', 'Моя секция']}
      showTopologySidebar={true}
      onHome={() => console.log('Home clicked')}
    >
      {/* Your dashboard content */}
      <div>Dashboard content here</div>
    </UnifiedDashboard>
  );
};
```

### Using Permission Gates

```tsx
import { PermissionGate } from '@/components/dashboard/UnifiedDashboard';
import { useUserRole } from '@/hooks/useUserRole';

const MyComponent = () => {
  const { role } = useUserRole();
  
  return (
    <PermissionGate permission="create.countries" role={role!}>
      <Button>Create Country</Button>
    </PermissionGate>
  );
};
```

### Using Resource Views

```tsx
import { ResourceView } from '@/components/dashboard/UnifiedDashboard';
import { useUserRole } from '@/hooks/useUserRole';

const MyComponent = () => {
  const { role } = useUserRole();
  
  return (
    <ResourceView resource="countries" role={role!}>
      <CountriesList />
    </ResourceView>
  );
};
```

### Using Resource Actions

```tsx
import { ResourceActions } from '@/components/dashboard/UnifiedDashboard';
import { useUserRole } from '@/hooks/useUserRole';

const MyComponent = () => {
  const { role } = useUserRole();
  
  return (
    <ResourceActions
      resource="countries"
      role={role!}
      onCreate={() => console.log('Create')}
      onEdit={() => console.log('Edit')}
      onDelete={() => console.log('Delete')}
    />
  );
};
```

## Permissions System

### Available Permissions

- `view.countries`, `view.cities`, `view.offices`, `view.teams`, `view.realtors`
- `create.countries`, `create.cities`, `create.offices`, `create.teams`, `create.realtors`
- `edit.countries`, `edit.cities`, `edit.offices`, `edit.teams`, `edit.realtors`
- `delete.countries`, `delete.cities`, `delete.offices`, `delete.teams`, `delete.realtors`
- `edit.training` - Can edit training progress
- `view.training` - Can view training
- `export.data` - Can export data
- `manage.users` - Can manage users (admin only)

### Role Permissions

- **admin**: Full access to all resources and features
- **regional_manager**: Can view cities, offices, teams, realtors; can edit training
- **office_manager**: Can view offices, teams, realtors; can edit training
- **team_leader**: Can view teams, realtors; can edit training
- **realtor**: Can view and edit own training

## Props

### UnifiedDashboard Props

- `userId: string` - Current user ID
- `role: UserRole` - Current user role
- `children?: ReactNode` - Dashboard content
- `customHeader?: ReactNode` - Custom header content
- `customBreadcrumb?: string[]` - Breadcrumb items (default: ['Начало'])
- `showTopologySidebar?: boolean` - Show topology sidebar (default: false)
- `onHome?: () => void` - Home button click handler

## Helper Functions

### hasPermission(role, permission)

Check if a role has a specific permission.

```tsx
import { hasPermission } from '@/utils/permissions';

if (hasPermission(role, 'create.countries')) {
  // Show create button
}
```

### getViewableResources(role)

Get list of resources a role can view.

```tsx
import { getViewableResources } from '@/utils/permissions';

const viewable = getViewableResources(role);
// Returns: ['countries', 'cities', ...] for admin
```

## Migration Guide

To migrate an existing dashboard to use UnifiedDashboard:

1. Import UnifiedDashboard and useUserRole
2. Wrap your dashboard content with UnifiedDashboard
3. Replace permission checks with PermissionGate components
4. Use ResourceView for resource-based access control
5. Use ResourceActions for CRUD operations

Example migration:

```tsx
// Before
const MyDashboard = () => {
  return (
    <div>
      <header>...</header>
      <main>...</main>
    </div>
  );
};

// After
const MyDashboard = () => {
  const { role, userId } = useUserRole();
  
  return (
    <UnifiedDashboard userId={userId!} role={role!}>
      <main>...</main>
    </UnifiedDashboard>
  );
};
```

