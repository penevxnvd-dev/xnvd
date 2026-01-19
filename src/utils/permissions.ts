import { UserRole } from '@/hooks/useUserRole';

export type Permission = 
  | 'view.countries'
  | 'view.cities'
  | 'view.offices'
  | 'view.teams'
  | 'view.realtors'
  | 'create.countries'
  | 'create.cities'
  | 'create.offices'
  | 'create.teams'
  | 'create.realtors'
  | 'edit.countries'
  | 'edit.cities'
  | 'edit.offices'
  | 'edit.teams'
  | 'edit.realtors'
  | 'delete.countries'
  | 'delete.cities'
  | 'delete.offices'
  | 'delete.teams'
  | 'delete.realtors'
  | 'edit.training'
  | 'view.training'
  | 'export.data'
  | 'manage.users';

export interface RolePermissions {
  view: string[];
  create: string[];
  edit: string[];
  delete: string[];
  special: string[];
}

const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    view: ['countries', 'cities', 'offices', 'teams', 'realtors'],
    create: ['countries', 'cities', 'offices', 'teams', 'realtors'],
    edit: ['countries', 'cities', 'offices', 'teams', 'realtors'],
    delete: ['countries', 'cities', 'offices', 'teams', 'realtors'],
    special: ['edit.training', 'view.training', 'export.data', 'manage.users'],
  },
  regional_manager: {
    view: ['cities', 'offices', 'teams', 'realtors'],
    create: [],
    edit: [],
    delete: [],
    special: ['edit.training', 'view.training', 'export.data', 'manage.users'],
  },
  office_manager: {
    view: ['offices', 'teams', 'realtors'],
    create: [],
    edit: [],
    delete: [],
    special: ['edit.training', 'view.training', 'export.data', 'manage.users'],
  },
  team_leader: {
    view: ['teams', 'realtors'],
    create: [],
    edit: [],
    delete: [],
    special: ['edit.training', 'view.training', 'export.data', 'manage.users'],
  },
  realtor: {
    view: [],
    create: [],
    edit: [],
    delete: [],
    // Реализаторите само гледат своето обучение, не редактират
    special: ['view.training'],
  },
  null: {
    view: [],
    create: [],
    edit: [],
    delete: [],
    special: [],
  },
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  if (!role || role === 'null') return false;

  const permissions = rolePermissions[role];
  if (!permissions) return false;

  const [action, resource] = permission.split('.');

  // Check special permissions
  if (permissions.special.includes(permission)) {
    return true;
  }

  // Check resource-based permissions
  if (action === 'view' && permissions.view.includes(resource)) {
    return true;
  }
  if (action === 'create' && permissions.create.includes(resource)) {
    return true;
  }
  if (action === 'edit' && permissions.edit.includes(resource)) {
    return true;
  }
  if (action === 'delete' && permissions.delete.includes(resource)) {
    return true;
  }

  return false;
};

export const getViewableResources = (role: UserRole): string[] => {
  if (!role || role === 'null') return [];
  return rolePermissions[role]?.view || [];
};

export const getCreatableResources = (role: UserRole): string[] => {
  if (!role || role === 'null') return [];
  return rolePermissions[role]?.create || [];
};

export const getEditableResources = (role: UserRole): string[] => {
  if (!role || role === 'null') return [];
  return rolePermissions[role]?.edit || [];
};

export const getDeletableResources = (role: UserRole): string[] => {
  if (!role || role === 'null') return [];
  return rolePermissions[role]?.delete || [];
};

