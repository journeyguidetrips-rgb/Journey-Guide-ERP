export type TabView = 'User' | 'Role' | 'Permission' | 'Organization'

// User type
export interface User {
  id: number;
  email: string;
  roleId: number;
  roleName: string;
  orgId: number | null;
  orgName: string | null;
  createdAt: string;
}

// Role type
export interface Role {
  id: number;
  name: string;
  description: string;
}

// Permission type
export interface Permission {
  id: number;
  name: string;
  description: string;
}

// Permission type
export interface RolePermissionMapping {
  role_id: number;
  permission_id: number;
}

// Organization type
export interface Organization {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
}

// Role with permissions
export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}