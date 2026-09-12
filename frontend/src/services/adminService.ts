import { api } from './api';
import {     
    User,
    Role,
    Permission,
    Organization,
    RolePermissionMapping,    
} from '../types/admin';

// Fetch all users
export const fetchAllUsers = async (): Promise<User[]> => {
  const response = await api.get('/admin/users');
  return response.data;
};

// Create a new user
export const createUser = async (userData: {
  email: string;
  password: string;
  roleId: number;
  orgId: number;
}): Promise<User> => {
  const response = await api.post('/admin/users', userData);
  return response.data;
};

// Delete a user
export const deleteUser = async (userId: number): Promise<User> => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

// Fetch all roles
export const fetchAllRoles = async (): Promise<Role[]> => {
  const response = await api.get('/admin/roles');
  return response.data;
};

// Create new role
export const createRole = async (
  roleName: string,
  roleDescription: string
) => {
  const response = await api.put('/admin/roles', { roleName, roleDescription });
  return response.data;
};

// Update role
export const updateRole = async (
  id: number,
  roleName: string,
  roleDescription: string
) => {
  const response = await api.put('/admin/updateRoles', { id, roleName, roleDescription });
  return response.data;
};

// Fetch all permissions
export const fetchAllPermissions = async (): Promise<Permission[]> => {
  const response = await api.get('/admin/permissions');
  return response.data;
};

// Fetch all permissions assigned to a role
export const fetchAllPermissionsAssignedToRole = async (): Promise<RolePermissionMapping[]> => {
  const response = await api.get(`/admin/permissionsAssignedToRole`);
  return response.data;
};

// Assign permission to role
export const assignPermissionToRole = async (
  roleId: number,
  permissionId: number
): Promise<{ roleId: number; permissionId: number }> => {
  const response = await api.put(`/admin/roles/${roleId}/permissions/${permissionId}`);
  return response.data;
};

// Remove permission from role
export const removePermissionFromRole = async (
  roleId: number,
  permissionId: number
): Promise<{ roleId: number; permissionId: number }> => {
  const response = await api.delete(`/admin/roles/${roleId}/permissions/${permissionId}`);
  return response.data;
};

// Fetch all organizations
export const fetchAllOrganizations = async (): Promise<Organization[]> => {
  const response = await api.get('/admin/organizations');
  return response.data;
};

// Create a new organization
export const createOrganization = async (name: string, slug: string): Promise<Organization> => {
  const response = await api.post('/admin/organizations', { name, slug });
  return response.data;
};

// Delete an organization
export const deleteOrganization = async (orgId: number): Promise<Organization> => {
  const response = await api.delete(`/admin/organizations/${orgId}`);
  return response.data;
};