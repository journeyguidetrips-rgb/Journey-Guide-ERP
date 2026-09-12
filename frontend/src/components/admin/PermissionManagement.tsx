import React, { useState, useEffect } from 'react';
import { fetchAllRoles, fetchAllPermissions, assignPermissionToRole, removePermissionFromRole } from '../../services/adminService';

const PermissionManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rolesData, permissionsData] = await Promise.all([
          fetchAllRoles(),
          fetchAllPermissions(),
        ]);
        setRoles(rolesData);
        setPermissions(permissionsData);
      } catch (err) {
        setError('Failed to fetch permissions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Permission Management</h2>
      {/* Render permissions UI */}
    </div>
  );
};

export default PermissionManagement;