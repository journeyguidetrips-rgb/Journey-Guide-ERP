import { pool } from '../database/connection';
import { getContext } from '../context/requestContext';

// Fetch all users (SuperAdmin only)
export const getAllUsers = async () => {
  const { orgId } = getContext();
  const result = await pool.query(`
    SELECT
      u.id, u.email, u.role_id, r.name AS role_name,
      u.org_id, o.name AS org_name, u.created_at
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN organizations o ON u.org_id = o.id
    ORDER BY u.created_at DESC
  `);
  return result.rows;
};

// Create a new user
export const createUser = async (
  email: string,
  password: string,
  roleId: number,
  orgId: number
) => {
  const result = await pool.query(`
    INSERT INTO users (email, password_hash, role_id, org_id)
    VALUES ($1, crypt($2, gen_salt('bf')), $3, $4)
    RETURNING id, email, role_id, org_id
  `, [email, password, roleId, orgId]);
  return result.rows[0];
};

// Delete a user
export const deleteUser = async (userId: number) => {
  const result = await pool.query(`
    DELETE FROM users WHERE id = $1
    RETURNING id, email
  `, [userId]);
  return result.rows[0];
};

// Create user role
export const createUserRole = async (roleName: string, roleDescription: string) => {
  const result = await pool.query(`
    INSERT INTO roles (name, description)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING id, name, description
  `, [roleName, roleDescription]);
  return result.rows[0];
};

// Update user role
export const updateUserRole = async (roleId: number, roleName: string, roleDescription: string) => {
  const result = await pool.query(`
    UPDATE roles 
    SET name = $2,  
        description = $3
    WHERE id = $1
    RETURNING id, name, description
  `, [roleId, roleName, roleDescription]);
  return result.rows[0];
};

// Fetch all roles
export const getAllRoles = async () => {
  const result = await pool.query('SELECT id, name, description FROM roles ORDER BY id');
  return result.rows;
};

// Fetch all permissions
export const getAllPermissions = async () => {
  const result = await pool.query('SELECT id, name, description FROM permissions');
  return result.rows;
};

// Fetch all permissions assigned to role
export const getAllPermissionsAssignedToRole = async () => {
  const result = await pool.query('SELECT role_id, permission_id FROM role_permissions');
  return result.rows;
};

// Assign permission to role
export const assignPermissionToRole = async (roleId: number, permissionId: number) => {
  const result = await pool.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING *
  `, [roleId, permissionId]);
  return result.rows[0];
};

// Remove permission from role
export const removePermissionFromRole = async (roleId: number, permissionId: number) => {
  const result = await pool.query(`
    DELETE FROM role_permissions
    WHERE role_id = $1 AND permission_id = $2
    RETURNING *
  `, [roleId, permissionId]);
  return result.rows[0];
};

// Fetch all organizations
export const getAllOrganizations = async () => {
  const result = await pool.query('SELECT id, name, slug, is_active FROM organizations');
  return result.rows;
};

// Create a new organization
export const createOrganization = async (name: string, slug: string) => {
  const result = await pool.query(`
    INSERT INTO organizations (name, slug)
    VALUES ($1, $2)
    RETURNING id, name, slug
  `, [name, slug]);
  return result.rows[0];
};

// Delete an organization
export const deleteOrganization = async (orgId: number) => {
  const result = await pool.query(`
    DELETE FROM organizations WHERE id = $1
    RETURNING id, name
  `, [orgId]);
  return result.rows[0];
};