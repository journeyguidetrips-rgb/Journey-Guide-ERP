import React, { useState, useEffect } from 'react';
import {
  fetchAllRoles,
  fetchAllPermissions,
  fetchAllPermissionsAssignedToRole,
  assignPermissionToRole,
  removePermissionFromRole,
  createRole,
  updateRole
} from '../../services/adminService';
import { Role, Permission, RolePermissionMapping } from '../../types/admin';

const RoleManagement: React.FC = () => {
  // State for roles, permissions, and UI
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMapping[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', description: '' });

  // Fetch roles and permissions on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rolesData, permissionsData, initialRolePermissions] = await Promise.all([
          fetchAllRoles(),
          fetchAllPermissions(),
          fetchAllPermissionsAssignedToRole()
        ]);
        setRoles(rolesData);
        setPermissions(permissionsData);
        setRolePermissions(initialRolePermissions);
      } catch (err) {
        setError('Failed to fetch roles or permissions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

   // Handle creating a new role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createdRole = await createRole(newRole.name, newRole.description);
      setRoles([...roles, {id: createdRole.id, name: createdRole.name, description: createdRole.description} ]);
    } catch (err) {
      setError('Failed to create role');
      console.error(err);
    }
  };

  // Open edit modal
  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setEditFormData({  name: role.name, description: role.description || '' });
    setIsEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingRole(null);
    setEditFormData({ name: '', description: '' });
  };

  // Handle updating a role
  const handleUpdateRole = async () => {
    if (!editingRole) 
      return;

    try {
      const updatedRole = await updateRole(
        editingRole.id,
        editFormData.name,
        editFormData.description
      );

      setRoles(roles.map((role) => (role.id === updatedRole.id ? updatedRole : role)));
      setEditingRole(null);
    } catch (err) {
      setError('Failed to update role');
      console.error(err);
    }
  };

  // Handle deleting a role
  const handleDeleteRole = async (roleId: number) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await deleteRole(roleId);
        setRoles(roles.filter((role) => role.id !== roleId));
        const newRolePermissions = { ...rolePermissions };
        delete newRolePermissions[roleId];
        setRolePermissions(newRolePermissions);
      } catch (err) {
        setError('Failed to delete role');
        console.error(err);
      }
    }
  };

  const assignPermission = (roleId: number, permissionId: number) => {
    setRolePermissions((prevPermissions) => [
      ...prevPermissions,
      { role_id: roleId, permission_id: permissionId }
    ]);
  };

  const removePermission = (roleId: number, permissionId: number) => {
    setRolePermissions((prevPermissions) =>
      prevPermissions.filter(
        (item) => !(item.role_id === roleId && item.permission_id === permissionId)
      )
    );
  };  

  // Handle toggling a permission for a role
  const handleTogglePermission = async (roleId: number, permissionId: number) => {
    try {
      const hasPermission = rolePermissions?.some(
        (item) => item.role_id === selectedRoleId && item.permission_id === permissionId) ?? false;
      
      if (hasPermission) {
        removePermission(roleId, permissionId);
        await removePermissionFromRole(roleId, permissionId);
      } else {
        assignPermission(roleId, permissionId);
        await assignPermissionToRole(roleId, permissionId);
      }
    } catch (err) {
      setError('Failed to update permission');
      console.error(err);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (    
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-xs font-medium text-gray-500 mb-1">Create New Role</label>
        <form onSubmit={handleCreateRole} className="flex flex-wrap gap-4">
          <input
            type="text"
            value={newRole.name}
            onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
            placeholder="Role Name (e.g., 'manager')"
            required
            className="border p-2 flex-1 min-w-[200px]"
          />
          <input
            type="text"
            value={newRole.description}
            onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
            placeholder="Description"
            className="border p-2 flex-1 min-w-[200px]"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Role
          </button>
        </form>
      </div>

      {/* Roles Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase tracking-wide">
            <tr>
              <th className="py-2 px-4 border">ID</th>
              <th className="py-2 px-4 border">Name</th>
              <th className="py-2 px-4 border">Description</th>
              <th className="py-2 px-4 border">Permissions</th>
              <th className="py-2 px-4 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="py-2 px-4 border">{role.id}</td>
                <td className="py-2 px-4 border">{role.name}</td>
                <td className="py-2 px-4 border">{role.description}</td>
                <td className="py-2 px-4 border">
                  <button
                    onClick={() => setSelectedRoleId(role.id)}
                    className="text-blue-500 hover:underline"
                  >
                    Manage Permissions
                  </button>
                </td>
                <td className="py-2 px-4 border">
                  {(
                    <>
                      <button
                        onClick={() => openEditModal(role)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded"
                        disabled={role.name === 'superAdmin'} // Prevent deleting SuperAdmin
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Role Modal */}
      {isEditModalOpen && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Edit Role</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full border p-2 rounded"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={handleUpdateRole}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Management Modal */}
      {selectedRoleId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                Manage Permissions for {roles.find((r) => r.id === selectedRoleId)?.name}
              </h3>
              <button
                onClick={() => handleTogglePermission(selectedRoleId, rolePermissions[selectedRoleId].permission_id)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permissions.map((permission) => {
                const hasPermission = rolePermissions?.some(
                  (item) => item.role_id === selectedRoleId && item.permission_id === permission.id) ?? false;
                return (
                  <div key={permission.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`perm-${selectedRoleId}-${permission.id}`}
                      checked={hasPermission || false}
                      onChange={() => handleTogglePermission(selectedRoleId, permission.id)}
                      className="mr-2"
                    />
                    <label htmlFor={`perm-${selectedRoleId}-${permission.id}`}>
                      {permission.name}
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedRoleId(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}      
    </div>
  );
};

export default RoleManagement;